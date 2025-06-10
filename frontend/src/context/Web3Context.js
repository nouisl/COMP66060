// Web3Context.js
import React, { createContext, useState } from 'react';

export const Web3Context = createContext();

export const Web3ProviderWrapper = ({ children }) => {
  const [walletConnected, setWalletConnected] = useState(false);

  return (
    <Web3Context.Provider value={{ walletConnected, setWalletConnected }}>
      {children}
    </Web3Context.Provider>
  );
};
