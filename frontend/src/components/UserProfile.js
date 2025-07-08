import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Docu3ABI from '../contracts/Docu3.json';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3ABI, provider);
      const data = await contract.getUserProfile(account);
      setProfile(data);
    }
    if (account) fetchProfile();
  }, [account]);

  return (
    <></>
  );
}

export default UserProfile;