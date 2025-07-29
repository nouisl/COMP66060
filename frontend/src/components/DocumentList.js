import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMoralis } from 'react-moralis';
import { documentService } from '../utils/documentService';

function truncateMiddle(str, frontLen = 8, backLen = 6) {
  if (!str || str.length <= frontLen + backLen + 3) return str;
  return str.slice(0, frontLen) + '...' + str.slice(-backLen);
}

function DocumentList() {
  const { account } = useMoralis();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchMetadata(ipfsHash) {
    const urls = [
      `https://ipfs.io/ipfs/${ipfsHash}/metadata.json`
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) return await res.json();
      } catch (e) {}
    }
    return null;
  }

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      setError('');
      try {
        if (!window.ethereum) throw new Error('No wallet found');
        if (!account) {
          setLoading(false);
          return;
        }
        const docs = await documentService.getDocumentsForUser(account);
        const docsWithMetadata = [];
        for (const doc of docs) {
          let metadata = null;
          try {
            metadata = await fetchMetadata(doc.ipfsHash);
          } catch (e) {}
          docsWithMetadata.push({ ...doc, _metadata: metadata });
        }
        setDocuments(docsWithMetadata);
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
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Documents</h2>
      {documents.length === 0 ? (
        <div>No documents found for your account.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">ID</th>
                <th className="py-2 px-4 border-b">Title / File Name</th>
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
                  <td className="py-2 px-4 border-b max-w-[160px] truncate" title={doc._metadata && doc._metadata.title ? doc._metadata.title : doc._metadata && doc._metadata.file && doc._metadata.file.name ? doc._metadata.file.name : ''}>
                    {doc._metadata && doc._metadata.title
                      ? truncateMiddle(doc._metadata.title, 16, 8)
                      : doc._metadata && doc._metadata.file && doc._metadata.file.name
                        ? truncateMiddle(doc._metadata.file.name, 16, 8)
                        : <span className="text-gray-400 italic">N/A</span>
                    }
                  </td>
                  <td className="py-2 px-4 border-b max-w-[220px] truncate" title={doc.ipfsHash || ''}>
                    {doc.ipfsHash ? truncateMiddle(doc.ipfsHash, 12, 12) : <span className="text-gray-400 italic">N/A</span>}
                  </td>
                  <td className="py-2 px-4 border-b max-w-[180px] truncate" title={doc.creator || ''}>
                    {doc.creator ? truncateMiddle(doc.creator, 10, 8) : <span className="text-gray-400 italic">N/A</span>}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {doc.isRevoked ? (
                      <span className="inline-block bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold" title="This document is revoked and cannot be changed.">Revoked</span>
                    ) : doc._metadata && doc._metadata.previousVersion ? (
                      <span className="inline-block bg-yellow-400 text-white px-2 py-0.5 rounded-full text-xs font-bold" title="This document is an amended version.">Amended</span>
                    ) : doc.fullySigned ? (
                      <span className="inline-block bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">Signed</span>
                    ) : (
                      <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">Pending</span>
                    )}
                    {doc._metadata && doc._metadata.previousVersion && (
                      <span className="ml-2 text-xs text-blue-700 underline cursor-pointer" title="View previous version">
                        <a href={`/documents/${doc._metadata.previousVersion}`}>Previous</a>
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <Link to={`/documents/${doc.docId}`} className="text-blue-600 underline">View / Sign</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DocumentList;
