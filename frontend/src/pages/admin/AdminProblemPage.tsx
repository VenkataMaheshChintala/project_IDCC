import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { problemApi, competitionApi } from '../../api/endpoints';
import { StatusBadge } from '../../components/StatusBadge';
import { Plus, Save, Trash2, ChevronLeft, Eye, EyeOff, GripVertical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

export default function AdminProblemPage() {
  const { id: problemId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = problemId === 'new';

  // For new problems, get competitionId from query params
  const compId = new URLSearchParams(window.location.search).get('competitionId');

  const [problem, setProblem] = useState<any>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '', slug: '', description: '', inputFormat: '', outputFormat: '',
    constraints: '', difficulty: 'MEDIUM', points: 100, timeLimitMs: 2000, memoryLimitMb: 256
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newTestCase, setNewTestCase] = useState({
    input: '', expectedOutput: '', sample: false, hidden: true, points: 0, orderIndex: 0
  });
  const [addingTC, setAddingTC] = useState(false);
  const [descTab, setDescTab] = useState<'write' | 'preview'>('write');

  useEffect(() => {
    if (!isNew) {
      problemApi.get(Number(problemId)).then((p: any) => {
        setProblem(p);
        setTestCases(p.testCases || []);
        setForm({
          title: p.title || '',
          slug: p.slug || '',
          description: p.description || '',
          inputFormat: p.inputFormat || '',
          outputFormat: p.outputFormat || '',
          constraints: p.constraints || '',
          difficulty: p.difficulty || 'MEDIUM',
          points: p.points || 100,
          timeLimitMs: p.timeLimitMs || 2000,
          memoryLimitMb: p.memoryLimitMb || 256
        });
      }).finally(() => setLoading(false));
    }
  }, [problemId, isNew]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        if (!compId) { setError('Missing competitionId'); return; }
        const created = await problemApi.create(Number(compId), form);
        navigate(`/admin/problems/${created.id}`);
      } else {
        await problemApi.update(Number(problemId), form);
        setSuccess('Saved!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      if (err.response?.data?.fieldErrors) {
        const errors = Object.entries(err.response.data.fieldErrors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(', ');
        setError(`Validation failed - ${errors}`);
      } else {
        setError(err.response?.data?.message || 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this problem? This removes all its test cases and submissions.')) return;
    try {
      await problemApi.delete(Number(problemId));
      navigate(-1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleAddTestCase = async () => {
    setAddingTC(true);
    try {
      const tc = await problemApi.addTestCase(Number(problemId), {
        ...newTestCase,
        orderIndex: testCases.length + 1
      });
      setTestCases(prev => [...prev, tc]);
      setNewTestCase({ input: '', expectedOutput: '', sample: false, hidden: true, points: 0, orderIndex: 0 });
      setSuccess('Test case added');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add test case');
    } finally {
      setAddingTC(false);
    }
  };

  const handleDeleteTC = async (tcId: number) => {
    if (!confirm('Delete this test case?')) return;
    try {
      await problemApi.deleteTestCase(tcId);
      setTestCases(prev => prev.filter(tc => tc.id !== tcId));
    } catch (err: any) {
      setError('Failed to delete test case');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-arena-muted hover:text-arena-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-arena-text">
          {isNew ? 'New Problem' : `Edit: ${problem?.title}`}
        </h1>
        {problem && <StatusBadge status={problem.difficulty} />}
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-arena-red/10 border border-arena-red/30 rounded-lg text-arena-red text-sm">{error}</div>}
      {success && <div className="mb-4 px-4 py-3 bg-arena-green/10 border border-arena-green/30 rounded-lg text-arena-green text-sm">{success}</div>}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-arena-text">Problem Details</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-arena-text-dim mb-1.5">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input" placeholder="Two Sum" />
            </div>
            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Slug (A, B, C...)</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toUpperCase() }))}
                className="input font-mono uppercase" placeholder="A" maxLength={10} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm text-arena-text-dim">Description (Markdown)</label>
              <div className="flex bg-arena-bg border border-arena-border rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDescTab('write')}
                  className={`px-3 py-1 rounded-md transition-colors ${descTab === 'write' ? 'bg-arena-surface text-arena-text font-medium shadow-sm' : 'text-arena-muted hover:text-arena-text'}`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setDescTab('preview')}
                  className={`px-3 py-1 rounded-md transition-colors ${descTab === 'preview' ? 'bg-arena-surface text-arena-text font-medium shadow-sm' : 'text-arena-muted hover:text-arena-text'}`}
                >
                  Preview
                </button>
              </div>
            </div>

            {descTab === 'write' ? (
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input min-h-40 resize-y font-mono text-xs"
                placeholder="## Problem Statement&#10;&#10;Given an array..."
              />
            ) : (
              <div className="input min-h-40 p-4 overflow-y-auto prose-arena bg-arena-bg/60">
                {form.description ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.description}</ReactMarkdown>
                ) : (
                  <span className="text-arena-muted italic">Nothing to preview.</span>
                )}
              </div>
            )}
            <p className="text-xs text-arena-muted mt-1.5">
              💡 Tip: Put image files in <code className="text-arena-accent font-mono">frontend/public/problems/</code> and embed with <code className="text-arena-accent font-mono">![Alt text](/problems/filename.png)</code>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Input Format (Markdown)</label>
              <textarea value={form.inputFormat}
                onChange={e => setForm(f => ({ ...f, inputFormat: e.target.value }))}
                className="input min-h-20 resize-y text-xs" placeholder="Line 1: n..." />
            </div>
            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Output Format (Markdown)</label>
              <textarea value={form.outputFormat}
                onChange={e => setForm(f => ({ ...f, outputFormat: e.target.value }))}
                className="input min-h-20 resize-y text-xs" placeholder="A single integer..." />
            </div>
          </div>

          <div>
            <label className="block text-sm text-arena-text-dim mb-1.5">Constraints (Markdown)</label>
            <textarea value={form.constraints}
              onChange={e => setForm(f => ({ ...f, constraints: e.target.value }))}
              className="input min-h-16 resize-y text-xs" placeholder="- 1 ≤ n ≤ 10⁵" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                className="input">
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Time Limit (ms)</label>
              <input type="number" value={form.timeLimitMs} min={100}
                onChange={e => setForm(f => ({ ...f, timeLimitMs: Number(e.target.value) }))}
                className="input" />
            </div>
            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Memory (MB)</label>
              <input type="number" value={form.memoryLimitMb} min={32}
                onChange={e => setForm(f => ({ ...f, memoryLimitMb: Number(e.target.value) }))}
                className="input" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : isNew ? 'Create Problem' : 'Save'}
            </button>
            {!isNew && (
              <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Problem
              </button>
            )}
          </div>
        </div>

        {/* Test Cases (only after problem is created) */}
        {!isNew && (
          <div className="card">
            <h2 className="font-semibold text-arena-text mb-4">Test Cases ({testCases.length})</h2>

            {/* Existing test cases */}
            {testCases.length > 0 && (
              <div className="space-y-3 mb-6">
                {testCases.map((tc, i) => (
                  <div key={tc.id} className="bg-arena-bg border border-arena-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-arena-muted font-mono">#{tc.orderIndex || i + 1}</span>
                        <span className="badge bg-arena-accent/10 text-arena-accent border border-arena-accent/20">{tc.points} pts</span>
                        {tc.sample && <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">Sample</span>}
                        {tc.hidden && <span className="badge bg-gray-500/10 text-gray-500 border border-gray-500/20 flex items-center gap-1"><EyeOff className="w-3 h-3" />Hidden</span>}
                      </div>
                      <button onClick={() => handleDeleteTC(tc.id)}
                        className="text-arena-red/50 hover:text-arena-red transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <p className="text-arena-muted mb-1">Input</p>
                        <pre className="bg-arena-surface border border-arena-border rounded p-2 text-arena-text overflow-x-auto whitespace-pre-wrap max-h-24">{tc.input}</pre>
                      </div>
                      <div>
                        <p className="text-arena-muted mb-1">Expected Output</p>
                        <pre className="bg-arena-surface border border-arena-border rounded p-2 text-arena-text overflow-x-auto whitespace-pre-wrap max-h-24">{tc.expectedOutput}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new test case */}
            <div className="border border-dashed border-arena-border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-arena-text">Add Test Case</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-arena-muted mb-1 block">Input</label>
                  <textarea value={newTestCase.input}
                    onChange={e => setNewTestCase(t => ({ ...t, input: e.target.value }))}
                    className="input min-h-24 resize-y font-mono text-xs" placeholder="Test input..." />
                </div>
                <div>
                  <label className="text-xs text-arena-muted mb-1 block">Expected Output</label>
                  <textarea value={newTestCase.expectedOutput}
                    onChange={e => setNewTestCase(t => ({ ...t, expectedOutput: e.target.value }))}
                    className="input min-h-24 resize-y font-mono text-xs" placeholder="Expected output..." />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <label className="text-xs text-arena-muted mb-1 block">Points</label>
                  <input type="number" value={newTestCase.points} min={0}
                    onChange={e => setNewTestCase(t => ({ ...t, points: Number(e.target.value) }))}
                    className="input py-1 px-2 text-xs w-24" />
                </div>
                <label className="flex items-center gap-2 text-sm text-arena-text-dim cursor-pointer mt-5">
                  <input type="checkbox" checked={newTestCase.sample}
                    onChange={e => setNewTestCase(t => ({ ...t, sample: e.target.checked }))}
                    className="rounded" />
                  Sample (visible to participants)
                </label>
                <label className="flex items-center gap-2 text-sm text-arena-text-dim cursor-pointer mt-5">
                  <input type="checkbox" checked={newTestCase.hidden}
                    onChange={e => setNewTestCase(t => ({ ...t, hidden: e.target.checked }))}
                    className="rounded" />
                  Hidden
                </label>
              </div>
              <button onClick={handleAddTestCase} disabled={addingTC || !newTestCase.input || !newTestCase.expectedOutput}
                className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                {addingTC ? 'Adding...' : 'Add Test Case'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
