import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { fetchPolicy, triggerPayout, closePolicy } from '../utils/thahar';

const STATUS_LABELS = { 0: 'Active', 1: 'Paid Out', 2: 'Expired' };
const STATUS_COLORS = { 0: '#00ff88', 1: '#7b61ff', 2: '#888' };
const TYPE_LABELS   = { 0: 'Drought', 1: 'Flood', 2: 'Both' };

const enumKey     = (obj) => obj && typeof obj === 'object' ? Object.keys(obj)[0] : obj;
const statusIndex = (s) => ({ active: 0, paidOut: 1, expired: 2 }[enumKey(s)] ?? s);
const typeIndex   = (t) => ({ drought: 0, flood: 1, both: 2 }[enumKey(t)] ?? t);

export default function MyPolicies({ notify }) {
  const wallet = useWallet();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!wallet.connected) return;
    setFetching(true);
    fetchPolicy(wallet)
      .then(p => { console.log("POLICY:", JSON.stringify(p, null, 2)); setPolicy(p); })
      .catch(() => setPolicy(null))
      .finally(() => setFetching(false));
  }, [wallet.connected]);

  const handleTrigger = async () => {
    if (!wallet.connected) return;
    setLoading(true);
    try {
      const sig = await triggerPayout(wallet, policy.regionId);
      notify(`Payout triggered! TX: ${sig.slice(0, 8)}...`);
      setPolicy(p => ({ ...p, status: 1 }));
    } catch (e) {
      if (e.message?.includes("already been processed")) { notify("Payout triggered!"); } else { notify(e.message || "Trigger failed", "error"); }
    }
    setLoading(false);
  };

  const handleClose = async () => {
    if (!wallet.connected) return;
    setLoading(true);
    try {
      const sig = await closePolicy(wallet);
      notify(`Policy closed! Rent returned. TX: ${sig.slice(0, 8)}...`);
      setPolicy(null);
    } catch (e) {
      if (e.message?.includes("already been processed")) { notify("Policy closed!"); } else { notify(e.message || "Close failed", "error"); }
    }
    setLoading(false);
  };

  if (!wallet.connected) {
    return (
      <div className="page-container">
        <div className="connect-prompt cryo-card">
          <p>Connect your wallet to view your policies</p>
          <WalletMultiButton className="cryo-wallet-btn" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 className="section-title">My Policies</h2>

      {fetching && <div className="loading-state">Loading your policy...</div>}

      {!fetching && !policy && (
        <div className="cryo-card empty-state">
          <div style={{ fontSize: '3rem' }}>🌾</div>
          <p>No policy found for this wallet.</p>
          <a href="/" className="cryo-btn">Register a Policy</a>
        </div>
      )}

      {policy && (
        <div className="cryo-card policy-detail">
          <div className="policy-header">
            <div>
              <h3 className="policy-type">{TYPE_LABELS[typeIndex(policy.policyType)]} Insurance</h3>
              <span className="policy-region">📍 {policy.regionId}</span>
            </div>
            <span
              className="status-badge"
              style={{
                background: STATUS_COLORS[statusIndex(policy.status)] + '22',
                color: STATUS_COLORS[statusIndex(policy.status)],
                border: `1px solid ${STATUS_COLORS[statusIndex(policy.status)]}`
              }}
            >
              {STATUS_LABELS[statusIndex(policy.status)]}
            </span>
          </div>

          <div className="policy-stats">
            <div className="policy-stat">
              <span className="stat-label">Coverage</span>
              <span className="stat-value">{(policy.coverageAmount?.toNumber?.() / 1e9).toFixed(2)} SOL</span>
            </div>
            <div className="policy-stat">
              <span className="stat-label">Trigger Threshold</span>
              <span className="stat-value">{policy.triggerThreshold?.toString()} mm</span>
            </div>
            <div className="policy-stat">
              <span className="stat-label">Premium Paid</span>
              <span className="stat-value">{policy.premiumPaid ? '✅ Yes' : '❌ No'}</span>
            </div>
            <div className="policy-stat">
              <span className="stat-label">Farmer</span>
              <span className="stat-value mono">{policy.farmer?.toBase58?.()?.slice(0, 8)}...</span>
            </div>
          </div>

          {statusIndex(policy.status) === 0 && policy.premiumPaid && (
            <button
              className="cryo-btn full-width"
              onClick={handleTrigger}
              disabled={loading}
            >
              {loading ? 'Processing...' : '⚡ Trigger Payout (if conditions met)'}
            </button>
          )}

          {statusIndex(policy.status) === 0 && !policy.premiumPaid && (
            <button
              className="cryo-btn full-width"
              onClick={handleClose}
              disabled={loading}
              style={{ background: '#ff444422', color: '#ff4444', border: '1px solid #ff4444' }}
            >
              {loading ? 'Processing...' : '🗑️ Cancel Policy & Reclaim SOL'}
            </button>
          )}

          {statusIndex(policy.status) === 1 && (
  <div className="payout-notice">
    ✅ Payout has been sent to your wallet.
    <button
      className="cryo-btn full-width"
      onClick={handleClose}
      disabled={loading}
      style={{ background: '#ff444422', color: '#ff4444', border: '1px solid #ff4444', marginTop: '1rem' }}
    >
      {loading ? 'Processing...' : '🗑️ Close Policy & Reclaim Rent'}
    </button>
  </div>
)}

          <a
            href={`https://explorer.solana.com/address/${wallet.publicKey?.toBase58()}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="explorer-link"
          >
            View on Solana Explorer ↗
          </a>
        </div>
      )}
    </div>
  );
}
