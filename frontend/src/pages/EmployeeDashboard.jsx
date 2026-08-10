import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import '../styles/dashboard.css';
import { CONSTRUCTION_METRICS, getMetricsByPhase } from '../utils/constructionMetrics';

// ── Helpers ───────────────────────────────────────────────────
function ProgressBar({ pct }) {
  const p = Math.min(100, Math.max(0, pct || 0));
  return (
    <div>
      <div className="progress-track" style={{ height: 10 }}>
        <div className="progress-fill" style={{ width: `${p}%` }} />
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 }}>{p}%</div>
    </div>
  );
}

function statusBadge(status) {
  const map = {
    EmployeeSubmitted: ['badge-info',    'Submitted'],
    ManagerApproved:  ['badge-success', 'Approved'],
    Rejected:         ['badge-danger',  'Rejected'],
  };
  const [cls, label] = map[status] || ['badge-neutral', status || 'Unknown'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function billBadge(status) {
  const map = {
    CompanySubmitted: ['badge-warning', 'Pending Verify'],
    EmployeeVerified: ['badge-info',    'Verified'],
    ManagerApproved:  ['badge-success', 'Approved'],
    Rejected:         ['badge-danger',  'Rejected'],
  };
  const [cls, label] = map[status] || ['badge-neutral', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

const NAV = [
  { key: 'Overview',      icon: '📊', label: 'Overview'          },
  { key: 'Assigned',      icon: '🏗️', label: 'Assigned Projects'  },
  { key: 'Verification',  icon: '✅', label: 'Verify Work'        },
  { key: 'Salary',        icon: '💰', label: 'Salary Calculator'  },
  { key: 'BillCheck',     icon: '🧾', label: 'Bill Verification'  },
  { key: 'Reports',       icon: '📋', label: 'My Reports'         },
];

// ─────────────────────────────────────────────────────────────
export default function EmployeeDashboard({ user, onLogout }) {
  const [active, setActive]           = useState('Overview');
  const [projects, setProjects]       = useState([]);
  const [allBills, setAllBills]       = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [salaries, setSalaries]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [msg, setMsg]                 = useState(null);

  // Verification form
  const [vForm, setVForm] = useState({
    projectId: '', materialsUsed: '', actualWorkers: '',
  });
  const [vMetrics, setVMetrics] = useState({});
  const [vLoading, setVLoading] = useState(false);

  // Salary form
  const [sForm, setSForm] = useState({ companyId: '', workerCount: '', workingDays: '', salaryPerWorker: '' });
  const [sLoading, setSLoading] = useState(false);

  // Bill cost state (per bill id)
  const [billCosts, setBillCosts] = useState({});
  const [billVerifyLoading, setBillVerifyLoading] = useState({});

  // ── Loaders ──────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [projRes, billRes, verifRes, salRes] = await Promise.all([
        api.get('/projects'),
        api.get('/bills'),
        api.get('/verification'),
        api.get('/salary'),
      ]);

      setProjects(projRes.data);
      setAllBills(billRes.data);
      setVerifications(verifRes.data);
      setSalaries(salRes.data);
    } catch (err) {
      console.error(err);
    }
  }, [user._id]);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  // Bills pending verification for my assigned projects
  const myProjectIds = new Set(projects.map(p => p._id));
  const pendingBills = allBills.filter(b =>
    b.status === 'CompanySubmitted' && myProjectIds.has(b.projectId?._id || b.projectId)
  );

  // My reports
  const myVerifications = verifications.filter(v => String(v.submittedBy?._id || v.submittedBy) === String(user._id));
  const mySalaries      = salaries.filter(s => String(s.submittedBy?._id || s.submittedBy) === String(user._id));

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  // ── Handlers ─────────────────────────────────────────────
  const handleVerification = async (e) => {
    e.preventDefault();
    setVLoading(true);
    
    // Transform checked metrics into the required format
    const metricVerifications = Object.keys(vMetrics)
      .filter(key => vMetrics[key])
      .map(key => ({
        metricKey: key,
        verified: true,
      }));

    try {
      await api.post('/verification', {
        projectId: vForm.projectId,
        metricVerifications,
        materialsUsed: vForm.materialsUsed,
        actualWorkers: Number(vForm.actualWorkers),
      });
      showMsg('success', '✅ Verification report submitted to manager!');
      setVForm({ projectId: '', materialsUsed: '', actualWorkers: '' });
      setVMetrics({});
      await load();
    } catch { showMsg('error', 'Failed to submit verification report.'); }
    setVLoading(false);
  };

  const handleSalary = async (e) => {
    e.preventDefault();
    setSLoading(true);
    try {
      await api.post('/salary', {
        projectId: sForm.projectId,
        workerCount: Number(sForm.workerCount),
        workingDays: Number(sForm.workingDays),
        salaryPerWorker: Number(sForm.salaryPerWorker),
      });
      showMsg('success', '✅ Salary report submitted to manager!');
      setSForm({ projectId: '', workerCount: '', workingDays: '', salaryPerWorker: '' });
      await load();
    } catch { showMsg('error', 'Failed to submit salary report.'); }
    setSLoading(false);
  };

  const handleBillVerify = async (billId) => {
    const cost = billCosts[billId];
    if (!cost) { showMsg('error', 'Enter calculated actual cost first.'); return; }
    setBillVerifyLoading(prev => ({ ...prev, [billId]: true }));
    try {
      await api.patch(`/bills/${billId}/verify`, { actualCostCalculated: Number(cost) });
      showMsg('success', '✅ Bill verified and sent to manager!');
      await load();
    } catch (err) {
      console.error(err.response?.data || err.message);
      showMsg('error', err.response?.data?.message || 'Failed to verify bill.');
    }
    setBillVerifyLoading(prev => ({ ...prev, [billId]: false }));
  };

  const totalSalary = Number(sForm.workerCount||0) * Number(sForm.workingDays||0) * Number(sForm.salaryPerWorker||0);

  if (loading) return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>Loading employee dashboard…</p>
    </div>
  );

  // ── Sections ─────────────────────────────────────────────
  const sections = {
    Overview: (
      <>
        <div className="stat-cards">
          {[
            { label: 'Assigned Projects', value: projects.length,         icon: '🏗️', accent: 'blue' },
            { label: 'Pending Verifications', value: projects.filter(p => !myVerifications.find(v => String(v.projectId?._id || v.projectId) === String(p._id))).length, icon: '⏳', accent: 'amber' },
            { label: 'Bills to Verify',    value: pendingBills.length,     icon: '🧾', accent: 'red'  },
            { label: 'Reports Submitted',  value: myVerifications.length,  icon: '📋', accent: 'green'},
            { label: 'Salary Reports',     value: mySalaries.length,       icon: '💰', accent: 'teal' },
            { label: 'Reports Approved',   value: myVerifications.filter(v => v.status === 'ManagerApproved').length, icon: '✅', accent: 'purple' },
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
          <div className="section-head"><h2 className="section-head-title">My Assigned Projects</h2></div>
          {projects.length === 0 ? (
            <div className="section-body"><div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No projects assigned yet. Contact the manager to get assigned to a project.</p>
            </div></div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Project</th><th>Company</th><th>Status</th><th>Deadline</th><th>Completion</th></tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p._id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.organisationId?.companyName || '—'}</td>
                      <td><span className="badge badge-primary">{p.status || 'Not Started'}</span></td>
                      <td>{p.expectedCompletionDate ? new Date(p.expectedCompletionDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ minWidth: 140 }}><ProgressBar pct={p.completionPercentage || 0} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    ),

    Assigned: (
      <div className="content-section">
        <div className="section-head"><h2 className="section-head-title">Assigned Projects — Detailed View</h2></div>
        {projects.length === 0 ? (
          <div className="section-body"><div className="empty-state">
            <div className="empty-icon">🏗️</div>
            <p>No projects assigned to you yet.</p>
          </div></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>#</th><th>Project Name</th><th>Company</th><th>Investment (₹)</th><th>Labour Budget (₹)</th><th>Status</th><th>Deadline</th><th>Completion</th></tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p._id}>
                    <td>{i+1}</td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.organisationId?.companyName || '—'}</td>
                    <td>₹{Number(p.budget||0).toLocaleString('en-IN')}</td>
                    <td>₹{Number(p.labourBudget||0).toLocaleString('en-IN')}</td>
                    <td><span className="badge badge-info">{p.status || 'Not Started'}</span></td>
                    <td>{p.expectedCompletionDate ? new Date(p.expectedCompletionDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ minWidth: 140 }}><ProgressBar pct={p.completionPercentage || 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ),

    Verification: (
      <div className="content-section">
        <div className="section-head"><h2 className="section-head-title">Submit Work Verification Report</h2></div>
        <div className="section-body">
          {projects.length === 0 ? (
            <div className="empty-state"><p>No projects assigned. Cannot submit verification.</p></div>
          ) : (
            <form onSubmit={handleVerification}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Select Assigned Project</label>
                  <select value={vForm.projectId} onChange={e => setVForm({...vForm, projectId: e.target.value})} required>
                    <option value="">-- Select Project --</option>
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                
                {vForm.projectId && (
                  <div className="form-field" style={{ gridColumn: '1/-1' }}>
                    <label>Verify Completed Construction Milestones</label>
                    <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      {Object.values(getMetricsByPhase()).map((phase) => (
                        <div key={phase.phaseName} style={{ marginBottom: 16 }}>
                          <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--text)' }}>{phase.phaseName}</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                            {phase.metrics.map(m => (
                              <label key={m.key} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={!!vMetrics[m.key]}
                                  onChange={(e) => setVMetrics({ ...vMetrics, [m.key]: e.target.checked })}
                                  style={{ marginRight: 8 }}
                                />
                                {m.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="form-field">
                  <label>Actual Workers Present</label>
                  <input type="number" min="0" placeholder="e.g. 78" value={vForm.actualWorkers} onChange={e => setVForm({...vForm, actualWorkers: e.target.value})} required />
                </div>
                <div className="form-field" style={{ gridColumn: '1/-1' }}>
                  <label>Materials Used / Verification Notes</label>
                  <textarea rows={3} placeholder="Describe materials used, observations, site condition…" value={vForm.materialsUsed} onChange={e => setVForm({...vForm, materialsUsed: e.target.value})} required style={{ resize: 'vertical' }} />
                </div>
              </div>
              {msg && <div className={`upload-msg ${msg.type}`} style={{ marginTop: 12 }}>{msg.text}</div>}
              <button type="submit" id="submit-verification-btn" className="btn btn-primary" disabled={vLoading} style={{ marginTop: 20 }}>
                {vLoading ? 'Submitting…' : '📋 Submit Verification Report'}
              </button>
            </form>
          )}
        </div>
      </div>
    ),

    Salary: (
      <div className="content-section">
        <div className="section-head"><h2 className="section-head-title">Salary Calculator & Report</h2></div>
        <div className="section-body">
          {projects.length === 0 ? (
            <div className="empty-state"><p>No projects assigned.</p></div>
          ) : (
            <form onSubmit={handleSalary}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Select Project</label>
                  <select value={sForm.projectId} onChange={e => setSForm({...sForm, projectId: e.target.value})} required>
                    <option value="">-- Select Project --</option>
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Number of Workers</label>
                  <input type="number" min="0" placeholder="e.g. 80" value={sForm.workerCount} onChange={e => setSForm({...sForm, workerCount: e.target.value})} required />
                </div>
                <div className="form-field">
                  <label>Working Days</label>
                  <input type="number" min="0" placeholder="e.g. 26" value={sForm.workingDays} onChange={e => setSForm({...sForm, workingDays: e.target.value})} required />
                </div>
                <div className="form-field">
                  <label>Salary Per Worker Per Day (₹)</label>
                  <input type="number" min="0" placeholder="e.g. 500" value={sForm.salaryPerWorker} onChange={e => setSForm({...sForm, salaryPerWorker: e.target.value})} required />
                </div>
              </div>

              <div className="calc-preview" style={{ marginTop: 20 }}>
                <div>
                  <div className="calc-preview-label">Total Salary Calculated</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                    {sForm.workerCount || 0} workers × {sForm.workingDays || 0} days × ₹{sForm.salaryPerWorker || 0}
                  </div>
                </div>
                <div className="calc-preview-value">₹{totalSalary.toLocaleString('en-IN')}</div>
              </div>

              {msg && <div className={`upload-msg ${msg.type}`} style={{ marginTop: 12 }}>{msg.text}</div>}
              <button type="submit" id="submit-salary-btn" className="btn btn-success" disabled={sLoading} style={{ marginTop: 20 }}>
                {sLoading ? 'Submitting…' : '💰 Submit Salary Report'}
              </button>
            </form>
          )}
        </div>
      </div>
    ),

    BillCheck: (
      <div className="content-section">
        <div className="section-head">
          <h2 className="section-head-title">Bill Verification</h2>
          <span className="badge badge-warning">{pendingBills.length} pending</span>
        </div>
        {pendingBills.length === 0 ? (
          <div className="section-body">
            <div className="empty-state">
              <div className="empty-icon">🧾</div>
              <p>No bills pending verification for your assigned companies.</p>
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>#</th><th>Bill Name</th><th>Company</th><th>Claimed Amount (₹)</th><th>Details</th><th>Your Calculated Cost (₹)</th><th>Action</th></tr>
              </thead>
              <tbody>
                {pendingBills.map((b, i) => (
                  <tr key={b._id}>
                    <td>{i+1}</td>
                    <td><strong>{b.billName || '—'}</strong></td>
                    <td>{b.projectId?.name || '—'}</td>
                    <td>₹{Number(b.amount).toLocaleString('en-IN')}</td>
                    <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.billDetails || '—'}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        placeholder="Actual cost"
                        id={`cost-${b._id}`}
                        value={billCosts[b._id] || ''}
                        onChange={e => setBillCosts(prev => ({ ...prev, [b._id]: e.target.value }))}
                        style={{ width: 130, padding: '8px 10px' }}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleBillVerify(b._id)}
                        disabled={!!billVerifyLoading[b._id]}
                        id={`verify-bill-${b._id}`}
                      >
                        {billVerifyLoading[b._id] ? '…' : '✅ Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {msg && <div className={`upload-msg ${msg.type}`} style={{ margin: '0 24px 16px' }}>{msg.text}</div>}
      </div>
    ),

    Reports: (
      <>
        <div className="content-section">
          <div className="section-head">
            <h2 className="section-head-title">My Verification Reports</h2>
            <span className="badge badge-neutral">{myVerifications.length} total</span>
          </div>
          {myVerifications.length === 0 ? (
            <div className="section-body"><div className="empty-state"><p>No verification reports submitted yet.</p></div></div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>#</th><th>Company</th><th>Completion %</th><th>Workers</th><th>Materials Used</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {myVerifications.map((v, i) => (
                    <tr key={v._id}>
                      <td>{i+1}</td>
                      <td><strong>{v.projectId?.name || '—'}</strong></td>
                      <td><ProgressBar pct={v.projectId?.completionPercentage || v.workCompletionPercentage || 0} /></td>
                      <td>{v.actualWorkers}</td>
                      <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.materialsUsed}</td>
                      <td>{statusBadge(v.status)}</td>
                      <td>{new Date(v.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="content-section">
          <div className="section-head">
            <h2 className="section-head-title">My Salary Reports</h2>
            <span className="badge badge-neutral">{mySalaries.length} total</span>
          </div>
          {mySalaries.length === 0 ? (
            <div className="section-body"><div className="empty-state"><p>No salary reports submitted yet.</p></div></div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>#</th><th>Company</th><th>Workers</th><th>Days</th><th>Rate (₹)</th><th>Total (₹)</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {mySalaries.map((s, i) => (
                    <tr key={s._id}>
                      <td>{i+1}</td>
                      <td><strong>{s.projectId?.name || '—'}</strong></td>
                      <td>{s.workerCount}</td>
                      <td>{s.workingDays}</td>
                      <td>₹{s.salaryPerWorker}</td>
                      <td>₹{Number(s.totalSalary).toLocaleString('en-IN')}</td>
                      <td>{statusBadge(s.status)}</td>
                      <td>{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    ),
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-glow" style={{ background: 'radial-gradient(circle at 20% 20%, hsla(142,71%,45%,0.2), transparent 40%)' }} />
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" style={{ background: 'linear-gradient(135deg, hsla(142,71%,45%,0.7), hsla(142,71%,45%,0.3))' }}>👷</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">{user?.name || 'Employee'}</div>
            <div className="sidebar-brand-role">Employee Portal</div>
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
              {item.key === 'BillCheck' && pendingBills.length > 0 && (
                <span className="sidebar-badge">{pendingBills.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-avatar" style={{ background: 'linear-gradient(135deg, var(--success), hsl(142,71%,60%))' }}>
            {(user?.name || 'E')[0].toUpperCase()}
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
            <div className="dash-topbar-eyebrow" style={{ color: 'var(--success)' }}>Employee Dashboard</div>
            <h1 className="dash-topbar-title">{NAV.find(n => n.key === active)?.label}</h1>
          </div>
          <div className="dash-topbar-right">
            {pendingBills.length > 0 && <span className="badge badge-danger">⚠ {pendingBills.length} bills to verify</span>}
            <div className="topbar-user-chip">
              <div className="topbar-avatar" style={{ background: 'linear-gradient(135deg, var(--success), hsl(142,71%,60%))' }}>
                {(user?.name || 'E')[0].toUpperCase()}
              </div>
              <span className="topbar-name">Employee</span>
            </div>
          </div>
        </header>
        <div className="dash-content">{sections[active]}</div>
      </div>
    </div>
  );
}
