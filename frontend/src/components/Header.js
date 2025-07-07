import { Link } from 'react-router-dom';
import { ConnectButton } from '@web3uikit/web3';
import { useMoralis } from 'react-moralis';

function Header() {
  const { account } = useMoralis();
  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Docu³
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium">
                Home
              </Link>
              <Link to="/upload" className="px-3 py-2 rounded-md text-sm font-medium">
                Upload
              </Link>
              {account && (
                <Link to="/documents" className="px-3 py-2 rounded-md text-sm font-medium">
                  Documents
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/profile" className="px-3 py-2 rounded-md text-sm font-medium">
              Profile
            </Link>
            <Link to="/register" className="px-3 py-2 rounded-md text-sm font-medium">
              Register
            </Link>
            <ConnectButton />
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header; 