import { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import GovernmentDashboard from './pages/GovernmentDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import ProtectedRoute from './ProtectedRoute';
import { getProfile, logout } from './services/authService';
import './styles/app.css';

const roleDashboard = {
  Government: '/government',
  Manager: '/manager',
  Employee: '/employee',
  Company: '/company',
};

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const profile = await getProfile();
      if (profile) {
        setUser(profile);
        navigate(roleDashboard[profile.role] || '/login');
      }
    };

    loadUser();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route
          path="/government"
          element={<ProtectedRoute user={user} roles={['Government']}><GovernmentDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>}
        />
        <Route
          path="/manager"
          element={<ProtectedRoute user={user} roles={['Manager']}><ManagerDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>}
        />
        <Route
          path="/employee"
          element={<ProtectedRoute user={user} roles={['Employee']}><EmployeeDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>}
        />
        <Route
          path="/company"
          element={<ProtectedRoute user={user} roles={['Company']}><CompanyDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>}
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;
