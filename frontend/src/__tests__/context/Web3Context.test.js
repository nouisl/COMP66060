import React, { useContext } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Web3Context, Web3ProviderWrapper } from '../../context/Web3Context';

function Consumer() {
  const { walletConnected, setWalletConnected, isRegistered, setIsRegistered } = useContext(Web3Context);
  return (
    <div>
      <div>Wallet: {walletConnected ? 'connected' : 'disconnected'}</div>
      <div>Registered: {isRegistered ? 'yes' : 'no'}</div>
      <button onClick={() => setWalletConnected(!walletConnected)}>Toggle Wallet</button>
      <button onClick={() => setIsRegistered(!isRegistered)}>Toggle Registered</button>
    </div>
  );
}

describe('Web3Context', () => {
  test('toggles context flags and re-renders consumer', () => {
    render(
      <Web3ProviderWrapper>
        <Consumer />
      </Web3ProviderWrapper>
    );

    expect(screen.getByText(/Wallet: disconnected/i)).toBeInTheDocument();
    expect(screen.getByText(/Registered: no/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Toggle Wallet/i));
    fireEvent.click(screen.getByText(/Toggle Registered/i));

    expect(screen.getByText(/Wallet: connected/i)).toBeInTheDocument();
    expect(screen.getByText(/Registered: yes/i)).toBeInTheDocument();
  });
});