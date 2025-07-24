import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useMoralis } from 'react-moralis';
import Docu3 from '../contracts/Docu3.json';
import { downloadEncryptedKey, restoreEncryptedKey, getEncryptedPrivateKey } from '../utils/crypto';
import EthCrypto from 'eth-crypto';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function UserProfile() {
  const { account } = useMoralis();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyTab, setKeyTab] = useState('download');
  const [restoreStatus, setRestoreStatus] = useState('');
  const [uploadKeyText, setUploadKeyText] = useState('');
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureModalText, setFeatureModalText] = useState('');
  const [balance, setBalance] = useState(null);
  const [walletConnected, setWalletConnected] = useState(!!window.ethereum);

  useEffect(() => {
    async function fetchProfile() {
      if (!account) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
        const [firstName, familyName, email, dob, , publicKey] = await contract.getUserProfile(account);
        // Always use the on-chain address for key operations
        const onChainAddress = account;
        setProfile({ firstName, familyName, email, dob, publicKey, onChainAddress });
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [account]);

  useEffect(() => {
    async function fetchBalance() {
      if (!window.ethereum || !account) {
        setWalletConnected(false);
        setBalance(null);
        return;
      }
      setWalletConnected(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const bal = await provider.getBalance(account);
        setBalance(ethers.formatEther(bal));
      } catch {
        setBalance(null);
      }
    }
    fetchBalance();
  }, [account]);

  if (loading) return <div className="text-center py-8">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 mt-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">User Profile</h2>
      {profile ? (
        <div className="space-y-4">
          {walletConnected && balance !== null && (
            <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Wallet Balance: <span className="font-semibold">{parseFloat(balance).toFixed(4)} MATIC</span>
              </p>
            </div>
          )}
          <div><strong>First Name:</strong> {profile.firstName}</div>
          <div><strong>Family Name:</strong> {profile.familyName}</div>
          <div><strong>Email:</strong> {profile.email}</div>
          <div><strong>Date of Birth:</strong> {profile.dob && new Date(Number(profile.dob) * 1000).toLocaleDateString()}</div>
          <div>
            <strong>Public Key:</strong>
            <span
              className="font-mono break-all cursor-pointer inline-block max-w-full align-middle"
              title={profile.publicKey}
              style={{ wordBreak: 'break-all' }}
            >
              {profile.publicKey
                ? `${profile.publicKey.slice(0, 12)}...${profile.publicKey.slice(-8)}`
                : ''}
            </span>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setShowKeyModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
              >
                Manage Encrypted Key
              </button>
              <button
                onClick={() => { setFeatureModalText('Amend User is not available yet.'); setShowFeatureModal(true); }}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-semibold"
              >
                Amend User
              </button>
              <button
                onClick={() => { setFeatureModalText('Delete Account is not available yet.'); setShowFeatureModal(true); }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
              >
                Delete Account
              </button>
            </div>
            {showKeyModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
                  <button
                    onClick={() => { setShowKeyModal(false); setRestoreStatus(''); setUploadKeyText(''); }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
                  >
                    ×
                  </button>
                  <div className="flex mb-4 border-b">
                    <button
                      className={`flex-1 py-2 font-semibold ${keyTab === 'download' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
                      onClick={() => { setKeyTab('download'); setRestoreStatus(''); }}
                    >
                      Download Key
                    </button>
                    <button
                      className={`flex-1 py-2 font-semibold ${keyTab === 'upload' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
                      onClick={() => { setKeyTab('upload'); setRestoreStatus(''); }}
                    >
                      Upload/Restore Key
                    </button>
                  </div>
                  {keyTab === 'download' && (
                    <div className="flex flex-col items-center space-y-4">
                      <p className="text-sm text-gray-700 text-center">Download your encrypted private key for backup. Keep it safe!</p>
                      <button
                        onClick={() => downloadEncryptedKey(account)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
                      >
                        Download Encrypted Key
                      </button>
                    </div>
                  )}
                  {keyTab === 'upload' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-700 text-center">Upload your encrypted key file or paste the key below to restore access on this device.</p>
                      <input
                        type="file"
                        accept=".txt"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = function(ev) {
                            const encryptedKey = ev.target.result;
                            try {
                              restoreEncryptedKey(account, encryptedKey);
                              setRestoreStatus('Key restored successfully.');
                            } catch {
                              setRestoreStatus('Failed to restore key.');
                            }
                          };
                          reader.readAsText(file);
                        }}
                        className="block w-full border border-gray-300 rounded px-3 py-2"
                      />
                      <div className="flex items-center justify-center my-2 text-gray-400 text-xs">or</div>
                      <textarea
                        value={uploadKeyText}
                        onChange={e => setUploadKeyText(e.target.value)}
                        placeholder="Paste your encrypted key here"
                        className="w-full border border-gray-300 rounded px-3 py-2 min-h-[60px]"
                      />
                      <button
                        onClick={() => {
                          try {
                            restoreEncryptedKey(account, uploadKeyText);
                            setRestoreStatus('Key restored successfully.');
                          } catch {
                            setRestoreStatus('Failed to restore key.');
                          }
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                        disabled={!uploadKeyText.trim()}
                      >
                        Restore from Pasted Key
                      </button>
                      {restoreStatus && <div className={`text-center text-sm mt-2 ${restoreStatus.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{restoreStatus}</div>}
                    </div>
                  )}
                </div>
              </div>
            )}
            {showFeatureModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative flex flex-col items-center">
                  <button
                    onClick={() => setShowFeatureModal(false)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
                  >
                    ×
                  </button>
                  <div className="text-lg font-semibold mb-4">Feature Unavailable</div>
                  <div className="text-gray-700 mb-4 text-center">{featureModalText}</div>
                  <button
                    onClick={() => setShowFeatureModal(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-gray-500">No profile found.</div>
      )}
    </div>
  );
}

export default UserProfile;