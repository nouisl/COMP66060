// import styles and components
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import UserRegistration from './components/UserRegistration';
import UserProfile from './components/UserProfile';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import DocumentDetail from './components/DocumentDetail';
import Header from './components/Header';
import Footer from './components/Footer';
import SignatureVerifier from './components/SignatureVerifier';
import { useMoralis } from 'react-moralis';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import Docu3 from './contracts/Docu3.json'; 
import Dashboard from './components/Dashboard';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

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

function PrivateRoute({ children }) {
  const { account } = useMoralis();
  const [profileChecked, setProfileChecked] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (account) {
        const registered = await checkUserRegistered(account);
        setIsRegistered(registered);
      } else {
        setIsRegistered(false);
      }
      setProfileChecked(true);
    };
    checkProfile();
  }, [account]);

  if (!account) return <Navigate to="/register" replace />;
  if (!profileChecked) return null;
  if (!isRegistered) return <Navigate to="/register" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { account } = useMoralis();
  const [profileChecked, setProfileChecked] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (account) {
        const registered = await checkUserRegistered(account);
        setIsRegistered(registered);
      } else {
        setIsRegistered(false);
      }
      setProfileChecked(true);
    };
    checkProfile();
  }, [account]);

  if (!profileChecked) return null;
  if (isRegistered) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  const { account } = useMoralis();
  const [profileChecked, setProfileChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      if (account) {
        const registered = await checkUserRegistered(account);
        if (!registered) {
          navigate('/register');
        }
      }
      setProfileChecked(true);
    };
    checkProfile();
  }, [account, navigate]);

  if (!profileChecked) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<PrivateRoute><DocumentUpload /></PrivateRoute>} />
          <Route path="/documents" element={<PrivateRoute><DocumentList /></PrivateRoute>} />
          <Route path="/documents/:docId" element={<PrivateRoute><DocumentDetail /></PrivateRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><UserRegistration /></PublicOnlyRoute>} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/verify" element={<SignatureVerifier />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
