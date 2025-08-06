// imports
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMoralis } from 'react-moralis';
import { documentService } from '../utils/documentService';
import { ethers } from 'ethers';

// shorten long strings for display
function truncateMiddle(str, frontLen = 8, backLen = 6) {
  if (!str || str.length <= frontLen + backLen + 3) return str;
  return str.slice(0, frontLen) + '...' + str.slice(-backLen);
}

// DocumentList component
function DocumentList() {
  const { account } = useMoralis();
  // define state for documents and loading
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // get metadata from IPFS
  async function fetchMetadata(ipfsHash) {
    const urls = [
      `https://ipfs.io/ipfs/${ipfsHash}/metadata.json`
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) return await res.json();
      } catch (e) {
        // skip failed metadata fetch - continue with next url
      }
    }
    return null;
  }

  // get documents from the blockchain
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
          } catch (e) {
            // skip failed metadata fetch - continue with next document
          }
          
          // fetch deadline information for each document
          let deadlineInfo = null;
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(process.env.REACT_APP_CONTRACT_ADDRESS, require('../contracts/Docu3.json').abi, provider);
            const [expiry, isExpired, timeUntilExpiry, hasExpiry] = await contract.getDocumentExpiryInfo(doc.docId);
            deadlineInfo = {
              expiry: Number(expiry),
              isExpired,
              timeUntilExpiry: Number(timeUntilExpiry),
              hasExpiry
            };
          } catch (e) {
            // skip deadline fetch errors
          }
          
          docsWithMetadata.push({ ...doc, _metadata: metadata, _deadlineInfo: deadlineInfo });
        }
        setDocuments(docsWithMetadata);
      } catch (err) {
        // handle specific contract call errors
        if (err.code === 'CALL_EXCEPTION') {
          setError('Contract interaction failed. Please check your wallet connection and try again.');
        } else if (err.message && err.message.includes('No wallet found')) {
          setError('Please connect your wallet to view documents.');
        } else {
          setError(err.message || 'Failed to fetch documents. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
    if (account) fetchDocuments();
  }, [account]);

  // show loading when getting data
  if (loading) return <div className="text-center py-8">Loading documents...</div>;
  // handle error message
  if (error) return <div className="text-center text-red-600 py-8">{error}</div>;

  // return document list
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
                    {/* show status based on document state */}
                    {doc.isRevoked ? (
                      <span className="inline-block bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold" title="This document is revoked and cannot be changed.">Revoked</span>
                    ) : doc._metadata && doc._metadata.previousVersion ? (
                      <span className="inline-block bg-yellow-400 text-white px-2 py-0.5 rounded-full text-xs font-bold" title="This document is an amended version.">Amended</span>
                    ) : doc.fullySigned ? (
                      <span className="inline-block bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                        {doc.signers && doc.signers.length === 1 && doc.creator === doc.signers[0] ? 'Self-Signed' : 'Signed'}
                      </span>
                    ) : (
                      <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">
                        {doc.signers && doc.signers.length === 1 && doc.creator === doc.signers[0] ? 'Self-Sign' : 'Incomplete'}
                      </span>
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

// export the DocumentList component
export default DocumentList;
