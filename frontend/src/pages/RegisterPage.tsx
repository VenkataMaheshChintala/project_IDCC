import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/endpoints';
import { Code2, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      const data = await authApi.register(form);
      login(data.token, data.user);
      navigate('/competitions');
    } catch (err: any) {
      if (err.response?.data?.fieldErrors) {
        setFieldErrors(err.response.data.fieldErrors);
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (p.length === 0) return null;
    if (p.length < 8) return { level: 'weak', color: 'text-arena-red', width: 'w-1/3' };
    if (p.length < 12 || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { level: 'medium', color: 'text-arena-yellow', width: 'w-2/3' };
    return { level: 'strong', color: 'text-arena-green', width: 'w-full' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-arena-accent/20 rounded-2xl mb-4 border border-arena-accent/30">
            <Code2 className="w-8 h-8 text-arena-accent" />
          </div>
          <h1 className="text-2xl font-bold text-arena-text">Create account</h1>
          <p className="text-arena-text-dim text-sm mt-1">Join CodeArena today</p>
        </div>

        <div className="card space-y-5">
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-arena-red/10 border border-arena-red/30 rounded-lg text-arena-red text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Email</label>
              <input
                type="email" value={form.email} id="email"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={`input ${fieldErrors.email ? 'border-arena-red' : ''}`}
                placeholder="you@example.com" required
              />
              {fieldErrors.email && <p className="text-xs text-arena-red mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Username</label>
              <input
                type="text" value={form.username} id="username"
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className={`input ${fieldErrors.username ? 'border-arena-red' : ''}`}
                placeholder="coolcoder" required minLength={3} maxLength={30}
              />
              {fieldErrors.username
                ? <p className="text-xs text-arena-red mt-1">{fieldErrors.username}</p>
                : <p className="text-xs text-arena-muted mt-1">Letters, numbers, underscores only</p>}
            </div>

            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Password</label>
              <input
                type="password" value={form.password} id="password"
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className={`input ${fieldErrors.password ? 'border-arena-red' : ''}`}
                placeholder="••••••••" required minLength={8}
              />
              {strength && (
                <div className="mt-2">
                  <div className="h-1 bg-arena-bg rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.width} ${
                      strength.level === 'weak' ? 'bg-arena-red' :
                      strength.level === 'medium' ? 'bg-arena-yellow' : 'bg-arena-green'
                    }`} />
                  </div>
                  <p className={`text-xs mt-1 ${strength.color}`}>{strength.level} password</p>
                </div>
              )}
              {fieldErrors.password && <p className="text-xs text-arena-red mt-1">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 mt-2"
              id="register-btn"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-arena-text-dim">
            Already have an account?{' '}
            <Link to="/login" className="text-arena-accent hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
