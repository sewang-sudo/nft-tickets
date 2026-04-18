import { Connection, PublicKey, Keypair, clusterApiUrl } from '@solana/web3.js';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const IDL = require('/home/sewang_rai/Desktop/Thahar/frontend/src/utils/anchor_program.json');

const PROGRAM_ID = new PublicKey('3o7dXUGpic6U7AsCpEwv4ifVp4w2B4waHk3ScbjT1NU2');
const CONNECTION  = new Connection(clusterApiUrl('devnet'), 'confirmed');

const raw     = JSON.parse(readFileSync('/home/sewang_rai/.config/solana/id.json', 'utf8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(raw));

const wallet = {
  publicKey:           keypair.publicKey,
  signTransaction:     async (tx) => { tx.partialSign(keypair); return tx; },
  signAllTransactions: async (txs) => { txs.forEach(tx => tx.partialSign(keypair)); return txs; },
};

const provider = new AnchorProvider(CONNECTION, wallet, { commitment: 'confirmed' });
const program  = new Program(IDL, provider);

function policyPDA(pub) { return PublicKey.findProgramAddressSync([Buffer.from('policy'), pub.toBuffer()], PROGRAM_ID); }
function treasuryPDA()  { return PublicKey.findProgramAddressSync([Buffer.from('treasury')], PROGRAM_ID); }
function oraclePDA(rid) { return PublicKey.findProgramAddressSync([Buffer.from('oracle'), Buffer.from(rid)], PROGRAM_ID); }

async function main() {
  const [policy]   = policyPDA(keypair.publicKey);
  const [treasury] = treasuryPDA();

  console.log('Fetching broken policy at:', policy.toBase58());
  let policyData;
  try {
    policyData = await program.account.insurancePolicy.fetch(policy);
    console.log('Policy found. Region:', policyData.regionId, '| Status:', JSON.stringify(policyData.status));
  } catch (e) {
    console.log('No policy account found — slot is already free!');
    return;
  }

  const regionId = policyData.regionId;
  const [oracle]  = oraclePDA(regionId);

  console.log('\nStep 1: Attempting triggerPayout...');
  try {
    const tx1 = await program.methods
      .triggerPayout()
      .accounts({ policy, oracle, treasury, farmer: keypair.publicKey, systemProgram: web3.SystemProgram.programId })
      .rpc();
    console.log('triggerPayout OK:', tx1);
  } catch (e) {
    console.log('triggerPayout skipped:', e.message?.slice(0, 100));
  }

  console.log('\nStep 2: Closing policy...');
  try {
    const tx2 = await program.methods
      .closePolicy()
      .accounts({ policy, farmer: keypair.publicKey, systemProgram: web3.SystemProgram.programId })
      .rpc();
    console.log('closePolicy OK:', tx2);
    console.log('\n✅ PDA slot freed! You can now create a fresh policy.');
  } catch (e) {
    console.error('closePolicy FAILED:', e.message);
  }
}

main().catch(console.error);
