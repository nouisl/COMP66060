import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useMoralis } from 'react-moralis';
import Docu3ABI from '../contracts/Docu3.json';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

function Dashboard() {
  const { account } = useMoralis();
  const [stats, setStats] = useState({
    totalDocuments: 0,
    pendingSignatures: 0,
    signedDocuments: 0,
    createdDocuments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!account) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3ABI, provider);
        const count = await contract.documentCount();
        
        let totalDocs = 0;
        let pendingSigs = 0;
        let signedDocs = 0;
        let createdDocs = 0;

        for (let i = 1; i <= count; i++) {
          const doc = await contract.getDocument(i);
          const isSigner = doc.signers && doc.signers.map(addr => addr.toLowerCase()).includes(account?.toLowerCase());
          const isCreator = doc.creator && doc.creator.toLowerCase() === account?.toLowerCase();
          
          if (isSigner || isCreator) {
            totalDocs++;
            if (isCreator) createdDocs++;
            if (isSigner && !doc.fullySigned) pendingSigs++;
            if (doc.fullySigned) signedDocs++;
          }
        }

        setStats({
          totalDocuments: totalDocs,
          pendingSignatures: pendingSigs,
          signedDocuments: signedDocs,
          createdDocuments: createdDocs
        });
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [account]);

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Documents</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalDocuments}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Signatures</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingSignatures}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Signed Documents</h3>
          <p className="text-3xl font-bold text-green-600">{stats.signedDocuments}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Created Documents</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.createdDocuments}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link 
              to="/upload" 
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors text-center"
            >
              Upload New Document
            </Link>
            <Link 
              to="/documents" 
              className="block w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors text-center"
            >
              View All Documents
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-gray-600">
            {stats.pendingSignatures > 0 ? (
              <p className="text-yellow-600 font-medium">
                You have {stats.pendingSignatures} document(s) waiting for your signature
              </p>
            ) : (
              <p>No pending signatures</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
