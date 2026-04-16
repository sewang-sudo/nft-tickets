import React, { useState } from 'react';
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
            <Route path="/" element={<Home notify={notify} />} />
            <Route path="/policies" element={<MyPolicies notify={notify} />} />
            <Route path="/oracle" element={<Oracle />} />
            <Route path="/admin" element={<Admin notify={notify} />} />
          </Routes>
        </div>
      </Router>
    </WalletProvider>
  );
}