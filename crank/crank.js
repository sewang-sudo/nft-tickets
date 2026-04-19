import fetch from 'node-fetch';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();

const REGIONS = [
  { id: 'khotang',    lat: 27.02, lon: 86.83 },
  { id: 'kathmandu',  lat: 27.71, lon: 85.31 },
  { id: 'terai',      lat: 27.00, lon: 84.50 },
];

async function getRainfall(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&forecast_days=1&timezone=Asia/Kathmandu`;
  const res = await fetch(url);
  const data = await res.json();
  const mm = data.daily.precipitation_sum[0] ?? 0;
  return Math.round(mm * 10); // store as tenths of mm
}

async function updateOracle(program, regionId, rainfallMm) {
  const [oraclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('oracle'), Buffer.from(regionId)],
    program.programId
  );
  await program.methods
    .updateOracle(regionId, new BN(rainfallMm), new BN(0))
    .accounts({ oracle: oraclePda })
    .rpc();
  console.log(`✅ ${regionId}: ${rainfallMm / 10}mm rainfall updated on-chain`);
}

async function main() {
  const connection = new Connection(process.env.RPC_URL, 'confirmed');
  const secret = JSON.parse(process.env.WALLET_KEY);
  const wallet = new anchor.Wallet(Keypair.fromSecretKey(Uint8Array.from(secret)));
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const idl = JSON.parse(readFileSync('../anchor-program/target/idl/anchor_program.json', 'utf8'));
  const program = new anchor.Program(idl, provider);

  console.log('🌧️  Thahar Oracle Crank starting...');

  while (true) {
    for (const region of REGIONS) {
      try {
        const rainfall = await getRainfall(region.lat, region.lon);
        await updateOracle(program, region.id, rainfall);
      } catch (err) {
        console.error(`❌ ${region.id} failed:`, err.message);
      }
    }
    console.log('⏳ Sleeping 1 hour...');
    await new Promise(r => setTimeout(r, 60 * 60 * 1000));
  }
}

main();
