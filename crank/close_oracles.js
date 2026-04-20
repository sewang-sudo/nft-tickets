import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();

const REGIONS = ['kathmandu', 'chitwan', 'pokhara', 'butwal', 'khotang', 'terai'];

async function main() {
  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const secret = JSON.parse(process.env.WALLET_KEY);
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(secret)));
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const idl = JSON.parse(readFileSync('../anchor-program/target/idl/thahar.json', 'utf8'));
  const program = new anchor.Program(idl, provider);
  console.log('Available methods:', Object.keys(program.methods));

  for (const region of REGIONS) {
    const [oraclePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('oracle'), Buffer.from(region)],
      program.programId
    );
    const info = await connection.getAccountInfo(oraclePda);
    if (!info) {
      console.log(`⏭️  ${region}: no account found, skipping`);
      continue;
    }
    try {
      await program.methods
        .closeOracle(region)
        .accounts({ oracle: oraclePda, caller: wallet.publicKey })
        .rpc();
      console.log(`✅ ${region}: closed successfully`);
    } catch (err) {
      console.error(`❌ ${region} failed:`, err.message);
    }
  }
  console.log('Done. Run crank.js to recreate fresh accounts.');
}

main();
