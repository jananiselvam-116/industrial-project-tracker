import { Navigate } from 'react-router-dom';

function ProtectedRoute({ user, requiredRole, children }) {
  // Check if user is logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // SuperAdmin can access Government routes
  let userRoleToCheck = user.role;
  if (userRoleToCheck === 'SuperAdmin') {
    userRoleToCheck = 'Government';
  }

  // Check if user has the correct role for this page
  if (requiredRole && requiredRole !== userRoleToCheck) {
    // Send them back to their correct dashboard
    if (userRoleToCheck === 'Government') {
      return <Navigate to="/government" replace />;
    } else if (userRoleToCheck === 'Manager') {
      return <Navigate to="/manager" replace />;
    } else if (userRoleToCheck === 'Employee') {
      return <Navigate to="/employee" replace />;
    } else if (userRoleToCheck === 'Company') {
      return <Navigate to="/company" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }
  
  // User is allowed, render the page
  return children;
}

export default ProtectedRoute;
