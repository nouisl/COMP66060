import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
              Docu3
            </h3>
            <p className="mt-4 text-base text-gray-500">
              Decentralized document signing system powered by Polygon blockchain and IPFS.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/" className="text-base text-gray-500 hover:text-gray-900">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/upload" className="text-base text-gray-500 hover:text-gray-900">
                  Upload Document
                </Link>
              </li>
              <li>
                <Link to="/documents" className="text-base text-gray-500 hover:text-gray-900">
                  View Documents
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
              Resources
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <a
                  href="https://polygon.technology/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-gray-500 hover:text-gray-900"
                >
                  Polygon Network
                </a>
              </li>
              <li>
                <a
                  href="https://ipfs.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-gray-500 hover:text-gray-900"
                >
                  IPFS
                </a>
              </li>
              <li>
                <a
                  href="https://metamask.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-gray-500 hover:text-gray-900"
                >
                  MetaMask
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-base text-gray-400 text-center">
            © {new Date().getFullYear()} Docu³. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 