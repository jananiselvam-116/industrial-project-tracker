import { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import GovernmentDashboard from './pages/GovernmentDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import ProtectedRoute from './ProtectedRoute';
import { getProfile, logout } from './services/authService';
import './styles/app.css';

function App() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    async function checkUserSession() {
      const userProfile = await getProfile();
      if (userProfile) {
        setCurrentUser(userProfile);
        
        // Redirect user to their specific dashboard based on role
        if (userProfile.role === 'Government' || userProfile.role === 'SuperAdmin') {
          navigate('/government');
        } else if (userProfile.role === 'Manager') {
          navigate('/manager');
        } else if (userProfile.role === 'Employee') {
          navigate('/employee');
        } else if (userProfile.role === 'Company') {
          navigate('/company');
        } else {
          navigate('/login');
        }
      }
      setIsAuthChecked(true);
    }

    checkUserSession();
  }, [navigate]);

  const handleUserLogout = () => {
    logout();
    setCurrentUser(null);
    navigate('/login');
  };

  // Show a simple loading message while checking auth
  if (!isAuthChecked) {
    return (
      <div className="auth-loading-screen">
        <p>Checking your session, please wait...</p>
      </div>
    );
  }

  return (
    <div className="main-app-container">
      <Routes>
        <Route path="/login" element={<Login onLogin={setCurrentUser} />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/government" element={
          <ProtectedRoute user={currentUser} requiredRole="Government">
            <GovernmentDashboard user={currentUser} onLogout={handleUserLogout} />
          </ProtectedRoute>
        } />
        
        <Route path="/manager" element={
          <ProtectedRoute user={currentUser} requiredRole="Manager">
            <ManagerDashboard user={currentUser} onLogout={handleUserLogout} />
          </ProtectedRoute>
        } />
        
        <Route path="/employee" element={
          <ProtectedRoute user={currentUser} requiredRole="Employee">
            <EmployeeDashboard user={currentUser} onLogout={handleUserLogout} />
          </ProtectedRoute>
        } />
        
        <Route path="/company" element={
          <ProtectedRoute user={currentUser} requiredRole="Company">
            <CompanyDashboard user={currentUser} onLogout={handleUserLogout} />
          </ProtectedRoute>
        } />
        
        {/* Fallback routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;
