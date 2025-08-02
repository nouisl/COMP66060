// imports
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';
import { useNotification } from '@web3uikit/core';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { Web3Context } from '../context/Web3Context';
import { fetchGasPrices, getGasConfig } from '../utils/gasStation';
import { generateAndStoreEncryptedKey } from '../utils/crypto';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

// UserRegistration component
function UserRegistration() {
  // define state for form data
  const [firstName, setFirstName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [networkStatus, setNetworkStatus] = useState('checking');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [walletConnected, setWalletConnected] = useState(!!window.ethereum);
  const dispatch = useNotification();
  const navigate = useNavigate();
  const { setIsRegistered } = useContext(Web3Context);

  // check wallet balance and network
  useEffect(() => {
    async function checkBalance() {
      if (!window.ethereum) {
        setWalletConnected(false);
        return;
      }
      setWalletConnected(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setNetworkStatus('connected');
      } catch (err) {
        setNetworkStatus('error');
      }
    }
    checkBalance();
  }, []);

  // handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    setPending(false);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (!window.ethereum) throw new Error('No wallet found');
      if (!dob || isNaN(Date.parse(dob))) throw new Error('Please enter a valid date of birth.');
      if (!passphrase || passphrase.length < 8) throw new Error('Passphrase must be at least 8 characters.');
      if (passphrase !== confirmPassphrase) throw new Error('Passphrases do not match.');
      const dobDate = new Date(dob);
      const now = new Date();
      if (dobDate > now) throw new Error('Date of birth cannot be in the future.');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
      
      // check network and balance
      const network = await provider.getNetwork();
      const expectedChainId = 80002;
      if (network.chainId.toString() !== expectedChainId.toString()) {
        throw new Error(`Please switch to Polygon Amoy testnet (Chain ID: ${expectedChainId}). Current network: ${network.name} (Chain ID: ${network.chainId})`);
      }
      
      const balance = await provider.getBalance(await signer.getAddress());
      if (balance === 0n) {
        throw new Error('Your wallet has no MATIC. Please add funds to your wallet.');
      }
      
      // generate encrypted key and register user
      const dobTimestamp = Math.floor(new Date(dob).getTime() / 1000);
      const userAddress = await signer.getAddress();
      const { publicKey } = await generateAndStoreEncryptedKey(passphrase, userAddress);
      let tx;
      let retryCount = 0;
      const maxRetries = 3;
      const attemptTransaction = async () => {
        const gasEstimate = await contractWithSigner.registerUser.estimateGas(firstName, familyName, normalizedEmail, dobTimestamp, publicKey);
        try {
          const gasPrices = await fetchGasPrices();
          const gasConfig = getGasConfig(gasPrices, 'standard');
          return await contractWithSigner.registerUser(firstName, familyName, normalizedEmail, dobTimestamp, publicKey, {
            gasLimit: gasEstimate * 150n / 100n,
            ...gasConfig
          });
        } catch (gasError) {
          const fallbackGasConfig = {
            maxFeePerGas: ethers.parseUnits('50', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei')
          };
          return await contractWithSigner.registerUser(firstName, familyName, normalizedEmail, dobTimestamp, publicKey, {
            gasLimit: gasEstimate * 150n / 100n,
            ...fallbackGasConfig
          });
        }
      };
      
      // retry transaction if needed
      while (retryCount < maxRetries) {
        try {
          tx = await attemptTransaction();
          break;
        } catch (err) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw err;
          }
          const delay = 2000 * retryCount;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // wait for transaction confirmation
      setPending(true);
      setSuccess('Transaction sent. Waiting for confirmation...');
      dispatch({
        type: 'info',
        message: 'Transaction sent. Waiting for confirmation...',
        title: 'Pending',
        position: 'topR',
      });
      await tx.wait();
      setIsRegistered(true);
      setSuccess('Profile registered successfully! Redirecting...');
      dispatch({
        type: 'success',
        message: 'Profile registered successfully!',
        title: 'Registration Complete',
        position: 'topR',
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      // handle different error types
      let msg = err.reason || err.data?.message || err.message || JSON.stringify(err) || 'Registration failed.';
      if (err.code === 4001 || (msg && msg.toLowerCase().includes('user denied')) || (msg && msg.toLowerCase().includes('rejected'))) {
        msg = 'You rejected the wallet request.';
        setError('');
        dispatch({
          type: 'error',
          message: msg,
          title: 'Registration Error',
          position: 'topR',
        });
        setLoading(false);
        setPending(false);
        return;
      }
      if (msg.toLowerCase().includes('email already registered')) {
        setError('This email is already registered with another wallet address. Please use a different email.');
        dispatch({
          type: 'error',
          message: 'This email is already registered with another wallet address. Please use a different email.',
          title: 'Email Taken',
          position: 'topR',
        });
        setLoading(false);
        setPending(false);
        return;
      }
      if (msg.toLowerCase().includes('already registered')) {
        setSuccess('You are already registered with this wallet. Redirecting to homepage...');
        dispatch({
          type: 'info',
          message: 'You are already registered with this wallet. Redirecting to homepage...',
          title: 'Already Registered',
          position: 'topR',
        });
        setTimeout(() => {
          navigate('/');
        }, 2000);
        setLoading(false);
        setPending(false);
        return;
      }
      if (msg.toLowerCase().includes('insufficient funds')) {
        msg = 'You do not have enough POL to complete registration. Please add funds to your wallet.';
      } else if (msg.toLowerCase().includes('gas') || msg.toLowerCase().includes('execution reverted')) {
        msg = 'Transaction failed. Please try again or check your network connection.';
      } else if (msg.toLowerCase().includes('internal json-rpc error') || msg.toLowerCase().includes('-32603')) {
        msg = 'Network connection error. Please check your internet connection and try again.';
      } else if (msg === 'Registration failed.' || msg.toLowerCase().includes('internal json-rpc error')) {
        msg = 'Registration failed. Please try again or check your wallet.';
      }
      setError(msg);
      dispatch({
        type: 'error',
        message: msg,
        title: 'Registration Error',
        position: 'topR',
      });
      setLoading(false);
      setPending(false);
    } finally {
      setLoading(false);
      setPending(false);
    }
  };

  // return registration form
  return (
    <div className="flex justify-center px-4 mt-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8 mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Register</h1>
        {/* show wallet connection warning */}
        {!walletConnected && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-900 font-semibold">
            Please connect your wallet to register.
          </div>
        )}
        {/* show network error message */}
        {networkStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ⚠️ Network connection issue. Please check your internet connection and wallet connection.
            </p>
            <p className="text-xs text-red-600 mt-1">
              If the issue persists, try switching to a different RPC endpoint in MetaMask:
              <br />
              • https://rpc-amoy.polygon.technology
              <br />
              • https://polygon-amoy.infura.io/v3/YOUR_PROJECT_ID
            </p>
          </div>
        )}
        {/* show network checking message */}
        {networkStatus === 'checking' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              🔄 Checking network connection...
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* show passphrase warning */}
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-900 px-4 py-3 rounded mb-4 text-sm font-semibold">
            If you forget your passphrase, you will lose access to your encrypted documents. There is no way to recover your passphrase. Please keep it safe.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="First Name"
              required
              disabled={loading || pending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Family Name *</label>
            <input
              type="text"
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Family Name"
              required
              disabled={loading || pending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
              required
              disabled={loading || pending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
            <input
              type="date"
              value={dob}
              onChange={e => {
                setDob(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading || pending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Passphrase *</label>
            <input
              type="password"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter a passphrase (min 8 chars)"
              required
              disabled={loading || pending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Passphrase *</label>
            <input
              type="password"
              value={confirmPassphrase}
              onChange={e => setConfirmPassphrase(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Re-enter your passphrase"
              required
              disabled={loading || pending}
            />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-2">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-2">{success}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            disabled={loading || pending || !walletConnected}
          >
            {loading || pending ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

// export the UserRegistration component
export default UserRegistration;