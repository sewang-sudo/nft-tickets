/**
 * push-oracle.js — Push weather data to Thahar oracle PDA
 * Usage:
 *   node push-oracle.js --rainfall 20 --flood 15
 *   node push-oracle.js --rainfall 20 --flood 15 --region kathmandu-1
 *
 * Defaults: rainfall=20, flood=15, region=kathmandu-1
 * Trigger fires when rainfall < policy.trigger_threshold (default 50)
 */

const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────────────
const PROGRAM_ID  = new PublicKey("3o7dXUGpic6U7AsCpEwv4ifVp4w2B4waHk3ScbjT1NU2");
const IDL_PATH    = path.join(__dirname, "../anchor-program/target/idl/anchor_program.json");
const WALLET_PATH = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;

// ── Args ──────────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const get        = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i+1] : def; };
const REGION_ID  = get("--region",   "kathmandu-1");
const RAINFALL   = parseInt(get("--rainfall", "20"));
const FLOOD      = parseInt(get("--flood",    "15"));

async function main() {
  // ── Load wallet ─────────────────────────────────────────────────────────────
  const raw    = JSON.parse(fs.readFileSync(WALLET_PATH));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
  console.log("Wallet:", keypair.publicKey.toBase58());

  // ── Provider ─────────────────────────────────────────────────────────────────
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const wallet     = new anchor.Wallet(keypair);
  const provider   = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  // ── Program ──────────────────────────────────────────────────────────────────
  const idl     = JSON.parse(fs.readFileSync(IDL_PATH));
  const program  = new anchor.Program(idl, provider);

  // ── Oracle PDA ───────────────────────────────────────────────────────────────
  const [oraclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle"), Buffer.from(REGION_ID)],
    PROGRAM_ID
  );
  console.log("Oracle PDA:", oraclePda.toBase58());

  // ── Push data ────────────────────────────────────────────────────────────────
  console.log(`Pushing — region: ${REGION_ID}, rainfall: ${RAINFALL}mm, flood: ${FLOOD}cm`);

  const tx = await program.methods
    .updateOracle(REGION_ID, new anchor.BN(RAINFALL), new anchor.BN(FLOOD))
    .accounts({
      oracle:        oraclePda,
      authority:     keypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✓ Oracle updated!");
  console.log("  TX:", tx);
  console.log("  Explorer: https://explorer.solana.com/tx/" + tx + "?cluster=devnet");

  // ── Verify ───────────────────────────────────────────────────────────────────
  const oracle = await program.account.oracleData.fetch(oraclePda);
  console.log("\nOracle state:");
  console.log("  region_id:      ", oracle.regionId);
  console.log("  rainfall_mm:    ", oracle.rainfallMm.toString());
  console.log("  flood_level_cm: ", oracle.floodLevelCm.toString());
  console.log("  last_updated:   ", new Date(oracle.lastUpdated.toNumber() * 1000).toISOString());
  console.log("  authority:      ", oracle.authority.toBase58());
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
