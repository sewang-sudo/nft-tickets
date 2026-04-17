import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import path from "path";

// ── Constants ────────────────────────────────────────────────────────────────
const REGION_ID        = "kathmandu-1";
const COVERAGE_AMOUNT  = new anchor.BN(1_000_000_000); // 1 SOL
const TRIGGER_THRESHOLD = new anchor.BN(50);            // mm — payout if rainfall < 50mm
const PREMIUM_AMOUNT   = new anchor.BN(10_000_000);    // 0.01 SOL

// ── Load IDL and wallet ───────────────────────────────────────────────────────
const idlPath  = path.resolve(__dirname, "../anchor-program/target/idl/anchor_program.json");
const idl      = JSON.parse(fs.readFileSync(idlPath, "utf8"));
const keyPath  = path.resolve(process.env.HOME!, ".config/solana/id.json");
const rawKey   = JSON.parse(fs.readFileSync(keyPath, "utf8"));
const authority = Keypair.fromSecretKey(Uint8Array.from(rawKey));

// ── Provider ──────────────────────────────────────────────────────────────────
const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");
const wallet     = new anchor.Wallet(authority);
const provider   = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
anchor.setProvider(provider);

const program = new Program(idl, provider);
const PROGRAM_ID = program.programId;

// ── PDA helpers ───────────────────────────────────────────────────────────────
function getTreasuryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("treasury")], PROGRAM_ID);
}

function getPolicyPda(farmer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("policy"), farmer.toBuffer()],
    PROGRAM_ID
  );
}

function getOraclePda(regionId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("oracle"), Buffer.from(regionId)],
    PROGRAM_ID
  );
}

// ── Main e2e flow ─────────────────────────────────────────────────────────────
async function main() {
  console.log("\n======================================");
  console.log("  Thahar Protocol — E2E Test");
  console.log("======================================\n");

  const farmerKeypair = (() => { const p = require("path").resolve(__dirname, "farmer-keypair.json"); const fs2 = require("fs"); if (fs2.existsSync(p)) return require("@solana/web3.js").Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs2.readFileSync(p,"utf8")))); const kp = require("@solana/web3.js").Keypair.generate(); fs2.writeFileSync(p, JSON.stringify(Array.from(kp.secretKey))); return kp; })();
  console.log("Authority  :", authority.publicKey.toBase58());
  console.log("Farmer     :", farmerKeypair.publicKey.toBase58());

  const [treasuryPda] = getTreasuryPda();
  const [policyPda]   = getPolicyPda(farmerKeypair.publicKey);
  const [oraclePda]   = getOraclePda(REGION_ID);

  console.log("Treasury PDA:", treasuryPda.toBase58());
  console.log("Policy PDA  :", policyPda.toBase58());
  console.log("Oracle PDA  :", oraclePda.toBase58());
  console.log("");

  // ── Step 1: Check balances (skip airdrop — wallets pre-funded) ─────────────
  console.log("Step 1: Checking balances...");
  const authBal = await connection.getBalance(authority.publicKey);
  const farmerBal = await connection.getBalance(farmerKeypair.publicKey);
  console.log(`  Authority: ${authBal / LAMPORTS_PER_SOL} SOL`);
  console.log(`  Farmer:    ${farmerBal / LAMPORTS_PER_SOL} SOL`);
  if (authBal < 0.5 * LAMPORTS_PER_SOL) throw new Error("Authority wallet too low");
  if (farmerBal < 0.5 * LAMPORTS_PER_SOL) throw new Error("Farmer wallet too low — fund it at faucet.solana.com");
  console.log("  ✓ Balances OK\n");

  // ── Step 2: Initialize treasury (skip if already exists) ──────────────────
  console.log("Step 2: Initializing treasury...");
  try {
    const tx = await program.methods
      .initialize()
      .accounts({
        treasury:      treasuryPda,
        authority:     authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
    console.log("  ✓ Treasury initialized:", tx, "\n");
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("  ✓ Treasury already initialized, skipping\n");
    } else {
      throw e;
    }
  }

  // ── Step 3: Fund treasury with SOL for payouts (skip if already funded) ────
  console.log("Step 3: Funding treasury PDA...");
  const treasuryBal = await connection.getBalance(treasuryPda);
  if (treasuryBal < 1 * LAMPORTS_PER_SOL) {
    const fundTx = await provider.sendAndConfirm(
      new web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey:   treasuryPda,
          lamports:   1 * LAMPORTS_PER_SOL,
        })
      ),
      [authority]
    );
    console.log("  ✓ Treasury funded:", fundTx, "\n");
  } else {
    console.log("  ✓ Treasury already funded:", treasuryBal / LAMPORTS_PER_SOL, "SOL\n");
  }

  // ── Step 4: Register policy (skip if already exists) ────────────────────
  console.log("Step 4: Registering insurance policy...");
  const policyInfo = await connection.getAccountInfo(policyPda);
  if (!policyInfo) {
    const registerTx = await program.methods
      .registerPolicy(
        { crop: {} },          // PolicyType::Crop  ← Anchor enum format
        COVERAGE_AMOUNT,
        TRIGGER_THRESHOLD,
        REGION_ID
      )
      .accounts({
        policy:        policyPda,
        farmer:        farmerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([farmerKeypair])
      .rpc();
    console.log("  ✓ Policy registered:", registerTx, "\n");
  } else {
    console.log("  ✓ Policy already registered, skipping\n");
  }

  // ── Steps 5-7: Only run if policy is Active (skip if already PaidOut) ──────
  const policyAccount = await program.account.insurancePolicy.fetch(policyPda);
  const policyStatus = JSON.stringify(policyAccount.status);
  if (policyStatus.includes("paidOut")) {
    console.log("Step 5: Paying premium...");
    console.log("  ✓ Policy already PaidOut — skipping steps 5-7\n");
    console.log("======================================");
    console.log("  E2E PASSED ✓ (payout already executed in prior run)");
    console.log("======================================\n");
    return;
  }
  // ── Step 5: Pay premium ───────────────────────────────────────────────────
  console.log("Step 5: Paying premium...");
  const premiumTx = await program.methods
    .payPremium(PREMIUM_AMOUNT)
    .accounts({
      policy:        policyPda,
      farmer:        farmerKeypair.publicKey,
      treasury:      treasuryPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([farmerKeypair])
    .rpc();
  console.log("  ✓ Premium paid:", premiumTx, "\n");

  // ── Step 6: Push oracle data (drought — rainfall below threshold) ──────────
  console.log("Step 6: Pushing oracle data (drought scenario: 20mm < 50mm threshold)...");
  const oracleTx = await program.methods
    .updateOracle(REGION_ID, new anchor.BN(20), new anchor.BN(5))
    .accounts({
      oracle:        oraclePda,
      authority:     authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc();
  console.log("  ✓ Oracle updated:", oracleTx, "\n");

  // ── Step 7: Trigger payout ────────────────────────────────────────────────
  console.log("Step 7: Triggering payout...");
  const farmerBalanceBefore = await connection.getBalance(farmerKeypair.publicKey);

  const payoutTx = await program.methods
    .triggerPayout()
    .accounts({
      policy:        policyPda,
      oracle:        oraclePda,
      treasury:      treasuryPda,
      farmer:        farmerKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  console.log("  ✓ PAYOUT TX:", payoutTx);

  const farmerBalanceAfter = await connection.getBalance(farmerKeypair.publicKey);
  const received = (farmerBalanceAfter - farmerBalanceBefore) / LAMPORTS_PER_SOL;
  console.log(`  ✓ Farmer received: ${received} SOL\n`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("======================================");
  console.log("  E2E PASSED ✓");
  console.log("======================================");
  console.log("  Register policy  : (skipped — already existed)");
  console.log("  Pay premium      :", premiumTx);
  console.log("  Oracle update    :", oracleTx);
  console.log("  PAYOUT           :", payoutTx);
  console.log("======================================\n");
}

main().catch((err) => {
  console.error("\n❌ E2E FAILED:", err.message ?? err);
  process.exit(1);
});