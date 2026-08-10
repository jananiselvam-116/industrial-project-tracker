import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import '../styles/dashboard.css';
import '../styles/tender.css';

// ── Helpers ──────────────────────────────────────────────────

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
      <div className="progress-track">
        <div className={`progress-fill ${cls}`} style={{ width: `${p}%` }} />
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 }}>{p}%</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Draft:       'badge-neutral',
    Published:   'badge-info',
    Closed:      'badge-success',
    Cancelled:   'badge-danger',
    InProgress:  'badge-primary',
    Completed:   'badge-success',
    PendingAssignment: 'badge-warning',
    AssignedToManager: 'badge-info',
    Verified:    'badge-success',
    Applied:     'badge-neutral',
    UnderReview: 'badge-warning',
    Approved:    'badge-success',
    Rejected:    'badge-danger',
    DocumentsRequested: 'badge-info',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
}

// ── Sidebar Nav Items ────────────────────────────────────────

const NAV = [
  { key: 'Overview',     icon: '📊', label: 'Overview'          },
  { key: 'Tenders',      icon: '📋', label: 'Tender Management' },
  { key: 'Applications', icon: '🏢', label: 'Company Applications' },
  { key: 'Projects',     icon: '🏗️', label: 'Active Projects'    },
  { key: 'Bills',        icon: '🧾', label: 'Bills'   },
  { key: 'Salaries',     icon: '💰', label: 'Salary Releases' },
  { key: 'Staff',        icon: '👤', label: 'Staff Management'   },
  { key: 'Reports',      icon: '📄', label: 'Inspection Reports' },
  { key: 'Archived',     icon: '🗃️', label: 'Archived Projects'  },
];

// ── Modal Component ──────────────────────────────────────────

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── Stat Card Component ──────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className={`stat-card ${accent}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────

function OverviewTab({ stats }) {
  if (!stats) return <div className="empty-state"><p>Loading stats...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="stat-cards">
        <StatCard icon="📋" label="Total Tenders"      value={stats.totalTenders || 0}    accent="accent-blue"  sub={`${stats.activeTenders || 0} active`} />
        <StatCard icon="🏗️" label="Active Projects"    value={stats.inProgress || 0}      accent="accent-amber" sub="Under construction" />
        <StatCard icon="✅" label="Completed"           value={stats.completed || 0}       accent="accent-green" />
        <StatCard icon="⏰" label="Delayed Projects"    value={stats.delayed || 0}         accent="accent-red"   sub="Past deadline" />
        <StatCard icon="🏢" label="Registered Companies" value={stats.totalCompanies || 0} accent="accent-teal"  />
        <StatCard icon="⏳" label="Pending Applications" value={stats.pendingApplications || 0} accent="accent-purple" sub="Awaiting review" />
        <StatCard icon="🧾" label="Pending Bills"       value={stats.pendingBills || 0}    accent="accent-amber" />
        <StatCard icon="💰" label="Total Payments"      value={fmt(stats.totalPaymentsReleased)} accent="accent-green" sub="Released" />
      </div>

      <div className="content-section">
        <div className="section-head">
          <div className="section-head-title">Quick Actions</div>
        </div>
        <div className="section-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="info-box" style={{ flex: 1, minWidth: 240 }}>
            <strong>📢 {stats.pendingApplications || 0} company applications</strong> waiting for your review.
          </div>
          <div className="info-box" style={{ flex: 1, minWidth: 240, background: 'var(--warning-bg)', borderColor: 'hsl(37,91%,75%)', color: 'var(--warning-text)' }}>
            <strong>🧾 {stats.pendingBills || 0} bills</strong> and <strong>{stats.pendingReports || 0} inspection reports</strong> pending.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tenders Tab ──────────────────────────────────────────────

function TendersTab() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTender, setEditTender] = useState(null);
  const [msg, setMsg] = useState(null);

  const defaultForm = {
    projectName: '', projectCategory: 'Government Office Building',
    budget: '', labourBudget: '', location: '', startDate: '', expectedCompletionDate: '',
    description: '', eligibilityCriteria: '',
  };
  const [form, setForm] = useState(defaultForm);

  const loadTenders = useCallback(async () => {
    try {
      const res = await api.get('/tenders');
      setTenders(res.data);
    } catch { setTenders([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTenders(); }, [loadTenders]);

  function openEdit(tender) {
    setForm({
      projectName: tender.projectName,
      projectCategory: tender.projectCategory,
      budget: tender.budget,
      labourBudget: tender.labourBudget || '',
      location: tender.location,
      startDate: tender.startDate?.slice(0, 10) || '',
      expectedCompletionDate: tender.expectedCompletionDate?.slice(0, 10) || '',
      description: tender.description || '',
      eligibilityCriteria: tender.eligibilityCriteria || '',
    });
    setEditTender(tender);
    setShowCreate(true);
  }

  async function handleSave() {
    try {
      if (editTender) {
        await api.put(`/tenders/${editTender._id}`, form);
        setMsg({ type: 'success', text: 'Tender updated.' });
      } else {
        await api.post('/tenders', form);
        setMsg({ type: 'success', text: 'Tender created as Draft.' });
      }
      setShowCreate(false);
      setEditTender(null);
      setForm(defaultForm);
      loadTenders();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error saving tender' });
    }
  }

  async function changeStatus(tenderId, status) {
    try {
      await api.put(`/tenders/${tenderId}`, { status });
      loadTenders();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  }

  if (loading) return <div className="empty-state"><p>Loading tenders...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>All Tenders ({tenders.length})</h3>
        <button className="btn btn-primary" onClick={() => { setEditTender(null); setForm(defaultForm); setShowCreate(true); }}>
          + Create Tender
        </button>
      </div>

      {msg && (
        <div className={`upload-msg ${msg.type}`}>{msg.text}</div>
      )}

      {tenders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No tenders created yet. Click "Create Tender" to get started.</p>
        </div>
      ) : (
        <div className="tender-grid">
          {tenders.map(t => (
            <div className="tender-card" key={t._id}>
              <div className="tender-card-header">
                <div>
                  <span className="tender-id-pill">{t.tenderId}</span>
                  <div className="tender-card-title">{t.projectName}</div>
                  <div className="tender-card-category">{t.projectCategory}</div>
                </div>
                <StatusBadge status={t.status} />
              </div>

              <div className="tender-meta-row">
                <div className="tender-meta-item">📍 <strong>{t.location}</strong></div>
                <div className="tender-meta-item">💰 <strong>{fmt(t.budget)}</strong></div>
                <div className="tender-meta-item">📅 {fmtDate(t.expectedCompletionDate)}</div>
              </div>

              <div className="tender-card-footer">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {t.status === 'Draft' && (
                    <>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(t)}>Edit</button>
                      <button className="btn btn-sm btn-primary" onClick={() => changeStatus(t._id, 'Published')}>Publish</button>
                      <button className="btn btn-sm btn-danger" onClick={() => changeStatus(t._id, 'Cancelled')}>Cancel</button>
                    </>
                  )}
                  {t.status === 'Published' && (
                    <>
                      <button className="btn btn-sm btn-secondary" onClick={() => changeStatus(t._id, 'Closed')}>Close</button>
                      <button className="btn btn-sm btn-danger" onClick={() => changeStatus(t._id, 'Cancelled')}>Cancel</button>
                    </>
                  )}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Created {fmtDate(t.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal
          title={editTender ? 'Edit Tender' : 'Create New Tender'}
          onClose={() => { setShowCreate(false); setEditTender(null); }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editTender ? 'Update Tender' : 'Create Tender'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Project Name *</label>
              <input value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} placeholder="e.g. District Hospital Building" />
            </div>
            <div className="form-field">
              <label>Project Category *</label>
              <select value={form.projectCategory} onChange={e => setForm({ ...form, projectCategory: e.target.value })}>
                <option>Government Office Building</option>
                <option>School Building</option>
                <option>Hospital Building</option>
                <option>Collector Office</option>
                <option>Public Service Building</option>
              </select>
            </div>
            <div className="form-field">
              <label>Budget (₹) *</label>
              <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="e.g. 5000000" />
            </div>
            <div className="form-field">
              <label>Labour Budget (₹) *</label>
              <input type="number" value={form.labourBudget} onChange={e => setForm({ ...form, labourBudget: e.target.value })} placeholder="e.g. 1000000" />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Location *</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="District, State" />
            </div>
            <div className="form-field">
              <label>Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Expected Completion *</label>
              <input type="date" value={form.expectedCompletionDate} onChange={e => setForm({ ...form, expectedCompletionDate: e.target.value })} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Project description..." />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Eligibility Criteria</label>
              <textarea rows={2} value={form.eligibilityCriteria} onChange={e => setForm({ ...form, eligibilityCriteria: e.target.value })} placeholder="e.g. Minimum 5 years experience in civil construction..." />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Company Applications Tab ─────────────────────────────────

function ApplicationsTab() {
  const [tenders, setTenders] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [applications, setApplications] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewApp, setViewApp] = useState(null);
  const [assignModal, setAssignModal] = useState(null); // application to assign manager for
  const [selectedManager, setSelectedManager] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get('/tenders').then(r => setTenders(r.data)).catch(() => {});
    api.get('/admin-users/managers').then(r => setManagers(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTenderId) { setApplications([]); return; }
    setLoading(true);
    api.get(`/tenders/${selectedTenderId}/applications`)
      .then(r => setApplications(r.data))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, [selectedTenderId]);

  async function handleReview(appId, status, notes = '') {
    try {
      await api.patch(`/tenders/applications/${appId}/review`, { status, reviewNotes: notes });
      setMsg({ type: 'success', text: `Application ${status}.` });
      // refresh
      api.get(`/tenders/${selectedTenderId}/applications`)
        .then(r => setApplications(r.data));
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error' });
    }
  }

  async function handleAssignManager() {
    if (!selectedManager) return alert('Select a manager first');
    try {
      await api.post(`/tenders/applications/${assignModal._id}/assign-manager`, { managerId: selectedManager });
      setMsg({ type: 'success', text: 'Manager assigned. Project created successfully.' });
      setAssignModal(null);
      setSelectedManager('');
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error assigning manager' });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="content-section">
        <div className="section-head">
          <div className="section-head-title">Select Tender to View Applications</div>
        </div>
        <div className="section-body">
          <select value={selectedTenderId} onChange={e => setSelectedTenderId(e.target.value)}>
            <option value="">-- Select a Tender --</option>
            {tenders.map(t => (
              <option key={t._id} value={t._id}>{t.tenderId} — {t.projectName}</option>
            ))}
          </select>
        </div>
      </div>

      {msg && <div className={`upload-msg ${msg.type}`}>{msg.text}</div>}

      {loading && <div className="empty-state"><p>Loading applications...</p></div>}

      {!loading && selectedTenderId && applications.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <p>No applications for this tender yet.</p>
        </div>
      )}

      {applications.map(app => (
        <div className="application-card" key={app._id}>
          <div className="application-card-header">
            <div>
              <div className="company-name">{app.organisationId?.name || 'Unknown Company'}</div>
              <div className="company-sub">Reg: {app.organisationId?.registrationNo} | {app.companyUserId?.email}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="bid-label">Bid Amount</div>
              <div className="bid-amount">{fmt(app.bidAmount)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={app.status} />
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Applied {fmtDate(app.submittedAt)}</span>
          </div>

          {app.reviewNotes && (
            <div style={{ fontSize: '0.82rem', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 8, color: 'var(--text-secondary)' }}>
              Note: {app.reviewNotes}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => setViewApp(app)}>
              View Details
            </button>
            {app.status === 'Applied' && (
              <button className="btn btn-sm btn-secondary" onClick={() => handleReview(app._id, 'UnderReview')}>
                Mark Under Review
              </button>
            )}
            {['Applied', 'UnderReview', 'DocumentsRequested'].includes(app.status) && (
              <>
                <button className="btn btn-sm btn-success" onClick={() => handleReview(app._id, 'Approved')}>
                  ✓ Approve
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleReview(app._id, 'Rejected')}>
                  ✕ Reject
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => handleReview(app._id, 'DocumentsRequested', 'Please submit additional documents.')}>
                  Request Docs
                </button>
              </>
            )}
            {app.status === 'Approved' && (
              <button className="btn btn-sm btn-primary" onClick={() => setAssignModal(app)}>
                Assign Manager & Create Project
              </button>
            )}
          </div>
        </div>
      ))}

      {/* View Application Detail Modal */}
      {viewApp && (
        <Modal title="Application Details" onClose={() => setViewApp(null)}
          footer={<button className="btn btn-secondary" onClick={() => setViewApp(null)}>Close</button>}>
          <div>
            <h4 style={{ marginBottom: 12 }}>{viewApp.organisationId?.name}</h4>
            <div className="info-row"><span className="info-label">Bid Amount</span> <span className="info-value">{fmt(viewApp.bidAmount)}</span></div>
            <div className="info-row"><span className="info-label">Experience</span> <span className="info-value">{viewApp.experience || '—'}</span></div>
            <div className="info-row"><span className="info-label">Previous Projects</span> <span className="info-value">{viewApp.previousProjects || '—'}</span></div>
            <div className="info-row"><span className="info-label">Company Profile</span> <span className="info-value">{viewApp.companyProfile || '—'}</span></div>
            {viewApp.documents?.registrationCertificate && (
              <div className="info-row">
                <span className="info-label">Reg Certificate</span>
                <a href={`http://localhost:5000${viewApp.documents.registrationCertificate}`} target="_blank" rel="noreferrer" className="info-value">View File</a>
              </div>
            )}
            {viewApp.documents?.gstCertificate && (
              <div className="info-row">
                <span className="info-label">GST Certificate</span>
                <a href={`http://localhost:5000${viewApp.documents.gstCertificate}`} target="_blank" rel="noreferrer" className="info-value">View File</a>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Assign Manager Modal */}
      {assignModal && (
        <Modal title="Assign Project Manager" onClose={() => setAssignModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignManager}>Assign & Create Project</button>
            </>
          }>
          <div>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
              Assigning a manager will create the project for <strong>{assignModal.organisationId?.name}</strong>.
            </p>
            <label>Select Project Manager *</label>
            <select value={selectedManager} onChange={e => setSelectedManager(e.target.value)}>
              <option value="">-- Select Manager --</option>
              {managers.map(m => (
                <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
              ))}
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Projects Tab ─────────────────────────────────────────────

function ProjectsTab() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then(r => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><p>Loading projects...</p></div>;
  if (projects.length === 0) return <div className="empty-state"><div className="empty-icon">🏗️</div><p>No projects yet.</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ margin: 0 }}>All Projects ({projects.length})</h3>
      <div className="content-section">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Company</th>
                <th>Location</th>
                <th>Budget</th>
                <th>Progress</th>
                <th>Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const isDelayed = p.status !== 'Completed' && p.expectedCompletionDate && new Date(p.expectedCompletionDate) < new Date();
                return (
                  <tr key={p._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{p.category}</div>
                    </td>
                    <td>{p.organisationId?.name || '—'}</td>
                    <td>{p.location}</td>
                    <td>{fmt(p.budget)}</td>
                    <td style={{ minWidth: 140 }}><ProgressBar pct={p.completionPercentage} /></td>
                    <td style={{ color: isDelayed ? 'var(--danger)' : 'inherit' }}>
                      {fmtDate(p.expectedCompletionDate)}
                      {isDelayed && <div className="badge badge-danger" style={{ marginTop: 4, fontSize: '0.68rem' }}>DELAYED</div>}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Bills & Payments Tab ─────────────────────────────────────

function BillsTab() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const loadBills = () => {
    api.get('/bills').then(r => setBills(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadBills(); }, []);

  async function handleBillAction(billId, status) {
    try {
      await api.patch(`/bills/${billId}/status`, { status, remarks: '' });
      setMsg({ type: 'success', text: `Bill ${status}.` });
      loadBills();
    } catch (err) {
      setMsg({ type: 'error', text: 'Error updating bill' });
    }
  }

  const billStatusBadge = (s) => {
    const map = { CompanySubmitted: 'badge-warning', EmployeeVerified: 'badge-info', ManagerApproved: 'badge-success', Rejected: 'badge-danger' };
    const labels = { CompanySubmitted: 'Submitted', EmployeeVerified: 'Engineer Verified', ManagerApproved: 'Approved', Rejected: 'Rejected' };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{labels[s] || s}</span>;
  };

  if (loading) return <div className="empty-state"><p>Loading bills...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg && <div className={`upload-msg ${msg.type}`}>{msg.text}</div>}
      <div className="content-section">
        <div className="section-head">
          <div className="section-head-title">All Bills ({bills.length})</div>
        </div>
        {bills.length === 0 ? (
          <div className="empty-state"><p>No bills submitted yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Bill Name</th>
                  <th>Amount</th>
                  <th>Project</th>
                  <th>Submitted By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b._id}>
                    <td><div style={{ fontWeight: 600 }}>{b.billName}</div>{b.billNumber && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>#{b.billNumber}</div>}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(b.amount)}</td>
                    <td>{b.projectId?.name || '—'}</td>
                    <td>{b.uploadedBy?.name || '—'}</td>
                    <td>{fmtDate(b.createdAt)}</td>
                    <td>{billStatusBadge(b.status)}</td>
                    <td>
                      {b.status === 'EmployeeVerified' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-success" onClick={() => handleBillAction(b._id, 'ManagerApproved')}>Approve & Pay</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleBillAction(b._id, 'Rejected')}>Reject</button>
                        </div>
                      )}
                      {b.status === 'ManagerApproved' && <span className="gps-indicator">✓ Payment Released</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Staff Management Tab ─────────────────────────────────────

function StaffTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', phone: '', role: 'Manager', designation: '' });

  const loadUsers = () => {
    api.get('/auth/users').then(r => {
      const staff = r.data.filter(u => ['Manager', 'Employee'].includes(u.role));
      setUsers(staff);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate() {
    try {
      await api.post('/auth/register', form);
      setMsg({ type: 'success', text: `${form.role} account created.` });
      setShowCreate(false);
      setForm({ name: '', username: '', email: '', password: '', phone: '', role: 'Manager', designation: '' });
      loadUsers();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error creating user' });
    }
  }

  if (loading) return <div className="empty-state"><p>Loading staff...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Staff Accounts ({users.length})</h3>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Staff</button>
      </div>

      {msg && <div className={`upload-msg ${msg.type}`}>{msg.text}</div>}

      <div className="content-section">
        {users.length === 0 ? (
          <div className="empty-state"><p>No staff accounts yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td><div style={{ fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>@{u.username}</div></td>
                    <td>{u.email}</td>
                    <td><StatusBadge status={u.role} /></td>
                    <td>{u.phone || '—'}</td>
                    <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Create Staff Account" onClose={() => setShowCreate(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create Account</button>
            </>
          }>
          <div className="form-grid">
            <div className="form-field">
              <label>Full Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Kumar" />
            </div>
            <div className="form-field">
              <label>Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="Manager">Project Manager</option>
                <option value="Employee">Site Engineer</option>
              </select>
            </div>
            <div className="form-field">
              <label>Username</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="e.g. ramesh.kumar" />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91-9000000000" />
            </div>
            <div className="form-field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Reports Tab ──────────────────────────────────────────────

function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/verification').then(r => setReports(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><p>Loading reports...</p></div>;

  return (
    <div>
      <div className="content-section">
        <div className="section-head">
          <div className="section-head-title">Inspection Reports ({reports.length})</div>
        </div>
        {reports.length === 0 ? (
          <div className="empty-state"><p>No inspection reports yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Engineer</th>
                  <th>Metrics Verified</th>
                  <th>GPS</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => {
                  const verified = (r.metricVerifications || []).filter(m => m.verified).length;
                  return (
                    <tr key={r._id}>
                      <td>{r.projectId?.name || '—'}</td>
                      <td>{r.submittedBy?.name || '—'}</td>
                      <td>{verified} / {r.metricVerifications?.length || 0} verified</td>
                      <td>
                        {r.gpsLat ? (
                          <span className="gps-indicator">📍 {r.gpsLat?.toFixed(4)}, {r.gpsLng?.toFixed(4)}</span>
                        ) : '—'}
                      </td>
                      <td>{fmtDate(r.inspectionDate)}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Salaries Tab ─────────────────────────────────────────────

function SalariesTab() {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const loadSalaries = () => {
    api.get('/salary').then(r => setSalaries(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadSalaries(); }, []);

  async function handleApprove(id) {
    try {
      await api.patch(`/salary/${id}/status`, { status: 'Released' });
      setMsg({ type: 'success', text: 'Salary Released successfully.' });
      loadSalaries();
    } catch (err) {
      setMsg({ type: 'error', text: 'Error releasing salary' });
    }
  }

  if (loading) return <div className="empty-state"><p>Loading salary reports...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg && <div className={`upload-msg ${msg.type}`}>{msg.text}</div>}
      <div className="content-section">
        <div className="section-head">
          <div className="section-head-title">Pending Salary Releases ({salaries.filter(s => s.status === 'Pending').length})</div>
        </div>
        {salaries.length === 0 ? (
          <div className="empty-state"><p>No salary reports found.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Company</th>
                  <th>Eligible Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map(s => (
                  <tr key={s._id}>
                    <td><div style={{ fontWeight: 600 }}>{s.projectId?.name || '—'}</div></td>
                    <td>{s.organisationId?.companyName || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(s.totalSalary)}</td>
                    <td>{fmtDate(s.createdAt)}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      {s.status === 'Pending' && (
                        <button className="btn btn-sm btn-success" onClick={() => handleApprove(s._id)}>Release Funds</button>
                      )}
                      {s.status === 'Released' && <span className="gps-indicator">✓ Released</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────

export default function GovernmentDashboard({ user, onLogout }) {
  const [active, setActive] = useState('Overview');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const tabContent = {
    Overview:     <OverviewTab stats={stats} />,
    Tenders:      <TendersTab />,
    Applications: <ApplicationsTab />,
    Projects:     <ProjectsTab />,
    Bills:        <BillsTab />,
    Salaries:     <SalariesTab />,
    Staff:        <StaffTab />,
    Reports:      <ReportsTab />,
    Archived:     <div className="empty-state"><div className="empty-icon">🗃️</div><p>Archived projects will appear here after completion.</p></div>,
  };

  return (
    <div className="dashboard-shell">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-glow" />
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🏛️</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">IPMS</div>
            <div className="sidebar-brand-role">Government Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {NAV.map(item => (
            <button
              key={item.key}
              className={`sidebar-nav-btn ${active === item.key ? 'active' : ''}`}
              onClick={() => setActive(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.key === 'Applications' && stats?.pendingApplications > 0 && (
                <span className="sidebar-badge">{stats.pendingApplications}</span>
              )}
              {item.key === 'Bills' && stats?.pendingBills > 0 && (
                <span className="sidebar-badge">{stats.pendingBills}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || 'G'}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'Government Admin'}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={onLogout} title="Logout">⎋</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dash-topbar">
          <div className="dash-topbar-left">
            <div className="dash-topbar-eyebrow">Government Admin · IPMS</div>
            <h1 className="dash-topbar-title">{NAV.find(n => n.key === active)?.label || active}</h1>
          </div>
          <div className="dash-topbar-right">
            <div className="topbar-user-chip">
              <div className="topbar-avatar">{user?.name?.[0]?.toUpperCase() || 'G'}</div>
              <span className="topbar-name">{user?.name}</span>
            </div>
          </div>
        </div>

        <div className="dash-content">
          {tabContent[active]}
        </div>
      </main>
    </div>
  );
}
