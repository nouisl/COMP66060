// imports
import React, { createContext, useState } from 'react';

// create Web3 context for global state
export const Web3Context = createContext();

// Web3ProviderWrapper component for context provider
export const Web3ProviderWrapper = ({ children }) => {
  // wallet connection state
  const [walletConnected, setWalletConnected] = useState(false);
  // user registration state
  const [isRegistered, setIsRegistered] = useState(false);

  // return provider with state values
  return (
    <Web3Context.Provider value={{ walletConnected, setWalletConnected, isRegistered, setIsRegistered }}>
      {children}
    </Web3Context.Provider>
  );
};
