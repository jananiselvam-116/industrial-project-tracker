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
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 }}>{p}% complete</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Applied: 'badge-neutral', UnderReview: 'badge-warning',
    Approved: 'badge-success', Rejected: 'badge-danger',
    DocumentsRequested: 'badge-info',
    InProgress: 'badge-primary', Completed: 'badge-success',
    CompanySubmitted: 'badge-warning', EmployeeVerified: 'badge-info',
    ManagerApproved: 'badge-success',
  };
  const labels = {
    CompanySubmitted: 'Submitted', EmployeeVerified: 'Engineer Verified',
    ManagerApproved: 'Approved', DocumentsRequested: 'Docs Requested',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{labels[status] || status}</span>;
}

// Construction metrics from backend constant (mirrored here for UI)
const PHASES = [
  { phase: 1, name: 'Pre-Construction', metrics: [
    { key: 'site_survey', label: 'Site Survey' },
    { key: 'land_survey_approval', label: 'Land Survey Approval' },
    { key: 'soil_testing', label: 'Soil Testing' },
    { key: 'site_clearing', label: 'Site Clearing' },
    { key: 'site_layout_marking', label: 'Site Layout Marking' },
  ]},
  { phase: 2, name: 'Foundation', metrics: [
    { key: 'excavation', label: 'Excavation' },
    { key: 'pcc', label: 'PCC (Plain Cement Concrete)' },
    { key: 'reinforcement', label: 'Reinforcement' },
    { key: 'footing', label: 'Footing' },
    { key: 'foundation_concrete', label: 'Foundation Concrete' },
  ]},
  { phase: 3, name: 'Structural Work', metrics: [
    { key: 'column_construction', label: 'Column Construction' },
    { key: 'beam_construction', label: 'Beam Construction' },
    { key: 'slab_casting', label: 'Slab Casting' },
    { key: 'staircase_construction', label: 'Staircase Construction' },
    { key: 'roof_structure', label: 'Roof Structure' },
  ]},
  { phase: 4, name: 'Masonry', metrics: [
    { key: 'brickwork', label: 'Brickwork' },
    { key: 'internal_walls', label: 'Internal Walls' },
    { key: 'external_walls', label: 'External Walls' },
    { key: 'plastering', label: 'Plastering' },
  ]},
  { phase: 5, name: 'Finishing', metrics: [
    { key: 'electrical_wiring', label: 'Electrical Wiring' },
    { key: 'plumbing', label: 'Plumbing' },
    { key: 'flooring', label: 'Flooring' },
    { key: 'painting', label: 'Painting' },
    { key: 'doors_installation', label: 'Doors Installation' },
    { key: 'windows_installation', label: 'Windows Installation' },
    { key: 'false_ceiling', label: 'False Ceiling' },
  ]},
  { phase: 6, name: 'Final Inspection', metrics: [
    { key: 'quality_inspection', label: 'Quality Inspection' },
    { key: 'safety_inspection', label: 'Safety Inspection' },
    { key: 'final_cleaning', label: 'Final Cleaning' },
    { key: 'project_handover', label: 'Project Handover' },
  ]},
];

const NAV = [
  { key: 'Overview',          icon: '📊', label: 'Overview'           },
  { key: 'Tenders',           icon: '📋', label: 'Available Tenders'  },
  { key: 'MyApplications',    icon: '📝', label: 'My Applications'    },
  { key: 'MyProjects',        icon: '🏗️', label: 'My Projects'        },
  { key: 'DailyUpdate',       icon: '📅', label: 'Daily Updates'      },
  { key: 'Bills',             icon: '🧾', label: 'Bills'              },
];

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

// ── Overview Tab ─────────────────────────────────────────────

function OverviewTab({ projects, applications, bills }) {
  const activeProject = projects[0];
  const approvedBills = bills.filter(b => b.status === 'ManagerApproved');
  const totalPaid = approvedBills.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="stat-cards">
        <div className="stat-card accent-blue">
          <div className="stat-card-icon">🏗️</div>
          <div className="stat-card-label">My Projects</div>
          <div className="stat-card-value">{projects.length}</div>
        </div>
        <div className="stat-card accent-amber">
          <div className="stat-card-icon">📝</div>
          <div className="stat-card-label">Applications</div>
          <div className="stat-card-value">{applications.length}</div>
          <div className="stat-card-sub">{applications.filter(a => a.status === 'Applied').length} pending</div>
        </div>
        <div className="stat-card accent-green">
          <div className="stat-card-icon">💰</div>
          <div className="stat-card-label">Payments Received</div>
          <div className="stat-card-value">{fmt(totalPaid)}</div>
        </div>
        <div className="stat-card accent-red">
          <div className="stat-card-icon">🧾</div>
          <div className="stat-card-label">Pending Bills</div>
          <div className="stat-card-value">{bills.filter(b => b.status === 'CompanySubmitted').length}</div>
        </div>
      </div>

      {activeProject && (
        <div className="content-section">
          <div className="section-head">
            <div className="section-head-title">Current Project Status</div>
            <StatusBadge status={activeProject.status} />
          </div>
          <div className="section-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <h4 style={{ marginBottom: 12 }}>{activeProject.name}</h4>
                <div className="info-row"><span className="info-label">Location</span><span className="info-value">{activeProject.location}</span></div>
                <div className="info-row"><span className="info-label">Budget</span><span className="info-value">{fmt(activeProject.budget)}</span></div>
                <div className="info-row"><span className="info-label">Deadline</span><span className="info-value">{fmtDate(activeProject.expectedCompletionDate)}</span></div>
                <div className="info-row"><span className="info-label">Manager</span><span className="info-value">{activeProject.assignedManagers?.[0]?.name || '—'}</span></div>
              </div>
              <div>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>Construction Progress</div>
                <div className="progress-block">
                  <div className="progress-block-header">
                    <div>
                      <div className="progress-pct-display">{activeProject.completionPercentage || 0}%</div>
                      <div className="progress-label">Auto-calculated from verified metrics</div>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {(activeProject.verifiedMetrics || []).length} / 30 verified
                    </div>
                  </div>
                  <ProgressBar pct={activeProject.completionPercentage} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Available Tenders Tab ────────────────────────────────────

function TendersTab({ onApplied }) {
  const [tenders, setTenders] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [applyFor, setApplyFor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  // Apply form state
  const [bidAmount, setBidAmount] = useState('');
  const [companyProfile, setCompanyProfile] = useState('');
  const [experience, setExperience] = useState('');
  const [previousProjects, setPreviousProjects] = useState('');
  const [regCert, setRegCert] = useState(null);
  const [gstCert, setGstCert] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/tenders'),
      api.get('/tender-applications/my'),
    ]).then(([tRes, aRes]) => {
      setTenders(tRes.data);
      setMyApplications(aRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function alreadyApplied(tenderId) {
    return myApplications.some(a => a.tenderId?._id === tenderId || a.tenderId === tenderId);
  }

  async function handleApply() {
    if (!bidAmount) { setMsg({ type: 'error', text: 'Bid amount is required' }); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('tenderId', applyFor._id);
      formData.append('bidAmount', bidAmount);
      formData.append('companyProfile', companyProfile);
      formData.append('experience', experience);
      formData.append('previousProjects', previousProjects);
      if (regCert) formData.append('registrationCertificate', regCert);
      if (gstCert) formData.append('gstCertificate', gstCert);

      await api.post('/tender-applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMsg({ type: 'success', text: 'Application submitted successfully!' });
      setApplyFor(null);
      onApplied && onApplied();
      // refresh
      api.get('/tender-applications/my').then(r => setMyApplications(r.data));
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error submitting application' });
    }
    setSubmitting(false);
  }

  if (loading) return <div className="empty-state"><p>Loading tenders...</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg && <div className={`upload-msg ${msg.type}`}>{msg.text}</div>}

      {tenders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No tenders are currently open for applications.</p>
        </div>
      ) : (
        <div className="tender-grid">
          {tenders.map(t => {
            const applied = alreadyApplied(t._id);
            return (
              <div className="tender-card" key={t._id}>
                <div className="tender-card-header">
                  <div>
                    <span className="tender-id-pill">{t.tenderId}</span>
                    <div className="tender-card-title">{t.projectName}</div>
                    <div className="tender-card-category">{t.projectCategory}</div>
                  </div>
                  <span className="badge badge-info">Published</span>
                </div>

                <div className="tender-meta-row">
                  <div className="tender-meta-item">📍 <strong>{t.location}</strong></div>
                  <div className="tender-meta-item">💰 Budget: <strong>{fmt(t.budget)}</strong></div>
                  <div className="tender-meta-item">📅 Due: <strong>{fmtDate(t.expectedCompletionDate)}</strong></div>
                </div>

                {t.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0' }}>
                    {t.description.slice(0, 120)}{t.description.length > 120 ? '...' : ''}
                  </p>
                )}

                <div className="tender-card-footer">
                  {applied ? (
                    <span className="badge badge-success">✓ Applied</span>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => { setApplyFor(t); setMsg(null); }}>
                      Apply Now
                    </button>
                  )}
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Closes {fmtDate(t.expectedCompletionDate)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Modal */}
      {applyFor && (
        <Modal
          title={`Apply for: ${applyFor.projectName}`}
          onClose={() => setApplyFor(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setApplyFor(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <div className="info-box">
                Budget: <strong>{fmt(applyFor.budget)}</strong> | Location: <strong>{applyFor.location}</strong>
              </div>
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Your Bid Amount (₹) *</label>
              <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder="Enter your quote" />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Company Profile</label>
              <textarea rows={2} value={companyProfile} onChange={e => setCompanyProfile(e.target.value)} placeholder="Brief about your company..." />
            </div>
            <div className="form-field">
              <label>Years of Experience</label>
              <input value={experience} onChange={e => setExperience(e.target.value)} placeholder="e.g. 10 years in civil construction" />
            </div>
            <div className="form-field">
              <label>Previous Projects</label>
              <input value={previousProjects} onChange={e => setPreviousProjects(e.target.value)} placeholder="e.g. Built 3 govt hospitals" />
            </div>
            <div className="form-field">
              <label>Registration Certificate</label>
              <input type="file" onChange={e => setRegCert(e.target.files[0])} />
              <div className="form-hint">PDF, JPG, PNG accepted</div>
            </div>
            <div className="form-field">
              <label>GST Certificate</label>
              <input type="file" onChange={e => setGstCert(e.target.files[0])} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── My Applications Tab ──────────────────────────────────────

function MyApplicationsTab() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tender-applications/my')
      .then(r => setApplications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;

  if (applications.length === 0) {
    return <div className="empty-state"><div className="empty-icon">📝</div><p>You haven't applied for any tenders yet.</p></div>;
  }

  const statusOrder = ['Applied', 'UnderReview', 'DocumentsRequested', 'Approved', 'Rejected'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {applications.map(app => {
        const currentIdx = statusOrder.indexOf(app.status);
        return (
          <div className="content-section" key={app._id}>
            <div className="section-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                    {app.tenderId?.projectName || 'Tender'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>
                    {app.tenderId?.tenderId} · {app.tenderId?.projectCategory}
                  </div>
                </div>
                <StatusBadge status={app.status} />
              </div>

              <div className="tender-meta-row" style={{ marginBottom: 14 }}>
                <div className="tender-meta-item">💰 Your bid: <strong>{fmt(app.bidAmount)}</strong></div>
                <div className="tender-meta-item">📍 {app.tenderId?.location}</div>
                <div className="tender-meta-item">📅 Applied: {fmtDate(app.submittedAt)}</div>
              </div>

              {/* Status timeline */}
              <div className="application-status-timeline">
                {statusOrder.slice(0, 4).map((s, i) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className={`timeline-step ${i < currentIdx ? 'done' : i === currentIdx ? 'current' : ''}`}>
                      <div className="timeline-step-dot" />
                      <span style={{ fontSize: '0.78rem' }}>{s}</span>
                    </div>
                    {i < 3 && <div className="timeline-connector" />}
                  </div>
                ))}
              </div>

              {app.reviewNotes && (
                <div className="info-box" style={{ marginTop: 10 }}>
                  <strong>Note from Government:</strong> {app.reviewNotes}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── My Projects Tab ──────────────────────────────────────────

function MyProjectsTab({ projects }) {
  if (projects.length === 0) {
    return <div className="empty-state"><div className="empty-icon">🏗️</div><p>No projects assigned yet. Apply for a tender first.</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {projects.map(p => (
        <div className="content-section" key={p._id}>
          <div className="section-head">
            <div>
              <div className="section-head-title">{p.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>{p.category} · {p.location}</div>
            </div>
            <StatusBadge status={p.status} />
          </div>
          <div className="section-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div className="info-row"><span className="info-label">Budget</span><span className="info-value">{fmt(p.budget)}</span></div>
                <div className="info-row"><span className="info-label">Deadline</span><span className="info-value">{fmtDate(p.expectedCompletionDate)}</span></div>
                <div className="info-row"><span className="info-label">Project Manager</span><span className="info-value">{p.assignedManagers?.[0]?.name || '—'}</span></div>
                <div className="info-row"><span className="info-label">Site Engineers</span><span className="info-value">{p.assignedEngineers?.map(e => e.name).join(', ') || '—'}</span></div>
                <div className="info-row"><span className="info-label">Payment Status</span><span className="info-value"><StatusBadge status={p.paymentStatus || 'Pending'} /></span></div>
              </div>
              <div>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>Construction Progress</div>
                <div className="progress-block">
                  <div className="progress-block-header">
                    <div>
                      <div className="progress-pct-display">{p.completionPercentage || 0}%</div>
                      <div className="progress-label">Based on verified metrics</div>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {(p.verifiedMetrics || []).length} / 30
                    </div>
                  </div>
                  <ProgressBar pct={p.completionPercentage} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Daily Update Tab ─────────────────────────────────────────

function DailyUpdateTab({ projects }) {
  const [selectedProject, setSelectedProject] = useState('');
  const [claimedMetrics, setClaimedMetrics] = useState([]);
  const [workDone, setWorkDone] = useState('');
  const [workerCount, setWorkerCount] = useState('');
  const [dailyExpenses, setDailyExpenses] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [issues, setIssues] = useState('');
  const [photos, setPhotos] = useState(null);
  const [msg, setMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    if (selectedProject) {
      api.get(`/daily-updates?projectId=${selectedProject}`)
        .then(r => setUpdates(r.data)).catch(() => {});
    }
  }, [selectedProject]);

  function toggleMetric(key) {
    setClaimedMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function handleSubmit() {
    if (!selectedProject) { setMsg({ type: 'error', text: 'Please select a project' }); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('projectId', selectedProject);
      formData.append('workDone', workDone);
      formData.append('workerCount', workerCount);
      formData.append('dailyExpenses', dailyExpenses);
      formData.append('materialsUsed', materialsUsed);
      formData.append('issues', issues);
      formData.append('claimedMetrics', JSON.stringify(claimedMetrics));

      if (photos) {
        for (const file of photos) {
          formData.append('photos', file);
        }
      }

      await api.post('/daily-updates', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg({ type: 'success', text: 'Daily update submitted successfully!' });
      setClaimedMetrics([]);
      setWorkDone('');
      setWorkerCount('');
      setDailyExpenses('');
      setMaterialsUsed('');
      setIssues('');
      setPhotos(null);

      api.get(`/daily-updates?projectId=${selectedProject}`).then(r => setUpdates(r.data));
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error submitting update' });
    }
    setSubmitting(false);
  }

  const currentProject = projects.find(p => p._id === selectedProject);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Project Selector */}
      <div className="content-section">
        <div className="section-head"><div className="section-head-title">Submit Daily Work Update</div></div>
        <div className="section-body">
          <div className="form-field" style={{ marginBottom: 16 }}>
            <label>Select Project</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
              <option value="">-- Select a project --</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {msg && <div className={`upload-msg ${msg.type}`}>{msg.text}</div>}

          {selectedProject && (
            <>
              {/* Construction Metrics Checklist */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Mark Completed Construction Milestones</div>
                <div className="info-box" style={{ marginBottom: 14 }}>
                  Check the milestones your team has completed. These will be sent to the Site Engineer for verification.
                  Current progress: <strong>{(currentProject?.verifiedMetrics || []).length} / 30 verified</strong>
                </div>

                {PHASES.map(phase => (
                  <div className="metric-phase-section" key={phase.phase}>
                    <div className="metric-phase-title">
                      <div className="metric-phase-number">{phase.phase}</div>
                      Phase {phase.phase} — {phase.name}
                    </div>
                    <div className="metric-grid">
                      {phase.metrics.map(m => {
                        const isClaimed = claimedMetrics.includes(m.key);
                        const isVerified = (currentProject?.verifiedMetrics || []).includes(m.key);
                        return (
                          <div
                            key={m.key}
                            className={`metric-item ${isVerified ? 'verified' : isClaimed ? 'claimed' : ''}`}
                            onClick={() => !isVerified && toggleMetric(m.key)}
                          >
                            <div className="metric-checkbox">
                              {isVerified ? '✓' : isClaimed ? '✓' : ''}
                            </div>
                            <span>{m.label}</span>
                            {isVerified && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--success-text)' }}>✅ Verified</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Daily Info */}
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-field">
                  <label>Worker Count</label>
                  <input type="number" value={workerCount} onChange={e => setWorkerCount(e.target.value)} placeholder="Number of workers today" />
                </div>
                <div className="form-field">
                  <label>Daily Expenses (₹)</label>
                  <input type="number" value={dailyExpenses} onChange={e => setDailyExpenses(e.target.value)} placeholder="Today's total expense" />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Materials Used</label>
                  <input value={materialsUsed} onChange={e => setMaterialsUsed(e.target.value)} placeholder="e.g. Cement: 50 bags, Steel: 2 tons" />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Work Description</label>
                  <textarea rows={2} value={workDone} onChange={e => setWorkDone(e.target.value)} placeholder="Describe what was done today..." />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Issues / Remarks</label>
                  <textarea rows={2} value={issues} onChange={e => setIssues(e.target.value)} placeholder="Any issues or problems today?" />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Site Photos (optional)</label>
                  <input type="file" multiple accept="image/*" onChange={e => setPhotos(Array.from(e.target.files))} />
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Daily Update'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Previous Updates */}
      {updates.length > 0 && (
        <div className="content-section">
          <div className="section-head"><div className="section-head-title">Previous Updates</div></div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Claimed Milestones</th>
                  <th>Workers</th>
                  <th>Expenses</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {updates.map(u => (
                  <tr key={u._id}>
                    <td>{fmtDate(u.date)}</td>
                    <td>{(u.claimedMetrics || []).length} milestones</td>
                    <td>{u.workerCount || '—'}</td>
                    <td>{fmt(u.dailyExpenses)}</td>
                    <td><span className={`badge ${u.status === 'Reviewed' ? 'badge-success' : 'badge-neutral'}`}>{u.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bills Tab ────────────────────────────────────────────────

function BillsTab({ projects }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ projectId: '', billName: '', amount: '', billNumber: '', billDetails: '', remarks: '' });
  const [billFile, setBillFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadBills = () => {
    api.get('/bills').then(r => setBills(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadBills(); }, []);

  async function handleSubmit() {
    if (!form.billName || !form.amount) { setMsg({ type: 'error', text: 'Bill name and amount are required' }); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (billFile) formData.append('billFile', billFile);
      await api.post('/bills', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg({ type: 'success', text: 'Bill submitted successfully.' });
      setForm({ projectId: '', billName: '', amount: '', billNumber: '', billDetails: '', remarks: '' });
      setBillFile(null);
      loadBills();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error submitting bill' });
    }
    setSubmitting(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="content-section">
        <div className="section-head"><div className="section-head-title">Submit New Bill</div></div>
        <div className="section-body">
          {msg && <div className={`upload-msg ${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}
          <div className="form-grid">
            <div className="form-field">
              <label>Project</label>
              <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                <option value="">-- Select Project --</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Bill Number</label>
              <input value={form.billNumber} onChange={e => setForm({ ...form, billNumber: e.target.value })} placeholder="e.g. BILL-001" />
            </div>
            <div className="form-field">
              <label>Bill Name / Description *</label>
              <input value={form.billName} onChange={e => setForm({ ...form, billName: e.target.value })} placeholder="e.g. Foundation Material Cost" />
            </div>
            <div className="form-field">
              <label>Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Bill Details</label>
              <textarea rows={2} value={form.billDetails} onChange={e => setForm({ ...form, billDetails: e.target.value })} placeholder="Details about what this bill covers..." />
            </div>
            <div className="form-field">
              <label>Bill File (PDF / Image)</label>
              <input type="file" onChange={e => setBillFile(e.target.files[0])} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Bill'}
          </button>
        </div>
      </div>

      <div className="content-section">
        <div className="section-head"><div className="section-head-title">My Bills ({bills.length})</div></div>
        {loading ? <div className="empty-state"><p>Loading...</p></div> : bills.length === 0 ? (
          <div className="empty-state"><p>No bills submitted yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Bill</th><th>Amount</th><th>Project</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b._id}>
                    <td><div style={{ fontWeight: 600 }}>{b.billName}</div><div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{b.billNumber}</div></td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(b.amount)}</td>
                    <td>{b.projectId?.name || '—'}</td>
                    <td>{fmtDate(b.createdAt)}</td>
                    <td><StatusBadge status={b.status} /></td>
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

export default function CompanyDashboard({ user, onLogout }) {
  const [active, setActive] = useState('Overview');
  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [bills, setBills] = useState([]);

  const loadAll = useCallback(async () => {
    try {
      const [pRes, aRes, bRes] = await Promise.all([
        api.get('/projects'),
        api.get('/tender-applications/my'),
        api.get('/bills'),
      ]);
      setProjects(pRes.data);
      setApplications(aRes.data);
      setBills(bRes.data);
    } catch {}
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const tabContent = {
    Overview:        <OverviewTab projects={projects} applications={applications} bills={bills} />,
    Tenders:         <TendersTab onApplied={loadAll} />,
    MyApplications:  <MyApplicationsTab />,
    MyProjects:      <MyProjectsTab projects={projects} />,
    DailyUpdate:     <DailyUpdateTab projects={projects} />,
    Bills:           <BillsTab projects={projects} />,
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-glow" />
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🏢</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">IPMS</div>
            <div className="sidebar-brand-role">Company Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.key}
              className={`sidebar-nav-btn ${active === item.key ? 'active' : ''}`}
              onClick={() => setActive(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || 'C'}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={onLogout} title="Logout">⎋</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dash-topbar">
          <div className="dash-topbar-left">
            <div className="dash-topbar-eyebrow">Company · IPMS</div>
            <h1 className="dash-topbar-title">{NAV.find(n => n.key === active)?.label || active}</h1>
          </div>
          <div className="dash-topbar-right">
            <div className="topbar-user-chip">
              <div className="topbar-avatar">{user?.name?.[0]?.toUpperCase() || 'C'}</div>
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
