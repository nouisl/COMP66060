import React, { useState } from 'react';
import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';
import { useNotification } from '@web3uikit/core';
import { useNavigate } from 'react-router-dom';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function UserRegistration() {
  const [firstName, setFirstName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const dispatch = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error('No wallet found');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const message = 'Register for Docu³';
      const signature = await signer.signMessage(message);
      const hash = ethers.hashMessage(message);
      const recoveredPublicKey = ethers.SigningKey.recoverPublicKey(hash, signature);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, signer);
      const dobTimestamp = Math.floor(new Date(dob).getTime() / 1000);
      const tx = await contract.registerUser(firstName, familyName, email, dobTimestamp, recoveredPublicKey);
      await tx.wait();
      setSuccess('Profile registered successfully!');
      dispatch({
        type: 'success',
        message: 'Profile registered successfully!',
        title: 'Registration Complete',
        position: 'topR',
      });
      setTimeout(() => {
        window.location.replace('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed.');
      dispatch({
        type: 'error',
        message: err.message || 'Registration failed.',
        title: 'Registration Error',
        position: 'topR',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center px-4 mt-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8 mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Register</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="First Name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Family Name *</label>
            <input
              type="text"
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Family Name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
            <input
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-2">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-2">{success}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UserRegistration;