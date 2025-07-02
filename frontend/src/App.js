// import styles and components
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import UserRegistration from './components/UserRegistration';
import UserProfile from './components/UserProfile.js';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import Header from './components/Header';
import Footer from './components/Footer';

// App component
function App() {
  return (
    <div className="App">
      <Router>
        <Header />
        <div className="min-h-screen flex flex-col">
          <main className="flex-grow container mx-auto px-4 py-8">
            {/* Defining routes */}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<DocumentUpload />} />
              <Route path="/documents" element={<DocumentList />} />
              <Route path="/register" element={<UserRegistration />} />
              <Route path="/profile" element={<UserProfile />} />
            </Routes>
          </main>
        </div>
        <Footer />
      </Router>
    </div>
  );
}

export default App;
