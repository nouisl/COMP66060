import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useMoralis } from 'react-moralis';
import Docu3ABI from '../contracts/Docu3.json';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function DocumentList() {
  const { account } = useMoralis();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      setError('');
      try {
        if (!window.ethereum) throw new Error('No wallet found');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3ABI, provider);
        const count = await contract.documentCount();
        const docs = [];
        for (let i = 1; i <= count; i++) {
          const doc = await contract.getDocument(i);
          const isSigner = doc.signers && doc.signers.map(addr => addr.toLowerCase()).includes(account?.toLowerCase());
          const isCreator = doc.creator && doc.creator.toLowerCase() === account?.toLowerCase();
          if (isSigner || isCreator) {
            docs.push({ ...doc, docId: i });
          }
        }
        setDocuments(docs);
      } catch (err) {
        setError(err.message || 'Failed to fetch documents.');
      } finally {
        setLoading(false);
      }
    }
    if (account) fetchDocuments();
  }, [account]);

  if (loading) return <div className="text-center py-8">Loading documents...</div>;
  if (error) return <div className="text-center text-red-600 py-8">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Documents</h2>
      {documents.length === 0 ? (
        <div>No documents found for your account.</div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">ID</th>
              <th className="py-2 px-4 border-b">IPFS Hash</th>
              <th className="py-2 px-4 border-b">Creator</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc.docId}>
                <td className="py-2 px-4 border-b">{doc.docId}</td>
                <td className="py-2 px-4 border-b">{doc.ipfsHash.slice(0, 8)}...{doc.ipfsHash.slice(-4)}</td>
                <td className="py-2 px-4 border-b">{doc.creator}</td>
                <td className="py-2 px-4 border-b">{doc.fullySigned ? 'Signed' : doc.isRevoked ? 'Revoked' : 'Pending'}</td>
                <td className="py-2 px-4 border-b">
                  <Link to={`/documents/${doc.docId}`} className="text-blue-600 underline">View / Sign</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DocumentList;
