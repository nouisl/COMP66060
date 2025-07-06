import React, { useState, useRef } from 'react';

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
 
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
  
    setSuccess('Form is valid! (Next: upload to IPFS and call contract)');
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
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
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
      </form>
    </div>
  </div>
  );
}

export default DocumentUpload;
