import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';
import { uploadFolderToPinata } from '../utils/pinata';
import CryptoJS from 'crypto-js';
import { useNotification } from '@web3uikit/core';
import { 
  generateDocumentHash, 
  signDocumentHash, 
  verifySignature, 
  formatSignature,
  createVerificationMessage 
} from '../utils/crypto';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function DocumentDetail() {
  const { docId } = useParams();
  const dispatch = useNotification();
  const [doc, setDoc] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasSigned, setHasSigned] = useState(false);
  const [isCurrentSigner, setIsCurrentSigner] = useState(false);
  const [signing, setSigning] = useState(false);
  const [amending, setAmending] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [amendTitle, setAmendTitle] = useState('');
  const [amendDescription, setAmendDescription] = useState('');
  const [amendFile, setAmendFile] = useState(null);
  const [showAmendForm, setShowAmendForm] = useState(false);
  const [decryptedFileUrl, setDecryptedFileUrl] = useState(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState('');
  const [documentHash, setDocumentHash] = useState('');
  const [signatures, setSignatures] = useState({});
  const [signatureVerification, setSignatureVerification] = useState({});
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureLoading, setSignatureLoading] = useState(false);

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
  }, [docId, dispatch]);

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
      
      let hashToSign = documentHash;
      if (!hashToSign && metadata?.documentHash) {
        hashToSign = metadata.documentHash;
      } else if (!hashToSign) {
        hashToSign = doc.ipfsHash;
      }
      
      const signature = await signDocumentHash(hashToSign, signer);
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
      const tx = await contract.signDocument(docId, signature);
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
      const files = [{ path: 'metadata.json', content: metadataBlob }];
      const newIpfsHash = await uploadFolderToPinata(files);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
      const tx = await contract.amendDocument(docId, newIpfsHash, 0);
      await tx.wait();
      setSuccess('Document amended!');
      dispatch({
        type: 'success',
        message: 'Document amended successfully!',
        title: 'Success',
        position: 'topR',
      });
      setShowAmendForm(false);
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

  const handleDecrypt = async () => {
    setDecrypting(true);
    setDecryptionError('');
    try {
      if (!metadata?.encryptedKeys?.[account]) {
        throw new Error('No encrypted key found for your account');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const privateKey = await signer.provider.send('eth_getEncryptionPublicKey', [account]);
      
      const encryptedKey = metadata.encryptedKeys[account];
      const decryptedKey = await window.ethereum.request({
        method: 'eth_decrypt',
        params: [encryptedKey, account]
      });
      
      const fileRes = await fetch(`https://ipfs.io/ipfs/${doc.ipfsHash}/docdir/${metadata.file.path}`);
      if (!fileRes.ok) throw new Error('Failed to fetch encrypted file');
      const encryptedContent = await fileRes.text();
      
      const decrypted = CryptoJS.AES.decrypt(encryptedContent, decryptedKey);
      const decryptedArray = decrypted.toString(CryptoJS.enc.Utf8);
      
      const blob = new Blob([decryptedArray], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      setDecryptedFileUrl(url);
    } catch (err) {
      const errorMessage = err.message || 'Failed to decrypt.';
      setDecryptionError(errorMessage);
      dispatch({
        type: 'error',
        message: errorMessage,
        title: 'Decryption Error',
        position: 'topR',
      });
    } finally {
      setDecrypting(false);
    }
  };

  const copyVerificationDetails = async (signerAddress, signature) => {
    try {
      const message = createVerificationMessage(documentHash, signerAddress, signature);
      await navigator.clipboard.writeText(message);
      setSuccess('Verification details copied to clipboard!');
      dispatch({
        type: 'success',
        message: 'Verification details copied to clipboard!',
        title: 'Success',
        position: 'topR',
      });
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  if (loading) return <div className="text-center py-8">Loading document...</div>;
  if (error) return <div className="text-center text-red-600 py-8">{error}</div>;
  if (!doc) return <div className="text-center py-8">Document not found</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Document Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Document Information</h3>
          <div className="space-y-2">
            <p><strong>Document ID:</strong> {docId}</p>
            <p><strong>Title:</strong> {metadata?.title || 'N/A'}</p>
            <p><strong>Description:</strong> {metadata?.description || 'N/A'}</p>
            <p><strong>Creator:</strong> {doc.creator}</p>
            <p><strong>IPFS Hash:</strong> {doc.ipfsHash}</p>
            <p><strong>Status:</strong> {doc.isRevoked ? 'Revoked' : doc.fullySigned ? 'Fully Signed' : 'Pending'}</p>
            <p><strong>Signatures:</strong> {doc.signatureCount}/{doc.signers?.length || 0}</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4">Signers</h3>
          <div className="space-y-2">
            {doc.signers?.map((signer, index) => (
              <div key={signer} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>{signer}</span>
                <div className="flex items-center space-x-2">
                  {signatures[signer] ? (
                    <span className="text-green-600">✓ Signed</span>
                  ) : (
                    <span className="text-yellow-600">Pending</span>
                  )}
                  {signatures[signer] && signatureVerification[signer] !== undefined && (
                    <span className={signatureVerification[signer] ? 'text-green-600' : 'text-red-600'}>
                      {signatureVerification[signer] ? '✓ Valid' : '✗ Invalid'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {metadata?.file?.encrypted && !decryptedFileUrl && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Encrypted Document</h3>
          <p className="mb-4">This document is encrypted. You need to decrypt it before signing.</p>
          <button
            onClick={handleDecrypt}
            disabled={decrypting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {decrypting ? 'Decrypting...' : 'Decrypt Document'}
          </button>
          {decryptionError && <p className="text-red-600 mt-2">{decryptionError}</p>}
        </div>
      )}

      {decryptedFileUrl && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Decrypted Document</h3>
          <a
            href={decryptedFileUrl}
            download={metadata?.file?.name || 'document'}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Download Document
          </a>
        </div>
      )}

      {success && <div className="mt-4 p-4 bg-green-50 text-green-700 rounded">{success}</div>}

      <div className="mt-6 flex space-x-4">
        {!hasSigned && isCurrentSigner && !doc.isRevoked && (
          <button
            onClick={handleSign}
            disabled={signing || (metadata?.file?.encrypted && !decryptedFileUrl)}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {signing ? 'Signing...' : 'Sign Document'}
          </button>
        )}
        
        {doc.creator?.toLowerCase() === account?.toLowerCase() && !doc.isRevoked && (
          <>
            <button
              onClick={() => setShowAmendForm(!showAmendForm)}
              className="px-6 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Amend Document
            </button>
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              {revoking ? 'Revoking...' : 'Revoke Document'}
            </button>
          </>
        )}
      </div>

      {showAmendForm && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Amend Document</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="New title"
              value={amendTitle}
              onChange={(e) => setAmendTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <textarea
              placeholder="New description"
              value={amendDescription}
              onChange={(e) => setAmendDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              rows={3}
            />
            <input
              type="file"
              onChange={(e) => setAmendFile(e.target.files[0])}
              className="w-full"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleAmend}
                disabled={amending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {amending ? 'Amending...' : 'Submit Amendment'}
              </button>
              <button
                onClick={() => setShowAmendForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {Object.keys(signatures).length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Signatures</h3>
          <div className="space-y-2">
            {Object.entries(signatures).map(([signer, signature]) => (
              <div key={signer} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p><strong>Signer:</strong> {signer}</p>
                    <p><strong>Signature:</strong> {formatSignature(signature)}</p>
                    {signatureVerification[signer] !== undefined && (
                      <p><strong>Verification:</strong> 
                        <span className={signatureVerification[signer] ? 'text-green-600' : 'text-red-600'}>
                          {signatureVerification[signer] ? ' Valid' : ' Invalid'}
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => copyVerificationDetails(signer, signature)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Copy Verification
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentDetail; 