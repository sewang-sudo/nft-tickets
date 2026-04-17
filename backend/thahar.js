/**
 * thahar.js — Frontend client for Thahar Protocol
 * Wraps all on-chain instructions with correct types and PDA derivation.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";

const REGION_ID  = "kathmandu-1";
const PROGRAM_ID = new PublicKey("3o7dXUGpic6U7AsCpEwv4ifVp4w2B4waHk3ScbjT1NU2");

// ── PDA helpers ───────────────────────────────────────────────────────────────

export function getTreasuryPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    PROGRAM_ID
  );
  return pda;
}

export function getPolicyPda(farmerPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("policy"), farmerPubkey.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export function getOraclePda(regionId: string = REGION_ID): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle"), Buffer.from(regionId)],
    PROGRAM_ID
  );
  return pda;
}

// ── Provider factory ──────────────────────────────────────────────────────────

export function getProvider(wallet: anchor.Wallet): AnchorProvider {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

// ── Instructions ──────────────────────────────────────────────────────────────

/**
 * Initialize the treasury PDA. Call once at deployment.
 */
export async function initialize(program: Program, wallet: anchor.Wallet) {
  const treasuryPda = getTreasuryPda();

  return await program.methods
    .initialize()
    .accounts({
      treasury:      treasuryPda,
      authority:     wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Register a new insurance policy for the connected farmer wallet.
 *
 * @param policyType  - "crop" or "disaster"
 * @param coverageAmount  - in lamports
 * @param triggerThreshold - rainfall mm below which payout triggers
 * @param regionId  - defaults to "kathmandu-1"
 */
export async function registerPolicy(
  program: Program,
  wallet: anchor.Wallet,
  policyType: "crop" | "disaster",
  coverageAmount: number,
  triggerThreshold: number,
  regionId: string = REGION_ID
) {
  const policyPda = getPolicyPda(wallet.publicKey);

  // Anchor enum format — must match Rust enum variant names (lowercase)
  const policyTypeArg = policyType === "crop" ? { crop: {} } : { disaster: {} };

  return await program.methods
    .registerPolicy(
      policyTypeArg,
      new anchor.BN(coverageAmount),
      new anchor.BN(triggerThreshold),
      regionId
    )
    .accounts({
      policy:        policyPda,
      farmer:        wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Pay the insurance premium. Transfers lamports from farmer to treasury.
 */
export async function payPremium(
  program: Program,
  wallet: anchor.Wallet,
  amount: number
) {
  const policyPda  = getPolicyPda(wallet.publicKey);
  const treasuryPda = getTreasuryPda();

  return await program.methods
    .payPremium(new anchor.BN(amount))
    .accounts({
      policy:        policyPda,
      farmer:        wallet.publicKey,
      treasury:      treasuryPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Push rainfall/flood data to the oracle PDA.
 * Only the authority that first initialized the oracle can update it.
 */
export async function updateOracle(
  program: Program,
  wallet: anchor.Wallet,
  rainfallMm: number,
  floodLevelCm: number,
  regionId: string = REGION_ID
) {
  const oraclePda = getOraclePda(regionId);

  return await program.methods
    .updateOracle(regionId, new anchor.BN(rainfallMm), new anchor.BN(floodLevelCm))
    .accounts({
      oracle:        oraclePda,
      authority:     wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Trigger payout for a farmer. Anyone can call this (permissionless).
 * On-chain checks: policy active, oracle fresh, rainfall below threshold.
 */
export async function triggerPayout(
  program: Program,
  wallet: anchor.Wallet,
  farmerPubkey: PublicKey,
  regionId: string = REGION_ID
) {
  const policyPda  = getPolicyPda(farmerPubkey);
  const oraclePda  = getOraclePda(regionId);
  const treasuryPda = getTreasuryPda();

  return await program.methods
    .triggerPayout()
    .accounts({
      policy:        policyPda,
      oracle:        oraclePda,
      treasury:      treasuryPda,
      farmer:        farmerPubkey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Read policy account data for display in the UI.
 */
export async function fetchPolicy(program: Program, farmerPubkey: PublicKey) {
  const policyPda = getPolicyPda(farmerPubkey);
  return await program.account.insurancePolicy.fetch(policyPda);
}

/**
 * Read oracle data for display in the UI.
 */
export async function fetchOracle(program: Program, regionId: string = REGION_ID) {
  const oraclePda = getOraclePda(regionId);
  return await program.account.oracleData.fetch(oraclePda);
}
