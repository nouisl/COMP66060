import axios from 'axios';

const IPFS_PROVIDER = process.env.REACT_APP_IPFS_PROVIDER || 'pinata';

const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.REACT_APP_PINATA_API_SECRET;
const INFURA_PROJECT_ID = process.env.REACT_APP_INFURA_PROJECT_ID;
const INFURA_PROJECT_SECRET = process.env.REACT_APP_INFURA_PROJECT_SECRET;
const WEB3_STORAGE_TOKEN = process.env.REACT_APP_WEB3_STORAGE_TOKEN;

class IPFSService {
  constructor() {
    this.provider = IPFS_PROVIDER;
  }

  async uploadFile(file) {
    switch (this.provider) {
      case 'pinata':
        return this.uploadToPinata(file);
      case 'infura':
        return this.uploadToInfura(file);
      case 'web3storage':
        return this.uploadToWeb3Storage(file);
      default:
        throw new Error(`Unsupported IPFS provider: ${this.provider}`);
    }
  }

  async uploadJson(json) {
    switch (this.provider) {
      case 'pinata':
        return this.uploadJsonToPinata(json);
      case 'infura':
        return this.uploadJsonToInfura(json);
      case 'web3storage':
        return this.uploadJsonToWeb3Storage(json);
      default:
        throw new Error(`Unsupported IPFS provider: ${this.provider}`);
    }
  }

  async uploadFolder(files) {
    switch (this.provider) {
      case 'pinata':
        return this.uploadFolderToPinata(files);
      case 'infura':
        return this.uploadFolderToInfura(files);
      case 'web3storage':
        return this.uploadFolderToWeb3Storage(files);
      default:
        throw new Error(`Unsupported IPFS provider: ${this.provider}`);
    }
  }

  async uploadToPinata(file) {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      throw new Error('Pinata API keys not configured');
    }

    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    const data = new FormData();
    data.append('file', file);

    const res = await axios.post(url, data, {
      maxContentLength: 'Infinity',
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    return res.data.IpfsHash;
  }

  async uploadJsonToPinata(json) {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      throw new Error('Pinata API keys not configured');
    }

    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    const res = await axios.post(url, json, {
      maxContentLength: 'Infinity',
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });
    return res.data.IpfsHash;
  }

  async uploadFolderToPinata(files) {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      throw new Error('Pinata API keys not configured');
    }

    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    const data = new FormData();
    const rootFolder = 'docdir';
    files.forEach(fileObj => {
      data.append('file', fileObj.content, `${rootFolder}/${fileObj.path}`);
    });

    try {
      const res = await axios.post(url, data, {
        maxContentLength: 'Infinity',
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      });
      return res.data.IpfsHash;
    } catch (err) {
      if (err.response) {
        throw new Error(`Pinata error: ${JSON.stringify(err.response.data)}`);
      }
      throw err;
    }
  }

  async uploadToInfura(file) {
    if (!INFURA_PROJECT_ID || !INFURA_PROJECT_SECRET) {
      throw new Error('Infura project credentials not configured');
    }

    const url = `https://ipfs.infura.io:5001/api/v0/add`;
    const data = new FormData();
    data.append('file', file);

    const res = await axios.post(url, data, {
      maxContentLength: 'Infinity',
      auth: {
        username: INFURA_PROJECT_ID,
        password: INFURA_PROJECT_SECRET,
      },
    });

    return res.data.Hash;
  }

  async uploadJsonToInfura(json) {
    if (!INFURA_PROJECT_ID || !INFURA_PROJECT_SECRET) {
      throw new Error('Infura project credentials not configured');
    }

    const jsonBlob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    return this.uploadToInfura(jsonBlob);
  }

  async uploadFolderToInfura(files) {
    if (!INFURA_PROJECT_ID || !INFURA_PROJECT_SECRET) {
      throw new Error('Infura project credentials not configured');
    }

    const url = `https://ipfs.infura.io:5001/api/v0/add`;
    const data = new FormData();
    const rootFolder = 'docdir';
    files.forEach(fileObj => {
      data.append('file', fileObj.content, `${rootFolder}/${fileObj.path}`);
    });

    const res = await axios.post(url, data, {
      maxContentLength: 'Infinity',
      auth: {
        username: INFURA_PROJECT_ID,
        password: INFURA_PROJECT_SECRET,
      },
    });

    return res.data.Hash;
  }

  async uploadToWeb3Storage(file) {
    if (!WEB3_STORAGE_TOKEN) {
      throw new Error('Web3.Storage token not configured');
    }

    const url = `https://api.web3.storage/upload`;
    const res = await axios.post(url, file, {
      maxContentLength: 'Infinity',
      headers: {
        'Authorization': `Bearer ${WEB3_STORAGE_TOKEN}`,
      },
    });

    return res.data.cid;
  }

  async uploadJsonToWeb3Storage(json) {
    if (!WEB3_STORAGE_TOKEN) {
      throw new Error('Web3.Storage token not configured');
    }

    const jsonBlob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    return this.uploadToWeb3Storage(jsonBlob);
  }

  async uploadFolderToWeb3Storage(files) {
    if (!WEB3_STORAGE_TOKEN) {
      throw new Error('Web3.Storage token not configured');
    }

    const url = `https://api.web3.storage/upload`;
    const data = new FormData();
    const rootFolder = 'docdir';
    files.forEach(fileObj => {
      data.append('file', fileObj.content, `${rootFolder}/${fileObj.path}`);
    });

    const res = await axios.post(url, data, {
      maxContentLength: 'Infinity',
      headers: {
        'Authorization': `Bearer ${WEB3_STORAGE_TOKEN}`,
      },
    });

    return res.data.cid;
  }
}

export const ipfsService = new IPFSService(); 