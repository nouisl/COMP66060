import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMoralis } from 'react-moralis';
import { documentService } from '../utils/documentService';

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
    let isMounted = true;
    
    async function fetchStats() {
      if (!account) return;
      try {
        const stats = await documentService.getStatsForUser(account);
        if (isMounted) {
          setStats(stats);
        }
      } catch (err) {
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchStats();
    
    return () => {
      isMounted = false;
    };
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
