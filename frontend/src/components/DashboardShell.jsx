import { useState } from 'react';
import '../styles/dashboard.css';

function DashboardShell({ title, subtitle, user, children, onLogout, sections, activeTab, onTabChange }) {
  const [internalActive, setInternalActive] = useState('Dashboard');
  const activeSection = activeTab || internalActive;
  const setActiveSection = onTabChange || setInternalActive;

  const navItems = ['Dashboard', 'Projects', 'Companies', 'Reports', 'Users'];

  const renderSection = () => {
    if (sections && sections[activeSection]) {
      return sections[activeSection];
    }

    if (activeSection === 'Dashboard') {
      return children;
    }

    return (
      <div className="report-section">
        <div className="section-header">
          <h2>{activeSection}</h2>
        </div>
        <p>Content for the {activeSection} section is not configured yet.</p>
      </div>
    );
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-link ${activeSection === item ? 'active' : ''}`}
              onClick={() => setActiveSection(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>Logged in as</span>
          <strong>{user?.role || 'User'}</strong>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <div className="topbar-label">{user?.role || 'Dashboard'} Overview</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </header>
        {renderSection()}
      </main>
    </div>
  );
}

export default DashboardShell;
