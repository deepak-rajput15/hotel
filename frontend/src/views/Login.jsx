import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Hotel, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <form onSubmit={handleSubmit}>
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
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                placeholder={showPassword ? "Enter password" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px', paddingRight: '42px' }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--t-500)', pointerEvents: 'none' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: showPassword ? 'var(--brand)' : 'var(--t-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'color 0.15s ease',
                }}
                title={showPassword ? 'Hide password' : 'View password'}
                aria-label={showPassword ? 'Hide password' : 'View password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: '14px', marginTop: '12px' }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Quick Demo Credentials for Fast Testing */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-sub)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)', marginBottom: '10px', textAlign: 'center', letterSpacing: '0.04em' }}>
            Quick Demo Logins (Password: Password@123)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                setEmail('owner@apexhospitality.com');
                setPassword('Password@123');
              }}
              style={{ padding: '6px 10px', fontSize: '11.5px', background: 'var(--surface-sub)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}
            >
              <span>🏨 <strong>Hotel Owner</strong> (Multi-Hotel Portfolio)</span>
              <span style={{ color: 'var(--brand)', fontWeight: '600' }}>Select</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('subadmin.vikram@apexhospitality.com');
                setPassword('Password@123');
              }}
              style={{ padding: '6px 10px', fontSize: '11.5px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', color: '#6d28d9' }}
            >
              <span>⭐ <strong>Hotel A Sub-Admin</strong> (Only Hotel A details)</span>
              <span style={{ fontWeight: '700' }}>Select</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('store.amit@apexhospitality.com');
                setPassword('Password@123');
              }}
              style={{ padding: '6px 10px', fontSize: '11.5px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', color: '#047857' }}
            >
              <span>📦 <strong>Store Admin / Keeper</strong> (Products & Stocks)</span>
              <span style={{ fontWeight: '700' }}>Select</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('admin@hotelsaask.com');
                setPassword('Password@123');
              }}
              style={{ padding: '6px 10px', fontSize: '11.5px', background: 'var(--surface-sub)', border: '1px solid var(--border-sub)', borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}
            >
              <span>🛡️ <strong>Platform Super Admin</strong></span>
              <span style={{ color: 'var(--brand)', fontWeight: '600' }}>Select</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
