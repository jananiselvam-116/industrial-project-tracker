import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import '../styles/dashboard.css';
import '../styles/tender.css';

// ── Helpers ───────────────────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ProgressBar({ pct }) {
  const p = Math.min(100, Math.max(0, pct || 0));
  const cls = p >= 100 ? 'fill-success' : p >= 60 ? '' : p >= 30 ? 'fill-warning' : 'fill-danger';
  return (
    <div>
      <div className="progress-track" style={{ height: 8 }}>
        <div className={`progress-fill ${cls}`} style={{ width: `${p}%` }} />
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 3 }}>{p}%</div>
    </div>
  );
}

function statusBadge(status) {
  const map = {
    EmployeeSubmitted: ['badge-info',    '⏳ Pending'],
    ManagerApproved:  ['badge-success', '✅ Approved'],
    Rejected:         ['badge-danger',  '❌ Rejected'],
  };
  const [cls, label] = map[status] || ['badge-neutral', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function billBadge(status) {
  const map = {
    CompanySubmitted: ['badge-warning', '📤 Submitted'],
    EmployeeVerified: ['badge-info',    '🔍 Verified'],
    ManagerApproved:  ['badge-success', '✅ Approved'],
    Rejected:         ['badge-danger',  '❌ Rejected'],
  };
  const [cls, label] = map[status] || ['badge-neutral', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

const NAV = [
  { key: 'Dashboard',    icon: '📊', label: 'Dashboard'           },
  { key: 'Projects',     icon: '🏗️', label: 'Manage Projects'     },
  { key: 'Team',         icon: '👥', label: 'Manage Team'         },
  { key: 'Verifications',icon: '✅', label: 'Verification Reports' },
  { key: 'Bills',        icon: '🧾', label: 'Bill Management'      },
  { key: 'Approvals',    icon: '✅', label: 'Pending Approvals'   },
];

// ─────────────────────────────────────────────────────────────
export default function ManagerDashboard({ user, onLogout }) {
  const [active, setActive]           = useState('Dashboard');
  const [projects, setProjects]       = useState([]);
  const [users, setUsers]             = useState([]);
  const [bills, setBills]             = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [msg, setMsg]                 = useState(null);

  // Engineer form state for Managers
  const [teamForm, setTeamForm] = useState({ username: '', password: '', name: '', email: '', phone: '', designation: '' });
  const [teamLoading, setTeamLoading] = useState(false);

  // ── Loaders ──────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [projRes, usersRes, billRes, verifRes, pendingRes] = await Promise.all([
        api.get('/projects'),
        api.get('/auth/users'),
        api.get('/bills'),
        api.get('/verification'),
        api.get('/admin-users/pending'),
      ]);
      setProjects(projRes.data);
      setUsers(usersRes.data);
      setBills(billRes.data);
      setVerifications(verifRes.data);
      setPendingUsers(pendingRes.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  const handleCreateTeamEngineer = async (e) => {
    e.preventDefault();
    setTeamLoading(true);
    try {
      await api.post('/auth/register', { ...teamForm, role: 'Employee', managerId: user._id });
      showMsg('success', `✅ Team Site Engineer "${teamForm.name}" created successfully!`);
      setTeamForm({ username: '', password: '', name: '', email: '', phone: '', designation: '' });
      await load();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to create site engineer.');
    }
    setTeamLoading(false);
  };

  const employees = users.filter(u => u.role === 'Employee');

  const handleApproveUser = async (userId) => {
    try {
      await api.put(`/admin-users/${userId}/approve`);
      showMsg('success', '✅ User approved successfully!');
      await load();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to approve user.');
    }
  };

  const handleAssignEmployee = async (projectId, employeeId) => {
    try {
      await api.put(`/projects/${projectId}`, { assignedEngineers: employeeId ? [employeeId] : [] });
      showMsg('success', '✅ Site Engineer assigned successfully!');
      await load();
    } catch { showMsg('error', 'Failed to assign Site Engineer.'); }
  };

  const handleVerifStatus = async (id, status) => {
    try {
      await api.patch(`/verification/${id}/status`, { status });
      showMsg('success', `Report ${status === 'ManagerApproved' ? 'approved' : 'rejected'}!`);
      await load();
    } catch { showMsg('error', 'Failed to update verification status.'); }
  };

  const handleBillStatus = async (id, status) => {
    try {
      await api.patch(`/bills/${id}/status`, { status });
      showMsg('success', `Bill ${status === 'ManagerApproved' ? 'approved' : 'rejected'}!`);
      await load();
    } catch { showMsg('error', 'Failed to update bill status.'); }
  };

  // ── Counts ───────────────────────────────────────────────
  const pendingVerif  = verifications.filter(v => v.status === 'EmployeeSubmitted').length;
  const pendingBills  = bills.filter(b => b.status === 'EmployeeVerified').length;
  const completedProj = projects.filter(p => p.status === 'Completed' || p.completionPercentage >= 100).length;

  if (loading) return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>Loading manager dashboard…</p>
    </div>
  );

  // ── Sections ─────────────────────────────────────────────
  const sections = {
    Dashboard: (
      <>
        <div className="stat-cards">
          {[
            { label: 'My Projects',            value: projects.length,     icon: '🏗️', accent: 'blue'   },
            { label: 'Completed Projects',     value: completedProj,       icon: '✅', accent: 'green'  },
            { label: 'Pending Verifications',  value: pendingVerif,        icon: '⏳', accent: 'amber'  },
            { label: 'Bills to Approve',       value: pendingBills,        icon: '🧾', accent: 'red'    },
            { label: 'Total Employees',        value: employees.length,    icon: '👷', accent: 'purple' },
          ].map(s => (
            <div key={s.label} className={`stat-card accent-${s.accent}`}>
              <div className="stat-card-icon">{s.icon}</div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value">{s.value}</div>
            </div>
          ))}
        </div>

        {msg && <div className={`upload-msg ${msg.type}`}>{msg.text}</div>}

        <div className="content-section">
          <div className="section-head"><h2 className="section-head-title">Project Overview</h2></div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>#</th><th>Project Name</th><th>Location</th><th>Status</th><th>Completion</th><th>Assigned Engineer</th></tr>
              </thead>
              <tbody>
                {projects.length === 0 && <tr><td colSpan={6}><div className="empty-state"><p>No projects assigned yet.</p></div></td></tr>}
                {projects.map((p, i) => {
                  const emp = p.assignedEngineers?.[0];
                  return (
                    <tr key={p._id}>
                      <td>{i+1}</td>
                      <td>
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{p.category}</div>
                      </td>
                      <td>{p.location}</td>
                      <td><span className="badge badge-primary">{p.status}</span></td>
                      <td style={{ minWidth: 140 }}><ProgressBar pct={p.completionPercentage || 0} /></td>
                      <td>{emp ? emp.name : <span className="text-muted">Unassigned</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    ),

    Projects: (
      <div className="content-section">
        <div className="section-head"><h2 className="section-head-title">Assign Site Engineers to Projects</h2></div>
        {msg && <div className={`upload-msg ${msg.type}`} style={{ margin: '0 24px 12px' }}>{msg.text}</div>}
        {projects.length === 0 ? (
          <div className="section-body"><div className="empty-state"><p>No projects created yet.</p></div></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>#</th><th>Project Name</th><th>Location</th><th>Current Status</th><th>Current Engineer</th><th>Assign Engineer</th></tr>
              </thead>
              <tbody>
                {projects.map((p, i) => {
                  const currentEmp = p.assignedEngineers?.[0];
                  const currentEmpId = currentEmp?._id || currentEmp;
                  return (
                    <tr key={p._id}>
                      <td>{i+1}</td>
                      <td><strong>{p.name}</strong><div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{p.category}</div></td>
                      <td>{p.location}</td>
                      <td><span className="badge badge-info">{p.status}</span></td>
                      <td>
                        {currentEmpId
                          ? <span className="badge badge-success">{employees.find(e => String(e._id) === String(currentEmpId))?.name || 'Assigned'}</span>
                          : <span className="badge badge-neutral">Unassigned</span>}
                      </td>
                      <td>
                        <select
                          value={currentEmpId || ''}
                          onChange={e => handleAssignEmployee(p._id, e.target.value)}
                          style={{ width: 220, padding: '8px 10px' }}
                          id={`assign-emp-${p._id}`}
                        >
                          <option value="">-- Assign Site Engineer --</option>
                          {employees.map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name} ({emp.designation || 'Engineer'})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ),

    Team: (
      <>
        {msg && <div className={`upload-msg ${msg.type}`}>{msg.text}</div>}
        <div className="content-section">
          <div className="section-head"><h2 className="section-head-title">Add Team Site Engineer</h2></div>
          <div className="section-body">
            <form onSubmit={handleCreateTeamEngineer}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Full Name *</label>
                  <input placeholder="e.g. Ramesh Kumar" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} required />
                </div>
                <div className="form-field">
                  <label>Designation *</label>
                  <input placeholder="e.g. Junior Site Inspector" value={teamForm.designation} onChange={e => setTeamForm({...teamForm, designation: e.target.value})} required />
                </div>
                <div className="form-field">
                  <label>Username *</label>
                  <input placeholder="e.g. ramesh_kumar" value={teamForm.username} onChange={e => setTeamForm({...teamForm, username: e.target.value})} required />
                </div>
                <div className="form-field">
                  <label>Email *</label>
                  <input type="email" placeholder="e.g. ramesh@gov.in" value={teamForm.email} onChange={e => setTeamForm({...teamForm, email: e.target.value})} required />
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <input placeholder="e.g. +91 90000 88888" value={teamForm.phone} onChange={e => setTeamForm({...teamForm, phone: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>Password *</label>
                  <input type="password" value={teamForm.password} onChange={e => setTeamForm({...teamForm, password: e.target.value})} required />
                </div>
              </div>
              <button type="submit" id="add-team-btn" className="btn btn-primary" disabled={teamLoading} style={{ marginTop: 20 }}>
                {teamLoading ? 'Creating…' : '👷 Create Site Engineer'}
              </button>
            </form>
          </div>
        </div>

        <div className="content-section">
          <div className="section-head">
            <h2 className="section-head-title">Active Team Members</h2>
            <span className="badge badge-neutral">{employees.length} active</span>
          </div>
          {employees.length === 0 ? (
            <div className="section-body"><div className="empty-state"><p>No team members created yet. Create one above.</p></div></div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Username</th><th>Designation</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {employees.map((emp, i) => (
                    <tr key={emp._id}>
                      <td>{i+1}</td>
                      <td><strong>{emp.name}</strong></td>
                      <td>{emp.email}</td>
                      <td>@{emp.username}</td>
                      <td><span className="badge badge-primary">{emp.designation || 'Site Engineer'}</span></td>
                      <td>{emp.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    ),

    Verifications: (
      <div className="content-section">
        <div className="section-head">
          <h2 className="section-head-title">Employee Verification Reports</h2>
          {pendingVerif > 0 && <span className="badge badge-warning">⏳ {pendingVerif} pending</span>}
        </div>
        {msg && <div className={`upload-msg ${msg.type}`} style={{ margin: '0 24px 12px' }}>{msg.text}</div>}
        {verifications.length === 0 ? (
          <div className="section-body"><div className="empty-state"><p>No verification reports submitted yet.</p></div></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>#</th><th>Project Name</th><th>Location</th><th>Workers verified</th><th>GPS Coordinates</th><th>Submitted By</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {verifications.map((v, i) => (
                  <tr key={v._id}>
                    <td>{i+1}</td>
                    <td><strong>{v.projectId?.name || '—'}</strong></td>
                    <td>{v.projectId?.location || '—'}</td>
                    <td>{v.actualWorkers} workers</td>
                    <td>
                      {v.gpsLat ? (
                        <span className="gps-indicator">📍 {v.gpsLat?.toFixed(4)}, {v.gpsLng?.toFixed(4)}</span>
                      ) : '—'}
                    </td>
                    <td>{v.submittedBy?.name || '—'}</td>
                    <td>{statusBadge(v.status)}</td>
                    <td>
                      {v.status === 'EmployeeSubmitted' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-success" id={`approve-verif-${v._id}`} onClick={() => handleVerifStatus(v._id, 'ManagerApproved')}>✅ Approve</button>
                          <button className="btn btn-sm btn-danger" id={`reject-verif-${v._id}`} onClick={() => handleVerifStatus(v._id, 'Rejected')}>❌ Reject</button>
                        </div>
                      )}
                      {v.status !== 'EmployeeSubmitted' && <span className="text-muted text-sm">Reviewed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ),

    Bills: (
      <div className="content-section">
        <div className="section-head">
          <h2 className="section-head-title">Bill Management</h2>
          {pendingBills > 0 && <span className="badge badge-danger">🧾 {pendingBills} awaiting approval</span>}
        </div>
        {msg && <div className={`upload-msg ${msg.type}`} style={{ margin: '0 24px 12px' }}>{msg.text}</div>}
        {bills.length === 0 ? (
          <div className="section-body"><div className="empty-state"><p>No bills submitted yet.</p></div></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>#</th><th>Bill Name</th><th>Project</th><th>Claimed (₹)</th><th>Verified Cost (₹)</th><th>Details</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {bills.map((b, i) => (
                  <tr key={b._id}>
                    <td>{i+1}</td>
                    <td><strong>{b.billName || '—'}</strong></td>
                    <td>{b.projectId?.name || '—'}</td>
                    <td>{fmt(b.amount)}</td>
                    <td>{b.actualCostCalculated ? fmt(b.actualCostCalculated) : <span className="text-muted">Not verified</span>}</td>
                    <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.billDetails || '—'}</td>
                    <td>{billBadge(b.status)}</td>
                    <td>
                      {b.status === 'EmployeeVerified' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-success" id={`approve-bill-${b._id}`} onClick={() => handleBillStatus(b._id, 'ManagerApproved')}>✅ Approve</button>
                          <button className="btn btn-sm btn-danger" id={`reject-bill-${b._id}`} onClick={() => handleBillStatus(b._id, 'Rejected')}>❌ Reject</button>
                        </div>
                      )}
                      {b.status !== 'EmployeeVerified' && <span className="text-muted text-sm">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ),

    Approvals: (
      <div className="content-section">
        <div className="section-head">
          <h2 className="section-head-title">Pending Employee Approvals</h2>
          <span className="badge badge-warning">{pendingUsers.length} pending</span>
        </div>
        {msg && <div className={`upload-msg ${msg.type}`} style={{ margin: '12px 24px' }}>{msg.text}</div>}
        {pendingUsers.length === 0 ? (
          <div className="section-body"><div className="empty-state"><p>No pending approvals.</p></div></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>#</th><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Date Joined</th><th>Action</th></tr>
              </thead>
              <tbody>
                {pendingUsers.map((u, i) => (
                  <tr key={u._id}>
                    <td>{i+1}</td>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-primary">{u.role}</span></td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button className="btn btn-success" style={{ padding: '6px 12px' }} onClick={() => handleApproveUser(u._id)}>
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
                </table>
          </div>
        )}
      </div>
    ),
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-glow" style={{ background: 'radial-gradient(circle at 20% 20%, hsla(37,91%,55%,0.18), transparent 40%)' }} />
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" style={{ background: 'linear-gradient(135deg, hsla(37,91%,55%,0.7), hsla(37,91%,55%,0.3))' }}>📋</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">{user?.name || 'Manager'}</div>
            <div className="sidebar-brand-role">Manager Portal</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button key={item.key} type="button" id={`nav-${item.key.toLowerCase()}`}
              className={`sidebar-nav-btn ${active === item.key ? 'active' : ''}`}
              onClick={() => setActive(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.key === 'Verifications' && pendingVerif > 0 && <span className="sidebar-badge">{pendingVerif}</span>}
              {item.key === 'Bills'         && pendingBills > 0 && <span className="sidebar-badge">{pendingBills}</span>}
              {item.key === 'Approvals'     && pendingUsers.length > 0 && <span className="sidebar-badge">{pendingUsers.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-avatar" style={{ background: 'linear-gradient(135deg, var(--warning), hsl(37,91%,65%))' }}>
            {(user?.name || 'M')[0].toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || '—'}</div>
            <div className="sidebar-user-email">{user?.email || '—'}</div>
          </div>
          <button type="button" id="logout-btn" className="sidebar-logout-btn" onClick={onLogout} title="Logout">⏻</button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dash-topbar">
          <div className="dash-topbar-left">
            <div className="dash-topbar-eyebrow" style={{ color: 'var(--warning)' }}>Manager Dashboard</div>
            <h1 className="dash-topbar-title">{NAV.find(n => n.key === active)?.label}</h1>
          </div>
          <div className="dash-topbar-right">
            {(pendingVerif + pendingBills + pendingUsers.length) > 0 && (
              <span className="badge badge-warning">⚠ {pendingVerif + pendingBills + pendingUsers.length} pending approvals</span>
            )}
            <div className="topbar-user-chip">
              <div className="topbar-avatar" style={{ background: 'linear-gradient(135deg, var(--warning), hsl(37,91%,65%))' }}>
                {(user?.name || 'M')[0].toUpperCase()}
              </div>
              <span className="topbar-name">Manager</span>
            </div>
          </div>
        </header>
        <div className="dash-content">{sections[active]}</div>
      </div>
    </div>
  );
}
