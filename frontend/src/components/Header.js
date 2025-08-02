// imports
import { Link } from 'react-router-dom';
import { ConnectButton } from '@web3uikit/web3';
import { useMoralis } from 'react-moralis';
import { useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import Docu3 from '../contracts/Docu3.json';
import { Web3Context } from '../context/Web3Context';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

// Header component
function Header() {
  const { account } = useMoralis();
  const { isRegistered, setIsRegistered } = useContext(Web3Context);

  // check if user is registered
  useEffect(() => {
    async function checkUserRegistered(account) {
      if (!window.ethereum || !account) return false;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, Docu3.abi, provider);
      try {
        const profile = await contract.getUserProfile(account);
        return profile.isRegistered;
      } catch {
        return false;
      }
    }
    if (account) {
      checkUserRegistered(account).then(setIsRegistered);
    } else {
      setIsRegistered(false);
    }
  }, [account, setIsRegistered]);

  // return header 
  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <nav className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Docu³
            </Link>
            <div className="hidden md:flex space-x-4">
              {isRegistered && (
                <>
                  <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium">
                    Dashboard
                  </Link>
                  <Link to="/upload" className="px-3 py-2 rounded-md text-sm font-medium">
                    Upload
                  </Link>
                  <Link to="/documents" className="px-3 py-2 rounded-md text-sm font-medium">
                    Documents
                  </Link>
                </>
              )}
              <Link to="/verify" className="px-3 py-2 rounded-md text-sm font-medium">
                Verify Signatures
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isRegistered && (
              <Link to="/profile" className="px-3 py-2 rounded-md text-sm font-medium">
                Profile
              </Link>
            )}
            <ConnectButton />
          </div>
        </div>
      </nav>
    </header>
  );
}

// export the Header component
export default Header; 