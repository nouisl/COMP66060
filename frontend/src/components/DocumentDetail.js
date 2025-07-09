import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import Docu3ABI from '../contracts/Docu3.json';
import { uploadFolderToPinata } from '../utils/pinata';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function DocumentDetail() {
  const { docId } = useParams();
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
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3ABI, provider);
        const docData = await contract.getDocument(docId);
        setDoc(docData);
        try {
          const metaRes = await fetch(`https://ipfs.io/ipfs/${docData.ipfsHash}/metadata.json`);
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
      } catch (err) {
        setError(err.message || 'Failed to fetch document.');
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3ABI, signer);
      const tx = await contract.signDocument(docId);
      await tx.wait();
      setSuccess('Document signed successfully!');
      setHasSigned(true);
    } catch (err) {
      setError(err.message || 'Failed to sign document.');
    } finally {
      setSigning(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3ABI, signer);
      const tx = await contract.revokeDocument(docId, "Revoked by creator");
      await tx.wait();
      setSuccess('Document revoked!');
    } catch (err) {
      setError(err.message || 'Failed to revoke.');
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
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3ABI, signer);
      const tx = await contract.amendDocument(docId, newDirHash, doc.expiry);
      await tx.wait();
      setSuccess('Document amended!');
    } catch (err) {
      setError(err.message || 'Failed to amend.');
    } finally {
      setAmending(false);
    }
  };

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
          {metadata?.file?.path && metadata.file.path.endsWith('.pdf') ? (
            <iframe
              src={`https://ipfs.io/ipfs/${doc.ipfsHash}/${metadata.file.path}`}
              width="100%"
              height="600px"
              title="Document PDF"
              className="border rounded"
            />
          ) : metadata?.file?.path ? (
            <img
              src={`https://ipfs.io/ipfs/${doc.ipfsHash}/${metadata.file.path}`}
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