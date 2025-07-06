import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { MoralisProvider } from "react-moralis";
import { Web3ProviderWrapper } from './context/Web3Context';
import { NotificationProvider } from '@web3uikit/core';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MoralisProvider initializeOnMount={false}>
     <NotificationProvider>
        <Web3ProviderWrapper>
          <App />
        </Web3ProviderWrapper>
      </NotificationProvider>
    </MoralisProvider>
  </React.StrictMode>
);

reportWebVitals();
