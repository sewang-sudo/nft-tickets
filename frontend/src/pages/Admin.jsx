import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { updateOracle, initializeTreasury } from '../utils/thahar';

const REGIONS = ['kathmandu-1', 'pokhara-1', 'chitwan-1', 'butwal-1'];

export default function Admin({ notify }) {
  const wallet = useWallet();
  const [oracleForm, setOracleForm] = useState({
    regionId: REGIONS[0],
    rainfallMm: '',
    floodLevel: '',
  });
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const handleChange = e => {
    setOracleForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleInit = async () => {
    if (!wallet.connected) return notify('Connect wallet', 'error');
    setInitLoading(true);
    try {
      const sig = await initializeTreasury(wallet);
      notify(`Treasury initialized! TX: ${sig.slice(0, 8)}...`);
    } catch (e) {
      notify(e.message || 'Init failed', 'error');
    }
    setInitLoading(false);
  };

  const handleOracleUpdate = async () => {
    if (!wallet.connected) return notify('Connect wallet', 'error');
    if (!oracleForm.rainfallMm || !oracleForm.floodLevel) return notify('Fill all fields', 'error');
    setLoading(true);
    try {
      const sig = await updateOracle(wallet, {
        regionId: oracleForm.regionId,
        rainfallMm: parseInt(oracleForm.rainfallMm),
        floodLevel: parseInt(oracleForm.floodLevel),
      });
      notify(`Oracle updated for ${oracleForm.regionId}! TX: ${sig.slice(0, 8)}...`);
    } catch (e) {
      notify(e.message || 'Oracle update failed', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <h2 className="section-title">Admin Panel</h2>
      <p className="section-sub">
        Only the authorized oracle wallet can push data and initialize the treasury.
      </p>

      {!wallet.connected ? (
        <div className="connect-prompt cryo-card">
          <p>Connect your admin wallet</p>
          <WalletMultiButton className="cryo-wallet-btn" />
        </div>
      ) : (
        <>
          {/* Initialize treasury */}
          <div className="cryo-card admin-card">
            <h3 className="form-title">Initialize Treasury</h3>
            <p className="form-sub">Run once. Creates the on-chain treasury PDA that holds all premiums.</p>
            <button
              className="cryo-btn"
              onClick={handleInit}
              disabled={initLoading}
            >
              {initLoading ? 'Initializing...' : '🏦 Initialize Treasury'}
            </button>
          </div>

          {/* Push oracle data */}
          <div className="cryo-card admin-card">
            <h3 className="form-title">Push Oracle Data</h3>
            <p className="form-sub">Push live weather readings on-chain. Data expires after 24 hours.</p>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Region</label>
                <select
                  className="cryo-input"
                  name="regionId"
                  value={oracleForm.regionId}
                  onChange={handleChange}
                >
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Rainfall (mm)</label>
                <input
                  className="cryo-input"
                  name="rainfallMm"
                  type="number"
                  placeholder="e.g. 20"
                  value={oracleForm.rainfallMm}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Flood Level (cm)</label>
                <input
                  className="cryo-input"
                  name="floodLevel"
                  type="number"
                  placeholder="e.g. 150"
                  value={oracleForm.floodLevel}
                  onChange={handleChange}
                />
              </div>
            </div>
            <button
              className="cryo-btn full-width"
              onClick={handleOracleUpdate}
              disabled={loading}
            >
              {loading ? 'Pushing...' : '⛅ Push Oracle Data'}
            </button>
          </div>

          {/* Program info */}
          <div className="cryo-card info-card">
            <h3>Program Info</h3>
            <div className="info-row">
              <span className="info-label">Program ID</span>
              <span className="info-value mono">3o7dXUGpic6U7AsCpEwv4ifVp4w2B4waHk3ScbjT1NU2</span>
            </div>
            <div className="info-row">
              <span className="info-label">Network</span>
              <span className="info-value">Solana Devnet</span>
            </div>
            <div className="info-row">
              <span className="info-label">Connected Wallet</span>
              <span className="info-value mono">{wallet.publicKey?.toBase58()?.slice(0, 16)}...</span>
            </div>
            <a
              href="https://explorer.solana.com/address/3o7dXUGpic6U7AsCpEwv4ifVp4w2B4waHk3ScbjT1NU2?cluster=devnet"
              target="_blank"
              rel="noreferrer"
              className="explorer-link"
            >
              View Program on Explorer ↗
            </a>
          </div>
        </>
      )}
    </div>
  );
}