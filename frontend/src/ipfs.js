import { create } from 'ipfs-http-client';

// Connect to Infura's IPFS gateway
const ipfs = create({ url: 'https://ipfs.infura.io:5001/api/v0' });

export async function uploadToIPFS(file) {
  // file can be a Buffer, Blob, or string
  const { path } = await ipfs.add(file);
  return path; // IPFS hash
} 