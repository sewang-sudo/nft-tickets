import React, { useEffect, useState } from 'react';
import { fetchOracleData } from '../utils/thahar';

const REGIONS = ['kathmandu-1', 'pokhara-1', 'chitwan-1', 'butwal-1'];

export default function Oracle() {
  const [oracles, setOracles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(REGIONS.map(r => fetchOracleData(r).catch(() => null)))
      .then(results => {
        setOracles(results.map((data, i) => ({ region: REGIONS[i], data })));
      })
      .finally(() => setLoading(false));
  }, []);

  const isStale = (timestamp) => {
    if (!timestamp) return true;
    const age = Date.now() / 1000 - timestamp;
    return age > 86400; // 24h
  };

  return (
    <div className="page-container">
      <h2 className="section-title">Oracle Data</h2>
      <p className="section-sub">
        Live rainfall and flood readings pushed on-chain by authorized oracle wallets.
        Data older than 24h is considered stale and cannot trigger payouts.
      </p>

      {loading && <div className="loading-state">Fetching oracle data...</div>}

      <div className="cryo-grid">
        {oracles.map(({ region, data }) => (
          <div className="cryo-card oracle-card" key={region}>
            <div className="oracle-header">
              <span className="oracle-region">📍 {region}</span>
              {data ? (
                <span className={`status-badge ${isStale(data.timestamp) ? 'stale' : 'fresh'}`}>
                  {isStale(data.timestamp) ? '⚠ Stale' : '✅ Fresh'}
                </span>
              ) : (
                <span className="status-badge stale">No Data</span>
              )}
            </div>

            {data ? (
              <div className="oracle-readings">
                <div className="oracle-reading">
                  <span className="reading-label">Rainfall</span>
                  <span className="reading-value rain">{data.rainfallMm?.toString()} mm</span>
                </div>
                <div className="oracle-reading">
                  <span className="reading-label">Flood Level</span>
                  <span className="reading-value flood">{data.floodLevel?.toString()} cm</span>
                </div>
                <div className="oracle-reading">
                  <span className="reading-label">Last Update</span>
                  <span className="reading-value time">
                    {data.timestamp
                      ? new Date(data.timestamp * 1000).toLocaleString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="oracle-empty">
                No oracle data pushed for this region yet.
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="cryo-card info-card">
        <h3>How the Oracle Works</h3>
        <p>
          An authorized wallet calls the <code>update_oracle</code> instruction on-chain,
          pushing rainfall (mm) and flood level (cm) for a specific region.
          The <code>trigger_payout</code> instruction verifies this data is under 24 hours old
          before releasing funds. No external API is trusted — everything lives on-chain.
        </p>
      </div>
    </div>
  );
}