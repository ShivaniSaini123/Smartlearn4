import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { EmailProvider } from './contexts/EmailContext';
import { OutputProvider } from './contexts/OutputContext';

// Set global axios defaults for cross-origin credentials and JWT auth
axios.defaults.withCredentials = true;
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Force scroll fix directly on DOM before React mounts
const rootEl = document.getElementById('root');
rootEl.style.height = 'auto';
rootEl.style.minHeight = '100vh';
rootEl.style.overflow = 'visible';

document.documentElement.style.height = 'auto';
document.documentElement.style.overflowX = 'hidden';

document.body.style.height = 'auto';
document.body.style.minHeight = '100vh';
document.body.style.overflowX = 'hidden';
document.body.style.overflowY = 'auto';

const root = ReactDOM.createRoot(rootEl);
root.render(
  <EmailProvider>
    <OutputProvider>
      <App />
    </OutputProvider>
  </EmailProvider>
);

reportWebVitals();