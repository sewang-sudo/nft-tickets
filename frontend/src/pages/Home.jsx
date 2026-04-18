import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { registerPolicy, payPremium } from '../utils/thahar';

const POLICY_TYPES = ['Drought', 'Flood', 'Both'];
const REGIONS = ['kathmandu-1', 'pokhara-1', 'chitwan-1', 'butwal-1'];

export default function Home({ notify }) {
  const wallet = useWallet();
  const [form, setForm] = useState({
    coverageAmount: '',
    triggerThreshold: '',
    regionId: REGIONS[0],
    policyType: 0,
    durationDays: 180,
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('register'); // 'register' | 'premium' | 'done'

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleRegister = async () => {
    if (!wallet.connected) return notify('Connect your wallet first', 'error');
    if (!form.coverageAmount || !form.triggerThreshold) return notify('Fill all fields', 'error');
    setLoading(true);
    try {
      const sig = await registerPolicy(wallet, {
        coverageAmount: parseFloat(form.coverageAmount) * 1e9,
        triggerThreshold: parseInt(form.triggerThreshold),
        regionId: form.regionId,
        policyType: parseInt(form.policyType),
        durationDays: parseInt(form.durationDays),
      });
      notify(`Policy registered! TX: ${sig.slice(0, 8)}...`);
      setStep('premium');
    } catch (e) {
      if (e.message?.includes("already been processed")) { notify("Policy registered!"); } else { notify(e.message || "Registration failed", "error"); }
    }
    setLoading(false);
  };

  const handlePremium = async () => {
    if (!wallet.connected) return notify('Connect your wallet first', 'error');
    setLoading(true);
    try {
      const premiumLamports = parseFloat(form.coverageAmount) * 1e9 * 0.05; // 5% premium
      const sig = await payPremium(wallet, premiumLamports);
      notify(`Premium paid! TX: ${sig.slice(0, 8)}...`);
      setStep('done');
    } catch (e) {
      if (e.message?.includes("already been processed")) { notify("Premium paid!"); } else { notify(e.message || "Payment failed", "error"); }
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">🇳🇵 Built for Nepal</div>
          <h1 className="hero-title">
            Parametric Crop Insurance<br />
            <span className="hero-accent">On-Chain, Instant Payouts</span>
          </h1>
          <p className="hero-sub">
            Thahar Protocol protects Nepali farmers from drought and floods.
            No paperwork. No middlemen. Oracle-triggered payouts straight to your wallet.
          </p>
          <div className="hero-stats">
            <div className="stat-pill">
              <span className="stat-num">3o7d...1NU2</span>
              <span className="stat-label">Live on Devnet</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">5</span>
              <span className="stat-label">On-chain Instructions</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">~24h</span>
              <span className="stat-label">Payout Time</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <h2 className="section-title">How It Works</h2>
        <div className="cryo-grid">
          {[
            { icon: '🔗', step: '01', title: 'Connect Wallet', desc: 'Link your Phantom wallet. Your wallet is your identity — no signup needed.' },
            { icon: '📋', step: '02', title: 'Register Policy', desc: 'Set your coverage amount, region, and rainfall trigger threshold.' },
            { icon: '💳', step: '03', title: 'Pay Premium', desc: 'Pay 5% of coverage as premium. Funds go to on-chain treasury.' },
            { icon: '⛅', step: '04', title: 'Oracle Monitors', desc: 'Authorized oracle pushes weather data on-chain every 12 hours.' },
            { icon: '⚡', step: '05', title: 'Auto Payout', desc: 'If rainfall drops below your threshold, SOL is sent directly to your wallet.' },
          ].map(card => (
            <div className="cryo-card step-card" key={card.step}>
              <div className="step-number">{card.step}</div>
              <div className="step-icon">{card.icon}</div>
              <h3 className="step-title">{card.title}</h3>
              <p className="step-desc">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Register form */}
      <section className="section">
        <h2 className="section-title">Register a Policy</h2>
        {!wallet.connected ? (
          <div className="connect-prompt cryo-card">
            <p>Connect your wallet to register a policy</p>
            <WalletMultiButton className="cryo-wallet-btn" />
          </div>
        ) : (
          <div className="cryo-card form-card">
            {step === 'done' ? (
              <div className="success-state">
                <div className="success-icon">✅</div>
                <h3>Policy Active!</h3>
                <p>Your insurance policy is live on Solana devnet. You will receive SOL directly when conditions are met.</p>
                <a
                  href={`https://explorer.solana.com/address/${wallet.publicKey?.toBase58()}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="cryo-btn"
                >
                  View on Explorer
                </a>
              </div>
            ) : step === 'premium' ? (
              <div className="premium-step">
                <h3 className="form-title">Step 2 — Pay Premium</h3>
                <p className="form-sub">
                  Premium: <strong>{(parseFloat(form.coverageAmount || 0) * 0.05).toFixed(4)} SOL</strong> (5% of coverage)
                </p>
                <button
                  className="cryo-btn full-width"
                  onClick={handlePremium}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : '💳 Pay Premium & Activate Policy'}
                </button>
              </div>
            ) : (
              <>
                <h3 className="form-title">Step 1 — Policy Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Coverage Amount (SOL)</label>
                    <input
                      className="cryo-input"
                      name="coverageAmount"
                      type="number"
                      placeholder="e.g. 2.5"
                      value={form.coverageAmount}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rainfall Trigger Threshold (mm)</label>
                    <input
                      className="cryo-input"
                      name="triggerThreshold"
                      type="number"
                      placeholder="e.g. 50"
                      value={form.triggerThreshold}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Region</label>
                    <select
                      className="cryo-input"
                      name="regionId"
                      value={form.regionId}
                      onChange={handleChange}
                    >
                      {REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Policy Type</label>
                    <select
                      className="cryo-input"
                      name="policyType"
                      value={form.policyType}
                      onChange={handleChange}
                    >
                      {POLICY_TYPES.map((t, i) => (
                        <option key={i} value={i}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (days)</label>
                    <select
                      className="cryo-input"
                      name="durationDays"
                      value={form.durationDays}
                      onChange={handleChange}
                    >
                      <option value={30}>30 days (1 month)</option>
                      <option value={90}>90 days (3 months)</option>
                      <option value={180}>180 days (6 months)</option>
                      <option value={365}>365 days (1 year)</option>
                    </select>
                  </div>
                </div>
                <button
                  className="cryo-btn full-width"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? 'Registering...' : '📋 Register Policy'}
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}