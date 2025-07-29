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
  createVerificationMessage,
  getDecryptedPrivateKey,
  getEncryptedPrivateKey,
  decryptDocument
} from '../utils/crypto';
import EthCrypto from 'eth-crypto';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function truncateMiddle(str, frontLen = 8, backLen = 6) {
  if (!str || str.length <= frontLen + backLen + 3) return str;
  return str.slice(0, frontLen) + '...' + str.slice(-backLen);
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 focus:outline-none"
      title="Copy to clipboard"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
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
  const [decrypting, setDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState('');
  const [showPassModal, setShowPassModal] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [passModalError, setPassModalError] = useState('');
  const [noKeyModal, setNoKeyModal] = useState(false);

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
        const isSigner = signers && signers.includes(userAddress);
        const isCreator = creator && creator === userAddress;
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
            `https://brown-sparkling-sheep-903.mypinata.cloud/ipfs/${docObj.ipfsHash}/docdir/metadata.json`,
            `https://brown-sparkling-sheep-903.mypinata.cloud/ipfs/${docObj.ipfsHash}/metadata.json`
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
        if (!meta) {
          setError('Metadata not found for this document.');
          setLoading(false);
          return;
        }
        const currentSigner = await contract.getCurrentSigner(docIdNum);
        setIsCurrentSigner(currentSigner === userAddress);
        const signed = await contract.hasSigned(docIdNum, userAddress);
        setHasSigned(signed);
        // Always show persistent message if already signed
        if (signed && !success) {
          setSuccess('You have already signed this document!');
        }
        const signaturesData = {};
        const verificationData = {};
        if (Array.isArray(docObj.signers) && docObj.signers.length > 0) {
          for (const signer of docObj.signers) {
            try {
              const signature = await contract.getSignature(docIdNum, signer);
              signaturesData[signer] = signature;
              if (signature && meta && meta.documentHash) {
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
      let tx;
      let retryCount = 0;
      const maxRetries = 3;
      const attemptTransaction = async () => {
        const gasEstimate = await contract.signDocument.estimateGas(docId, signature);
        try {
          const { fetchGasPrices, getGasConfig } = await import('../utils/gasStation');
          const gasPrices = await fetchGasPrices();
          const gasConfig = getGasConfig(gasPrices, 'standard');
          return await contract.signDocument(docId, signature, {
            gasLimit: gasEstimate * 150n / 100n,
            ...gasConfig
          });
        } catch (gasError) {
          const fallbackGasConfig = {
            maxFeePerGas: ethers.parseUnits('50', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei')
          };
          return await contract.signDocument(docId, signature, {
            gasLimit: gasEstimate * 150n / 100n,
            ...fallbackGasConfig
          });
        }
      };
      while (retryCount < maxRetries) {
        try {
          tx = await attemptTransaction();
          break;
        } catch (err) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw err;
          }
          const delay = 2000 * retryCount;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      await tx.wait();
      setSuccess('Document cryptographically signed successfully!');
      dispatch({
        type: 'success',
        message: 'Document cryptographically signed successfully!',
        title: 'Success',
        position: 'topR',
      });
      setHasSigned(true);
      setSignatures(prev => ({ ...prev, [account]: signature }));
      const isValid = verifySignature(hashToSign, signature, account);
      setSignatureVerification(prev => ({ ...prev, [account]: isValid }));
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
      const tx = await contract.revokeDocument(docId, 'Revoked by creator');
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
    setDecryptionError('');
    setPassModalError('');
    const encryptedPrivateKey = getEncryptedPrivateKey(account);
    if (!encryptedPrivateKey) {
      setNoKeyModal(true);
      return;
    }
    setShowPassModal(true);
  };

  const handlePassphraseDecrypt = async () => {
    setDecrypting(true);
    setPassModalError('');
    try {
      let decryptedPrivateKey = '';
      try {
        decryptedPrivateKey = await getDecryptedPrivateKey(account, passphrase);
      } catch (e) {
        throw new Error('Wrong passphrase. Please try again.');
      }
      const encryptedKeys = metadata?.asym?.encryptedKeys || {};
      const foundEntry = Object.entries(encryptedKeys).find(
        ([key]) => key === account
      );
      const encryptedKey = foundEntry ? foundEntry[1] : undefined;
      if (!encryptedKey) throw new Error('No encrypted symmetric key for your account in this document.');
      let symmetricKeyHex = '';
      try {
        const cipher = EthCrypto.cipher.parse(encryptedKey);
        const cleanPrivateKey = decryptedPrivateKey.startsWith('0x') ? decryptedPrivateKey.slice(2) : decryptedPrivateKey;
        symmetricKeyHex = await EthCrypto.decryptWithPrivateKey(cleanPrivateKey, cipher);
      } catch (e) {
        throw new Error('Symmetric key decryption failed. Your private key does not match the one used to encrypt this document.');
      }
      let documentDecryptionSuccess = false;
      let fileMimeType = 'application/octet-stream';
      try {
        let encryptedContentBuffer;
        const fileUrl = `https://brown-sparkling-sheep-903.mypinata.cloud/ipfs/${doc.ipfsHash}/${metadata.file.path}`;
        const fileRes = await fetch(fileUrl);
        if (fileRes.ok) {
          encryptedContentBuffer = await fileRes.arrayBuffer();
          fileMimeType = fileRes.headers.get('content-type') || fileMimeType;
        } else {
          const altFileUrl = `https://ipfs.io/ipfs/${doc.ipfsHash}/${metadata.file.path}`;
          const altFileRes = await fetch(altFileUrl);
          if (!altFileRes.ok) {
            throw new Error('Failed to fetch encrypted file from IPFS');
          }
          encryptedContentBuffer = await altFileRes.arrayBuffer();
          fileMimeType = altFileRes.headers.get('content-type') || fileMimeType;
        }
        let iv = undefined;
        if (metadata && metadata.iv) {
          iv = metadata.iv;
        } else if (metadata && metadata.asym && metadata.asym.iv) {
          iv = metadata.asym.iv;
        }
        if (!iv) {
          throw new Error('IV (initialization vector) missing from metadata. Cannot decrypt.');
        }
        const decryptedBuffer = await decryptDocument(
          encryptedContentBuffer,
          metadata.asym.encryptedKeys,
          account,
          passphrase,
          iv
        );
        documentDecryptionSuccess = !!decryptedBuffer;
        if (!documentDecryptionSuccess) throw new Error('Failed to decrypt document');
        let ext = '';
        if (metadata.file && metadata.file.name) {
          const parts = metadata.file.name.split('.');
          ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
        }
        if (!fileMimeType || fileMimeType === 'application/octet-stream') {
          if (ext === 'pdf') fileMimeType = 'application/pdf';
          else if (['jpg', 'jpeg'].includes(ext)) fileMimeType = 'image/jpeg';
          else if (ext === 'png') fileMimeType = 'image/png';
          else if (ext === 'txt') fileMimeType = 'text/plain';
        }
        const blob = new Blob([decryptedBuffer], { type: fileMimeType });
        const url = URL.createObjectURL(blob);
        setDecryptedFileUrl(url);
        setShowPassModal(false);
        setPassphrase('');
      } catch (e) {
        throw new Error('Document decryption failed. The symmetric key may be wrong or the document is corrupted.');
      }
    } catch (err) {
      setPassModalError(err.message || 'Failed to decrypt. Wrong passphrase or corrupted key.');
    } finally {
      setDecrypting(false);
    }
  };

  const handleCloseNoKeyModal = () => {
    setNoKeyModal(false);
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
    <>
      {loading && <div className="text-center py-8">Loading document...</div>}
      {!loading && error && <div className="text-center text-red-600 py-8">{error}</div>}
      {!loading && !error && !doc && <div className="text-center py-8">Document not found</div>}
      
      
      
      {!loading && !error && doc && (
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-8 mt-8">
          {/* Revoked badge and info */}
          {doc.isRevoked && (
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-block bg-red-600 text-white px-4 py-1 rounded-full font-bold text-lg">Revoked</span>
              <span className="text-xs text-red-700" title="Revoked documents cannot be signed, amended, or revoked again. The data remains on IPFS, but the document is locked on-chain.">
                (This document is locked and cannot be changed. Data remains accessible on IPFS.)
              </span>
            </div>
          )}
          {/* Amended badge and previous version info */}
          {metadata?.previousVersion && (
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-block bg-yellow-400 text-white px-4 py-1 rounded-full font-bold text-lg">Amended Version</span>
              <span className="text-xs text-yellow-800" title="This document is an amended version. Previous version is available.">
                (This is an amended version. <a href={`/documents/${metadata.previousVersion}`} className="underline text-blue-700">View previous version</a>)
              </span>
            </div>
          )}
          <h2 className="text-3xl font-bold mb-8 text-gray-900 text-center">Document Details</h2>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-blue-900">Document Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="font-semibold">Document ID:</span> <span>{docId}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Title:</span> <span title={metadata?.title}>{truncateMiddle(metadata?.title, 18, 8) || <span className="text-gray-400 italic">N/A</span>}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Description:</span> <span title={metadata?.description}>{truncateMiddle(metadata?.description, 18, 8) || <span className="text-gray-400 italic">N/A</span>}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Creator:</span> <span title={doc.creator} className="font-mono flex items-center">{truncateMiddle(doc.creator, 10, 8)}<CopyButton value={doc.creator} /></span></div>
                  <div className="flex justify-between"><span className="font-semibold">IPFS Hash:</span> <span title={doc.ipfsHash} className="font-mono flex items-center">{truncateMiddle(doc.ipfsHash, 12, 12)}<CopyButton value={doc.ipfsHash} /></span></div>
                  <div className="flex justify-between"><span className="font-semibold">Status:</span> <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${doc.isRevoked ? 'bg-red-100 text-red-700' : doc.fullySigned ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{doc.isRevoked ? 'Revoked' : doc.fullySigned ? 'Fully Signed' : 'Pending'}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Signatures:</span> <span>{Number(doc.signatureCount) || 0}/{doc.signers?.length || 0}</span></div>
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
                        {doc.fullySigned || (signer === account && hasSigned) || signatures[signer] ? (
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

          {metadata?.file?.encrypted && !decryptedFileUrl && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center">
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-1 text-blue-900">Encrypted Document</h3>
                <p className="text-sm mb-2">This document is encrypted. You need to decrypt it before signing.</p>
                {decryptionError && <p className="text-red-600 mt-1 text-xs">{decryptionError}</p>}
              </div>
              <button
                onClick={handleDecrypt}
                disabled={decrypting}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {decrypting ? 'Decrypting...' : 'Decrypt Document'}
              </button>
            </div>
          )}

          {decryptedFileUrl && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 flex flex-col items-center">
              <div className="flex-1 w-full text-center">
                <h3 className="text-base font-semibold mb-1 text-green-900">Decrypted Document</h3>
                {/* Inline preview for images and PDFs */}
                {(() => {
                  const ext = metadata?.file?.name?.split('.').pop()?.toLowerCase();
                  if (['jpg', 'jpeg', 'png'].includes(ext)) {
                    return <img src={decryptedFileUrl} alt="Decrypted Document" className="mx-auto max-h-96 my-4 rounded shadow" style={{maxWidth: '100%'}} />;
                  } else if (ext === 'pdf') {
                    return <iframe src={decryptedFileUrl} title="Decrypted PDF" className="mx-auto my-4 rounded shadow" style={{width: '100%', height: '600px', border: 'none'}} />;
                  } else if (ext === 'txt') {
                    return <iframe src={decryptedFileUrl} title="Decrypted Text" className="mx-auto my-4 rounded shadow" style={{width: '100%', height: '400px', border: 'none'}} />;
                  } else {
                    return <div className="text-gray-600 my-4">Preview not available for this file type.</div>;
                  }
                })()}
                <a
                  href={decryptedFileUrl}
                  download={metadata?.file?.name || 'document'}
                  className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Download Document
                </a>
              </div>
            </div>
          )}

          {success && <div className="mt-4 p-4 bg-green-50 text-green-700 rounded text-center">{success}</div>}

          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            {/* Sign button */}
            {!hasSigned && isCurrentSigner && !doc.isRevoked && (
              <button
                onClick={handleSign}
                disabled={signing || (metadata?.file?.encrypted && !decryptedFileUrl) || doc.isRevoked}
                title={doc.isRevoked ? 'This document is revoked and cannot be signed.' : ''}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {signing ? 'Signing...' : 'Sign Document'}
              </button>
            )}
            {/* Amend/Revoke buttons for creator */}
            {doc.creator === account && !doc.isRevoked && (
              <>
                <button
                  onClick={() => setShowAmendForm(!showAmendForm)}
                  disabled={doc.isRevoked}
                  title={doc.isRevoked ? 'This document is revoked and cannot be amended.' : ''}
                  className="px-6 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400"
                >
                  Amend Document
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={revoking || doc.isRevoked}
                  title={doc.isRevoked ? 'This document is already revoked.' : ''}
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



          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">Signatures</h3>
            <div className="space-y-2">
              {doc.signers?.map((signer) => (
                <div key={signer} className="p-4 bg-gray-50 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs"><strong>Signer:</strong> <span className="font-mono" title={signer}>{truncateMiddle(signer, 10, 8)}</span></p>
                    <p className="text-xs"><strong>Signature:</strong> {signatures[signer] || (signer === account && hasSigned) ? (
                      <span className="font-mono break-all" title={signatures[signer] || 'Signed by current user'}>
                        {signatures[signer] ? (
                          <>
                            {formatSignature(signatures[signer])} 
                            <CopyButton value={signatures[signer]} />
                            <details className="mt-1">
                              <summary className="text-xs text-blue-600 cursor-pointer">Show full signature</summary>
                              <div className="text-xs font-mono break-all bg-gray-100 p-2 rounded mt-1">{signatures[signer]}</div>
                            </details>
                          </>
                        ) : (
                          <>
                            Signed <CopyButton value="Signed by current user" />
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Pending</span>
                    )}</p>
                    {signatures[signer] && signatureVerification[signer] !== undefined && (
                      <p className="text-xs"><strong>Verification:</strong> <span className={signatureVerification[signer] ? 'text-green-600' : 'text-red-600'}>{signatureVerification[signer] ? 'Valid' : 'Invalid'}</span></p>
                    )}
                  </div>
                  {(signatures[signer] || (signer === account && hasSigned)) && (
                    <button
                      onClick={() => copyVerificationDetails(signer, signatures[signer] || 'Signed by current user')}
                      className="mt-2 md:mt-0 md:ml-4 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Copy Verification
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Passphrase Modal */}
          {showPassModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-2xl font-bold mb-4 text-gray-900 text-center">Enter Passphrase</h3>
                <p className="text-sm text-gray-700 mb-4 text-center">
                  Please enter your passphrase to decrypt your private key and access this encrypted document.
                </p>
                <input
                  type="password"
                  placeholder="Passphrase"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
                  disabled={decrypting}
                />
                {passModalError && <p className="text-red-500 text-sm text-center mb-4">{passModalError}</p>}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handlePassphraseDecrypt}
                    disabled={decrypting || !passphrase}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {decrypting ? 'Decrypting...' : 'Decrypt & Access'}
                  </button>
                  <button
                    onClick={() => { setShowPassModal(false); setPassphrase(''); setPassModalError(''); }}
                    className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No Key Modal */}
          {noKeyModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
                <h3 className="text-2xl font-bold mb-4 text-gray-900">No Encrypted Key Found</h3>
                <p className="text-gray-700 mb-4">You need to restore your encrypted key before you can decrypt this document.</p>
                <a
                  href="/profile"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4"
                >
                  Go to Profile to Restore Key
                </a>
                <div>
                  <button
                    onClick={handleCloseNoKeyModal}
                    className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default DocumentDetail; 