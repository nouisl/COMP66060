import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import Docu3ABI from '../contracts/Docu3.json';
import { uploadFileToPinata, uploadJsonToPinata } from '../utils/pinata';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function DocumentDetail() {
  const { docId } = useParams();
  const [doc, setDoc] = useState(null);
  const [ipfsUrl, setIpfsUrl] = useState('');
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
        setIpfsUrl(`https://ipfs.io/ipfs/${docData.ipfsHash}`);
        // Check if user is current signer
        const currentSigner = await contract.getCurrentSigner(docId);
        setIsCurrentSigner(currentSigner.toLowerCase() === userAddress.toLowerCase());
        // Check if user has already signed
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
      let newFileHash = doc.ipfsHash;
      if (amendFile) {
        newFileHash = await uploadFileToPinata(amendFile);
      }
  
      const newMetadata = {
        title: amendTitle || doc.title,
        description: amendDescription || doc.description,
        file: { name: amendFile ? amendFile.name : doc.file.name, ipfsHash: newFileHash },
      };
      const newMetadataHash = await uploadJsonToPinata(newMetadata);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3ABI, signer);
      const tx = await contract.amendDocument(docId, newMetadataHash, doc.expiry);
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
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Document Details</h2>
      <div className="mb-4">
        <strong>IPFS Hash:</strong> {doc.ipfsHash}
      </div>
      <div className="mb-4">
        <strong>Creator:</strong> {doc.creator}
      </div>
      <div className="mb-4">
        <strong>Signers:</strong> {doc.signers && doc.signers.join(', ')}
      </div>
      <div className="mb-4">
        <strong>Created At:</strong> {doc.createdAt && new Date(Number(doc.createdAt) * 1000).toLocaleString()}
      </div>
      <div className="mb-4">
        <strong>Fully Signed:</strong> {doc.fullySigned ? 'Yes' : 'No'}
      </div>
      <div className="mb-4">
        <strong>Revoked:</strong> {doc.isRevoked ? 'Yes' : 'No'}
      </div>
      <div className="mb-6">
        <strong>Document:</strong>
        <div className="mt-4">
          {/* embed PDF */}
          {ipfsUrl.endsWith('.pdf') ? (
            <iframe
              src={ipfsUrl}
              width="100%"
              height="600px"
              title="Document PDF"
              className="border rounded"
            />
          ) : (
            <img
              src={ipfsUrl}
              alt="Document"
              className="max-w-full max-h-[600px] rounded border"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
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
        <>
          <button onClick={handleRevoke} disabled={revoking}>Revoke</button>
          <button onClick={() => setShowAmendForm(true)}>Amend</button>
          {showAmendForm && (
            <form onSubmit={handleAmend}>
              {/* Inputs for new title, description, file */}
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default DocumentDetail; 