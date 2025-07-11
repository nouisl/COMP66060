import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';
import { uploadFolderToPinata } from '../utils/pinata';
<<<<<<< Updated upstream
import CryptoJS from 'crypto-js';
=======
<<<<<<< Updated upstream
=======
import CryptoJS from 'crypto-js';
import { useNotification } from '@web3uikit/core';
import { 
  generateDocumentHash, 
  signDocumentHash, 
  verifySignature, 
  formatSignature,
  createVerificationMessage 
} from '../utils/crypto';
>>>>>>> Stashed changes
>>>>>>> Stashed changes
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function DocumentDetail() {
  const { docId } = useParams();
  const dispatch = useNotification();
  const [doc, setDoc] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [success, setSuccess] = useState('');
  const [account, setAccount] = useState('');
  const [isCurrentSigner, setIsCurrentSigner] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [amending, setAmending] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [amendTitle, setAmendTitle] = useState('');
  const [amendDescription, setAmendDescription] = useState('');
  const [amendFile, setAmendFile] = useState(null);
  const [showAmendForm, setShowAmendForm] = useState(false);
<<<<<<< Updated upstream
  const [decryptedFileUrl, setDecryptedFileUrl] = useState(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState('');
=======
<<<<<<< Updated upstream
=======
  const [decryptedFileUrl, setDecryptedFileUrl] = useState(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState('');
  const [documentHash, setDocumentHash] = useState('');
  const [signatures, setSignatures] = useState({});
  const [signatureVerification, setSignatureVerification] = useState({});
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureLoading, setSignatureLoading] = useState(false);
>>>>>>> Stashed changes
>>>>>>> Stashed changes

  useEffect(() => {
    async function fetchDoc() {
      setLoading(true);
      setError('');
      try {
        if (!window.ethereum) throw new Error('No wallet found');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        setAccount(userAddress);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
        const docData = await contract.getDocument(docId);
        setDoc(docData);
        let metaRes;
        try {
          metaRes = await fetch(`https://ipfs.io/ipfs/${docData.ipfsHash}/docdir/metadata.json`);
          if (!metaRes.ok) {
            metaRes = await fetch(`https://cloudflare-ipfs.com/ipfs/${docData.ipfsHash}/docdir/metadata.json`);
          }
          if (metaRes.ok) {
            const meta = await metaRes.json();
            setMetadata(meta);
          } else {
            setMetadata(null);
          }
        } catch (e) {
          setMetadata(null);
        }
        const currentSigner = await contract.getCurrentSigner(docId);
        setIsCurrentSigner(currentSigner.toLowerCase() === userAddress.toLowerCase());
        const signed = await contract.hasSigned(docId, userAddress);
        setHasSigned(signed);
        
        const signaturesData = {};
        const verificationData = {};
        for (const signer of docData.signers) {
          const signature = await contract.getSignature(docId, signer);
          signaturesData[signer] = signature;
          
          if (signature && metadata?.documentHash) {
            const isValid = verifySignature(metadata.documentHash, signature, signer);
            verificationData[signer] = isValid;
          }
        }
        setSignatures(signaturesData);
        setSignatureVerification(verificationData);
        
        if (metadata?.documentHash) {
          setDocumentHash(metadata.documentHash);
        }
      } catch (err) {
        const errorMessage = err.message || 'Failed to fetch document.';
        setError(errorMessage);
        dispatch({
          type: 'error',
          message: errorMessage,
          title: 'Error',
          position: 'topR',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchDoc();
  }, [docId]);

  const handleSign = async () => {
    setSigning(true);
    setError('');
    setSuccess('');
    try {
      if (!window.ethereum) throw new Error('No wallet found');
      
      if (!decryptedFileUrl && metadata?.file?.encrypted) {
        throw new Error('Please decrypt and view the document before signing.');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
<<<<<<< Updated upstream
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
=======
<<<<<<< Updated upstream
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3ABI, signer);
>>>>>>> Stashed changes
      const tx = await contract.signDocument(docId);
=======
      
      let hashToSign = documentHash;
      if (!hashToSign && metadata?.documentHash) {
        hashToSign = metadata.documentHash;
      } else if (!hashToSign) {
        hashToSign = doc.ipfsHash;
      }
      
      const signature = await signDocumentHash(hashToSign, signer);
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
      const tx = await contract.signDocument(docId, signature);
>>>>>>> Stashed changes
      await tx.wait();
      
      setSuccess('Document cryptographically signed successfully!');
      dispatch({
        type: 'success',
        message: 'Document cryptographically signed successfully!',
        title: 'Success',
        position: 'topR',
      });
      setHasSigned(true);
      
      setSignatures(prev => ({
        ...prev,
        [account]: signature
      }));
      
      const isValid = verifySignature(hashToSign, signature, account);
      setSignatureVerification(prev => ({
        ...prev,
        [account]: isValid
      }));
      
    } catch (err) {
      const errorMessage = err.message || 'Failed to sign document.';
      setError(errorMessage);
      dispatch({
        type: 'error',
        message: errorMessage,
        title: 'Signing Error',
        position: 'topR',
      });
    } finally {
      setSigning(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
      const tx = await contract.revokeDocument(docId, "Revoked by creator");
      await tx.wait();
      setSuccess('Document revoked!');
      dispatch({
        type: 'success',
        message: 'Document revoked successfully!',
        title: 'Success',
        position: 'topR',
      });
    } catch (err) {
      const errorMessage = err.message || 'Failed to revoke.';
      setError(errorMessage);
      dispatch({
        type: 'error',
        message: errorMessage,
        title: 'Revoke Error',
        position: 'topR',
      });
    } finally {
      setRevoking(false);
    }
  };

  const handleAmend = async () => {
    setAmending(true);
    try {
      const newMetadata = {
        title: amendTitle || (metadata && metadata.title) || 'Document',
        description: amendDescription || (metadata && metadata.description) || '',
        file: {
          name: amendFile ? amendFile.name : (metadata && metadata.file && metadata.file.name) || 'document',
          path: amendFile ? 'document.' + amendFile.name.split('.').pop() : (metadata && metadata.file && metadata.file.path) || 'document.pdf',
        },
      };
      const metadataBlob = new Blob([JSON.stringify(newMetadata)], { type: 'application/json' });
      
      const files = [
        { path: 'metadata.json', content: metadataBlob },
      ];
      
      if (amendFile) {
        const fileExt = amendFile.name.split('.').pop();
        const filePath = 'document.' + fileExt;
        files.push({ path: filePath, content: amendFile });
      }
      
      const newDirHash = await uploadFolderToPinata(files);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
      const tx = await contract.amendDocument(docId, newDirHash, doc.expiry);
      await tx.wait();
      setSuccess('Document amended!');
      dispatch({
        type: 'success',
        message: 'Document amended successfully!',
        title: 'Success',
        position: 'topR',
      });
    } catch (err) {
      const errorMessage = err.message || 'Failed to amend.';
      setError(errorMessage);
      dispatch({
        type: 'error',
        message: errorMessage,
        title: 'Amend Error',
        position: 'topR',
      });
    } finally {
      setAmending(false);
    }
  };

<<<<<<< Updated upstream
=======
<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes
  // Decryption is not handled in-browser for security. Only registered signers can view if not encrypted.

  const handleDecryptAndView = async () => {
    setDecrypting(true);
    setDecryptionError('');
    try {
      if (!window.ethereum) throw new Error('No wallet found');
      if (!metadata?.file?.encrypted) throw new Error('File is not encrypted.');
      const encryptedKey = metadata.encryptedKeys[account.toLowerCase()];
      if (!encryptedKey) throw new Error('No encrypted key found for your address.');
      // Use MetaMask eth_decrypt to decrypt the symmetric key
      const decryptedSymmetricKey = await window.ethereum.request({
        method: 'eth_decrypt',
        params: [encryptedKey, account],
      });
      // Fetch the encrypted file from IPFS
      const fileRes = await fetch(`https://ipfs.io/ipfs/${doc.ipfsHash}/docdir/${metadata.file.path}`);
      const encryptedFileText = await fileRes.text();
      // Decrypt the file
      const decrypted = CryptoJS.AES.decrypt(encryptedFileText, decryptedSymmetricKey);
      const decryptedWordArray = decrypted;
      const decryptedBytes = new Uint8Array(decryptedWordArray.sigBytes);
      for (let i = 0; i < decryptedWordArray.sigBytes; i++) {
        decryptedBytes[i] = (decryptedWordArray.words[Math.floor(i / 4)] >> (24 - 8 * (i % 4))) & 0xff;
      }
      const blob = new Blob([decryptedBytes], { type: metadata.file.path.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      setDecryptedFileUrl(url);
    } catch (err) {
<<<<<<< Updated upstream
      setDecryptionError(err.message || 'Failed to decrypt.');
=======
      const errorMessage = err.message || 'Failed to decrypt.';
      setDecryptionError(errorMessage);
      dispatch({
        type: 'error',
        message: errorMessage,
        title: 'Decryption Error',
        position: 'topR',
      });
>>>>>>> Stashed changes
    } finally {
      setDecrypting(false);
    }
  };

<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes
>>>>>>> Stashed changes
  if (loading) return <div className="text-center py-8">Loading document...</div>;
  if (error) return <div className="text-center text-red-600 py-8">{error}</div>;
  if (!doc) return null;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 mt-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">{metadata?.title || 'Document Details'}</h2>
      <div className="mb-4">
        <strong>Description:</strong> {metadata?.description || <span className="text-gray-400 italic">N/A</span>}
      </div>
      <div className="mb-4">
        <strong>IPFS Directory Hash:</strong> {doc?.ipfsHash}
      </div>
      <div className="mb-4">
        <strong>File Path:</strong> {metadata?.file?.path || <span className="text-gray-400 italic">N/A</span>}
      </div>
      <div className="mb-4">
        <strong>Creator:</strong> {doc?.creator}
      </div>
      <div className="mb-4">
        <strong>Signers:</strong> {doc?.signers && doc.signers.join(', ')}
      </div>
      <div className="mb-4">
        <strong>Created At:</strong> {doc?.createdAt && new Date(Number(doc.createdAt) * 1000).toLocaleString()}
      </div>
      <div className="mb-4">
        <strong>Fully Signed:</strong> {doc?.fullySigned ? 'Yes' : 'No'}
      </div>
      <div className="mb-4">
        <strong>Revoked:</strong> {doc?.isRevoked ? 'Yes' : 'No'}
      </div>
      <div className="mb-6">
        <strong>Document:</strong>
        <div className="mt-4">
          {metadata?.file?.encrypted ? (
            isCurrentSigner ? (
              <div>
                <button
                  onClick={handleDecryptAndView}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4"
                  disabled={decrypting}
                >
                  {decrypting ? 'Decrypting...' : 'Decrypt & View Document'}
                </button>
                {decryptionError && <div className="text-red-600 mb-2">{decryptionError}</div>}
                {decryptedFileUrl && metadata.file.path.endsWith('.pdf') && (
                  <iframe src={decryptedFileUrl} width="100%" height="600px" title="Decrypted Document" className="border rounded" />
                )}
                {decryptedFileUrl && !metadata.file.path.endsWith('.pdf') && (
                  <a href={decryptedFileUrl} download={metadata.file.name} className="text-blue-600 underline">Download Decrypted File</a>
                )}
              </div>
            ) : (
              <span className="text-gray-500 italic">This document is encrypted. Only registered signers can decrypt and view it using their wallet.</span>
            )
          ) : metadata?.file?.path && metadata.file.path.endsWith('.pdf') ? (
            <iframe
              src={`https://ipfs.io/ipfs/${doc.ipfsHash}/docdir/${metadata.file.path}`}
              width="100%"
              height="600px"
              title="Document PDF"
              className="border rounded"
            />
          ) : metadata?.file?.path ? (
            <img
              src={`https://ipfs.io/ipfs/${doc.ipfsHash}/docdir/${metadata.file.path}`}
              alt="Document"
              className="max-w-full max-h-[600px] rounded border"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span className="text-gray-400 italic">No document available</span>
          )}
        </div>
      </div>
      {isCurrentSigner && !hasSigned && !doc.isRevoked && !doc.fullySigned && (
        <button
          onClick={handleSign}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          disabled={signing}
        >
          {signing ? 'Signing...' : 'Sign Document'}
        </button>
      )}
      {hasSigned && <div className="text-green-600 mt-4">You have signed this document.</div>}
      {success && <div className="text-green-600 mt-4">{success}</div>}
      {error && <div className="text-red-600 mt-4">{error}</div>}
      
      {documentHash && (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Document Hash & Signatures</h3>
          <div className="mb-4">
            <strong>Document Hash:</strong>
            <div className="font-mono text-sm bg-white p-2 rounded border mt-1 break-all">
              {documentHash}
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold">Signatures:</h4>
            {doc?.signers && doc.signers.map((signer, index) => (
              <div key={signer} className="bg-white p-3 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <strong>Signer {index + 1}:</strong> {signer}
                    {signatures[signer] ? (
                      <div className="mt-2">
                        <div className="text-sm text-gray-600">
                          <strong>Signature:</strong>
                          <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                            {formatSignature(signatures[signer])}
                          </div>
                        </div>
                        {signatureVerification[signer] !== undefined && (
                          <div className={`text-sm mt-1 ${signatureVerification[signer] ? 'text-green-600' : 'text-red-600'}`}>
                            <strong>Verification:</strong> {signatureVerification[signer] ? '✓ Valid' : '✗ Invalid'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm mt-1">Not signed yet</div>
                    )}
                  </div>
                  {signatures[signer] && (
                    <button
                      onClick={() => {
                        const message = createVerificationMessage(documentHash, signer, signatures[signer]);
                        navigator.clipboard.writeText(message);
                        setSuccess('Verification details copied to clipboard!');
        dispatch({
          type: 'success',
          message: 'Verification details copied to clipboard!',
          title: 'Success',
          position: 'topR',
        });
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Copy Verification
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border">
            <h5 className="font-semibold text-blue-900 mb-2">How to Verify Signatures:</h5>
            <div className="text-sm text-blue-800 space-y-1">
              <p>1. Use the document hash above</p>
              <p>2. Use the signer's address and signature</p>
              <p>3. Verify using Ethereum's ecrecover function</p>
              <p>4. Or use our verification tool below</p>
            </div>
          </div>
        </div>
      )}
      {account === doc.creator && !doc.isRevoked && (
        <div className="mt-6 space-x-4">
          <button 
            onClick={handleRevoke} 
            disabled={revoking}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {revoking ? 'Revoking...' : 'Revoke Document'}
          </button>
          <button 
            onClick={() => setShowAmendForm(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
          >
            Amend Document
          </button>
        </div>
      )}
      {showAmendForm && (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Amend Document</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleAmend(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Title</label>
              <input
                type="text"
                value={amendTitle}
                onChange={(e) => setAmendTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="New title (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Description</label>
              <textarea
                value={amendDescription}
                onChange={(e) => setAmendDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="New description (optional)"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New File (optional)</label>
              <input
                type="file"
                onChange={(e) => setAmendFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                accept=".pdf,.jpg,.jpeg,.png,.txt"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                disabled={amending}
              >
                {amending ? 'Amending...' : 'Amend Document'}
              </button>
              <button
                type="button"
                onClick={() => setShowAmendForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default DocumentDetail; 