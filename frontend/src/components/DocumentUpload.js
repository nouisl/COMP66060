import React, { useState, useRef } from 'react';
import Docu3ABI from '../contracts/Docu3.json';
import { ethers } from 'ethers';
import { uploadFileToPinata, uploadJsonToPinata } from '../utils/pinata';
import { useNotification } from '@web3uikit/core';

function DocumentUpload() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [signers, setSigners] = useState(['']);
  const [expiry, setExpiry] = useState('');
  const isValidAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
  const fileInputRef = useRef();
  const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
  const dispatch = useNotification();
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (!window.ethereum) throw new Error('No wallet found');
      if (!selectedFile) throw new Error('Please select a file to upload.');
      const fileHash = await uploadFileToPinata(selectedFile);
      const metadata = {
        title,
        description,
        file: {
          name: selectedFile.name,
          ipfsHash: fileHash,
        },
      };
      const metadataHash = await uploadJsonToPinata(metadata);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3ABI, signer);
      const expiryTimestamp = expiry ? Math.floor(new Date(expiry).getTime() / 1000) : 0;
      const validSigners = signers.filter(isValidAddress);
      const tx = await contract.createDocument(metadataHash, validSigners, expiryTimestamp);
      await tx.wait();
      dispatch({
        type: 'success',
        message: 'Document uploaded!',
        title: 'Success',
        position: 'topR',
      });
    } catch (err) {
      dispatch({
        type: 'error',
        message: err.message || 'Upload failed.',
        title: 'Error',
        position: 'topR',
      });
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError('');
    setSuccess('');
  };

  const handleSignerChange = (idx, value) => {
    const updated = [...signers];
    updated[idx] = value;
    setSigners(updated);
  };

  const addSigner = () => setSigners([...signers, '']);
  const removeSigner = (idx) => setSigners(signers.filter((_, i) => i !== idx));

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Signers (wallet addresses) *</label>
            <div className="space-y-2">
              {signers.map((signer, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={signer}
                    onChange={e => handleSignerChange(idx, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs"
                    placeholder="0x..."
                  />
                  {signers.length > 1 && (
                    <button type="button" onClick={() => removeSigner(idx)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                  )}
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Upload Document
          </button>
      </form>
    </div>
  </div>
  );
}

export default DocumentUpload;
