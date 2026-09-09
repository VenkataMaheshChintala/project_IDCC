import React, { useEffect, useState } from 'react';
import { adminApi, competitionApi } from '../../api/endpoints';
import { StatusBadge } from '../../components/StatusBadge';
import { Link } from 'react-router-dom';
import { ClipboardList, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUSES = ['', 'QUEUED', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER', 'COMPILATION_ERROR',
  'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'SYSTEM_ERROR'];

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any>(null);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [filters, setFilters] = useState({ competitionId: '', status: '', page: 0 });
  const [loading, setLoading] = useState(true);

  const load = (f = filters) => {
    setLoading(true);
    adminApi.getSubmissions({
      competitionId: f.competitionId || undefined,
      status: f.status || undefined,
      page: f.page
    }).then(setSubmissions).finally(() => setLoading(false));
  };

  useEffect(() => {
    competitionApi.list().then(setCompetitions);
    load();
  }, []);

  const handleFilter = () => { load({ ...filters, page: 0 }); };
  const changePage = (delta: number) => {
    const next = { ...filters, page: filters.page + delta };
    setFilters(next);
    load(next);
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-xl font-bold text-arena-text flex items-center gap-2 mb-6">
        <ClipboardList className="w-5 h-5 text-arena-accent" />
        All Submissions
      </h1>

      {/* Filters */}
      <div className="card mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-arena-text-dim mb-1">Competition</label>
          <select value={filters.competitionId}
            onChange={e => setFilters(f => ({ ...f, competitionId: e.target.value }))}
            className="input text-sm py-1.5 w-48">
            <option value="">All competitions</option>
            {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-arena-text-dim mb-1">Status</label>
          <select value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="input text-sm py-1.5 w-44">
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
        </div>
        <button onClick={handleFilter} className="btn-primary flex items-center gap-2 text-sm py-1.5">
          <Filter className="w-4 h-4" />
          Apply
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-arena-muted uppercase border-b border-arena-border">
                  <th className="text-left py-3 pr-3 font-medium">ID</th>
                  <th className="text-left py-3 pr-3 font-medium">Participant</th>
                  <th className="text-left py-3 pr-3 font-medium hidden md:table-cell">Problem</th>
                  <th className="text-left py-3 pr-3 font-medium">Status</th>
                  <th className="text-right py-3 pr-3 font-medium">Score</th>
                  <th className="text-right py-3 pr-3 font-medium hidden lg:table-cell">Time</th>
                  <th className="text-right py-3 font-medium hidden lg:table-cell">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submissions?.content?.map((s: any) => (
                  <tr key={s.id} className="table-row">
                    <td className="py-3 pr-3 font-mono text-xs text-arena-muted">#{s.id}</td>
                    <td className="py-3 pr-3 font-medium text-arena-text">{s.username || s.userId}</td>
                    <td className="py-3 pr-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-arena-accent bg-arena-accent/10 px-1.5 py-0.5 rounded">
                          {s.problemSlug}
                        </span>
                        <Link to={`/submissions/${s.id}`} className="text-arena-text hover:text-arena-accent transition-colors">
                          {s.problemTitle}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 pr-3"><StatusBadge status={s.status} /></td>
                    <td className="py-3 pr-3 text-right font-mono text-sm">
                      {s.score !== undefined ? `${s.score}/${s.maxScore}` : '—'}
                    </td>
                    <td className="py-3 pr-3 text-right text-arena-muted text-xs hidden lg:table-cell">
                      {s.executionTimeMs ? `${s.executionTimeMs}ms` : '—'}
                    </td>
                    <td className="py-3 text-right text-arena-muted text-xs hidden lg:table-cell">
                      {s.createdAt ? fmt(s.createdAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {submissions && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-arena-border">
                <span className="text-xs text-arena-muted">
                  {submissions.totalElements || 0} total submissions
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => changePage(-1)} disabled={filters.page === 0}
                    className="btn-secondary p-1.5 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-arena-text-dim px-2">
                    Page {filters.page + 1} of {Math.max(1, submissions.totalPages || 1)}
                  </span>
                  <button onClick={() => changePage(1)}
                    disabled={filters.page >= (submissions.totalPages || 1) - 1}
                    className="btn-secondary p-1.5 disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
