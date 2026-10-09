import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserPlus, CheckCircle2 } from 'lucide-react';

export default function FarmerRegister() {
  const { registerFarmer } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    fullName: '',
    email: '',
    village: '',
    district: '',
    state: 'Maharashtra',
    landAcres: '5.0',
    kisanCreditCard: '',
    bankAccountNo: '',
    bankIfsc: '',
    preferredLanguage: 'en'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await registerFarmer(formData);
      navigate('/farmer/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '2.5rem auto', padding: '0 1rem' }}>
      <div className="card" style={{ padding: '2.5rem 2rem', boxShadow: 'var(--shadow-xl)', borderTop: '4px solid var(--primary-600)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <UserPlus size={28} />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--slate-800)' }}>
            {t('register')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
            Register your farmer profile for digital mandi procurement slots
          </p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('full_name')} *</label>
              <input
                type="text"
                name="fullName"
                className="form-input"
                placeholder="e.g. Ramesh Patil"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('phone')} *</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('password')} *</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('language')}</label>
              <select
                name="preferredLanguage"
                className="form-select"
                value={formData.preferredLanguage}
                onChange={handleChange}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--slate-200)', margin: '1rem 0 1.25rem 0', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
              Agricultural & Location Information
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">{t('village')} *</label>
                <input
                  type="text"
                  name="village"
                  className="form-input"
                  placeholder="Village"
                  value={formData.village}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('district')} *</label>
                <input
                  type="text"
                  name="district"
                  className="form-input"
                  placeholder="District"
                  value={formData.district}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('state')} *</label>
                <input
                  type="text"
                  name="state"
                  className="form-input"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('land_acres')}</label>
                <input
                  type="number"
                  step="0.1"
                  name="landAcres"
                  className="form-input"
                  value={formData.landAcres}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('kcc')}</label>
                <input
                  type="text"
                  name="kisanCreditCard"
                  className="form-input"
                  placeholder="KCC ID"
                  value={formData.kisanCreditCard}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--slate-200)', margin: '1rem 0 1.25rem 0', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
              Direct Bank Transfer (DBT) Information
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('bank_account')}</label>
                <input
                  type="text"
                  name="bankAccountNo"
                  className="form-input"
                  placeholder="Account number"
                  value={formData.bankAccountNo}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('bank_ifsc')}</label>
                <input
                  type="text"
                  name="bankIfsc"
                  className="form-input"
                  placeholder="e.g. SBIN0001234"
                  value={formData.bankIfsc}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontSize: '1rem' }}
          >
            {loading ? 'Creating Account...' : t('register')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
          Already have an account?{' '}
          <Link to="/farmer/login" style={{ color: 'var(--primary-700)', fontWeight: 700, textDecoration: 'none' }}>
            {t('login')}
          </Link>
        </div>

      </div>
    </div>
  );
}
