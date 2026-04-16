/**
 * Thahar Protocol — Backend
 * Oracle automation + REST API
 * Built for Colosseum Hackathon 2026
 */

const express    = require("express");
const cors       = require("cors");
const cron       = require("node-cron");
const anchor     = require("@coral-xyz/anchor");
const web3       = require("@solana/web3.js");
const fs         = require("fs");
const path       = require("path");

// ── Config ────────────────────────────────────────────────────────
const PORT          = process.env.PORT || 3001;
const RPC_URL       = process.env.RPC_URL || "https://api.devnet.solana.com";
const KEYPAIR_PATH  = process.env.KEYPAIR_PATH || path.join(
  process.env.HOME, ".config", "solana", "id.json"
);
const IDL_PATH      = process.env.IDL_PATH || path.join(
  __dirname, "thahar.json"
);
const PROGRAM_ID    = "3o7dXUGpic6U7AsCpEwv4ifVp4w2B4waHk3ScbjT1NU2";

// ── Mock weather regions (DHM Nepal districts) ────────────────────
// rainfall_mm: current rainfall reading
// flood_level_cm: current river gauge reading
// In production: replace getMockWeatherData() with real DHM API call
const REGIONS = [
  { id: "terai-east",  name: "Eastern Terai",    baseRain: 120, baseFlood: 45 },
  { id: "terai-west",  name: "Western Terai",    baseRain: 95,  baseFlood: 30 },
  { id: "hills-east",  name: "Eastern Hills",    baseRain: 80,  baseFlood: 20 },
  { id: "hills-west",  name: "Western Hills",    baseRain: 60,  baseFlood: 15 },
  { id: "kathmandu",   name: "Kathmandu Valley", baseRain: 55,  baseFlood: 10 },
];

// ── Anchor setup ──────────────────────────────────────────────────
let program;
let provider;
let oracleKeypair;

function setupAnchor() {
  try {
    // Railway: set KEYPAIR_JSON env var to contents of id.json
    // Local:   uses ~/.config/solana/id.json automatically
    const raw       = process.env.KEYPAIR_JSON || fs.readFileSync(KEYPAIR_PATH, "utf8");
    const secretKey = Uint8Array.from(JSON.parse(raw));
    oracleKeypair    = web3.Keypair.fromSecretKey(secretKey);

    const idl        = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
    const connection = new web3.Connection(RPC_URL, "confirmed");
    const wallet     = new anchor.Wallet(oracleKeypair);

    provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    anchor.setProvider(provider);

    program = new anchor.Program(idl, provider);

    console.log(`✅ Anchor ready`);
    console.log(`   Program : ${PROGRAM_ID}`);
    console.log(`   Oracle  : ${oracleKeypair.publicKey.toBase58()}`);
    console.log(`   Network : ${RPC_URL}`);
  } catch (err) {
    console.error("❌ Anchor setup failed:", err.message);
    process.exit(1);
  }
}

// ── Mock weather data ─────────────────────────────────────────────
// Simulates realistic variance ±20% around base values
// Replace this function body with real DHM API call for production
function getMockWeatherData(region) {
  const variance    = () => (Math.random() - 0.5) * 0.4; // ±20%
  const rainfall_mm = Math.round(region.baseRain * (1 + variance()));
  const flood_cm    = Math.round(region.baseFlood * (1 + variance()));
  return {
    rainfall_mm:    Math.max(0, rainfall_mm),
    flood_level_cm: Math.max(0, flood_cm),
  };
}

// ── Oracle PDA helper ─────────────────────────────────────────────
function getOraclePDA(regionId) {
  const [pda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("oracle"), Buffer.from(regionId)],
    new web3.PublicKey(PROGRAM_ID)
  );
  return pda;
}

// ── Policy PDA helper ─────────────────────────────────────────────
function getPolicyPDA(walletAddress) {
  const farmerKey = new web3.PublicKey(walletAddress);
  const [pda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("policy"), farmerKey.toBuffer()],
    new web3.PublicKey(PROGRAM_ID)
  );
  return pda;
}

// ── Push one oracle update on-chain ──────────────────────────────
async function pushOracleUpdate(region) {
  const { rainfall_mm, flood_level_cm } = getMockWeatherData(region);

  try {
    const tx = await program.methods
      .updateOracle(region.id, new anchor.BN(rainfall_mm), new anchor.BN(flood_level_cm))
      .accounts({ authority: oracleKeypair.publicKey })
      .signers([oracleKeypair])
      .rpc();

    console.log(`📡 [${region.id}] rain=${rainfall_mm}mm flood=${flood_level_cm}cm | tx=${tx.slice(0,8)}...`);
    return { success: true, tx, rainfall_mm, flood_level_cm };
  } catch (err) {
    console.error(`❌ [${region.id}] Oracle push failed:`, err.message);
    return { success: false, error: err.message };
  }
}

// ── Push all regions ──────────────────────────────────────────────
async function pushAllOracles() {
  console.log(`\n🌧  Oracle cron fired — ${new Date().toISOString()}`);
  for (const region of REGIONS) {
    await pushOracleUpdate(region);
    // Small delay to avoid rate limiting on devnet
    await new Promise(r => setTimeout(r, 800));
  }
}

// ── Express app ───────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    protocol:  "Thahar",
    status:    "online",
    oracle:    oracleKeypair?.publicKey.toBase58(),
    network:   RPC_URL.includes("devnet") ? "devnet" : "mainnet",
    regions:   REGIONS.map(r => r.id),
    timestamp: new Date().toISOString(),
  });
});

// GET /oracle/:region_id — read OracleData PDA from chain
app.get("/oracle/:region_id", async (req, res) => {
  const { region_id } = req.params;

  const regionMeta = REGIONS.find(r => r.id === region_id);
  if (!regionMeta) {
    return res.status(404).json({
      error: `Unknown region: ${region_id}`,
      valid_regions: REGIONS.map(r => r.id),
    });
  }

  try {
    const pda  = getOraclePDA(region_id);
    const data = await program.account.oracleData.fetch(pda);

    res.json({
      region_id:      data.regionId,
      region_name:    regionMeta.name,
      rainfall_mm:    data.rainfallMm.toNumber(),
      flood_level_cm: data.floodLevelCm.toNumber(),
      last_updated:   data.lastUpdated.toNumber(),
      last_updated_iso: new Date(data.lastUpdated.toNumber() * 1000).toISOString(),
      oracle_address: pda.toBase58(),
      authority:      data.authority.toBase58(),
    });
  } catch (err) {
    // Account not initialised yet — oracle hasn't pushed for this region
    if (err.message.includes("Account does not exist")) {
      return res.status(404).json({
        error: "Oracle not yet initialised for this region. Waiting for first cron push.",
        region_id,
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /oracle — all regions at once
app.get("/oracle", async (req, res) => {
  const results = [];

  for (const region of REGIONS) {
    try {
      const pda  = getOraclePDA(region.id);
      const data = await program.account.oracleData.fetch(pda);
      results.push({
        region_id:      region.id,
        region_name:    region.name,
        rainfall_mm:    data.rainfallMm.toNumber(),
        flood_level_cm: data.floodLevelCm.toNumber(),
        last_updated:   data.lastUpdated.toNumber(),
        last_updated_iso: new Date(data.lastUpdated.toNumber() * 1000).toISOString(),
      });
    } catch {
      results.push({
        region_id:   region.id,
        region_name: region.name,
        status:      "not_initialised",
      });
    }
  }

  res.json({ regions: results, timestamp: new Date().toISOString() });
});

// GET /policy/:wallet — read InsurancePolicy PDA from chain
app.get("/policy/:wallet", async (req, res) => {
  const { wallet } = req.params;

  try {
    new web3.PublicKey(wallet); // validate address format
  } catch {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  try {
    const pda  = getPolicyPDA(wallet);
    const data = await program.account.insurancePolicy.fetch(pda);

    const policyTypeMap  = ["Crop", "Disaster"];
    const policyStatusMap = ["Active", "PaidOut", "Expired"];

    res.json({
      farmer:            data.farmer.toBase58(),
      policy_type:       policyTypeMap[Object.keys(data.policyType)[0] === "crop" ? 0 : 1],
      status:            policyStatusMap[
                           data.status.active    ? 0 :
                           data.status.paidOut   ? 1 : 2
                         ],
      premium_paid_lamports: data.premiumPaid.toNumber(),
      coverage_amount:   data.coverageAmount.toNumber(),
      trigger_threshold: data.triggerThreshold.toNumber(),
      region_id:         data.regionId,
      created_at:        data.createdAt.toNumber(),
      created_at_iso:    new Date(data.createdAt.toNumber() * 1000).toISOString(),
      policy_address:    pda.toBase58(),
    });
  } catch (err) {
    if (err.message.includes("Account does not exist")) {
      return res.status(404).json({
        error: "No policy found for this wallet",
        wallet,
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /oracle/push — manual trigger for demo purposes
// Hit this during the demo to force an oracle update on camera
app.post("/oracle/push", async (req, res) => {
  const { region_id, rainfall_mm, flood_level_cm } = req.body;

  const region = REGIONS.find(r => r.id === region_id);
  if (!region) {
    return res.status(404).json({
      error: "Unknown region",
      valid_regions: REGIONS.map(r => r.id),
    });
  }

  try {
    const rain  = rainfall_mm    ?? getMockWeatherData(region).rainfall_mm;
    const flood = flood_level_cm ?? getMockWeatherData(region).flood_level_cm;

    const tx = await program.methods
      .updateOracle(region_id, new anchor.BN(rain), new anchor.BN(flood))
      .accounts({ authority: oracleKeypair.publicKey })
      .signers([oracleKeypair])
      .rpc();

    res.json({
      success:        true,
      region_id,
      rainfall_mm:    rain,
      flood_level_cm: flood,
      tx,
      explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Cron: push oracle every 5 minutes ────────────────────────────
// For demo: change "*/5 * * * *" to "* * * * *" for every minute
cron.schedule("*/5 * * * *", pushAllOracles);

// ── Start ─────────────────────────────────────────────────────────
setupAnchor();

app.listen(PORT, () => {
  console.log(`\n🚀 Thahar backend running on port ${PORT}`);
  console.log(`   GET  /                     health check`);
  console.log(`   GET  /oracle               all regions`);
  console.log(`   GET  /oracle/:region_id    single region`);
  console.log(`   GET  /policy/:wallet       farmer policy`);
  console.log(`   POST /oracle/push          manual trigger (demo use)\n`);

  // Push immediately on startup so oracle has data right away
  console.log("📡 Pushing initial oracle data...");
  pushAllOracles();
});