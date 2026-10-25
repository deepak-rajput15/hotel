import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Hotel, Shield, Building, Lock, Mail, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(email, password);
    } catch (err) {
      setError(err.data?.message || err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setLoading(true);
    setError(null);
    try {
      if (role === 'admin') {
        await login('admin@hotelsaask.com', 'Password@123');
      } else {
        await login('owner@apexhospitality.com', 'Password@123');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--white)',
          border: '1px solid var(--border-sub)',
          borderRadius: 'var(--r-container)',
          padding: '36px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--brand), #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              margin: '0 auto 12px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <Hotel size={24} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
            GrandStay SaaS
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--t-500)', marginTop: '2px' }}>
            Multi-Tenant Hotel Automation Platform
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--error-bg)',
              border: '1px solid var(--error-border)',
              color: 'var(--error)',
              padding: '10px 14px',
              borderRadius: 'var(--r-sm)',
              fontSize: '12.5px',
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@hotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--t-500)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--t-500)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: '14px', marginTop: '6px' }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div style={{ paddingTop: '18px', borderTop: '1px solid var(--border-sub)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--t-500)', textAlign: 'center', marginBottom: '12px', letterSpacing: '0.04em' }}>
            Instant Demo Logins
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '9px 8px', flexDirection: 'column', gap: '3px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand)' }}>
                <Shield size={14} />
                <strong>Super Admin</strong>
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--t-500)' }}>Platform Control</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('owner')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '9px 8px', flexDirection: 'column', gap: '3px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                <Building size={14} />
                <strong>Hotel Owner</strong>
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--t-500)' }}>Apex Group (3 Hotels)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
