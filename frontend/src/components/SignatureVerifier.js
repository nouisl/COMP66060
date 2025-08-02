// imports
import React, { useState } from 'react';
import { useNotification } from '@web3uikit/core';
import { verifySignature } from '../utils/crypto';

// SignatureVerifier component
function SignatureVerifier() {
  const dispatch = useNotification();
  // define state for form data
  const [documentHash, setDocumentHash] = useState('');
  const [signerAddress, setSignerAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // verify signature with crypto function
  const handleVerify = async () => {
    if (!documentHash || !signerAddress || !signature) {
      const errorMessage = 'All fields are required';
      setVerificationResult({ valid: false, error: errorMessage });
      dispatch({
        type: 'error',
        message: errorMessage,
        title: 'Validation Error',
        position: 'topR',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = verifySignature(documentHash, signature, signerAddress);
      setVerificationResult({ valid: isValid, error: null });
      
      if (isValid) {
        dispatch({
          type: 'success',
          message: 'Signature verification successful!',
          title: 'Success',
          position: 'topR',
        });
      } else {
        dispatch({
          type: 'error',
          message: 'Signature verification failed!',
          title: 'Verification Failed',
          position: 'topR',
        });
      }
    } catch (error) {
      const errorMessage = error.message || 'Verification failed';
      setVerificationResult({ valid: false, error: errorMessage });
      dispatch({
        type: 'error',
        message: errorMessage,
        title: 'Verification Error',
        position: 'topR',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // clear form data
  const handleClear = () => {
    setDocumentHash('');
    setSignerAddress('');
    setSignature('');
    setVerificationResult(null);
  };

  // return verification form
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Signature Verification Tool</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Hash *
          </label>
          <input
            type="text"
            value={documentHash}
            onChange={(e) => setDocumentHash(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Enter the document hash (IPFS hash or file hash)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Signer Address *
          </label>
          <input
            type="text"
            value={signerAddress}
            onChange={(e) => setSignerAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="0x..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Signature *
          </label>
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Enter the cryptographic signature"
            rows={3}
          />
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleVerify}
            disabled={isVerifying || !documentHash || !signerAddress || !signature}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            {isVerifying ? 'Verifying...' : 'Verify Signature'}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>

        {verificationResult && (
          <div className={`mt-4 p-4 rounded-lg border ${
            verificationResult.valid 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <div className={`text-lg mr-2 ${verificationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                {verificationResult.valid ? '✓' : '✗'}
              </div>
              <div>
                <h4 className={`font-semibold ${verificationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                  {verificationResult.valid ? 'Signature Valid' : 'Signature Invalid'}
                </h4>
                {verificationResult.error && (
                  <p className="text-red-700 text-sm mt-1">{verificationResult.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border">
          <h4 className="font-semibold text-blue-900 mb-2">How to Use:</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>1. Enter the document hash (from IPFS or file content)</p>
            <p>2. Enter the signer's Ethereum address</p>
            <p>3. Enter the cryptographic signature</p>
            <p>4. Click "Verify Signature" to check validity</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-semibold text-gray-900 mb-2">Technical Details:</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Uses Ethereum's ecrecover function</p>
            <p>• Verifies ECDSA signatures with secp256k1 curve</p>
            <p>• Supports standard Ethereum message signing format</p>
            <p>• Works with MetaMask and other Ethereum wallets</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// export the SignatureVerifier component
export default SignatureVerifier; 