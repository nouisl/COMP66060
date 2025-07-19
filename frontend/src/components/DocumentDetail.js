import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';
import { uploadFolderToPinata } from '../utils/pinata';
import { useNotification } from '@web3uikit/core';
import { 
  signDocumentHash, 
  verifySignature, 
  formatSignature,
  createVerificationMessage 
} from '../utils/crypto';
import { litProtocolService } from '../utils/litProtocol';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function truncateMiddle(str, frontLen = 8, backLen = 6) {
  if (!str || str.length <= frontLen + backLen + 3) return str;
  return str.slice(0, frontLen) + '...' + str.slice(-backLen);
}

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
  const [documentHash, setDocumentHash] = useState('');
  const [signatures, setSignatures] = useState({});
  const [signatureVerification, setSignatureVerification] = useState({});

  useEffect(() => {
    async function fetchDoc() {
      setLoading(true);
      setError('');
      const docIdNum = Number(docId);
      if (!docId || isNaN(docIdNum) || docIdNum < 1) {
        setError('Invalid document ID.');
        setLoading(false);
        return;
      }
      try {
        if (!window.ethereum) throw new Error('No wallet found');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        setAccount(userAddress);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
        
        const [
          ipfsHash,
          creator,
          signers,
          createdAt,
          signatureCount,
          fullySigned,
          isRevoked
        ] = await contract.getDocument(docIdNum);
        
        const docObj = {
          ipfsHash,
          creator,
          signers,
          createdAt,
          signatureCount,
          fullySigned,
          isRevoked
        };
        
        const isSigner = signers && signers.map(addr => addr.toLowerCase()).includes(userAddress.toLowerCase());
        const isCreator = creator && creator.toLowerCase() === userAddress.toLowerCase();
        
        if (!isSigner && !isCreator) {
          setError('You are not authorized to view this document. Only signers and the document creator can access this page.');
          setLoading(false);
          return;
        }
        
        setDoc(docObj);
        
        let metaRes;
        let meta = null;
        try {
          const urls = [
            `https://ipfs.io/ipfs/${docObj.ipfsHash}/docdir/metadata.json`,
            `https://ipfs.io/ipfs/${docObj.ipfsHash}/metadata.json`,
            `https://cloudflare-ipfs.com/ipfs/${docObj.ipfsHash}/docdir/metadata.json`,
            `https://cloudflare-ipfs.com/ipfs/${docObj.ipfsHash}/metadata.json`,
            `https://jade-voluntary-macaw-912.mypinata.cloud/ipfs/${docObj.ipfsHash}/docdir/metadata.json`,
            `https://jade-voluntary-macaw-912.mypinata.cloud/ipfs/${docObj.ipfsHash}/metadata.json`
          ];
          for (const url of urls) {
            try {
              metaRes = await fetch(url);
              if (metaRes.ok) {
                meta = await metaRes.json();
                break;
              }
            } catch (e) {}
          }
          setMetadata(meta);
        } catch (e) {
          setMetadata(null);
        }
        
        const currentSigner = await contract.getCurrentSigner(docIdNum);
        setIsCurrentSigner(currentSigner.toLowerCase() === userAddress.toLowerCase());
        const signed = await contract.hasSigned(docIdNum, userAddress);
        setHasSigned(signed);
        
        const signaturesData = {};
        const verificationData = {};
        if (Array.isArray(docObj.signers) && docObj.signers.length > 0 && meta && meta.documentHash) {
          for (const signer of docObj.signers) {
            try {
              const signature = await contract.getSignature(docIdNum, signer);
              signaturesData[signer] = signature;
              if (signature) {
                const isValid = verifySignature(meta.documentHash, signature, signer);
                verificationData[signer] = isValid;
              }
            } catch (e) {
              signaturesData[signer] = null;
              verificationData[signer] = false;
            }
          }
        }
        setSignatures(signaturesData);
        setSignatureVerification(verificationData);
        if (meta && meta.documentHash) {
          setDocumentHash(meta.documentHash);
        }
        if (!meta) {
          setError('Metadata not found for this document.');
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

  useEffect(() => {
    // After fetching metadata, fetch and decrypt the file if encrypted
    async function fetchAndDecrypt() {
      if (!metadata || !metadata.file || !metadata.file.path) return;
      let encrypted = false;
      if (metadata.file.encrypted) encrypted = true;
      let fileBlob = null;
      let fileUrl = null;
      let fileFetched = false;
      const urls = [
        `https://brown-sparkling-sheep-903.mypinata.cloud/ipfs/${doc.ipfsHash}/docdir/${metadata.file.path}`,
        `https://ipfs.io/ipfs/${doc.ipfsHash}/docdir/${metadata.file.path}`
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            fileBlob = await res.blob();
            fileFetched = true;
            break;
          }
        } catch (e) {}
      }
      if (!fileFetched) return;
      if (!encrypted) {
        fileUrl = URL.createObjectURL(fileBlob);
        setDecryptedFileUrl(fileUrl);
        return;
      }
      
      // LIT PROTOCOL DECRYPTION
      if (!metadata.litProtocol) {
        setError('Document encrypted with old method. Please re-upload.');
        return;
      }
      
      try {
        const { encryptedSymmetricKey, accessControlConditions } = metadata.litProtocol;
        const decryptedFile = await litProtocolService.instance.decryptFile(
          await fileBlob.arrayBuffer(),
          encryptedSymmetricKey,
          accessControlConditions,
          docId
        );
        
        const decryptedBlob = new Blob([decryptedFile], { type: 'application/octet-stream' });
        fileUrl = URL.createObjectURL(decryptedBlob);
        setDecryptedFileUrl(fileUrl);
      } catch (error) {
        setError('Failed to decrypt document. You may not have access or need to connect your wallet.');
        dispatch({
          type: 'error',
          message: 'Failed to decrypt document. You may not have access or need to connect your wallet.',
          title: 'Decryption Error',
          position: 'topR',
        });
      }
    }
    if (metadata && doc && account) {
      fetchAndDecrypt();
    }
  }, [metadata, doc, account, docId, dispatch]);

  const handleSign = async () => {
    setSigning(true);
    setError('');
    setSuccess('');
    try {
      if (!window.ethereum) throw new Error('No wallet found');
      
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-2">
      {loading && <div className="text-center py-8">Loading document...</div>}
      {!loading && error && <div className="text-center text-red-600 py-8">{error}</div>}
      {!loading && !error && !doc && <div className="text-center py-8">Document not found</div>}
      {!loading && !error && doc && (
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8 mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-gray-900 text-center">Document Details</h2>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-blue-900">Document Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="font-semibold">Document ID:</span> <span>{docId}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Title:</span> <span title={metadata?.title}>{truncateMiddle(metadata?.title, 18, 8) || <span className="text-gray-400 italic">N/A</span>}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Description:</span> <span title={metadata?.description}>{truncateMiddle(metadata?.description, 18, 8) || <span className="text-gray-400 italic">N/A</span>}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Creator:</span> <span title={doc.creator} className="font-mono">{truncateMiddle(doc.creator, 10, 8)}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">IPFS Hash:</span> <span title={doc.ipfsHash} className="font-mono">{truncateMiddle(doc.ipfsHash, 12, 12)}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Status:</span> <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${doc.isRevoked ? 'bg-red-100 text-red-700' : doc.fullySigned ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{doc.isRevoked ? 'Revoked' : doc.fullySigned ? 'Fully Signed' : 'Pending'}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Signatures:</span> <span>{doc.signatureCount}/{doc.signers?.length || 0}</span></div>
                </div>
              </div>
            </div>
            <div>
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-blue-900">Signers</h3>
                <div className="space-y-2">
                  {doc.signers?.map((signer, index) => (
                    <div key={signer} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                      <span className="font-mono text-xs truncate max-w-[160px]" title={signer}>{truncateMiddle(signer, 10, 8)}</span>
                      <div className="flex items-center space-x-2">
                        {signatures[signer] ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">Signed</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-semibold">Pending</span>
                        )}
                        {signatures[signer] && signatureVerification[signer] !== undefined && (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${signatureVerification[signer] ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{signatureVerification[signer] ? 'Valid' : 'Invalid'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {metadata?.file && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center">
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-1 text-blue-900">Document File</h3>
                <p className="text-sm mb-2">This document is stored on IPFS.</p>
              </div>
            </div>
          )}

          {decryptedFileUrl && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 flex items-center">
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-1 text-green-900">Document</h3>
                <a
                  href={decryptedFileUrl}
                  download={metadata?.file?.name || 'document'}
                  className="inline-block mt-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Download Document
                </a>
              </div>
            </div>
          )}

          {success && <div className="mt-4 p-4 bg-green-50 text-green-700 rounded text-center">{success}</div>}

          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            {!hasSigned && isCurrentSigner && !doc.isRevoked && (
              <button
                onClick={handleSign}
                disabled={signing}
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
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">Signatures</h3>
              <div className="space-y-2">
                {Object.entries(signatures).map(([signer, signature]) => (
                  <div key={signer} className="p-4 bg-gray-50 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs"><strong>Signer:</strong> <span className="font-mono" title={signer}>{truncateMiddle(signer, 10, 8)}</span></p>
                      <p className="text-xs"><strong>Signature:</strong> <span className="font-mono break-all" title={signature}>{formatSignature(signature)}</span></p>
                      {signatureVerification[signer] !== undefined && (
                        <p className="text-xs"><strong>Verification:</strong> <span className={signatureVerification[signer] ? 'text-green-600' : 'text-red-600'}>{signatureVerification[signer] ? 'Valid' : 'Invalid'}</span></p>
                      )}
                    </div>
                    <button
                      onClick={() => copyVerificationDetails(signer, signature)}
                      className="mt-2 md:mt-0 md:ml-4 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Copy Verification
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DocumentDetail; 