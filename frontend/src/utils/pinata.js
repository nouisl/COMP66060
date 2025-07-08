import axios from 'axios';

const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.REACT_APP_PINATA_API_SECRET;

export async function uploadFileToPinata(file) {
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

export async function uploadJsonToPinata(json) {
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
