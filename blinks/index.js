import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import pkg from '@coral-xyz/anchor';
const {AnchorProvider, Program, BN} =pkg;
import idl from './idl.json' with{type: 'json'};

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PROGRAM_ID = process.env.PROGRAM_ID;
const RPC_URL = process.env.RPC_URL;

const connection = new Connection(RPC_URL, 'confirmed');

const walletKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.WALLET_KEY))
);

const wallet = {
  publicKey: walletKeypair.publicKey,
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
};

const provider = new AnchorProvider(connection, wallet, {
  commitment: 'confirmed',
});

const program = new Program(idl, provider);

app.get('/api/blink', (req, res) => {
  res.json({
    title: 'Thahar Crop Insurance',
    description: 'Register your crop insurance policy on Solana. Protect your harvest.',
    icon: 'https://raw.githubusercontent.com/sewang-sudo/Thahar/main/blinks/ThaharLogo.png',
    label: 'Register Policy',
    links: {
      actions: [
        {
          label: 'Register Policy',
          href: '/api/blink/register',
        }
      ]
    }
  });
});

app.post('/api/blink/register', async (req, res) => {
  try {
    const { account } = req.body;
    const farmerPubkey = new PublicKey(account);

    const [policyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('policy'), farmerPubkey.toBuffer()],
      new PublicKey(PROGRAM_ID)
    );

    const transaction = await program.methods
      .registerPolicy(new BN(1000000), new BN(5000000))
      .accounts({
        farmer: farmerPubkey,
        policy: policyPda,
        systemProgram: PublicKey.default,
      })
      .transaction();

    transaction.feePayer = farmerPubkey;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const base64 = serialized.toString('base64');

    res.json({
      transaction: base64,
      message: 'Register your crop insurance policy on Thahar.',
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Thahar Blink server running on port ${PORT}`);
});