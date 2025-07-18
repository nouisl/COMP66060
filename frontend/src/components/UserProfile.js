import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useMoralis } from 'react-moralis';
import Docu3 from '../contracts/Docu3.json';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function UserProfile() {
  const { account } = useMoralis();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportError, setExportError] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importKey, setImportKey] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!account) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
        const [firstName, familyName, email, dob, , publicKey] = await contract.getUserProfile(account);
        setProfile({ firstName, familyName, email, dob, publicKey });
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [account]);

  const handleExport = () => {
    setExportError('');
    try {
      const privateKey = localStorage.getItem('docu3_enc_privateKey');
      if (!privateKey) {
        setExportError('No private key found in this browser.');
        return;
      }
      const blob = new Blob([privateKey], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'docu3_encryption_private_key.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError('Failed to export private key.');
    }
  };

  const handleImport = () => {
    setImportError('');
    setImportSuccess('');
    const key = importKey.trim();
    if (!key) {
      setImportError('Please enter or paste a private key.');
      return;
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
      setImportError('Invalid private key format.');
      return;
    }
    localStorage.setItem('docu3_enc_privateKey', key);
    setImportSuccess('Private key imported successfully. You can now decrypt your documents.');
    setImportKey('');
  };

  const handleImportFile = (e) => {
    setImportError('');
    setImportSuccess('');
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const key = (event.target.result || '').trim();
      if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
        setImportError('Invalid private key format in file.');
        return;
      }
      localStorage.setItem('docu3_enc_privateKey', key);
      setImportSuccess('Private key imported successfully from file.');
      setImportKey('');
    };
    reader.readAsText(file);
  };

  if (loading) return <div className="text-center py-8">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">User Profile</h2>
      {profile ? (
        <div className="space-y-4">
          <div><strong>First Name:</strong> {profile.firstName}</div>
          <div><strong>Family Name:</strong> {profile.familyName}</div>
          <div><strong>Email:</strong> {profile.email}</div>
          <div><strong>Date of Birth:</strong> {profile.dob && new Date(Number(profile.dob) * 1000).toLocaleDateString()}</div>
          {profile.publicKey && (
            <div><strong>Public Key:</strong> <span className="break-all text-xs">{profile.publicKey}</span></div>
          )}
          <div className="mt-8">
            <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Manage Encryption Key</button>
          </div>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                <button onClick={() => { setShowModal(false); setExportError(''); setImportError(''); setImportSuccess(''); setImportKey(''); }} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
                <h3 className="text-lg font-semibold mb-4">Encryption Key Management</h3>
                <button onClick={handleExport} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full mb-2">Export Encryption Key</button>
                {exportError && <div className="text-red-600 text-xs mb-2">{exportError}</div>}
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Paste your encryption private key here"
                    value={importKey}
                    onChange={e => setImportKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                  />
                  <button onClick={handleImport} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-full mb-2">Import Key</button>
                  <input type="file" accept=".txt" onChange={handleImportFile} className="w-full mb-2" />
                  {importError && <div className="text-red-600 text-xs mb-2">{importError}</div>}
                  {importSuccess && <div className="text-green-600 text-xs mb-2">{importSuccess}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500">No profile found.</div>
      )}
    </div>
  );
}

export default UserProfile;