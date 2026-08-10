import { useState } from 'react';
import api from '../services/api';
import '../styles/company.css';

function BillUpload({ companies, onSuccess }) {
  const [companyId, setCompanyId] = useState('');
  const [billName, setBillName]   = useState('');
  const [amount, setAmount]       = useState('');
  const [file, setFile]           = useState(null);
  const [status, setStatus]       = useState(null); // 'loading' | 'success' | 'error'
  const [message, setMessage]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId || !amount || !file) {
      setStatus('error');
      setMessage('Please fill all fields and choose a file.');
      return;
    }

    const formData = new FormData();
    formData.append('companyId', companyId);
    formData.append('billName', billName);
    formData.append('amount', amount);
    if (file) {
      formData.append('billFile', file);
    }

    try {
      setStatus('loading');
      await api.post('/bills', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('success');
      setMessage('✅ Bill uploaded successfully!');
      setBillName('');
      setAmount('');
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
      <div className="form-row">
        <div className="form-field">
          <label>Select Company</label>
          <select
            id="bill-company-select"
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
          <label>Bill Amount (₹)</label>
          <input
            id="bill-amount"
            type="number"
            placeholder="e.g. 50000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="form-field">
        <label>Bill File (PDF / Image)</label>
        <div className="file-drop">
          <input
            id="bill-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
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
        id="upload-bill-btn"
        className="btn btn-primary"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Uploading…' : '📤 Upload Bill'}
      </button>
    </form>
  );
}

export default BillUpload;
