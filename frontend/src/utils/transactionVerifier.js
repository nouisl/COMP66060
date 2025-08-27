// imports
import React, { useState } from 'react';

const CHAIN_ID = process.env.REACT_APP_CHAIN_ID || '80002';

// shorten long strings for display
function shortenMiddle(str, frontLen = 8, backLen = 6) {
  if (!str || str.length <= frontLen + backLen + 3) return str;
  return str.slice(0, frontLen) + '...' + str.slice(-backLen);
}

// copy button component
function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 focus:outline-none"
      title="Copy to clipboard"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// transaction verification component
function TransactionVerifier({ txHash, action, className = "" }) {
  if (!txHash) return null;
  
  const getExplorerUrl = (hash) => {
    const chainId = CHAIN_ID;
    if (chainId === '80002') {
      return `https://amoy.polygonscan.com/tx/${hash}`;
    } else if (chainId === '137') {
      return `https://polygonscan.com/tx/${hash}`;
    } else {
      return `https://etherscan.io/tx/${hash}`;
    }
  };

  return (
    <div className={`mt-2 p-2 bg-blue-50 rounded border border-blue-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-700">
          {action ? <span>{action}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <CopyButton value={txHash} />
          <a
            href={getExplorerUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            title="View on blockchain explorer"
          >
            View on chain
          </a>
        </div>
      </div>
    </div>
  );
}

// transaction history component
function TransactionHistory({ transactions = [] }) {
  if (!transactions || transactions.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Transaction History</h4>
      <div className="space-y-2">
        {transactions.map((tx, index) => (
          <TransactionVerifier 
            key={index}
            txHash={tx.hash} 
            action={tx.action} 
          />
        ))}
      </div>
    </div>
  );
}

// export components
export { TransactionVerifier, TransactionHistory };
export default TransactionVerifier; 