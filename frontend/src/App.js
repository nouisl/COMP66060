// import styles and components
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import UserRegistration from './components/UserRegistration';
import UserProfile from './components/UserProfile.js';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import Header from './components/Header';
import Footer from './components/Footer';
import { useMoralis } from 'react-moralis';

// PrivateRoute wrapper
function PrivateRoute({ children }) {
  const { account } = useMoralis();
  return account ? children : <Navigate to="/register" replace />;
}

// App component
function App() {
  return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Router>
          <Header />
          <main className="flex-grow flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
  
              {/* routes */}
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/upload" element={<DocumentUpload />} />
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
