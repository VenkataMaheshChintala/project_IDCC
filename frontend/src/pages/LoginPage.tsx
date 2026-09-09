import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/endpoints';
import { Code2, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(form);
      login(data.token, data.user);
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/competitions');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-arena-accent/20 rounded-2xl mb-4 border border-arena-accent/30">
            <Code2 className="w-8 h-8 text-arena-accent" />
          </div>
          <h1 className="text-2xl font-bold text-arena-text">Welcome back</h1>
          <p className="text-arena-text-dim text-sm mt-1">Sign in to CodeArena</p>
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
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input"
                placeholder="you@example.com"
                required
                autoFocus
                id="email"
              />
            </div>

            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  id="password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-arena-muted hover:text-arena-text"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2"
              id="login-btn"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-arena-text-dim">
            Don't have an account?{' '}
            <Link to="/register" className="text-arena-accent hover:underline">Register</Link>
          </p>

          {/* Dev credentials hint */}
          <div className="border-t border-arena-border pt-4">
            <p className="text-xs text-arena-muted text-center mb-2">Demo credentials</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setForm({ email: 'admin@codearena.local', password: 'Admin@123' })}
                className="px-3 py-2 bg-arena-bg border border-arena-border rounded-lg text-arena-text-dim hover:border-arena-accent/50 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setForm({ email: 'student@codearena.local', password: 'Student@123' })}
                className="px-3 py-2 bg-arena-bg border border-arena-border rounded-lg text-arena-text-dim hover:border-arena-accent/50 transition-colors"
              >
                Participant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
