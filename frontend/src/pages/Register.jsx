import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/app.css';

function Register() {
  const [fullName, setFullName] = useState('');
  const [userName, setUserName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('Manager');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const response = await api.post('/auth/public-register', {
        name: fullName,
        username: userName,
        email: emailAddress,
        phone: phoneNumber,
        password: userPassword,
        role: userRole
      });
      
      setSuccessMessage(response.data.message || 'Registration successful. Waiting for admin approval.');
      
      // Go to login page after 5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 5000);
      
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Registration failed. Please try again.');
      }
    }
    
    setIsRegistering(false);
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
            <div className="login-form-title">Create Account</div>
            <div className="login-form-subtitle">Register as a Manager or Site Engineer</div>
          </div>

          {errorMessage && (
            <div className="alert-error" style={{ margin: '10px 0', padding: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 4, textAlign: 'center' }}>
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="alert-success" style={{ margin: '10px 0', padding: 10, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: 4, textAlign: 'center' }}>
              {successMessage}
            </div>
          )}

          {!successMessage && (
            <form className="login-form" onSubmit={handleRegisterSubmit}>
              <div>
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Create password"
                  required
                />
              </div>

              <div>
                <label htmlFor="role">Role</label>
                <select 
                  id="role" 
                  value={userRole} 
                  onChange={(e) => setUserRole(e.target.value)} 
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                >
                  <option value="Manager" style={{ color: 'black' }}>Manager</option>
                  <option value="Employee" style={{ color: 'black' }}>Site Engineer (Employee)</option>
                </select>
              </div>

              <button type="submit" className="login-submit-btn" disabled={isRegistering}>
                {isRegistering ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
          )}

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
