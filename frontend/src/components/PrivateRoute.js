// imports
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Web3Context } from '../context/Web3Context';

// PrivateRoute component
function PrivateRoute({ children }) {
  const { isRegistered } = useContext(Web3Context);
  // redirect to register if user not registered
  if (!isRegistered) {
    return <Navigate to="/register" replace />;
  }
  return children;
}

// export the PrivateRoute component
export default PrivateRoute; 