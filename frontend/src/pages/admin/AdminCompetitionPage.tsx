import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { competitionApi, problemApi, leaderboardApi, adminApi } from '../../api/endpoints';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Plus, Save, Trash2, Download, ChevronLeft,
  ExternalLink, Calendar, FileText, Settings, Info, Award
} from 'lucide-react';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['UPCOMING', 'LIVE'],
  UPCOMING: ['LIVE', 'ARCHIVED'],
  LIVE: ['ENDED'],
  ENDED: ['ARCHIVED'],
  ARCHIVED: [],
};

interface CompetitionForm {
  name: string;
  description: string;
  rules: string;
  timeLimitMinutes?: number | '';
  status?: string;
}

export default function AdminCompetitionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [competition, setCompetition] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [form, setForm] = useState<CompetitionForm>({
    name: '', description: '', rules: '', timeLimitMinutes: '', status: ''
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('problems');

  useEffect(() => {
    if (!isNew) {
      Promise.all([
        competitionApi.get(Number(id)),
        problemApi.listByCompetition(Number(id)).catch(() => [])
      ]).then(([comp, probs]) => {
        setCompetition(comp);
        setProblems(probs);
        setForm({
          name: comp.name || '',
          description: comp.description || '',
          rules: comp.rules || '',
          timeLimitMinutes: comp.timeLimitMinutes || '',
          status: comp.status || ''
        });
      }).finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const toLocalInput = (iso: string) =>
    new Date(iso).toISOString().slice(0, 16);

  const toIso = (local: string) => local ? new Date(local).toISOString() : null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        timeLimitMinutes: form.timeLimitMinutes === '' ? null : Number(form.timeLimitMinutes),
        status: form.status || undefined
      };

      if (isNew) {
        const created = await competitionApi.create(payload);
        navigate(`/admin/competitions/${created.id}`);
      } else {
        const updated = await competitionApi.update(Number(id), {
          ...payload,
          status: form.status || undefined
        });
        setCompetition(updated);
        setSuccess('Saved successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      if (err.response?.data?.fieldErrors) {
        const errors = Object.entries(err.response.data.fieldErrors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(', ');
        setError(`Validation failed - ${errors}`);
      } else {
        setError(err.response?.data?.message || 'Save failed. Check your inputs.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    setError('');
    try {
      const updated = await competitionApi.update(Number(id), { status: newStatus });
      setCompetition(updated);
      setForm(f => ({ ...f, status: newStatus }));
      setSuccess(`Status changed to ${newStatus}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Status change failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this competition? This cannot be undone.')) return;
    try {
      await competitionApi.delete(Number(id));
      navigate('/admin/competitions');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleExport = async () => {
    try {
      const res = await leaderboardApi.exportCsv(Number(id));
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leaderboard-${id}.csv`;
      a.click();
    } catch {
      setError('Export failed');
    }
  };

  const handleExportSubmissions = async () => {
    try {
      const res = await adminApi.exportSubmissionsCsv(Number(id));
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions-${id}.csv`;
      a.click();
    } catch {
      setError('Export failed');
    }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const availableTransitions = competition ? STATUS_TRANSITIONS[competition.status] || [] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="text-arena-muted hover:text-arena-text transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-arena-text flex items-center gap-2">
          {isNew ? 'New Competition' : (
            <>
              Edit Competition: <span className="text-arena-accent">{competition?.name}</span>
            </>
          )}
        </h1>
        {competition && <StatusBadge status={competition.status} />}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-arena-red/10 border border-arena-red/30 rounded-lg text-arena-red text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 px-4 py-3 bg-arena-green/10 border border-arena-green/30 rounded-lg text-arena-green text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main forms */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* General Info Card */}
            <div className="card space-y-5">
              <div className="flex items-center gap-2 border-b border-arena-border pb-3">
                <Settings className="w-5 h-5 text-arena-accent" />
                <h2 className="font-semibold text-arena-text text-lg">General Information</h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-arena-text-dim mb-1.5">Competition Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input text-base py-2.5" placeholder="e.g. Spring Programming Contest 2026" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-arena-text-dim mb-1.5">Description</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input min-h-24 resize-y leading-relaxed" placeholder="Brief overview of what this competition is about..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-arena-text-dim mb-1.5">Time Limit (Minutes)</label>
                  <input type="number" value={form.timeLimitMinutes} min="1"
                    onChange={e => setForm(f => ({ ...f, timeLimitMinutes: e.target.value ? Number(e.target.value) : '' }))}
                    className="input py-2.5 w-full" placeholder="e.g. 120" />
                  <p className="text-xs text-arena-muted mt-1">Leave empty for no time limit.</p>
                </div>
                {!isNew && (
                  <div>
                    <label className="block text-sm font-medium text-arena-text-dim mb-1.5">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="input py-2.5 w-full">
                      <option value="DRAFT">Draft</option>
                      <option value="UPCOMING">Upcoming</option>
                      <option value="LIVE">Live</option>
                      <option value="ENDED">Ended</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Rules Card */}
            <div className="card space-y-5">
              <div className="flex items-center gap-2 border-b border-arena-border pb-3">
                <FileText className="w-5 h-5 text-arena-accent" />
                <h2 className="font-semibold text-arena-text text-lg">Rules & Guidelines</h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-arena-text-dim mb-1.5">
                  Rules <span className="text-xs text-arena-muted font-normal">(Markdown supported)</span>
                </label>
                <textarea value={form.rules}
                  onChange={e => setForm(f => ({ ...f, rules: e.target.value }))}
                  className="input min-h-40 resize-y font-mono text-sm leading-relaxed"
                  placeholder="## Rules&#10;&#10;1. No external libraries...&#10;2. Plagiarism is strictly prohibited..." />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-2">
              <button type="submit" disabled={saving}
                className="btn-primary flex items-center justify-center gap-2 py-2.5 px-6 flex-1 sm:flex-none">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : isNew ? 'Create Competition' : 'Save Changes'}
              </button>
              {!isNew && (
                <button type="button" onClick={handleDelete} disabled={saving} className="btn-danger flex items-center gap-2 py-2.5 px-5">
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          </form>

          {/* Navigation Tabs */}
          {!isNew && competition && (
            <div className="flex gap-1 mb-6 bg-arena-surface rounded-lg p-1 border border-arena-border w-fit">
              <button onClick={() => setTab('problems')}
                className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                  tab === 'problems' ? 'bg-arena-bg text-arena-text shadow shadow-black/20' : 'text-arena-muted hover:text-arena-text hover:bg-arena-bg/50'
                }`}>
                Problems
              </button>
              <button onClick={() => setTab('leaderboard')}
                className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                  tab === 'leaderboard' ? 'bg-arena-bg text-arena-text shadow shadow-black/20' : 'text-arena-muted hover:text-arena-text hover:bg-arena-bg/50'
                }`}>
                Live Leaderboard
              </button>
              <button onClick={() => setTab('submissions')}
                className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                  tab === 'submissions' ? 'bg-arena-bg text-arena-text shadow shadow-black/20' : 'text-arena-muted hover:text-arena-text hover:bg-arena-bg/50'
                }`}>
                Submissions
              </button>
            </div>
          )}

          {/* Problems section */}
          {!isNew && competition && tab === 'problems' && (
            <div className="card border-l-4 border-l-arena-accent animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-semibold text-arena-text text-lg">Problems</h2>
                  <p className="text-sm text-arena-text-dim mt-0.5">Manage questions for this competition</p>
                </div>
                {/* BUG FIX: Added correct problem creation route with query parameter */}
                <Link to={`/admin/problems/new?competitionId=${id}`} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5 shadow-sm">
                  <Plus className="w-4 h-4" />
                  Add Problem
                </Link>
              </div>
              
              {problems.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-arena-border rounded-lg bg-arena-bg">
                  <p className="text-arena-muted text-sm">No problems added yet. Click 'Add Problem' to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {problems.map(p => (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3
                                               bg-arena-surface border border-arena-border rounded-xl hover:border-arena-accent/40 transition-colors group">
                      <div className="flex items-center gap-3 mb-2 sm:mb-0">
                        <span className="font-mono text-sm font-bold text-arena-accent bg-arena-accent/10 px-2.5 py-1 rounded-md">
                          {p.slug}
                        </span>
                        <span className="text-base text-arena-text font-medium group-hover:text-arena-accent transition-colors">
                          {p.title}
                        </span>
                        <StatusBadge status={p.difficulty} />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-arena-muted font-mono bg-arena-bg px-2 py-1 rounded">{p.points} pts</span>
                        <Link to={`/admin/problems/${p.id}`}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 group-hover:bg-arena-accent/10">
                          Edit <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isNew && competition && tab === 'leaderboard' && (
            <AdminLeaderboardTab competitionId={Number(id)} />
          )}

          {!isNew && competition && tab === 'submissions' && (
            <AdminSubmissionsTab competitionId={Number(id)} />
          )}
        </div>

        {/* Sidebar */}
        {!isNew && competition && (
          <div className="col-span-1 space-y-6">
            {/* Deployment & Status */}
            <div className="card sticky top-6">
              <div className="border-b border-arena-border pb-3 mb-4">
                <h3 className="font-semibold text-arena-text text-lg">Deployment & Status</h3>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-arena-text-dim">Current Status:</span>
                  <StatusBadge status={competition.status} />
                </div>
              </div>
              
              <div className="space-y-3">
                {competition.status === 'DRAFT' && (
                  <>
                    <p className="text-xs text-arena-muted mb-2">This competition is currently hidden from participants. You can publish it as upcoming, or deploy it live immediately.</p>
                    <button onClick={() => handleStatusChange('UPCOMING')} disabled={saving}
                      className="w-full btn-secondary py-2.5 flex items-center justify-center gap-2">
                      Publish as Upcoming
                    </button>
                    <button onClick={() => handleStatusChange('LIVE')} disabled={saving}
                      className="w-full btn-primary bg-arena-green hover:bg-arena-green/90 py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-arena-green/20">
                      🚀 Deploy Live Now
                    </button>
                  </>
                )}

                {competition.status === 'UPCOMING' && (
                  <>
                    <p className="text-xs text-arena-muted mb-2">Participants can see this competition but cannot start attempting problems yet.</p>
                    <button onClick={() => handleStatusChange('LIVE')} disabled={saving}
                      className="w-full btn-primary bg-arena-green hover:bg-arena-green/90 py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-arena-green/20">
                      🚀 Start Competition (Go Live)
                    </button>
                    <button onClick={() => handleStatusChange('ARCHIVED')} disabled={saving}
                      className="w-full btn-secondary border-arena-red/50 text-arena-red hover:bg-arena-red/10 py-2.5 mt-2">
                      Cancel & Archive
                    </button>
                  </>
                )}

                {competition.status === 'LIVE' && (
                  <>
                    <p className="text-xs text-arena-green/80 mb-2 font-medium">Competition is currently active! Participants can submit solutions.</p>
                    <button onClick={() => handleStatusChange('ENDED')} disabled={saving}
                      className="w-full btn-secondary border-arena-red/50 text-arena-red hover:bg-arena-red/10 py-2.5 flex items-center justify-center gap-2">
                      🛑 End Competition
                    </button>
                  </>
                )}

                {competition.status === 'ENDED' && (
                  <>
                    <p className="text-xs text-arena-muted mb-2">The competition has concluded. Submissions are closed.</p>
                    <button onClick={() => handleStatusChange('ARCHIVED')} disabled={saving}
                      className="w-full btn-secondary py-2.5 flex items-center justify-center gap-2">
                      Archive Competition
                    </button>
                  </>
                )}

                {competition.status === 'ARCHIVED' && (
                  <div className="text-center py-4 bg-arena-bg rounded-lg border border-arena-border border-dashed">
                    <p className="text-arena-muted text-xs">This competition is archived and read-only.</p>
                  </div>
                )}
              </div>

              {/* Export */}
              <div className="mt-8 pt-6 border-t border-arena-border">
                <h3 className="font-semibold text-arena-text text-sm mb-3">Data Export</h3>
                <div className="flex flex-col gap-2">
                  <button onClick={handleExport}
                    className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm hover:border-arena-accent/50">
                    <Download className="w-4 h-4" />
                    Leaderboard CSV
                  </button>
                  <button onClick={handleExportSubmissions}
                    className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm hover:border-arena-accent/50">
                    <Download className="w-4 h-4" />
                    Submissions CSV
                  </button>
                </div>
              </div>

              {/* View live */}
              <div className="mt-4 pt-4 border-t border-arena-border">
                <Link to={`/competitions/${id}`}
                  className="card block bg-arena-bg hover:bg-arena-surface border-arena-border hover:border-arena-accent/40 transition-colors text-center text-sm font-medium text-arena-accent group">
                  <span className="flex items-center justify-center gap-2">
                    View Public Page 
                    <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminLeaderboardTab({ competitionId }: { competitionId: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../../api/endpoints').then(({ leaderboardApi }) =>
      leaderboardApi.get(competitionId).then(setData).finally(() => setLoading(false))
    );
  }, [competitionId]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="card animate-fade-in border-l-4 border-l-yellow-500">
      <h2 className="text-lg font-semibold text-arena-text mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-yellow-500" />
        Live Leaderboard
      </h2>
      {!data?.entries?.length ? (
        <div className="text-center py-10 border-2 border-dashed border-arena-border rounded-lg bg-arena-bg">
          <p className="text-arena-muted text-sm">No submissions yet to generate a leaderboard.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-arena-muted uppercase tracking-wider border-b border-arena-border">
                <th className="text-left py-3 pr-6 font-medium">Rank</th>
                <th className="text-left py-3 pr-6 font-medium">Participant</th>
                <th className="text-right py-3 pr-6 font-medium">Score</th>
                <th className="text-right py-3 font-medium">Solved</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e: any) => (
                <tr key={e.userId} className="table-row">
                  <td className="py-3 pr-6">
                    <span className={`font-bold text-sm ${
                      e.rank === 1 ? 'text-yellow-400' :
                      e.rank === 2 ? 'text-gray-300' :
                      e.rank === 3 ? 'text-orange-400' : 'text-arena-muted'
                    }`}>
                      #{e.rank}
                    </span>
                  </td>
                  <td className="py-3 pr-6 font-medium text-arena-text">{e.username}</td>
                  <td className="py-3 pr-6 text-right font-mono font-bold text-arena-accent">{e.totalScore}</td>
                  <td className="py-3 text-right text-arena-text-dim text-sm">{e.problemsSolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminSubmissionsTab({ competitionId }: { competitionId: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [submissionDetails, setSubmissionDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    setLoading(true);
    import('../../api/endpoints').then(({ adminApi }) =>
      adminApi.getSubmissions({ competitionId, page }).then(setData).finally(() => setLoading(false))
    );
  }, [competitionId, page]);

  const handleViewClick = (id: number) => {
    setSelectedSubmissionId(id);
    setLoadingDetails(true);
    import('../../api/endpoints').then(({ submissionApi }) =>
      submissionApi.get(id).then(setSubmissionDetails).finally(() => setLoadingDetails(false))
    );
  };

  if (loading && !data) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="card animate-fade-in border-l-4 border-l-blue-500">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-arena-text flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          Participant Submissions
        </h2>
      </div>

      {!data?.content?.length ? (
        <div className="text-center py-10 border-2 border-dashed border-arena-border rounded-lg bg-arena-bg">
          <p className="text-arena-muted text-sm">No submissions have been made yet.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-arena-muted uppercase tracking-wider border-b border-arena-border">
                  <th className="text-left py-3 pr-6 font-medium">ID</th>
                  <th className="text-left py-3 pr-6 font-medium">Participant</th>
                  <th className="text-left py-3 pr-6 font-medium">Problem</th>
                  <th className="text-left py-3 pr-6 font-medium">Status</th>
                  <th className="text-right py-3 pr-6 font-medium">Score</th>
                  <th className="text-right py-3 font-medium">Time</th>
                  <th className="text-right py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.content.map((s: any) => (
                  <tr key={s.id} className="border-b border-arena-border/50 last:border-0 hover:bg-arena-bg/30 transition-colors">
                    <td className="py-3 pr-6 font-mono text-arena-muted">#{s.id}</td>
                    <td className="py-3 pr-6 font-medium text-arena-text">{s.username}</td>
                    <td className="py-3 pr-6 text-arena-text-dim">{s.problemTitle}</td>
                    <td className="py-3 pr-6">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-3 pr-6 text-right font-mono text-arena-text">
                      {s.score}/{s.maxScore}
                    </td>
                    <td className="py-3 text-right text-arena-text-dim text-xs pr-6">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <button onClick={() => handleViewClick(s.id)}
                        className="btn-secondary py-1 px-3 text-xs bg-arena-bg hover:bg-arena-surface">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-arena-border">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={data.first || loading}
                className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50">
                Previous
              </button>
              <span className="text-sm text-arena-text-dim">
                Page {data.number + 1} of {data.totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(data.totalPages - 1, p + 1))} disabled={data.last || loading}
                className="btn-secondary py-1.5 px-4 text-sm disabled:opacity-50">
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Submission Details Modal */}
      {selectedSubmissionId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-arena-surface border border-arena-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-arena-border flex items-center justify-between bg-arena-bg/50">
              <h3 className="font-semibold text-arena-text text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-arena-accent" />
                Submission #{selectedSubmissionId}
              </h3>
              <button onClick={() => { setSelectedSubmissionId(null); setSubmissionDetails(null); }}
                className="text-arena-muted hover:text-arena-text p-1">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {loadingDetails ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : submissionDetails ? (
                <>
                  <div className="flex items-center gap-4 flex-wrap bg-arena-bg p-4 rounded-lg border border-arena-border">
                    <div>
                      <span className="text-xs text-arena-muted block mb-1">Status</span>
                      <StatusBadge status={submissionDetails.status} />
                    </div>
                    <div className="h-8 w-px bg-arena-border mx-2"></div>
                    <div>
                      <span className="text-xs text-arena-muted block mb-1">Score</span>
                      <span className="font-mono font-bold text-arena-text">{submissionDetails.score} / {submissionDetails.maxScore}</span>
                    </div>
                    <div className="h-8 w-px bg-arena-border mx-2"></div>
                    <div>
                      <span className="text-xs text-arena-muted block mb-1">Language</span>
                      <span className="font-mono text-sm bg-arena-surface px-2 py-0.5 rounded text-arena-accent">{submissionDetails.language}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-arena-text-dim uppercase tracking-wider mb-2">Source Code</h4>
                    <pre className="bg-black/40 border border-arena-border p-4 rounded-lg overflow-x-auto text-sm font-mono text-gray-300">
                      {submissionDetails.sourceCode}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-arena-text-dim uppercase tracking-wider mb-2">Test Cases</h4>
                    <div className="space-y-3">
                      {submissionDetails.testResults?.map((tr: any) => (
                        <div key={tr.orderIndex} className="bg-arena-bg border border-arena-border rounded-lg overflow-hidden">
                          <div className="px-4 py-3 border-b border-arena-border flex items-center justify-between bg-arena-surface/50">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-arena-text text-sm">Test Case #{tr.orderIndex + 1}</span>
                              {tr.hidden && <span className="text-[10px] px-2 py-0.5 rounded-full bg-arena-border text-arena-muted uppercase tracking-wider">Hidden</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-arena-muted">{tr.executionTimeMs}ms</span>
                              <StatusBadge status={tr.status} />
                            </div>
                          </div>
                          
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tr.input !== null && (
                              <div className="col-span-1 md:col-span-2">
                                <span className="text-xs text-arena-muted mb-1 block">Input</span>
                                <pre className="bg-black/30 border border-arena-border/50 p-2.5 rounded font-mono text-xs text-gray-300 whitespace-pre-wrap">{tr.input}</pre>
                              </div>
                            )}
                            {tr.expectedOutput !== null && (
                              <div>
                                <span className="text-xs text-arena-muted mb-1 block">Expected Output</span>
                                <pre className="bg-black/30 border border-arena-border/50 p-2.5 rounded font-mono text-xs text-gray-300 whitespace-pre-wrap">{tr.expectedOutput}</pre>
                              </div>
                            )}
                            {tr.actualOutput !== null && (
                              <div>
                                <span className="text-xs text-arena-muted mb-1 block">Actual Output</span>
                                <pre className={`bg-black/30 border border-arena-border/50 p-2.5 rounded font-mono text-xs whitespace-pre-wrap ${
                                  tr.status === 'ACCEPTED' ? 'text-arena-green' : 'text-arena-red'
                                }`}>{tr.actualOutput}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {!submissionDetails.testResults?.length && (
                        <p className="text-sm text-arena-muted text-center py-4">No test case details available.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-arena-red">Failed to load submission details.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
