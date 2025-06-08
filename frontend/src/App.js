import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3ProviderWrapper } from './context/Web3Context';
import Home from './components/Home';
import UserRegistration from './components/UserRegistration';
import UserProfile from './components/UserProfile.js';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import Header from './components/Header';
import Footer from './components/Footer';


function App() {
  return (
    <Router>
      <Web3ProviderWrapper>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<DocumentUpload />} />
              <Route path="/documents" element={<DocumentList />} />
              <Route path="/register" element={<UserRegistration />} />
              <Route path="/profile" element={<UserProfile />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Web3ProviderWrapper>
    </Router>
  );
}

export default App;
