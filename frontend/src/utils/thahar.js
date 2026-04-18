import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AnchorProvider, Program, BN, web3 } from '@coral-xyz/anchor';
import IDL from './anchor_program.json';

// ─── Program constants ────────────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey('3o7dXUGpic6U7AsCpEwv4ifVp4w2B4waHk3ScbjT1NU2');
const CONNECTION = new Connection(clusterApiUrl('devnet'), 'confirmed');

// ─── Policy type enum — matches Rust PolicyType ───────────────────────────────
export const POLICY_TYPE_ENUM = {
  0: { crop:  {} },
  1: { flood: {} },
  2: { both:  {} },
};

// ─── Provider / Program helpers ───────────────────────────────────────────────
function getProvider(wallet) {
  return new AnchorProvider(CONNECTION, wallet, { commitment: 'confirmed' });
}

function getProgram(wallet) {
  return new Program(IDL, getProvider(wallet));
}

// ─── PDA helpers ──────────────────────────────────────────────────────────────
export function policyPDA(farmerPubkey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('policy'), farmerPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function treasuryPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('treasury')],
    PROGRAM_ID
  );
}

export function oraclePDA(regionId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('oracle'), Buffer.from(regionId)],
    PROGRAM_ID
  );
}

// ─── Instructions ─────────────────────────────────────────────────────────────

export async function initializeTreasury(wallet) {
  const program = getProgram(wallet);
  const [treasury] = treasuryPDA();
  return await program.methods
    .initialize()
    .accounts({
      treasury,
      authority: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}

export async function registerPolicy(wallet, { coverageAmount, triggerThreshold, regionId, policyType, durationDays }) {
  const program = getProgram(wallet);
  const [policy] = policyPDA(wallet.publicKey);
  // Rust arg order: policy_type, coverage_amount, trigger_threshold, region_id, duration_days
  return await program.methods
    .registerPolicy(
      POLICY_TYPE_ENUM[policyType] ?? { crop: {} },
      new BN(coverageAmount),
      new BN(triggerThreshold),
      regionId,
      durationDays
    )
    .accounts({
      policy,
      treasury: treasuryPDA()[0],
      farmer: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}

export async function payPremium(wallet, amount) {
  const program = getProgram(wallet);
  const [policy] = policyPDA(wallet.publicKey);
  const [treasury] = treasuryPDA();
  return await program.methods
    .payPremium(new BN(amount))
    .accounts({
      policy,
      treasury,
      farmer: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}

export async function updateOracle(wallet, { regionId, rainfallMm, floodLevel }) {
  const program = getProgram(wallet);
  const [oracle] = oraclePDA(regionId);
  return await program.methods
    .updateOracle(regionId, new BN(rainfallMm), new BN(floodLevel))
    .accounts({
      oracle,
      authority: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}

export async function triggerPayout(wallet, regionId) {
  const program = getProgram(wallet);
  const [policy]   = policyPDA(wallet.publicKey);
  const [oracle]   = oraclePDA(regionId);
  const [treasury] = treasuryPDA();
  return await program.methods
    .triggerPayout()
    .accounts({
      policy,
      oracle,
      treasury,
      farmer:        wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}

// ─── Fetch helpers ─────────────────────────────────────────────────────────────

export async function fetchPolicy(wallet) {
  const program = getProgram(wallet);
  const [policy] = policyPDA(wallet.publicKey);
  return await program.account.insurancePolicy.fetch(policy);
}


export async function fetchOracleData(regionId) {
  const provider = new AnchorProvider(CONNECTION, {
    publicKey: PublicKey.default,
    signTransaction: async t => t,
    signAllTransactions: async t => t,
  }, { commitment: 'confirmed' });
  const program = new Program(IDL, provider);
  const [oracle] = oraclePDA(regionId);
  return await program.account.oracleData.fetch(oracle);
}

export async function closePolicy(wallet) {
  const program = getProgram(wallet);
  const [policy] = policyPDA(wallet.publicKey);
  const [treasury] = treasuryPDA();
  return await program.methods
    .closePolicy()
    .accounts({
      policy,
      treasury,
      farmer: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}

export async function expirePolicy(wallet, farmerPubkey) {
  const program = getProgram(wallet);
  const [policy] = policyPDA(farmerPubkey);
  const [treasury] = treasuryPDA();
  return await program.methods
    .expirePolicy()
    .accounts({
      policy,
      treasury,
      farmer: farmerPubkey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}
