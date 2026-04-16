import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AnchorProvider, Program, BN, web3 } from '@coral-xyz/anchor';

// ─── Program constants ────────────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey('3o7dXUGpic6U7AsCpEwv4ifVp4w2B4waHk3ScbjT1NU2');
const CONNECTION   = new Connection(clusterApiUrl('devnet'), 'confirmed');

// ─── IDL (minimal — matches your lib.rs instructions) ─────────────────────────
const IDL = {
  version: '0.1.0',
  name: 'anchor_program',
  instructions: [
    {
      name: 'initialize',
      accounts: [
        { name: 'treasury',  isMut: true,  isSigner: false },
        { name: 'authority', isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'registerPolicy',
      accounts: [
        { name: 'policy',    isMut: true,  isSigner: false },
        { name: 'farmer',    isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'coverageAmount',   type: 'u64'    },
        { name: 'triggerThreshold', type: 'i64'    },
        { name: 'regionId',         type: 'string' },
        { name: 'policyType',       type: 'u8'     },
      ],
    },
    {
      name: 'payPremium',
      accounts: [
        { name: 'policy',    isMut: true,  isSigner: false },
        { name: 'treasury',  isMut: true,  isSigner: false },
        { name: 'farmer',    isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'amount', type: 'u64' },
      ],
    },
    {
      name: 'updateOracle',
      accounts: [
        { name: 'oracle',    isMut: true,  isSigner: false },
        { name: 'authority', isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'regionId',   type: 'string' },
        { name: 'rainfallMm', type: 'i64'    },
        { name: 'floodLevel', type: 'i64'    },
      ],
    },
    {
      name: 'triggerPayout',
      accounts: [
        { name: 'policy',   isMut: true,  isSigner: false },
        { name: 'oracle',   isMut: false, isSigner: false },
        { name: 'treasury', isMut: true,  isSigner: false },
        { name: 'farmer',   isMut: true,  isSigner: false },
        { name: 'caller',   isMut: true,  isSigner: true  },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'InsurancePolicy',
      type: {
        kind: 'struct',
        fields: [
          { name: 'farmer',           type: 'publicKey' },
          { name: 'coverageAmount',   type: 'u64'       },
          { name: 'triggerThreshold', type: 'i64'       },
          { name: 'regionId',         type: 'string'    },
          { name: 'policyType',       type: 'u8'        },
          { name: 'premiumPaid',      type: 'bool'      },
          { name: 'status',           type: 'u8'        },
          { name: 'bump',             type: 'u8'        },
        ],
      },
    },
    {
      name: 'OracleData',
      type: {
        kind: 'struct',
        fields: [
          { name: 'regionId',   type: 'string' },
          { name: 'rainfallMm', type: 'i64'    },
          { name: 'floodLevel', type: 'i64'    },
          { name: 'timestamp',  type: 'i64'    },
          { name: 'authority',  type: 'publicKey' },
          { name: 'bump',       type: 'u8'    },
        ],
      },
    },
    {
      name: 'ProgramTreasury',
      type: {
        kind: 'struct',
        fields: [
          { name: 'authority',     type: 'publicKey' },
          { name: 'totalDeposits', type: 'u64'       },
          { name: 'bump',          type: 'u8'        },
        ],
      },
    },
  ],
};

// ─── Provider helper ───────────────────────────────────────────────────────────
function getProvider(wallet) {
  return new AnchorProvider(CONNECTION, wallet, { commitment: 'confirmed' });
}

function getProgram(wallet) {
  return new Program(IDL, PROGRAM_ID, getProvider(wallet));
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
  const tx = await program.methods
    .initialize()
    .accounts({
      treasury,
      authority: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
  return tx;
}

export async function registerPolicy(wallet, { coverageAmount, triggerThreshold, regionId, policyType }) {
  const program = getProgram(wallet);
  const [policy] = policyPDA(wallet.publicKey);
  const tx = await program.methods
    .registerPolicy(
      new BN(coverageAmount),
      new BN(triggerThreshold),
      regionId,
      policyType
    )
    .accounts({
      policy,
      farmer: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
  return tx;
}

export async function payPremium(wallet, amount) {
  const program = getProgram(wallet);
  const [policy] = policyPDA(wallet.publicKey);
  const [treasury] = treasuryPDA();
  const tx = await program.methods
    .payPremium(new BN(amount))
    .accounts({
      policy,
      treasury,
      farmer: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
  return tx;
}

export async function updateOracle(wallet, { regionId, rainfallMm, floodLevel }) {
  const program = getProgram(wallet);
  const [oracle] = oraclePDA(regionId);
  const tx = await program.methods
    .updateOracle(regionId, new BN(rainfallMm), new BN(floodLevel))
    .accounts({
      oracle,
      authority: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
  return tx;
}

export async function triggerPayout(wallet, regionId) {
  const program = getProgram(wallet);
  const [policy] = policyPDA(wallet.publicKey);
  const [oracle] = oraclePDA(regionId);
  const [treasury] = treasuryPDA();
  const tx = await program.methods
    .triggerPayout()
    .accounts({
      policy,
      oracle,
      treasury,
      farmer: wallet.publicKey,
      caller: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
  return tx;
}

// ─── Fetch helpers ─────────────────────────────────────────────────────────────

export async function fetchPolicy(wallet) {
  const program = getProgram(wallet);
  const [policy] = policyPDA(wallet.publicKey);
  return await program.account.insurancePolicy.fetch(policy);
}

export async function fetchOracleData(regionId) {
  // Use a read-only provider for fetching
  const provider = new AnchorProvider(CONNECTION, {
    publicKey: PublicKey.default,
    signTransaction: async t => t,
    signAllTransactions: async t => t,
  }, { commitment: 'confirmed' });
  const program = new Program(IDL, PROGRAM_ID, provider);
  const [oracle] = oraclePDA(regionId);
  return await program.account.oracleData.fetch(oracle);
}