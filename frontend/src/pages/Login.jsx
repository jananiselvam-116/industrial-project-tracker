import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, saveUserSession } from '../services/authService';
import '../styles/app.css';

function Login({ onLogin }) {
  const [loginId, setLoginId] = useState(''); // can be username or email
  const [userPassword, setUserPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // call api
      const data = await login({
        usernameOrEmail: loginId.trim(),
        password: userPassword.trim(),
      });
      
      const user = saveUserSession(data);
      onLogin(user);
      
      // redirect based on role
      if (user.role === 'Government') {
        navigate('/government');
      } else if (user.role === 'Manager') {
        navigate('/manager');
      } else if (user.role === 'Employee') {
        navigate('/employee');
      } else if (user.role === 'Company') {
        navigate('/company');
      } else {
        navigate('/login');
      }
      
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Invalid credentials. Please try again.');
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-brand">
          <div>
            <div className="brand-icon">🏭</div>
          </div>
          <div>
            <div className="brand-title">Industrial Project<br/>Monitor</div>
            <div className="brand-subtitle" style={{ marginTop: 12 }}>
              A real-world multi-company project management platform with role-based access control.
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <div>
            <div className="login-form-title">Welcome Back</div>
            <div className="login-form-subtitle">Sign in to access your dashboard</div>
          </div>

          {errorMessage && (
            <div className="alert-error" style={{ margin: '10px 0', padding: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 4, textAlign: 'center' }}>
              {errorMessage}
            </div>
          )}

          <form className="login-form" onSubmit={handleLoginSubmit}>
            <div>
              <label htmlFor="identifier">Username or Email Address</label>
              <input
                id="identifier"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Enter username or email"
                required
              />
            </div>

            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Don't have an account? </span>
            <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>Create one here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
