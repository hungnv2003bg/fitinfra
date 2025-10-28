import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requiredRoles = [] }) {
  const { quyenList } = useSelector(state => state.user);

  const hasAccess = () => {
    if (!quyenList || quyenList.length === 0) return false;
    if (requiredRoles.length === 0) return true;
    
    return quyenList.some(role => 
      requiredRoles.some(requiredRole => 
        role === requiredRole || role === `ROLE_${requiredRole}`
      )
    );
  };

  if (!hasAccess()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;

