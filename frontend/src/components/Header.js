
import { Link } from 'react-router-dom';
function Header () {

  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Docu3
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium`}
              >
                Home
              </Link>
              <Link
                to="/upload"
                className={`px-3 py-2 rounded-md text-sm font-medium`}
              >
                Upload
              </Link>
              <Link
                to="/documents"
                className={`px-3 py-2 rounded-md text-sm font-medium`}
              >
                Documents
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            
              <>
                <Link
                  to="/profile"
                  className={`px-3 py-2 rounded-md text-sm font-medium`}
                >
                  Profile
                </Link>
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                </button>
              </>
              <>
                <Link
                  to="/register"
                  className={`px-3 py-2 rounded-md text-sm font-medium`}
                >
                  Register
                </Link>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Connect Wallet
                </button>
              </>
          
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header; 