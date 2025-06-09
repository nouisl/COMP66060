// import styles and components
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3ProviderWrapper } from './context/Web3Context';
import Home from './components/Home';
import UserRegistration from './components/UserRegistration';
import UserProfile from './components/UserProfile.js';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import Header from './components/Header';
import Footer from './components/Footer';
import { NotificationProvider } from '@web3uikit/core';

// App component
function App() {
  return (
    <div className="App">
      <NotificationProvider>
        <Web3ProviderWrapper>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              <Router>
                {/* Defining routes */}
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/upload" element={<DocumentUpload />} />
                  <Route path="/documents" element={<DocumentList />} />
                  <Route path="/register" element={<UserRegistration />} />
                  <Route path="/profile" element={<UserProfile />} />
                </Routes>
              </Router>
            </main>
            <Footer />
          </div>
        </Web3ProviderWrapper>
      </NotificationProvider>
    </div>
  );
}

export default App;
