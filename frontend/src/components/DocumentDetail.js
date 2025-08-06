// imports
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
import TransactionVerifier from './TransactionVerifier';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const CHAIN_ID = process.env.REACT_APP_CHAIN_ID || '80002';

// shorten long strings for display
function shortenMiddle(str, frontLen = 8, backLen = 6) {
  if (!str || str.length <= frontLen + backLen + 3) return str;
  return str.slice(0, frontLen) + '...' + str.slice(-backLen);
}

// copy button component
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

// DocumentDetail component
function DocumentDetail() {
  const { docId } = useParams();
  const dispatch = useNotification();
  // define state for document data
  const [doc, setDoc] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasSigned, setHasSigned] = useState(false);
  const [isCurrentSigner, setIsCurrentSigner] = useState(false);
  const [currentSignerAddress, setCurrentSignerAddress] = useState('');
  // define state for actions
  const [signing, setSigning] = useState(false);
  const [amending, setAmending] = useState(false);
  const [revoking, setRevoking] = useState(false);
  // define state for amend form
  const [amendTitle, setAmendTitle] = useState('');
  const [amendDescription, setAmendDescription] = useState('');
  const [amendFile, setAmendFile] = useState(null);
  const [showAmendForm, setShowAmendForm] = useState(false);
  // define state for decryption
  const [decryptedFileUrl, setDecryptedFileUrl] = useState(null);
  const [documentHash, setDocumentHash] = useState('');
  const [signatures, setSignatures] = useState({});
  const [signatureVerification, setSignatureVerification] = useState({});
  const [signatureTransactions, setSignatureTransactions] = useState({});
  const [decrypting, setDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState('');
  const [expiryInfo, setExpiryInfo] = useState(null);
  // define state for modals
  const [showPassModal, setShowPassModal] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [passModalError, setPassModalError] = useState('');
  const [noKeyModal, setNoKeyModal] = useState(false);
  // define state for transaction tracking
  const [lastTransactionHash, setLastTransactionHash] = useState('');
  const [lastTransactionAction, setLastTransactionAction] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);

  // fetch registered users for email display
  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      if (!window.ethereum || !CONTRACT_ADDRESS) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
        
        // check if getAllRegisteredUsers function exists in the contract
        if (!contract.getAllRegisteredUsers) {
          // function not available - set empty users list
          setRegisteredUsers([]);
          return;
        }
        
        const addresses = await contract.getAllRegisteredUsers();
        const users = [];
        for (let addr of addresses) {
          try {
            const profile = await contract.getUserProfile(addr);
            const [firstName, familyName, email, dob, isRegistered, publicKey] = profile;
            if (isRegistered && email && typeof email === 'string') {
              users.push({ address: addr, firstName, familyName, email: email.trim().toLowerCase() });
            }
                    } catch (err) {
            // skip individual user profile errors - keep going
          }
        }
        setRegisteredUsers(users);
      } catch (err) {
        // handle contract call errors
        if (err.code === 'CALL_EXCEPTION') {
          // contract function might not be implemented
        } else {
          // general error fetching users
        }
        setRegisteredUsers([]);
      }
    };

    fetchRegisteredUsers();
  }, [CONTRACT_ADDRESS]);

  // get document data from the blockchain
  useEffect(() => {
    const fetchDoc = async () => {
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
        if (!CONTRACT_ADDRESS) throw new Error('Contract address not configured');
        if (!ethers.isAddress(CONTRACT_ADDRESS)) throw new Error('Invalid contract address');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        setAccount(userAddress);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
        let ipfsHash, creator, signers, createdAt, signatureCount, fullySigned, isRevoked;
        try {
          [ipfsHash, creator, signers, createdAt, signatureCount, fullySigned, isRevoked] = await contract.getDocument(docIdNum);
        } catch (contractError) {
          throw new Error(`Failed to fetch document from blockchain: ${contractError.message}`);
        }
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
            } catch (e) {
              // skip failed metadata fetch - continue with next url
            }
          }
          setMetadata(meta);
        } catch (e) {
          setMetadata(null);
        }
        if (!meta) {
          setError('Metadata not found for this document. The document may not exist or the IPFS hash is invalid.');
          setLoading(false);
          return;
        }
        let currentSigner, signed;
        try {
          currentSigner = await contract.getCurrentSigner(docIdNum);
          signed = await contract.hasSigned(docIdNum, userAddress);
        } catch (contractError) {
          throw new Error(`Failed to fetch signing information: ${contractError.message}`);
        }
        setCurrentSignerAddress(currentSigner);
        setIsCurrentSigner(currentSigner === userAddress);
        setHasSigned(signed);
        // show message if already signed
        if (signed && !success) {
          setSuccess('You have already signed this document!');
        }
        
        // refresh document data to get updated signature count
        const [
          refreshedIpfsHash,
          refreshedCreator,
          refreshedSigners,
          refreshedCreatedAt,
          refreshedSignatureCount,
          refreshedFullySigned,
          refreshedIsRevoked
        ] = await contract.getDocument(docIdNum);
        
        // update document with fresh data
        setDoc({
          ipfsHash: refreshedIpfsHash,
          creator: refreshedCreator,
          signers: refreshedSigners,
          createdAt: refreshedCreatedAt,
          signatureCount: refreshedSignatureCount,
          fullySigned: refreshedFullySigned,
          isRevoked: refreshedIsRevoked
        });
        const signaturesData = {};
        const verificationData = {};
        const transactionHashesData = {};
        if (Array.isArray(docObj.signers) && docObj.signers.length > 0) {
          for (const signer of docObj.signers) {
            try {
              const signature = await contract.getSignature(docIdNum, signer);
              signaturesData[signer] = signature;
              if (signature && meta && meta.documentHash) {
                const isValid = verifySignature(meta.documentHash, signature, signer);
                verificationData[signer] = isValid;
              }
              // get transaction hash from smart contract
              try {
                const txHash = await contract.getSignatureTransactionHash(docIdNum, signer);
                if (txHash && txHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                  transactionHashesData[signer] = txHash;
                }
              } catch (e) {
                // ignore if function doesn't exist yet
              }
            } catch (e) {
              signaturesData[signer] = null;
              verificationData[signer] = false;
            }
          }
        }
        setSignatures(signaturesData);
        setSignatureVerification(verificationData);
        setSignatureTransactions(transactionHashesData);
        if (meta && meta.documentHash) {
          setDocumentHash(meta.documentHash);
        }
        
        // get expiry information
        try {
          const [expiry, isExpired, timeUntilExpiry, hasExpiry] = await contract.getDocumentExpiryInfo(docIdNum);
          setExpiryInfo({
            expiry: Number(expiry),
            isExpired,
            timeUntilExpiry: Number(timeUntilExpiry),
            hasExpiry
          });
        } catch (err) {
          setExpiryInfo(null);
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
    };
    fetchDoc();
  }, [docId]);

  // sign document with cryptographic signature
  const handleSign = async () => {
    setSigning(true);
    setError('');
    setSuccess('');
    try {
      if (!window.ethereum) throw new Error('No wallet found');
      
      // check if document has expired
      if (expiryInfo && expiryInfo.hasExpiry && expiryInfo.isExpired) {
        throw new Error('This document has expired and cannot be signed.');
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
      
      // validate transaction hash before setting it
      if (tx.hash && tx.hash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        setLastTransactionHash(tx.hash);
        setLastTransactionAction('Document Signed');
      } else {
        throw new Error('Transaction failed - invalid transaction hash received');
      }
      setSuccess('Document cryptographically signed successfully!');
      dispatch({
        type: 'success',
        message: 'Document cryptographically signed successfully!',
        title: 'Success',
        position: 'topR',
      });
      setHasSigned(true);
      setSignatures(prev => ({ ...prev, [account]: signature }));
      setSignatureTransactions(prev => ({ ...prev, [account]: tx.hash }));
      const isValid = verifySignature(hashToSign, signature, account);
      setSignatureVerification(prev => ({ ...prev, [account]: isValid }));
      
      // update transaction hash in smart contract
      try {
        await contract.updateSignatureTransactionHash(docId, tx.hash);
      } catch (err) {
        // skip transaction hash update - optional feature
      }
      
      // automatically refresh document data to get updated signature count
      setTimeout(async () => {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
          const docIdNum = Number(docId);
          const [
            refreshedIpfsHash,
            refreshedCreator,
            refreshedSigners,
            refreshedCreatedAt,
            refreshedSignatureCount,
            refreshedFullySigned,
            refreshedIsRevoked
          ] = await contract.getDocument(docIdNum);
          
          setDoc({
            ipfsHash: refreshedIpfsHash,
            creator: refreshedCreator,
            signers: refreshedSigners,
            createdAt: refreshedCreatedAt,
            signatureCount: refreshedSignatureCount,
            fullySigned: refreshedFullySigned,
            isRevoked: refreshedIsRevoked
          });
        } catch (err) {
          // skip refresh error
        }
      }, 2000); // wait 2 seconds for blockchain to update
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

  // revoke document by creator
  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
      const tx = await contract.revokeDocument(docId, 'Revoked by creator');
      await tx.wait();
      
      // validate transaction hash before setting it
      if (tx.hash && tx.hash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        setLastTransactionHash(tx.hash);
        setLastTransactionAction('Document Revoked');
      } else {
        throw new Error('Transaction failed - invalid transaction hash received');
      }
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

  // amend document with new metadata
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
      const tx = await contract.amendDocumentMetadata(docId, newIpfsHash);
      await tx.wait();
      
      // validate transaction hash before setting it
      if (tx.hash && tx.hash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        setLastTransactionHash(tx.hash);
        setLastTransactionAction('Document Amended');
      } else {
        throw new Error('Transaction failed - invalid transaction hash received');
      }
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

  // start decryption process
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

  // decrypt document with passphrase
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

  // close no key modal
  const handleCloseNoKeyModal = () => {
    setNoKeyModal(false);
  };

  // copy verification details to clipboard
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

  // get signer position in the signing order
  const getSignerPosition = (signerAddress) => {
    if (!doc?.signers) return -1;
    return doc.signers.findIndex(signer => signer.toLowerCase() === signerAddress.toLowerCase()) + 1;
  };

  // get current signer position
  const getCurrentSignerPosition = () => {
    return getSignerPosition(currentSignerAddress);
  };

  // get user's position in signing order
  const getUserPosition = () => {
    return getSignerPosition(account);
  };

  // check if this is a single user document
  const isSingleUserDocument = () => {
    return doc && doc.signers && doc.signers.length === 1 && doc.creator === doc.signers[0];
  };

  // format expiry information for display
  const formatExpiryInfo = () => {
    if (!expiryInfo) {
      return { text: 'Loading expiry...', className: 'text-gray-500' };
    }
    
    // check if expiry is set (either hasExpiry is true or expiry timestamp is non-zero)
    const hasExpirySet = expiryInfo.hasExpiry || (expiryInfo.expiry && expiryInfo.expiry > 0);
    
    if (!hasExpirySet) {
      return { text: 'No expiry set', className: 'text-gray-500' };
    }
    
    // additional check: if expiry timestamp exists and is in the past, consider it expired
    const currentTime = Math.floor(Date.now() / 1000);
    const isActuallyExpired = expiryInfo.expiry && currentTime > expiryInfo.expiry;
    
    if (expiryInfo.isExpired || isActuallyExpired) {
      // show actual expiry date for expired documents
      const expiryDate = new Date(expiryInfo.expiry * 1000);
      return { 
        text: `Expired on ${expiryDate.toLocaleDateString()} at ${expiryDate.toLocaleTimeString()}`, 
        className: 'text-red-600 font-semibold' 
      };
    }
    
    const days = Math.floor(expiryInfo.timeUntilExpiry / 86400);
    const hours = Math.floor((expiryInfo.timeUntilExpiry % 86400) / 3600);
    const minutes = Math.floor((expiryInfo.timeUntilExpiry % 3600) / 60);
    
    if (days > 0) {
      return { text: `Expires in ${days} day${days > 1 ? 's' : ''}`, className: 'text-yellow-600' };
    } else if (hours > 0) {
      return { text: `Expires in ${hours} hour${hours > 1 ? 's' : ''}`, className: 'text-yellow-600' };
    } else if (minutes > 0) {
      return { text: `Expires in ${minutes} minute${minutes > 1 ? 's' : ''}`, className: 'text-red-600 font-semibold' };
    } else {
      return { text: 'Expires soon', className: 'text-red-600 font-semibold' };
    }
  };
  // return document detail
  return (
    <>
      {/* show loading state */}
      {loading && <div className="text-center py-8">Loading document...</div>}
      {/* show error state */}
      {!loading && error && <div className="text-center text-red-600 py-8">{error}</div>}
      {/* show not found state */}
      {!loading && !error && !doc && <div className="text-center py-8">Document not found</div>}
      
      {/* show document content */}
      {!loading && !error && doc && (
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-8 mt-8">
          {/* show revoked badge if document is revoked */}
          {doc.isRevoked && (
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-block bg-red-600 text-white px-4 py-1 rounded-full font-bold text-lg">Revoked</span>
              <span className="text-xs text-red-700" title="Revoked documents cannot be signed, amended, or revoked again. The data remains on IPFS, but the document is locked on-chain.">
                (This document is locked and cannot be changed. Data remains accessible on IPFS.)
              </span>
            </div>
          )}
          {/* show amended badge if document is amended */}
          {metadata?.previousVersion && (
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-block bg-yellow-400 text-white px-4 py-1 rounded-full font-bold text-lg">Amended Version</span>
              <span className="text-xs text-yellow-800" title="This document is an amended version. Previous version is available.">
                (This is an amended version. <a href={`/documents/${metadata.previousVersion}`} className="underline text-blue-700">View previous version</a>)
              </span>
            </div>
          )}
          
          {/* show expiry warning only if document is not fully signed and close to expiring */}
          {expiryInfo && expiryInfo.hasExpiry && !expiryInfo.isExpired && expiryInfo.timeUntilExpiry < 3600 && expiryInfo.timeUntilExpiry > 0 && !doc.fullySigned && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800">Document Expiring Soon</h3>
                  <p className="text-sm text-red-700 mt-1">
                    This document expires in {formatExpiryInfo().text.toLowerCase()}. Please sign it before it expires.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* show expired badge if document has expired and not fully signed */}
          {expiryInfo && expiryInfo.hasExpiry && (expiryInfo.isExpired || (expiryInfo.expiry && Math.floor(Date.now() / 1000) > expiryInfo.expiry)) && !doc.fullySigned && (
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-block bg-red-600 text-white px-4 py-1 rounded-full font-bold text-lg">Expired</span>
              <span className="text-xs text-red-700" title="This document has expired and cannot be signed.">
                (This document has expired and cannot be signed or amended.)
              </span>
            </div>
          )}
          <h2 className="text-3xl font-bold mb-8 text-gray-900 text-center">Document Details</h2>
          {/* show document info and signers */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              {/* show document information */}
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-blue-900">Document Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="font-semibold">Title:</span> <span title={metadata?.title}>{shortenMiddle(metadata?.title, 18, 8) || <span className="text-gray-400 italic">N/A</span>}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Description:</span> <span title={metadata?.description}>{shortenMiddle(metadata?.description, 18, 8) || <span className="text-gray-400 italic">N/A</span>}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Creator:</span> <span title={doc.creator} className="font-mono flex items-center">{shortenMiddle(doc.creator, 10, 8)}<CopyButton value={doc.creator} /></span></div>
                  <div className="flex justify-between"><span className="font-semibold">IPFS Hash:</span> <span title={doc.ipfsHash} className="font-mono flex items-center">{shortenMiddle(doc.ipfsHash, 12, 12)}<CopyButton value={doc.ipfsHash} /></span></div>
                  <div className="flex justify-between"><span className="font-semibold">Status:</span> <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${doc.isRevoked ? 'bg-red-100 text-red-700' : doc.fullySigned ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{doc.isRevoked ? 'Revoked' : doc.fullySigned ? 'Fully Signed' : 'Pending'}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Signatures:</span> <span>{Number(doc.signatureCount) || 0}/{doc.signers?.length || 0}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Sign Deadline:</span> <span className={formatExpiryInfo().className}>{formatExpiryInfo().text}</span></div>
                </div>
              </div>
            </div>
            <div>
              {/* show signers list */}
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-blue-900">Signers</h3>
                <div className="space-y-3">
                  {doc.signers?.map((signer, index) => (
                    <div key={signer} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Signer {index + 1}</p>
                          <p className="text-xs text-gray-500 font-mono" title={signer}>
                            {shortenMiddle(signer, 12, 8)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {(() => {
                              if (signer === account) return 'You';
                              if (!registeredUsers || !Array.isArray(registeredUsers)) return 'Registered User';
                              const user = registeredUsers.find(u => u.address && u.address.toLowerCase() === signer.toLowerCase());
                              return user && user.email ? user.email : 'Registered User';
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {doc.fullySigned || (signer === account && hasSigned) || signatures[signer] ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                            Signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* show decryption section for encrypted documents */}
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

          {/* show decrypted document preview */}
          {decryptedFileUrl && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 flex flex-col items-center">
              <div className="flex-1 w-full text-center">
                <h3 className="text-base font-semibold mb-1 text-green-900">Decrypted Document</h3>
                {/* show preview based on file type */}
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
          
          {/* show transaction verification link */}
          {lastTransactionHash && (
            <TransactionVerifier txHash={lastTransactionHash} action={lastTransactionAction} />
          )}

          {/* show sequential signing feedback */}
          {!doc.isRevoked && !doc.fullySigned && !isSingleUserDocument() && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-base font-semibold mb-2 text-blue-900">Signing Order</h3>
              {currentSignerAddress && (
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Current signer:</strong> {shortenMiddle(currentSignerAddress, 10, 8)} (Position {getCurrentSignerPosition()})
                </p>
              )}
              {!hasSigned && !isCurrentSigner && getUserPosition() > 0 && (
                <p className="text-sm text-yellow-700">
                  <strong>Your position:</strong> {getUserPosition()}. You can sign when it's your turn.
                </p>
              )}
              {!hasSigned && getUserPosition() === 0 && (
                <p className="text-sm text-gray-600">
                  You are not in the signing order for this document.
                </p>
              )}
            </div>
          )}

          {/* show single user document info */}
          {!doc.isRevoked && !doc.fullySigned && isSingleUserDocument() && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-base font-semibold mb-2 text-green-900">Single User Document</h3>
              <p className="text-sm text-green-700">
                This is a self-signed document. You are the creator and the only signer.
              </p>
              {!hasSigned && (
                <p className="text-sm text-green-700 mt-2">
                  <strong>Ready to sign:</strong> You can sign this document now since you are the only signer.
                </p>
              )}
            </div>
          )}

          {/* show action buttons */}
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            {/* sign button for current signer or single user document */}
            {!hasSigned && (isCurrentSigner || isSingleUserDocument()) && !doc.isRevoked && (
              <button
                onClick={handleSign}
                disabled={signing || (metadata?.file?.encrypted && !decryptedFileUrl) || doc.isRevoked || (expiryInfo && expiryInfo.hasExpiry && expiryInfo.isExpired)}
                title={
                  doc.isRevoked ? 'This document is revoked and cannot be signed.' :
                  (expiryInfo && expiryInfo.hasExpiry && expiryInfo.isExpired) ? 'This document has expired and cannot be signed.' :
                  ''
                }
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {signing ? 'Signing...' : 'Sign Document'}
              </button>
            )}
            {/* amend and revoke buttons for uploader */}
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

          {/* show amend form when clicked */}
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



          {/* show signatures section */}
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-6 text-gray-900 border-b border-gray-200 pb-2">Signatures</h3>
            <div className="space-y-4">
              {doc.signers?.map((signer, index) => (
                <div key={signer} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Header with signer info and status */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Signer {index + 1}</p>
                          <p className="text-xs text-gray-500 font-mono" title={signer}>
                            {signer}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {(() => {
                              if (signer === account) return 'You';
                              if (!registeredUsers || !Array.isArray(registeredUsers)) return 'Registered User';
                              const user = registeredUsers.find(u => u.address && u.address.toLowerCase() === signer.toLowerCase());
                              return user && user.email ? user.email : 'Registered User';
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(signatures[signer] || (signer === account && hasSigned)) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                            Signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Signature details */}
                    {(signatures[signer] || (signer === account && hasSigned)) ? (
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-700 mb-2">Signature Hash</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-mono text-gray-900 break-all">
                              {signatures[signer] ? formatSignature(signatures[signer]) : 'Signed by current user'}
                            </span>
                            <CopyButton value={signatures[signer] || 'Signed by current user'} />
                          </div>
                          {signatures[signer] && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 font-medium">
                                Show full signature
                              </summary>
                              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono break-all text-gray-700">
                                {signatures[signer]}
                              </div>
                            </details>
                          )}
                        </div>

                        {/* Verification status */}
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                            Verification: Valid
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-3 pt-2">
                          <button
                            onClick={() => copyVerificationDetails(signer, signatures[signer] || 'Signed by current user')}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Verification
                          </button>
                          {signatureTransactions[signer] ? (
                            <a
                              href={`https://amoy.polygonscan.com/tx/${signatureTransactions[signer]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                              title="View signature transaction on PolygonScan"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View on Chain
                            </a>
                          ) : (
                            <a
                              href={`https://amoy.polygonscan.com/tx/${signatureTransactions && signatureTransactions[signer] ? signatureTransactions[signer] : '0x0000000000000000000000000000000000000000000000000000000000000000'}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                              title="View transaction on PolygonScan"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View Transaction
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-gray-400 mb-2">
                          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-500">Awaiting signature</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* passphrase modal for decryption */}
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

          {/* no key modal */}
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

// export the DocumentDetail component
export default DocumentDetail; 