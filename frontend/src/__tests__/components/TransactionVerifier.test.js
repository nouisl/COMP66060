import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionVerifier, { TransactionHistory } from '../../utils/transactionVerifier';

// mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(void 0)
  }
});

describe('TransactionVerifier', () => {
  test('renders null when no txHash', () => {
    const { container } = render(<TransactionVerifier />);
    expect(container.firstChild).toBeNull();
  });

  test('uses default Amoy explorer link (CHAIN_ID 80002 by default)', () => {
    render(<TransactionVerifier txHash="0xabc" action="Signed" />);
    const viewLink = screen.getByRole('link', { name: /view/i });
    expect(viewLink).toHaveAttribute('href', 'https://amoy.polygonscan.com/tx/0xabc');
  });

  test('copy button copies tx hash', async () => {
    render(<TransactionVerifier txHash="0xdeadbeef" action="Sign" />);
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0xdeadbeef');
  });
});

describe('TransactionHistory', () => {
  test('renders null when no transactions', () => {
    const { container } = render(<TransactionHistory transactions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders list of TransactionVerifier entries', () => {
    const txs = [
      { hash: '0x1', action: 'Created' },
      { hash: '0x2', action: 'Signed' }
    ];
    render(<TransactionHistory transactions={txs} />);
    expect(screen.getByText(/Created/i)).toBeInTheDocument();
    expect(screen.getByText(/Signed/i)).toBeInTheDocument();
  });
});