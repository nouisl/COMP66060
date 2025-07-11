import React, { useState, useRef, useEffect } from 'react';
import Docu3 from '../contracts/Docu3.json';
import { ethers } from 'ethers';
import { uploadFolderToPinata } from '../utils/pinata';
import { useNotification } from '@web3uikit/core';
<<<<<<< Updated upstream
import CryptoJS from 'crypto-js';
import EthCrypto from 'eth-crypto';
=======
<<<<<<< Updated upstream
=======
import CryptoJS from 'crypto-js';
import EthCrypto from 'eth-crypto';
import { generateDocumentHash } from '../utils/crypto';
>>>>>>> Stashed changes
>>>>>>> Stashed changes

function DocumentUpload() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [signers, setSigners] = useState([{ email: '', error: '', address: '' }]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [expiry, setExpiry] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
  const dispatch = useNotification();
 
<<<<<<< Updated upstream
=======
<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes
  useEffect(() => {
    async function fetchRegisteredUsers() {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
      const addresses = await contract.getAllRegisteredUsers();
      const users = [];
      for (let addr of addresses) {
<<<<<<< Updated upstream
        const [firstName, familyName, email, dob, isRegistered, publicKey] = await contract.getUserProfile(addr);
=======
        const [firstName, familyName, email, , isRegistered, publicKey] = await contract.getUserProfile(addr);
>>>>>>> Stashed changes
        if (isRegistered && publicKey && publicKey.length > 66) {
          users.push({ address: addr, firstName, familyName, email: email.toLowerCase(), publicKey });
        }
      }
      setRegisteredUsers(users);
    }
    fetchRegisteredUsers();
<<<<<<< Updated upstream
  }, []);

=======
  }, [CONTRACT_ADDRESS]);

>>>>>>> Stashed changes
>>>>>>> Stashed changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploading(true);
    let dirHash = null;
    try {
      if (!window.ethereum) throw new Error('No wallet found');
      if (!selectedFile) throw new Error('Please select a file to upload.');
      // Validate all signers
      for (let i = 0; i < signers.length; i++) {
        if (!signers[i].address) {
          throw new Error(`Signer ${i + 1}: ${signers[i].email} is not a registered user.`);
        }
      }
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      if (!fileExt || fileExt === selectedFile.name) {
        throw new Error('File must have a valid extension');
      }
      const filePath = 'document.' + fileExt;
<<<<<<< Updated upstream
=======
<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes
      const symmetricKey = CryptoJS.lib.WordArray.random(32).toString();
      const fileBuffer = await selectedFile.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);
      const encrypted = CryptoJS.AES.encrypt(wordArray, symmetricKey).toString();
      const encryptedFileBlob = new Blob([encrypted], { type: 'text/plain' });
      const encryptedKeys = {};
      for (let i = 0; i < signers.length; i++) {
        const user = registeredUsers.find(u => u.address === signers[i].address);
        const publicKey = user.publicKey;
        if (!publicKey || publicKey.length < 66) {
          throw new Error(`Missing or invalid public key for signer ${signers[i].email}`);
        }
        const encryptedSymmetricKey = await EthCrypto.encryptWithPublicKey(publicKey, symmetricKey);
        encryptedKeys[signers[i].address] = EthCrypto.cipher.stringify(encryptedSymmetricKey);
      }
<<<<<<< Updated upstream
=======
      const documentHash = await generateDocumentHash(selectedFile, null);
      
>>>>>>> Stashed changes
>>>>>>> Stashed changes
      const metadata = {
        title,
        description,
        file: {
          name: selectedFile.name,
          path: filePath,
          encrypted: true,
        },
<<<<<<< Updated upstream
        encryptedKeys, 
=======
<<<<<<< Updated upstream
=======
        documentHash,
        encryptedKeys, 
>>>>>>> Stashed changes
>>>>>>> Stashed changes
      };
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const files = [
        { path: filePath, content: encryptedFileBlob }, 
        { path: 'metadata.json', content: metadataBlob },
      ];
      dirHash = await uploadFolderToPinata(files);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
      const expiryTimestamp = expiry ? Math.floor(new Date(expiry).getTime() / 1000) : 0;
      const validSigners = signers.map(s => s.address);
      const tx = await contract.createDocument(dirHash, validSigners, expiryTimestamp);
      await tx.wait();
      dispatch({
        type: 'success',
        message: 'Document uploaded and registered on-chain!',
        title: 'Success',
        position: 'topR',
      });
    } catch (err) {
      if (err.code === 4001 || (err.message && err.message.toLowerCase().includes('user denied'))) {
        dispatch({
          type: 'error',
          message: 'You rejected the transaction in MetaMask.',
          title: 'Transaction Rejected',
          position: 'topR',
        });
      } else if (dirHash) {
        dispatch({
          type: 'error',
          message: `Folder uploaded to IPFS (hash: ${dirHash}) but contract call failed. You can retry or remove the folder from Pinata if needed.`,
          title: 'Partial Upload',
          position: 'topR',
        });
      } else {
        dispatch({
          type: 'error',
          message: err.message || 'Upload failed.',
          title: 'Error',
          position: 'topR',
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError('');
    setSuccess('');
  };

  const handleSignerEmailChange = (idx, email) => {
    const updated = [...signers];
    const user = registeredUsers.find(u => u.email === email.toLowerCase());
    if (user) {
      updated[idx] = { email, error: '', address: user.address };
    } else {
      updated[idx] = { email, error: 'No registered user with this email', address: '' };
    }
    setSigners(updated);
  };
  const addSigner = () => {
    setSigners([...signers, { email: '', error: '', address: '' }]);
  };
  const removeSigner = (idx) => {
    setSigners(signers.filter((_, i) => i !== idx));
  };

  const isFormValid = () => {
    if (!selectedFile || !title.trim() || signers.length === 0) return false;
    for (let s of signers) {
      if (!s.email.trim() || s.error || !s.address) return false;
    }
    return true;
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-8 mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Upload Document</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* file upload */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document File *</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && <div className="text-xs text-gray-500 mt-1">{selectedFile.name}</div>}
          </div>
          {/*  set document title */}
          <div>
            <label className="block text-sm text-gray-700 font-medium mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter document title "
              required
            />
          </div>
          {/* set document description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Short description (optional)"
              rows={2}
            />
          </div>
          {/* set signers - multiple allowed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Signers (enter registered user email) *</label>
            <div className="space-y-2">
              {signers.map((signer, idx) => (
                <div key={idx} className="flex flex-row gap-2 items-center">
                  <input
                    type="email"
                    value={signer.email}
                    onChange={e => handleSignerEmailChange(idx, e.target.value)}
                    className={`flex-1 px-3 py-2 border ${signer.error ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs`}
                    placeholder="Enter registered user's email"
                    required
                  />
                  {signers.length > 1 && (
                    <button type="button" onClick={() => removeSigner(idx)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                  )}
                  {signer.error && <span className="text-red-500 text-xs ml-2">{signer.error}</span>}
                </div>
              ))}
              <button type="button" onClick={addSigner} className="text-blue-600 hover:text-blue-800 text-xs mt-1">+ Add Signer</button>
            </div>
          </div>
          {/* set expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiry (optional)</label>
            <input
              type="datetime-local"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* error or success */}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-2">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-2">{success}</div>}
          {/* submit button */}
          <button
            type="submit"
            className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors 
              ${uploading || !isFormValid() 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            disabled={uploading || !isFormValid()}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
      </form>
    </div>
  </div>
  );
}

export default DocumentUpload;
