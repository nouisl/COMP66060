import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useMoralis } from 'react-moralis';
import Docu3 from '../contracts/Docu3.json';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function UserProfile() {
  const { account } = useMoralis();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!account) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
        const [firstName, familyName, email, dob, , publicKey] = await contract.getUserProfile(account);
        setProfile({ firstName, familyName, email, dob, publicKey });
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [account]);

  if (loading) return <div className="text-center py-8">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">User Profile</h2>
      {profile ? (
        <div className="space-y-4">
          <div><strong>First Name:</strong> {profile.firstName}</div>
          <div><strong>Family Name:</strong> {profile.familyName}</div>
          <div><strong>Email:</strong> {profile.email}</div>
          <div><strong>Date of Birth:</strong> {profile.dob && new Date(Number(profile.dob) * 1000).toLocaleDateString()}</div>
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-2 text-blue-900">🔐 Lit Protocol Encryption</h3>
            <p className="text-sm text-blue-700">
              Your documents are now encrypted using Lit Protocol with wallet-based access control. 
              No key management needed - just connect your wallet to decrypt documents from any device.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-gray-500">No profile found.</div>
      )}
    </div>
  );
}

export default UserProfile;