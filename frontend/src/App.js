// import styles and components
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import UserRegistration from './components/UserRegistration';
import UserProfile from './components/UserProfile.js';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import Header from './components/Header';
import Footer from './components/Footer';
import { useMoralis } from 'react-moralis';
import { useEffect, useState } from 'react';
import { getUserProfile } from './orbis/orbisService';

function PrivateRoute({ children }) {
  const { account } = useMoralis();
  const [profileChecked, setProfileChecked] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (account) {
        try {
          const profile = await getUserProfile(account);
          setIsRegistered(!!profile);
        } catch {
          setIsRegistered(false);
        }
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

function App() {
  const { account } = useMoralis();
  const [profileChecked, setProfileChecked] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      if (account) {
        try {
          const profile = await getUserProfile(account);
          setIsRegistered(!!profile);
          if (!profile) {
            navigate('/register');
          }
        } catch {
          setIsRegistered(false);
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
        <Router>
          <Header />
          <main className="flex-grow flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
  
              {/* routes */}
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/upload" element={<PrivateRoute><DocumentUpload /></PrivateRoute>} />
                <Route path="/documents" element={
                  <PrivateRoute>
                    <DocumentList />
                  </PrivateRoute>
                } />
                <Route path="/register" element={<UserRegistration />} />
                <Route path="/profile" element={<UserProfile />} />
              </Routes>
            
        </main>
        <Footer />
      </Router>
    </div>
  );
}

export default App;
