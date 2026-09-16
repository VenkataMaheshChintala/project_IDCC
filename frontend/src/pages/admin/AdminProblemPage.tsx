import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { problemApi } from '../../api/endpoints';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Plus, Save, Trash2, ChevronLeft, Eye, EyeOff, Pencil, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

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
    constraints: '', points: 0, timeLimitMs: 2000, memoryLimitMb: 256
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
  const [showDeleteProblemModal, setShowDeleteProblemModal] = useState(false);
  const [deleteTcId, setDeleteTcId] = useState<number | null>(null);

  // Inline edit state
  const [editingTcId, setEditingTcId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingTc, setSavingTc] = useState(false);

  // Derived total points = sum of saved test case points + what admin is currently typing in "add" form
  const savedPoints = useMemo(() => testCases.reduce((s, tc) => s + (tc.points || 0), 0), [testCases]);
  const derivedPoints = savedPoints + (newTestCase.points || 0);

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
          points: p.points || 0,
          timeLimitMs: p.timeLimitMs || 2000,
          memoryLimitMb: p.memoryLimitMb || 256
        });
      }).catch(() => setError('Failed to load problem'))
        .finally(() => setLoading(false));
    }
  }, [problemId, isNew]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Sync stored points with the sum of existing test case points
      const payload = { ...form, points: savedPoints };
      if (isNew) {
        if (!compId) { setError('Missing competitionId'); return; }
        const created = await problemApi.create(Number(compId), payload);
        navigate(`/admin/problems/${created.id}`);
      } else {
        await problemApi.update(Number(problemId), payload);
        setSuccess('Problem saved successfully');
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
      const updatedTcs = [...testCases, tc];
      setTestCases(updatedTcs);
      // Sync problem points with the new total
      const newTotal = updatedTcs.reduce((s, t) => s + (t.points || 0), 0);
      await problemApi.update(Number(problemId), { ...form, points: newTotal });
      setForm(f => ({ ...f, points: newTotal }));
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
    try {
      await problemApi.deleteTestCase(tcId);
      const updatedTcs = testCases.filter(tc => tc.id !== tcId);
      setTestCases(updatedTcs);
      // Sync problem points with the new total
      const newTotal = updatedTcs.reduce((s, t) => s + (t.points || 0), 0);
      await problemApi.update(Number(problemId), { ...form, points: newTotal });
      setForm(f => ({ ...f, points: newTotal }));
    } catch (err: any) {
      setError('Failed to delete test case');
    }
  };

  const startEditTc = (tc: any) => {
    setEditingTcId(tc.id);
    setEditForm({ input: tc.input, expectedOutput: tc.expectedOutput, points: tc.points, sample: tc.sample, hidden: tc.hidden });
  };

  const cancelEditTc = () => {
    setEditingTcId(null);
    setEditForm({});
  };

  const handleUpdateTC = async (tcId: number) => {
    setSavingTc(true);
    try {
      const updated = await problemApi.updateTestCase(tcId, editForm);
      const updatedTcs = testCases.map(tc => tc.id === tcId ? updated : tc);
      setTestCases(updatedTcs);
      // Sync problem points
      const newTotal = updatedTcs.reduce((s, t) => s + (t.points || 0), 0);
      await problemApi.update(Number(problemId), { ...form, points: newTotal });
      setForm(f => ({ ...f, points: newTotal }));
      setEditingTcId(null);
      setEditForm({});
      setSuccess('Test case updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update test case');
    } finally {
      setSavingTc(false);
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
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{form.description}</ReactMarkdown>
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
                className="input min-h-20 resize-y text-xs font-mono whitespace-pre-wrap" placeholder="Line 1: n..." />
            </div>
            <div>
              <label className="block text-sm text-arena-text-dim mb-1.5">Output Format (Markdown)</label>
              <textarea value={form.outputFormat}
                onChange={e => setForm(f => ({ ...f, outputFormat: e.target.value }))}
                className="input min-h-20 resize-y text-xs font-mono whitespace-pre-wrap" placeholder="A single integer..." />
            </div>
          </div>

          <div>
            <label className="block text-sm text-arena-text-dim mb-1.5">Constraints (Markdown)</label>
            <textarea value={form.constraints}
              onChange={e => setForm(f => ({ ...f, constraints: e.target.value }))}
              className="input min-h-16 resize-y text-xs font-mono whitespace-pre-wrap" placeholder="- 1 ≤ n ≤ 10⁵" />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex gap-3 pt-2 items-center">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : isNew ? 'Create Problem' : 'Save'}
            </button>
            {!isNew && (
              <button onClick={() => setShowDeleteProblemModal(true)} className="btn-danger flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Problem
              </button>
            )}
          </div>
        </div>

        {/* Test Cases (only after problem is created) */}
        {!isNew && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-arena-text">Test Cases ({testCases.length})</h2>
              {/* Live derived total points */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-arena-muted">Total Points:</span>
                <span className="badge bg-arena-accent/15 text-arena-accent border border-arena-accent/30 text-sm font-bold">
                  {derivedPoints} pts
                </span>
              </div>
            </div>

            {/* Existing test cases */}
            {testCases.length > 0 && (
              <div className="space-y-3 mb-6">
                {testCases.map((tc, i) => (
                  <div key={tc.id} className="bg-arena-bg border border-arena-border rounded-lg p-3">
                    {editingTcId === tc.id ? (
                      /* ── Edit mode ── */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-arena-muted font-mono">#{tc.orderIndex || i + 1} — editing</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateTC(tc.id)}
                              disabled={savingTc}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-arena-green/10 text-arena-green border border-arena-green/30 rounded-md hover:bg-arena-green/20 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {savingTc ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={cancelEditTc} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-arena-surface text-arena-muted border border-arena-border rounded-md hover:text-arena-text transition-colors">
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-arena-muted mb-1 block">Input</label>
                            <textarea
                              value={editForm.input}
                              onChange={e => setEditForm((f: any) => ({ ...f, input: e.target.value }))}
                              className="input min-h-20 resize-y font-mono text-xs whitespace-pre-wrap"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-arena-muted mb-1 block">Expected Output</label>
                            <textarea
                              value={editForm.expectedOutput}
                              onChange={e => setEditForm((f: any) => ({ ...f, expectedOutput: e.target.value }))}
                              className="input min-h-20 resize-y font-mono text-xs whitespace-pre-wrap"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div>
                            <label className="text-xs text-arena-muted mb-1 block">Points</label>
                            <input type="number" value={editForm.points} min={0}
                              onChange={e => setEditForm((f: any) => ({ ...f, points: Number(e.target.value) }))}
                              className="input py-1 px-2 text-xs w-24" />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-arena-text-dim cursor-pointer mt-4">
                            <input type="checkbox" checked={editForm.sample}
                              onChange={e => setEditForm((f: any) => ({ ...f, sample: e.target.checked }))}
                              className="rounded" />
                            Sample
                          </label>
                          <label className="flex items-center gap-2 text-sm text-arena-text-dim cursor-pointer mt-4">
                            <input type="checkbox" checked={editForm.hidden}
                              onChange={e => setEditForm((f: any) => ({ ...f, hidden: e.target.checked }))}
                              className="rounded" />
                            Hidden
                          </label>
                        </div>
                      </div>
                    ) : (
                      /* ── View mode ── */
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-arena-muted font-mono">#{tc.orderIndex || i + 1}</span>
                            <span className="badge bg-arena-accent/10 text-arena-accent border border-arena-accent/20">{tc.points} pts</span>
                            {tc.sample && <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">Sample</span>}
                            {tc.hidden && <span className="badge bg-gray-500/10 text-gray-500 border border-gray-500/20 flex items-center gap-1"><EyeOff className="w-3 h-3" />Hidden</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEditTc(tc)}
                              className="text-arena-muted hover:text-arena-accent transition-colors" title="Edit test case">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteTcId(tc.id)}
                              className="text-arena-red/50 hover:text-arena-red transition-colors" title="Delete test case">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                      </>
                    )}
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
                    className="input min-h-24 resize-y font-mono text-xs whitespace-pre-wrap" placeholder="Test input..." />
                </div>
                <div>
                  <label className="text-xs text-arena-muted mb-1 block">Expected Output</label>
                  <textarea value={newTestCase.expectedOutput}
                    onChange={e => setNewTestCase(t => ({ ...t, expectedOutput: e.target.value }))}
                    className="input min-h-24 resize-y font-mono text-xs whitespace-pre-wrap" placeholder="Expected output..." />
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

      <ConfirmModal
        isOpen={showDeleteProblemModal}
        title="Delete Problem?"
        message="Are you sure you want to delete this problem? This removes all its test cases and submissions. This action cannot be undone."
        confirmText="Delete Problem"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          setShowDeleteProblemModal(false);
          handleDelete();
        }}
        onClose={() => setShowDeleteProblemModal(false)}
      />

      <ConfirmModal
        isOpen={deleteTcId !== null}
        title="Delete Test Case?"
        message="Are you sure you want to delete this test case? This cannot be undone."
        confirmText="Delete Test Case"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deleteTcId !== null) {
            handleDeleteTC(deleteTcId);
            setDeleteTcId(null);
          }
        }}
        onClose={() => setDeleteTcId(null)}
      />
    </div>
  );
}
