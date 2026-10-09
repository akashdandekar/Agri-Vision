import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, Clock, ShieldCheck, Cpu, ArrowRight, CheckCircle2, AlertTriangle, Building2, UserCheck } from 'lucide-react';

export default function Home() {
  const { t } = useLanguage();

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      
      {/* Hero Header */}
      <section style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '3.5rem 2.5rem',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-emerald)',
        marginBottom: '3rem'
      }}>
        <div style={{ maxWidth: '750px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', padding: '0.4rem 0.9rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            <Sprout size={16} color="#fef08a" />
            <span>Smart Agricultural Procurement & Token Management</span>
          </div>
          
          <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1rem', color: '#ffffff' }}>
            Zero-Wait Mandi Procurement for Every Indian Farmer
          </h1>
          
          <p style={{ fontSize: '1.15rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6, marginBottom: '2rem' }}>
            KisanSetu connects farmers to government procurement centres with AI-powered slot scheduling, real-time queue tracking, emergency perishable crop lanes, and transparent DBT payments.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <Link to="/farmer/login" className="btn btn-amber" style={{ padding: '0.85rem 1.75rem', fontSize: '1.05rem' }}>
              <span>Enter Farmer Portal</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/admin/login" className="btn" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '0.85rem 1.75rem', fontSize: '1.05rem' }}>
              <span>Official Admin Portal</span>
              <ShieldCheck size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Role Selection Gateway */}
      <section style={{ marginBottom: '3.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-800)', textAlign: 'center', marginBottom: '0.5rem' }}>
          Choose Your Portal
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--slate-500)', marginBottom: '2rem' }}>
          Separate secure portals tailored for farmers and procurement officials
        </p>

        <div className="grid-2">
          
          {/* Farmer Card */}
          <div className="card" style={{ borderTop: '5px solid var(--primary-600)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--slate-800)' }}>Farmer Portal</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>For Registered Cultivators & Growers</p>
                </div>
              </div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem', fontSize: '0.925rem', color: 'var(--slate-600)' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--primary-600)" />
                  <span>Book regular & emergency slots (kg or quintal)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--primary-600)" />
                  <span>Receive unique digital token passes (e.g. T001)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--primary-600)" />
                  <span>Live Queue Radar with AI estimated waiting times</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--primary-600)" />
                  <span>Track crop quality grade and DBT bank transfer</span>
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to="/farmer/login" className="btn btn-primary" style={{ flex: 1 }}>
                Log In as Farmer
              </Link>
              <Link to="/farmer/register" className="btn btn-outline">
                Register New
              </Link>
            </div>
          </div>

          {/* Admin Card */}
          <div className="card" style={{ borderTop: '5px solid var(--slate-800)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--slate-100)', color: 'var(--slate-800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--slate-800)' }}>Admin & Mandi Portal</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>For Procurement Officers & Mandi Staff</p>
                </div>
              </div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem', fontSize: '0.925rem', color: 'var(--slate-600)' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--primary-600)" />
                  <span>Configure centres, operating hours & daily kg capacities</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--primary-600)" />
                  <span>Live queue control: Call next, check-in, no-show</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--primary-600)" />
                  <span>Crop quality testing (Moisture, Grade A/B/C, Pass/Fail)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--primary-600)" />
                  <span>Digital weighbridge, MSP rate calculation & DBT releases</span>
                </li>
              </ul>
            </div>

            <Link to="/admin/login" className="btn btn-secondary" style={{ width: '100%' }}>
              Official Admin Login
            </Link>
          </div>

        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section>
        <div className="grid-3">
          <div className="card">
            <Cpu size={28} color="var(--primary-600)" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>AI Wait-Time Engine</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)' }}>
              Dedicated Python AI service on port 8000 using ridge regression with queue depth, produce volume, and counter factors.
            </p>
          </div>

          <div className="card">
            <AlertTriangle size={28} color="var(--amber-600)" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Emergency Priority Quota</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)' }}>
              Reserved portion of centre capacity strictly allocated for perishable crops (e.g. tomatoes) at risk of post-harvest loss.
            </p>
          </div>

          <div className="card">
            <Clock size={28} color="var(--primary-700)" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>12-Hour AM/PM Slots</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)' }}>
              Farmer-friendly time windows with automatic capacity balancing across both farmer headcounts and metric quintals/kg.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
