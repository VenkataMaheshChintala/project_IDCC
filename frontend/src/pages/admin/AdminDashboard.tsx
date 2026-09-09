import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { competitionApi, problemApi, adminApi } from '../../api/endpoints';
import { StatusBadge } from '../../components/StatusBadge';
import {
  LayoutDashboard, Trophy, ClipboardList, Users,
  CheckCircle2, XCircle, Clock, Activity, Plus, Settings
} from 'lucide-react';

export default function AdminDashboard() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      competitionApi.list(),
      adminApi.getSubmissions({ page: 0 }).catch(() => null)
    ]).then(([comps, subs]) => {
      setCompetitions(comps);
      setSubmissions(subs);
    }).finally(() => setLoading(false));
  }, []);

  const liveComp = competitions.find(c => c.status === 'LIVE');
  const stats = submissions ? {
    total: submissions.totalElements || 0,
    accepted: 0,  // Would need extra endpoint for real stats
  } : null;

  const navItems = [
    { to: '/admin/competitions', icon: Trophy, label: 'Competitions', desc: 'Manage competitions' },
    { to: '/admin/submissions', icon: ClipboardList, label: 'Submissions', desc: 'Monitor all submissions' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-arena-text flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-arena-accent" />
            Admin Dashboard
          </h1>
          <p className="text-arena-text-dim text-sm mt-1">Platform management overview</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {navItems.map(item => (
          <Link key={item.to} to={item.to}
            className="card hover:border-arena-accent/40 transition-all duration-200 group">
            <item.icon className="w-6 h-6 text-arena-accent mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-arena-text text-sm">{item.label}</p>
            <p className="text-arena-muted text-xs mt-0.5">{item.desc}</p>
          </Link>
        ))}
        <Link to="/admin/competitions/new"
          className="card hover:border-arena-green/40 transition-all duration-200 group border-dashed">
          <Plus className="w-6 h-6 text-arena-green mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-arena-text text-sm">New Competition</p>
          <p className="text-arena-muted text-xs mt-0.5">Create a new contest</p>
        </Link>
        <a href="#competitions-section"
          className="card hover:border-arena-blue/40 transition-all duration-200 group">
          <Activity className="w-6 h-6 text-arena-blue mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-arena-text text-sm">Live Status</p>
          <p className="text-arena-muted text-xs mt-0.5">{liveComp?.name || 'No live contest'}</p>
        </a>
      </div>

      {/* Competitions Table */}
      <div id="competitions-section" className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-arena-text">All Competitions</h2>
          <Link to="/admin/competitions/new" className="btn-primary text-sm py-1.5 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            New
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : competitions.length === 0 ? (
          <p className="text-arena-muted text-center py-8">No competitions yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-arena-muted uppercase border-b border-arena-border">
                <th className="text-left py-2 pr-4 font-medium">Name</th>
                <th className="text-left py-2 pr-4 font-medium">Status</th>
                <th className="text-right py-2 pr-4 font-medium hidden md:table-cell">Participants</th>
                <th className="text-right py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {competitions.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="py-3 pr-4 font-medium text-arena-text text-sm">{c.name}</td>
                  <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
                  <td className="py-3 pr-4 text-right text-arena-muted text-sm hidden md:table-cell">
                    {c.participantCount}
                  </td>
                  <td className="py-3 text-right">
                    <Link to={`/admin/competitions/${c.id}`}
                      className="text-xs text-arena-accent hover:underline">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
