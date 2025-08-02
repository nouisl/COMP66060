// imports
import React, { useState, useRef, useEffect } from 'react';
import Docu3 from '../contracts/Docu3.json';
import { ethers } from 'ethers';
import { uploadFolderToPinata } from '../utils/pinata';
import { useNotification } from '@web3uikit/core';
import { fetchGasPrices, getGasConfig } from '../utils/gasStation';
import { encryptDocument } from '../utils/crypto';
import { useNavigate } from 'react-router-dom';

// DocumentUpload component
function DocumentUpload() {
  // define state for form data
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [signers, setSigners] = useState([{ email: '', error: '', address: '' }]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [expiry, setExpiry] = useState('');
  const [uploading, setUploading] = useState(false);
  const [includeSelfAsSigner, setIncludeSelfAsSigner] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const fileInputRef = useRef();
  const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
  const dispatch = useNotification();
  const navigate = useNavigate();

  // get registered users and user profile
  useEffect(() => {
    async function fetchRegisteredUsers() {
      if (!window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
        const addresses = await contract.getAllRegisteredUsers();
        const users = [];
        for (let addr of addresses) {
          try {
            const profile = await contract.getUserProfile(addr);
            const [firstName, familyName, email, , isRegistered] = profile;
            if (isRegistered) {
              users.push({ address: addr, firstName, familyName, email: email.trim().toLowerCase() });
            }
          } catch (err) {}
        }
        setRegisteredUsers(users);
      } catch (err) {}
    }

    async function fetchUserProfile() {
      if (!window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
        const profile = await contract.getUserProfile(userAddress);
        const [firstName, familyName, email, , isRegistered] = profile;
        if (isRegistered) {
          setUserProfile({ address: userAddress, firstName, familyName, email: email.trim() });
        }
      } catch (err) {}
    }

    fetchRegisteredUsers();
    fetchUserProfile();
  }, [CONTRACT_ADDRESS]);

  // handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploading(true);
    let provider, signer, uploaderAddress, contract;
    try {
      // check wallet connection
      if (!window.ethereum) throw new Error('No wallet found');
      if (!selectedFile) throw new Error('Please select a file to upload.');
      if (!CONTRACT_ADDRESS) throw new Error('Contract address not configured. Please check your environment variables.');
      
      // setup blockchain connection
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      uploaderAddress = await signer.getAddress();
      contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
      
      // check network and balance
      const network = await provider.getNetwork();
      const expectedChainId = 80002;
      if (network.chainId.toString() !== expectedChainId.toString()) {
        throw new Error(`Please switch to Polygon Amoy testnet (Chain ID: ${expectedChainId}). Current network: ${network.name} (Chain ID: ${network.chainId})`);
      }
      const balance = await provider.getBalance(uploaderAddress);
      if (balance === 0n) {
        throw new Error('Your wallet has no MATIC. Please add funds to your wallet.');
      }
      
      // validate signers
      for (let i = 0; i < signers.length; i++) {
        if (!signers[i].address) {
          throw new Error(`Signer ${i + 1}: ${signers[i].email} is not a registered user.`);
        }
      }
      
      // check file extension
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      if (!fileExt || fileExt === selectedFile.name) {
        throw new Error('File must have a valid extension');
      }
      const filePath = 'document.' + fileExt;
      const validSignerAddresses = signers.map(s => s.address).filter(addr => addr);
      const allRecipients = includeSelfAsSigner ? [uploaderAddress, ...validSignerAddresses] : validSignerAddresses;
      
      // get public keys for encryption
      const getPublicKey = async (address) => {
        const profile = await contract.getUserProfile(address);
        return profile[5];
      };
      const fileBuffer = await selectedFile.arrayBuffer();
      if (!fileBuffer || fileBuffer.byteLength === 0) throw new Error('File buffer is empty');
      const publicKeys = {};
      for (const addr of allRecipients) {
        if (!addr) throw new Error('Recipient address is undefined');
        const publicKey = await getPublicKey(addr);
        if (!publicKey) throw new Error(`No public key found for address: ${addr}`);
        publicKeys[addr] = publicKey;
      }
      
      // encrypt document
      const { encryptedFile, encryptedKeys, iv } = await encryptDocument(fileBuffer, uploaderAddress, validSignerAddresses, getPublicKey);
      const metadata = {
        title,
        description,
        file: {
          name: selectedFile.name,
          path: filePath,
          encrypted: true,
        },
        asym: {
          encryptedKeys
        },
        iv 
      };
      
      // upload to IPFS
      const encryptedBlob = new Blob([encryptedFile], { type: 'text/plain' });
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const files = [
        { path: filePath, content: encryptedBlob },
        { path: 'metadata.json', content: metadataBlob },
      ];
      let finalDirHash;
      try {
        finalDirHash = await uploadFolderToPinata(files);
        if (!finalDirHash || finalDirHash.length === 0) {
          throw new Error('No hash returned from IPFS upload');
        }
      } catch (uploadError) {
        throw new Error(`Failed to upload encrypted file to IPFS: ${uploadError.message}`);
      }
      
      // validate document parameters
      const expiryTimestamp = expiry ? Math.floor(new Date(expiry).getTime() / 1000) : 0;
      const validSigners = getValidSigners();
      
      if (expiryTimestamp > 0 && expiryTimestamp <= Math.floor(Date.now() / 1000)) {
        throw new Error('Expiry date must be in the future.');
      }
      if (validSigners.length === 0) {
        throw new Error('No valid signers found. At least one signer is required.');
      }
      for (let i = 0; i < validSigners.length; i++) {
        if (!validSigners[i] || validSigners[i] === '0x0000000000000000000000000000000000000000') {
          throw new Error(`Invalid signer address at position ${i + 1}: ${validSigners[i]}`);
        }
        try {
          const signerProfile = await contract.getUserProfile(validSigners[i]);
          if (!signerProfile.isRegistered) {
            throw new Error(`Signer ${validSigners[i]} is not a registered user.`);
          }
        } catch (err) {
          throw new Error(`Signer ${validSigners[i]} is not a registered user or profile fetch failed.`);
        }
      }
      
      // estimate gas and create transaction
      let createGasEstimate;
      let createGasConfig;
      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        try {
          createGasEstimate = await contract.createDocument.estimateGas(finalDirHash, validSigners, expiryTimestamp);
          try {
            const gasPrices = await fetchGasPrices();
            createGasConfig = getGasConfig(gasPrices, 'standard');
          } catch (gasError) {
            createGasConfig = {
              maxFeePerGas: ethers.parseUnits('50', 'gwei'),
              maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei')
            };
          }
          break;
        } catch (err) {
          retryCount++;
          if (retryCount >= maxRetries) {
            createGasEstimate = 300000n;
            createGasConfig = {
              maxFeePerGas: ethers.parseUnits('50', 'gwei'),
              maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei')
            };
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      // send transaction to blockchain
      const createTx = await contract.createDocument(finalDirHash, validSigners, expiryTimestamp, {
        gasLimit: createGasEstimate * 150n / 100n,
        ...createGasConfig
      });
      const receipt = await createTx.wait();
      
      // find the new document ID from the event
      let newDocId = null;
      if (receipt && receipt.logs && receipt.logs.length > 0) {
        // try to get the DocumentCreated event
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name === 'DocumentCreated') {
              newDocId = parsed.args.docId?.toString();
              break;
            }
          } catch {}
        }
      }
      if (!newDocId) {
        try {
          newDocId = (await contract.documentCount()).toString();
        } catch {}
      }
      
      // show success and navigate
      dispatch({
        type: 'success',
        message: 'Document uploaded and registered on-chain!',
        title: 'Success',
        position: 'topR',
      });
      if (newDocId) {
        navigate(`/documents/${newDocId}`);
      }
    } catch (err) {
      // handle transaction rejection
      if (err.code === 4001 || (err.message && err.message.toLowerCase().includes('user denied'))) {
        dispatch({
          type: 'error',
          message: 'You rejected the transaction in MetaMask.',
          title: 'Transaction Rejected',
          position: 'topR',
        });
      } else {
        // handle other errors
        let errorMessage = 'Upload failed.';
        if (err.message && err.message.includes('IPFS hash required')) {
          errorMessage = 'IPFS hash is empty or invalid.';
        } else if (err.message && err.message.includes('At least one signer required')) {
          errorMessage = 'No valid signers found. At least one signer is required.';
        } else if (err.message && err.message.includes('Invalid signer address')) {
          errorMessage = 'One or more signer addresses are invalid.';
        } else if (err.message && err.message.includes('Expiry must be in the future')) {
          errorMessage = 'Expiry date must be in the future.';
        } else if (err.message && err.message.includes('revert')) {
          errorMessage = `Smart contract reverted: ${err.message}`;
        } else if (err.message && err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas. Please add more MATIC to your wallet.';
        } else if (err.message && err.message.includes('gas')) {
          errorMessage = 'Gas estimation failed. Please try again or check your network connection.';
        } else if ((err.message && err.message.includes('internal json-rpc error')) || (err.message && err.message.includes('-32603'))) {
          errorMessage = 'Network connection error. Please check your internet connection and try again.';
        } else if (err.message && err.message.includes('execution reverted')) {
          errorMessage = 'Transaction failed. Please check your input parameters and try again.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        if (err.reason) {
          errorMessage += `\n\nRevert reason: ${err.reason}`;
        }
        if (err.data) {
          errorMessage += `\n\nError data: ${err.data}`;
        }
        dispatch({
          type: 'error',
          message: errorMessage || (err.message || JSON.stringify(err)),
          title: 'Upload Failed',
          position: 'topR',
        });
      }
    } finally {
      setUploading(false);
    }
  };

  // handle file selection
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError('');
    setSuccess('');
  };

  // handle signer email changes
  const handleSignerEmailChange = (idx, email) => {
    const updated = [...signers];
    const normalizedEmail = email.trim().toLowerCase();
    const user = registeredUsers.find(u => u.email === normalizedEmail);
    
    if (user) {
      // check if this user is already included
      const isDuplicate = (includeSelfAsSigner && userProfile && user.address.toLowerCase() === userProfile.address.toLowerCase()) ||
                         updated.some((s, i) => i !== idx && s.address && s.address.toLowerCase() === user.address.toLowerCase());
      
      if (isDuplicate) {
        updated[idx] = { email, error: 'This user is already included as a signer', address: '' };
      } else {
        updated[idx] = { email, error: '', address: user.address };
      }
    } else {
      updated[idx] = { email, error: 'No registered user with this email', address: '' };
    }
    setSigners(updated);
  };
  
  // add new signer field
  const addSigner = () => {
    setSigners([...signers, { email: '', error: '', address: '' }]);
  };
  
  // remove signer field
  const removeSigner = (idx) => {
    setSigners(signers.filter((_, i) => i !== idx));
  };

  // get valid signer addresses
  const getValidSigners = () => {
    const validSigners = signers.filter(s => s.email.trim() && !s.error && s.address);
    if (includeSelfAsSigner && userProfile) {
      // delete duplicates if uploader is already in the signers list
      const uploaderAddress = userProfile.address.toLowerCase();
      const filteredSigners = validSigners.filter(s => s.address.toLowerCase() !== uploaderAddress);
      return [userProfile.address, ...filteredSigners];
    }
    return validSigners.map(s => s.address);
  };

  // check if form is valid
  const isFormValid = () => {
    if (!selectedFile || !title.trim()) return false;
    
    const validSigners = getValidSigners();
    if (validSigners.length === 0) return false;
    if (includeSelfAsSigner && !userProfile) return false;
    
    return true;
  };

  // return upload form
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-8 mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Signers (enter registered user email) *</label>
            
            <div className="mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeSelfAsSigner}
                  onChange={(e) => setIncludeSelfAsSigner(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Include myself as a signer</span>
              </label>
              {includeSelfAsSigner && userProfile && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  <strong>Note:</strong> You will be the first signer. Remove your email from the signer list below to avoid duplicates.
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {includeSelfAsSigner && userProfile && (
                <div className="flex flex-row gap-2 items-center">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">1</div>
                  <input
                    type="email"
                    value={userProfile.email}
                    disabled
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 font-mono text-xs"
                    placeholder="You will be the first signer"
                  />
                  <span className="text-xs text-gray-500">(You)</span>
                </div>
              )}
              
              {includeSelfAsSigner && !userProfile && (
                <div className="flex flex-row gap-2 items-center">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">1</div>
                  <input
                    type="email"
                    value="Please register first"
                    disabled
                    className="flex-1 px-3 py-2 border border-red-300 rounded-lg bg-red-50 text-red-500 font-mono text-xs"
                    placeholder="You need to register first"
                  />
                  <span className="text-xs text-red-500">(Not registered)</span>
                </div>
              )}
              
              {signers.map((signer, idx) => (
                <div key={idx} className="flex flex-row gap-2 items-center">
                  <div className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                    {includeSelfAsSigner ? idx + 2 : idx + 1}
                  </div>
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
                  {!signer.error && signer.address && (
                    <span className="text-xs text-green-600 ml-2">✓ Valid</span>
                  )}
                </div>
              ))}
              <button type="button" onClick={addSigner} className="text-blue-600 hover:text-blue-800 text-xs mt-1">+ Add Signer</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiry (optional)</label>
            <input
              type="datetime-local"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-2">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-2">{success}</div>}
          
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

// export the DocumentUpload component
export default DocumentUpload;