import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './WalletProvider';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MyPolicies from './pages/MyPolicies';
import Oracle from './pages/Oracle';
import Admin from './pages/Admin';
import './styles/theme.css';

export default function App() {
  const [notification, setNotification] = useState(null);
  const [solPrice, setSolPrice] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd').then(r => r.json()),
      fetch('https://api.exchangerate-api.com/v4/latest/USD').then(r => r.json())
    ]).then(([sol, fx]) => {
      const solUsd = sol?.solana?.usd;
      const usdNpr = fx?.rates?.NPR;
      if (solUsd && usdNpr) setSolPrice(solUsd * usdNpr);
    }).catch(() => setSolPrice(null));
  }, []);

  const toNPR = (sol) => {
    if (!solPrice || !sol) return '';
    return '\u2248 Rs. ' + Math.round(sol * solPrice).toLocaleString();
  };

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <WalletProvider>
      <Router>
        <div className="app-root">
          <Navbar />
          {notification && (
            <div className={`toast toast-${notification.type}`}>
              {notification.msg}
            </div>
          )}
          <Routes>
            <Route path="/" element={<Home notify={notify} toNPR={toNPR} />} />
            <Route path="/policies" element={<MyPolicies notify={notify} toNPR={toNPR} />} />
            <Route path="/oracle" element={<Oracle />} />
            <Route path="/admin" element={<Admin notify={notify} />} />
          </Routes>
        </div>
      </Router>
    </WalletProvider>
  );
}
