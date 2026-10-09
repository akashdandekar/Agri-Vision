import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { User, Lock, Phone, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

export default function FarmerLogin() {
  const { loginFarmer } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginFarmer(phone, password);
      navigate('/farmer/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAutofill = (demoPhone) => {
    setPhone(demoPhone);
    setPassword('farmer123');
    setError('');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto', padding: '0 1rem' }}>
      <div className="card" style={{ padding: '2.5rem 2rem', boxShadow: 'var(--shadow-xl)', borderTop: '4px solid var(--primary-600)' }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <User size={28} />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            {t('farmer_portal')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
            Sign in with your registered mobile number
          </p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('phone')}</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--slate-400)' }} />
              <input
                type="tel"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontSize: '1rem' }}
          >
            {loading ? 'Authenticating...' : t('login')}
          </button>
        </form>

        {/* Demo Credentials Quick-Fill Pill */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--slate-200)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <KeyRound size={13} />
            <span>Instant Demo Logins (Password: farmer123)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => handleDemoAutofill('9123456780')}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', justifyContent: 'space-between' }}
            >
              <span>🌾 Ramesh Patil (Pune, MH)</span>
              <span style={{ fontFamily: 'monospace' }}>9123456780</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoAutofill('9123456781')}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', justifyContent: 'space-between' }}
            >
              <span>🌾 Suresh Sharma (Karnal, HR)</span>
              <span style={{ fontFamily: 'monospace' }}>9123456781</span>
            </button>
          </div>
        </div>

        {/* Register footer link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
          Don't have a KisanSetu account?{' '}
          <Link to="/farmer/register" style={{ color: 'var(--primary-700)', fontWeight: 700, textDecoration: 'none' }}>
            {t('register')}
          </Link>
        </div>

      </div>
    </div>
  );
}
