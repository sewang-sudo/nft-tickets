import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { path: '/',          label: 'Home'       },
    { path: '/policies',  label: 'My Policies' },
    { path: '/oracle',    label: 'Oracle Data' },
    { path: '/admin',     label: 'Admin'       },
  ];

  return (
    <nav className="cryo-nav">
      <div className="nav-brand">
        <span className="brand-icon">🌾</span>
        <span className="brand-name">Thahar</span>
        <span className="brand-tag">Protocol</span>
      </div>

      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        {links.map(l => (
          <Link
            key={l.path}
            to={l.path}
            className={`nav-link ${location.pathname === l.path ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="nav-actions">
        <WalletMultiButton className="cryo-wallet-btn" />
        <button
          className="hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="menu"
        >
          ☰
        </button>
      </div>
    </nav>
  );
}