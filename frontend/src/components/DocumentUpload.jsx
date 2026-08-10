import { useState } from 'react';
import api from '../services/api';
import '../styles/company.css';

function DocumentUpload({ companies, onSuccess }) {
  const [companyId, setCompanyId] = useState('');
  const [file, setFile]           = useState(null);
  const [status, setStatus]       = useState(null);
  const [message, setMessage]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId || !file) {
      setStatus('error');
      setMessage('Please select a company and a file.');
      return;
    }

    const formData = new FormData();
    formData.append('companyId', companyId);
    formData.append('documentFile', file);

    try {
      setStatus('loading');
      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('success');
      setMessage('✅ Document uploaded successfully!');
      setFile(null);
      e.target.reset();
      if (onSuccess) onSuccess();
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Upload failed. Please try again.');
    }
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label>Select Company</label>
        <select
          id="doc-company-select"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          required
        >
          <option value="">-- Choose Company --</option>
          {companies.map((c) => (
            <option key={c._id} value={c._id}>{c.companyName}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>Document File (PDF / DOC / Image / TXT)</label>
        <div className="file-drop">
          <input
            id="doc-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
          {file && <span className="file-name">📎 {file.name}</span>}
        </div>
      </div>

      {status === 'success' && <div className="upload-msg success">{message}</div>}
      {status === 'error'   && <div className="upload-msg error">{message}</div>}

      <button
        type="submit"
        id="upload-doc-btn"
        className="btn btn-primary"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Uploading…' : '📁 Upload Document'}
      </button>
    </form>
  );
}

export default DocumentUpload;
