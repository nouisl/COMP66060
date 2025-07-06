import React, { useState, useRef } from 'react';

function DocumentUpload() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isValidAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

 
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
  
    setSuccess('Form is valid! (Next: upload to IPFS and call contract)');
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Upload Document</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
  
       
      </form>
    </div>
  </div>
  );
}

export default DocumentUpload;
