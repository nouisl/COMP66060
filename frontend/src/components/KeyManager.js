import React, { useState, useEffect } from 'react';
import EthCrypto from 'eth-crypto';

const LOCAL_KEY_STORAGE = 'docu3_user_keypair';

function KeyManager({ onPublicKey, onKeyChange }) {
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [showPrivate, setShowPrivate] = useState(false);
  const [importText, setImportText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_KEY_STORAGE);
    if (stored) {
      try {
        const { privateKey } = JSON.parse(stored);
        if (privateKey) {
          setPrivateKey(privateKey);
          const pub = EthCrypto.publicKeyByPrivateKey(privateKey);
          setPublicKey(pub);
          if (onPublicKey) onPublicKey(pub);
          if (onKeyChange) onKeyChange(privateKey, pub);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (privateKey) {
      const pub = EthCrypto.publicKeyByPrivateKey(privateKey);
      setPublicKey(pub);
      if (onPublicKey) onPublicKey(pub);
      if (onKeyChange) onKeyChange(privateKey, pub);
    }
  }, [privateKey]);

  const generateKeypair = async () => {
    const identity = EthCrypto.createIdentity();
    setPrivateKey(identity.privateKey);
    setPublicKey(identity.publicKey);
    localStorage.setItem(LOCAL_KEY_STORAGE, JSON.stringify({ privateKey: identity.privateKey }));
    setError('');
  };

  const downloadKey = () => {
    const blob = new Blob([JSON.stringify({ privateKey })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docu3_private_key.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const obj = JSON.parse(evt.target.result);
        if (obj.privateKey && EthCrypto.publicKeyByPrivateKey(obj.privateKey)) {
          setPrivateKey(obj.privateKey);
          localStorage.setItem(LOCAL_KEY_STORAGE, JSON.stringify({ privateKey: obj.privateKey }));
          setError('');
        } else {
          setError('Invalid private key file.');
        }
      } catch {
        setError('Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportPaste = () => {
    try {
      const obj = JSON.parse(importText);
      if (obj.privateKey && EthCrypto.publicKeyByPrivateKey(obj.privateKey)) {
        setPrivateKey(obj.privateKey);
        localStorage.setItem(LOCAL_KEY_STORAGE, JSON.stringify({ privateKey: obj.privateKey }));
        setError('');
        setImportText('');
      } else {
        setError('Invalid private key JSON.');
      }
    } catch {
      setError('Invalid JSON format.');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify({ privateKey }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-bold mb-2">Encryption Key Management</h3>
      {privateKey ? (
        <>
          <div className="mb-2">
            <span className="font-semibold">Public Key:</span>
            <div className="break-all text-xs bg-gray-100 p-2 rounded mt-1">{publicKey}</div>
          </div>
          <div className="mb-2">
            <button onClick={() => setShowPrivate(!showPrivate)} className="text-blue-600 underline mr-2 text-xs">{showPrivate ? 'Hide' : 'Show'} Private Key</button>
            <button onClick={handleCopy} className="text-blue-600 underline text-xs">Copy Private Key JSON</button>
          </div>
          {showPrivate && (
            <div className="mb-2">
              <span className="font-semibold">Private Key:</span>
              <div className="break-all text-xs bg-gray-100 p-2 rounded mt-1">{privateKey}</div>
            </div>
          )}
          <div className="mb-2">
            <button onClick={downloadKey} className="bg-blue-600 text-white px-3 py-1 rounded mr-2 text-xs">Download Private Key</button>
            <label className="bg-green-600 text-white px-3 py-1 rounded text-xs cursor-pointer">
              Upload Key
              <input type="file" accept="application/json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          <div className="mb-2">
            <textarea
              className="w-full p-2 border border-gray-300 rounded text-xs"
              placeholder="Paste private key JSON here"
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={2}
            />
            <button onClick={handleImportPaste} className="bg-blue-500 text-white px-2 py-1 rounded text-xs mt-1">Import from Text</button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-2 text-sm text-gray-700">No encryption key found. Generate a new keypair to use encryption features.</div>
          <button onClick={generateKeypair} className="bg-blue-600 text-white px-4 py-2 rounded">Generate Keypair</button>
        </>
      )}
      {error && <div className="text-red-600 text-xs mt-2">{error}</div>}
    </div>
  );
}

export default KeyManager; 