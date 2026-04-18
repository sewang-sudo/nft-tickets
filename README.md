# Thahar Protocol — थाहर
> *Thahar (थाहर) — Nepali for "stable ground"*

Parametric crop and flood insurance on Solana for Nepali smallholder farmers.
No banks. No claim forms. No middlemen. Just code.

---

## The Problem
Over 2 million farming households in Nepal have no crop insurance.
When drought or floods hit — there is no safety net. Relief takes weeks
through systems that were never built for people like my family.

In 3 years, Rs. 33 billion disappeared from Nepali cooperative savings.
Most victims were farmers. My family among them.

Thahar is built so that cannot happen again. Not because of rules.
Because of code.

---

## The Solution
- Farmer registers a policy and pays a micro-premium in SOL
- Authorized oracle pushes rainfall and flood data on-chain
- Threshold breached → smart contract releases payout automatically
- No middleman can touch the funds. Not even me.

---

## How It Works
Farmer registers policy
↓
Pays micro-premium in SOL → locked in treasury PDA
↓
Oracle pushes: rainfall_mm / flood_level_cm
↓
Threshold breached?
YES → payout released to farmer wallet automatically
NO  → premium returned at season end (planned)

---

## Insurance Types
| Type | Trigger |
|------|---------|
| Drought Insurance | Rainfall below threshold (mm) |
| Flood Insurance | Flood level exceeds threshold (cm) |
| Both | Either condition triggers payout |

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Blockchain | Solana (devnet) |
| Smart Contract | Rust + Anchor Framework |
| Currency | SOL (lamports) |
| Frontend | React + Wallet Adapter |
| Oracle | Single authorized wallet (known limitation) |

---

## Smart Contract Instructions
| Instruction | Description |
|-------------|-------------|
| `register_policy` | Creates InsurancePolicy PDA for farmer |
| `pay_premium` | Transfers SOL from farmer to treasury PDA |
| `update_oracle` | Pushes rainfall/flood readings on-chain |
| `trigger_payout` | Checks threshold, releases SOL to farmer |
| `close_policy` | Closes policy and returns rent to farmer |

---

## Known Limitations
- Oracle is currently a single authorized wallet — centralized weakness
- Devnet only — not on mainnet due to Nepal regulatory limitations
- One policy per wallet at this stage

## Planned Improvements
- Decentralized oracle via Switchboard or Pyth
- USDC denomination for stable premiums
- Multiple policies per farmer
- Mainnet deployment post-regulation

---

## Why Solana
A micro-premium cannot survive Ethereum gas fees.
On Solana it works. Low fees mean small farmers can actually use this.
No legal identity required. Just a wallet.

---

## Built For
Colosseum Frontier Hackathon 2026
Built solo by Sewang Rai — from Bhulke, Khotang. Based in Kathmandu.
