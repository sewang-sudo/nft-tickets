import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import * as dotenv from 'dotenv';
dotenv.config();

const REGIONS = ['kathmandu', 'khotang', 'terai'];
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);

async function main() {
  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const secret = JSON.parse(process.env.WALLET_KEY);
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));

  for (const region of REGIONS) {
    const [oraclePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('oracle'), Buffer.from(region)],
      PROGRAM_ID
    );
    const info = await connection.getAccountInfo(oraclePda);
    if (!info) {
      console.log(`⏭️  ${region}: no account found`);
      continue;
    }
    console.log(`📍 ${region} PDA: ${oraclePda.toString()} — ${info.lamports} lamports`);
    console.log(`⚠️  Cannot force close PDA without program authority. Need different approach.`);
  }
}

main();
