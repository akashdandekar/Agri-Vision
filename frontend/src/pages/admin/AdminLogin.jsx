import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, Lock, User, KeyRound } from 'lucide-react';

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginAdmin(identifier, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Administrator login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAutofill = () => {
    setIdentifier('admin@kisansetu.gov.in');
    setPassword('admin123');
    setError('');
  };

  return (
    <div style={{ maxWidth: '460px', margin: '3rem auto', padding: '0 1rem' }}>
      <div className="card" style={{ padding: '2.5rem 2rem', boxShadow: 'var(--shadow-xl)', borderTop: '4px solid var(--slate-900)' }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--slate-100)', color: 'var(--slate-800)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            {t('admin_portal')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
            Official Mandi Procurement Officer Authentication
          </p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Official Email, Phone, or Employee ID</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--slate-400)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="e.g. admin@kisansetu.gov.in"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('password')}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--slate-400)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontSize: '1rem', background: 'var(--slate-900)', color: '#fff' }}
          >
            {loading ? 'Verifying...' : 'Login to Admin Dashboard'}
          </button>
        </form>

        {/* Demo Credentials Quick-Fill */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--slate-200)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <KeyRound size={13} />
            <span>Admin Demo Credentials</span>
          </div>
          <button
            type="button"
            onClick={handleDemoAutofill}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.8rem', justifyContent: 'space-between' }}
          >
            <span>🏛️ Dr. Rajesh Deshmukh</span>
            <span style={{ fontFamily: 'monospace' }}>admin@kisansetu.gov.in / admin123</span>
          </button>
        </div>

      </div>
    </div>
  );
}
