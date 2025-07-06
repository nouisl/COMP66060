import { Link } from 'react-router-dom';
import { useMoralis } from 'react-moralis';

function Home() {
  const { account } = useMoralis();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* section 1 - intro */}
      <div className="mx-auto px-16 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">Docu³</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The decentralized document signing platform built on Polygon. 
            Secure, transparent, and immutable document management with IPFS storage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {account ? (
              <Link
                to="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Get Started
              </Link>
            )}
            <Link
              to="/documents"
              className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              View Documents
            </Link>
          </div>
        </div>

        {/* section 2 - features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Signing</h3>
            <p className="text-gray-600">
              Sequential document signing with blockchain verification and IPFS storage for complete transparency.
            </p>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Decentralized</h3>
            <p className="text-gray-600">
              Built on Polygon blockchain with IPFS storage. No central authority, complete user control.
            </p>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Audit Trail</h3>
            <p className="text-gray-600">
              Complete audit trail with timestamps, amendments, and revocation history on the blockchain.
            </p>
          </div>
        </div>

        
      </div>
    </div>
  );
}

export default Home;