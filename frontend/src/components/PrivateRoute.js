import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Web3Context } from '../context/Web3Context';

function PrivateRoute({ children }) {
  const { isRegistered } = useContext(Web3Context);
  if (!isRegistered) {
    return <Navigate to="/register" replace />;
  }
  return children;
}

export default PrivateRoute; 