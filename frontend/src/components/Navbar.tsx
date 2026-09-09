import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Trophy, Code2, LayoutDashboard, LogOut, User,
  ClipboardList, Settings, ChevronRight
} from 'lucide-react';

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) =>
    location.pathname.startsWith(path) ? 'text-arena-accent' : 'text-arena-text-dim hover:text-arena-text';

  return (
    <nav className="sticky top-0 z-50 bg-arena-surface/90 backdrop-blur-sm border-b border-arena-border">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/competitions" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-arena-accent rounded-lg flex items-center justify-center
                          group-hover:bg-arena-accent-hover transition-colors">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-arena-text tracking-tight">CodeArena</span>
        </Link>

        {/* Nav Links */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            <Link to="/competitions"
              className={`nav-link text-sm ${isActive('/competitions')}`}>
              <Trophy className="w-4 h-4" />
              Competitions
            </Link>
            <Link to="/submissions"
              className={`nav-link text-sm ${isActive('/submissions')}`}>
              <ClipboardList className="w-4 h-4" />
              Submissions
            </Link>
            {isAdmin && (
              <Link to="/admin"
                className={`nav-link text-sm ${isActive('/admin')}`}>
                <LayoutDashboard className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>
        )}

        {/* User Section */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-arena-bg border border-arena-border">
                <div className="w-6 h-6 rounded-full bg-arena-accent/20 flex items-center justify-center">
                  <User className="w-3 h-3 text-arena-accent" />
                </div>
                <span className="text-sm text-arena-text-dim">{user.username}</span>
                {isAdmin && (
                  <span className="text-xs bg-arena-accent/20 text-arena-accent px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-arena-muted
                           hover:text-arena-red transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary text-sm py-1.5">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-1.5">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
