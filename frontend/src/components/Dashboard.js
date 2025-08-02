// imports
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMoralis } from 'react-moralis';
import { documentService } from '../utils/documentService';

// Dashboard component
function Dashboard() {
  const { account } = useMoralis();
  // define state for dashboard stats
  const [stats, setStats] = useState({
    totalDocuments: 0,
    pendingSignatures: 0,
    signedDocuments: 0,
    createdDocuments: 0
  });
  // define loading and refreshing states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // get user info from the blockchain
  const fetchStats = async () => {
    if (!account) return;
    try {
      documentService.clearCache();
      const stats = await documentService.getStatsForUser(account);
      setStats(stats);
    } catch (err) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // load user info when component mounts or account changes
  useEffect(() => {
    let isMounted = true;
    
    async function loadStats() {
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
    
    loadStats();
    
    return () => {
      isMounted = false;
    };
  }, [account]);

  // refresh user info when button is clicked
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
  };

  // show loading state when getting data
  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;

  // return dashboard with stats and quick actions
  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* show header with refresh button */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
        >
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
      {/* display stats cards */}
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

      {/* quick actions and recent activity section */}
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
            {/* show pending signatures message if any exist */}
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

// export the Dashboard component
export default Dashboard;
