import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { problemApi, submissionApi, competitionApi } from '../api/endpoints';
import { StatusBadge } from '../components/StatusBadge';
import {
  Play, Send, RotateCcw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, Cpu, AlertCircle,
  ChevronLeft, Terminal, ChevronRight, X, List, CheckCircle, Circle
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAttempt } from '../context/AttemptContext';
import { useAuth } from '../context/AuthContext';
import { CompetitionTimer } from '../components/CompetitionTimer';

const DEFAULT_JAVA = `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Scanner sc = new Scanner(System.in);
        
    }
}
`;

const DEFAULT_C = `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Your code here
    
    return 0;
}
`;

interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
  orderIndex: number;
}

interface Problem {
  id: number;
  competitionId: number;
  title: string;
  slug: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: string;
  points: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  starterCode?: string;
  cStarterCode?: string;
  sampleTestCases: TestCase[];
}

export default function ProblemPage() {
  const { id: compId, problemId } = useParams<{ id: string; problemId: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [competition, setCompetition] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'JAVA' | 'C'>('JAVA');
  const [codes, setCodes] = useState<Record<'JAVA' | 'C', string>>({
    JAVA: DEFAULT_JAVA,
    C: DEFAULT_C
  });
  const code = codes[language];
  const [showQuestionDropdown, setShowQuestionDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'output' | 'results'>('input');
  const [sampleInput, setSampleInput] = useState('');
  const [bottomPanelHeight, setBottomPanelHeight] = useState(208); // default h-52 is 208px
  const [timeUp, setTimeUp] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(208);

  const handleMouseDownOnResizer = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    startHeightRef.current = bottomPanelHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = dragStartYRef.current - moveEvent.clientY;
      const newHeight = Math.max(100, Math.min(600, startHeightRef.current + deltaY));
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  const eventSourceRef = useRef<EventSource | null>(null);
  const { inAttempt, endAttempt } = useAttempt();
  const { isAdmin } = useAuth();

  useEffect(() => {
    const savedJava = localStorage.getItem(`code-draft-${problemId}-JAVA`);
    const savedC = localStorage.getItem(`code-draft-${problemId}-C`);

    Promise.all([
      problemApi.get(Number(problemId)),
      competitionApi.get(Number(compId)),
      problemApi.listByCompetition(Number(compId)).catch(() => [])
    ]).then(([p, c, probs]) => {
      // Check access controls
      if (!inAttempt && !isAdmin && c.status !== 'ENDED') {
        window.location.href = `/competitions/${compId}`;
        return;
      }
      
      setProblem(p);
      setCompetition(c);
      setProblems(probs);
      
      setCodes({
        JAVA: savedJava || p.starterCode || DEFAULT_JAVA,
        C: savedC || p.cStarterCode || DEFAULT_C
      });
      
      if (p.sampleTestCases?.length > 0) {
        setSampleInput(p.sampleTestCases[0].input);
        setCustomInput(p.sampleTestCases[0].input);
      }
    }).catch(() => {
      window.location.href = `/competitions/${compId}`;
    }).finally(() => setLoading(false));

    return () => { eventSourceRef.current?.close(); };
  }, [problemId, compId, inAttempt, isAdmin]);

  const [copyPasteWarning, setCopyPasteWarning] = useState(false);
  const copyPasteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCopyPasteWarning = useCallback(() => {
    setCopyPasteWarning(true);
    if (copyPasteTimeoutRef.current) {
      clearTimeout(copyPasteTimeoutRef.current);
    }
    copyPasteTimeoutRef.current = setTimeout(() => {
      setCopyPasteWarning(false);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (copyPasteTimeoutRef.current) {
        clearTimeout(copyPasteTimeoutRef.current);
      }
    };
  }, []);

  // Disable copy/paste and right click for participants across the entire page
  useEffect(() => {
    if (isAdmin) return;

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showCopyPasteWarning();
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // Use capture phase (true) so events are intercepted BEFORE reaching any child elements or Monaco editor
    window.addEventListener('copy', handleCopyPaste, true);
    window.addEventListener('cut', handleCopyPaste, true);
    window.addEventListener('paste', handleCopyPaste, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('copy', handleCopyPaste, true);
      window.removeEventListener('cut', handleCopyPaste, true);
      window.removeEventListener('paste', handleCopyPaste, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [isAdmin, showCopyPasteWarning]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    if (isAdmin) return;

    // 1. Intercept keyboard shortcuts for copy, paste, cut inside Monaco
    editor.onKeyDown((e: any) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isPaste = (isCtrlOrCmd && (e.code === 'KeyV' || e.keyCode === monaco.KeyCode.KeyV)) ||
                      (e.shiftKey && (e.code === 'Insert' || e.keyCode === monaco.KeyCode.Insert));
      const isCopy = isCtrlOrCmd && (e.code === 'KeyC' || e.keyCode === monaco.KeyCode.KeyC);
      const isCut = isCtrlOrCmd && (e.code === 'KeyX' || e.keyCode === monaco.KeyCode.KeyX);

      if (isPaste || isCopy || isCut) {
        e.preventDefault();
        e.stopPropagation();
        if (e.browserEvent) {
          e.browserEvent.preventDefault();
          e.browserEvent.stopPropagation();
          e.browserEvent.stopImmediatePropagation();
        }
        showCopyPasteWarning();
      }
    });

    // 2. Attach capture-phase event listeners to Monaco's root DOM node
    const domNode = editor.getDomNode();
    if (domNode) {
      const blockClipboard = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showCopyPasteWarning();
      };

      const blockContextMenu = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      };

      domNode.addEventListener('copy', blockClipboard, true);
      domNode.addEventListener('cut', blockClipboard, true);
      domNode.addEventListener('paste', blockClipboard, true);
      domNode.addEventListener('drop', blockClipboard, true);
      domNode.addEventListener('contextmenu', blockContextMenu, true);
    }

    // 3. Override Monaco's internal clipboard actions
    try {
      const copyAction = editor.getAction('editor.action.clipboardCopyAction');
      if (copyAction) copyAction.run = () => Promise.resolve();

      const pasteAction = editor.getAction('editor.action.clipboardPasteAction');
      if (pasteAction) pasteAction.run = () => Promise.resolve();

      const cutAction = editor.getAction('editor.action.clipboardCutAction');
      if (cutAction) cutAction.run = () => Promise.resolve();
    } catch (err) {
      console.error('Error overriding Monaco clipboard actions:', err);
    }
  };

  useEffect(() => {
    if (problemId) {
      if (codes.JAVA !== undefined && codes.JAVA !== '') {
        localStorage.setItem(`code-draft-${problemId}-JAVA`, codes.JAVA);
      }
      if (codes.C !== undefined && codes.C !== '') {
        localStorage.setItem(`code-draft-${problemId}-C`, codes.C);
      }
    }
  }, [codes, problemId]);

  const confirmResetCode = () => {
    const defaultCode = language === 'C' ? (problem?.cStarterCode || DEFAULT_C) : (problem?.starterCode || DEFAULT_JAVA);
    setCodes(prev => ({ ...prev, [language]: defaultCode }));
    localStorage.removeItem(`code-draft-${problemId}-${language}`);
    setShowResetConfirm(false);
  };

  const handleLanguageChange = (newLang: 'JAVA' | 'C') => {
    setLanguage(newLang);
    setShowLanguageDropdown(false);
  };

  const handleRun = async () => {
    if (!problem) return;
    setRunning(true);
    setRunResult(null);
    setActiveTab('output');

    try {
      const { runJobId } = await submissionApi.run(Number(problemId), {
        language: language,
        sourceCode: code,
        input: customInput
      });

      // Poll for result via SSE or fallback polling
      const token = localStorage.getItem('token');
      const es = new EventSource(`/api/sse/run/${runJobId}?token=${token}`);
      eventSourceRef.current = es;

      es.addEventListener('run-result', (evt) => {
        const data = JSON.parse(evt.data);
        if (data.status === 'ACCEPTED' && problem) {
          const sample = problem.sampleTestCases.find((tc: any) => tc.input.trim() === customInput.trim());
          if (sample) {
            if (data.stdout.trim() === sample.expectedOutput.trim()) {
              data.status = 'Correct Output';
            } else {
              data.status = 'Wrong Output';
            }
          } else {
            data.status = 'Execution Successful';
          }
        }
        setRunResult(data);
        setRunning(false);
        es.close();
      });

      es.onerror = () => {
        es.close();
        // Fallback: poll Redis result endpoint
        pollRunResult(runJobId);
      };

      // Timeout safety
      setTimeout(() => {
        if (running) {
          es.close();
          setRunning(false);
          setRunResult({ status: 'SYSTEM_ERROR', stdout: '', stderr: 'Run timed out (took > 15 mins)', executionTimeMs: 0 });
        }
      }, 900000);

    } catch (err: any) {
      setRunning(false);
      setRunResult({ status: 'ERROR', stderr: err.response?.data?.message || 'Run failed' });
    }
  };

  const pollRunResult = async (runJobId: string) => {
    // Simple polling fallback (900 seconds)
    for (let i = 0; i < 900; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = await fetch(`/api/runs/${runJobId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            if (data.status === 'ACCEPTED' && problem) {
              const sample = problem.sampleTestCases.find((tc: any) => tc.input.trim() === customInput.trim());
              if (sample) {
                if (data.stdout.trim() === sample.expectedOutput.trim()) {
                  data.status = 'Correct Output';
                } else {
                  data.status = 'Wrong Output';
                }
              } else {
                data.status = 'Execution Successful';
              }
            }
            setRunResult(data);
            setRunning(false);
            return;
          }
        }
      } catch {}
    }
    setRunning(false);
    setRunResult({ status: 'TIMEOUT', stderr: 'No response from judge' });
  };

  const handleSubmit = async () => {
    if (!problem) return;
    setSubmitting(true);
    setSubmission(null);

    try {
      const result = await submissionApi.submit(Number(problemId), {
        language: language,
        sourceCode: code
      });
      setSubmission({ ...result, status: 'QUEUED' });
      setActiveTab('results');

      // Subscribe to SSE for status updates
      const token = localStorage.getItem('token');
      const es = new EventSource(`/api/sse/submissions?token=${token}`);
      eventSourceRef.current = es;

      es.addEventListener('submission-update', (evt) => {
        const update = JSON.parse(evt.data);
        if (update.submissionId === result.id) {
          setSubmission((prev: any) => ({ ...prev, ...update }));
          if (!['QUEUED', 'RUNNING'].includes(update.status)) {
            es.close();
            setSubmitting(false);
          }
        }
      });

      // Fallback polling
      pollSubmissionStatus(result.id);

    } catch (err: any) {
      setSubmitting(false);
      setSubmission({ status: 'ERROR', error: err.response?.data?.message || 'Submission failed' });
    }
  };

  const pollSubmissionStatus = async (submissionId: number) => {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const data = await submissionApi.get(submissionId);
        setSubmission(data);
        if (!['QUEUED', 'RUNNING'].includes(data.status)) {
          setSubmitting(false);
          return;
        }
      } catch {}
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!problem) return <div className="text-center py-16 text-arena-muted">Problem not found</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Copy-Paste Warning Toast Popup */}
      {copyPasteWarning && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] animate-fade-in pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-3 bg-arena-surface/95 border border-arena-red/50 text-arena-text rounded-xl shadow-2xl backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-arena-red/20 border border-arena-red/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-arena-red" />
            </div>
            <div>
              <p className="text-sm font-semibold text-arena-text">Copy & Paste Disabled</p>
              <p className="text-xs text-arena-text-dim">Copying and pasting is prohibited during the competition.</p>
            </div>
            <button
              type="button"
              onClick={() => setCopyPasteWarning(false)}
              className="ml-2 text-arena-muted hover:text-arena-text p-1 rounded-lg hover:bg-white/5 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top bar / Attempt Header */}
      {inAttempt && competition ? (
        <div className="flex items-center gap-4 px-4 py-3 border-b border-arena-border bg-arena-surface/80">
          <div className="flex items-center gap-3 flex-1">
            <h1 className="font-semibold text-arena-text text-sm">{competition.name}</h1>
            <span className="w-1.5 h-1.5 rounded-full bg-arena-border"></span>
            <span className="font-mono text-sm font-bold text-arena-accent w-8 text-center
                             bg-arena-accent/10 rounded px-2 py-0.5">{problem.slug}</span>
            <h2 className="font-semibold text-arena-text-dim text-sm truncate">{problem.title}</h2>
            {problems.length > 1 && (
              <div className="relative ml-4">
                <button 
                  onClick={() => setShowQuestionDropdown(!showQuestionDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-arena-bg border border-arena-border rounded-md text-arena-text text-sm hover:bg-arena-surface transition-colors"
                >
                  <List className="w-4 h-4" />
                  Questions List
                  <ChevronDown className="w-4 h-4 text-arena-muted" />
                </button>
                {showQuestionDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowQuestionDropdown(false)} />
                    <div className="absolute left-0 top-full mt-1 w-80 bg-arena-surface border border-arena-border rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="max-h-80 overflow-y-auto">
                        {problems.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setShowQuestionDropdown(false);
                              navigate(`/competitions/${compId}/problems/${p.id}`);
                            }}
                            className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors ${p.id === problem.id ? 'bg-arena-accent/10' : ''}`}
                          >
                            <div className="flex flex-col gap-1 text-left">
                              <span className="text-sm font-medium text-arena-text">
                                <span className="text-arena-accent mr-1 font-mono">{p.slug}:</span>
                                {p.title}
                              </span>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={p.difficulty} />
                              </div>
                            </div>
                            <div className="ml-3 flex-shrink-0">
                              {p.userStatus === 'SOLVED' ? (
                                <span className="flex items-center text-arena-green" title="Solved"><CheckCircle className="w-4 h-4" /></span>
                              ) : p.userStatus === 'ATTEMPTED' ? (
                                <span className="flex items-center text-arena-yellow" title="Attempted"><Circle className="w-4 h-4" /></span>
                              ) : (
                                <span className="text-arena-muted font-bold" title="Unattempted">-</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <CompetitionTimer
              serverTime={competition.serverTime}
              status={competition.status}
              attemptStartedAt={competition.attemptStartedAt}
              timeLimitMinutes={competition.timeLimitMinutes}
              onExpire={() => {
                setTimeUp(true);
              }}
            />
            <button onClick={() => {
              if (confirm('Are you sure you want to end your attempt early? You cannot resume later.')) {
                endAttempt();
              }
            }} className="btn-secondary text-sm py-1.5 border-arena-red/50 text-arena-red hover:bg-arena-red/10">
              End Competition
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-arena-border bg-arena-surface/50">
          <Link to={`/competitions/${compId}`}
            className="text-arena-muted hover:text-arena-text transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="font-mono text-sm font-bold text-arena-accent w-8 text-center
                           bg-arena-accent/10 rounded px-2 py-0.5">{problem.slug}</span>
          <h1 className="font-semibold text-arena-text text-sm flex-1 truncate">{problem.title}</h1>
          <StatusBadge status={problem.difficulty} />
          <span className="text-sm text-arena-muted font-mono">{problem.points} pts</span>
          <span className="text-xs text-arena-muted">{problem.timeLimitMs}ms | {problem.memoryLimitMb}MB</span>
        </div>
      )}

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Problem statement */}
        <div className="w-[45%] overflow-y-auto border-r border-arena-border p-5 prose-arena">
          {problem.description && (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.description}</ReactMarkdown>
          )}

          {problem.inputFormat && (
            <div className="mt-4">
              <h3 className="text-arena-text font-semibold text-sm mb-1">Input Format</h3>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.inputFormat}</ReactMarkdown>
            </div>
          )}

          {problem.outputFormat && (
            <div className="mt-4">
              <h3 className="text-arena-text font-semibold text-sm mb-1">Output Format</h3>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.outputFormat}</ReactMarkdown>
            </div>
          )}

          {problem.constraints && (
            <div className="mt-4">
              <h3 className="text-arena-text font-semibold text-sm mb-1">Constraints</h3>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.constraints}</ReactMarkdown>
            </div>
          )}

          {problem.sampleTestCases?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-arena-text font-semibold text-sm mb-3">Examples</h3>
              {problem.sampleTestCases.map((tc, i) => (
                <div key={tc.id} className="mb-4 space-y-2">
                  <p className="text-xs text-arena-muted font-medium">Example {i + 1}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-arena-muted mb-1">Input</p>
                      <pre className="bg-arena-bg border border-arena-border rounded-lg p-3 text-xs font-mono text-arena-text overflow-x-auto whitespace-pre-wrap">
                        {tc.input}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-arena-muted mb-1">Expected Output</p>
                      <pre className="bg-arena-bg border border-arena-border rounded-lg p-3 text-xs font-mono text-arena-text overflow-x-auto whitespace-pre-wrap">
                        {tc.expectedOutput}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-arena-border bg-arena-surface/30">
            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center justify-between gap-2 w-28 text-xs px-2 py-1 rounded bg-arena-bg border border-arena-border text-arena-text-dim font-mono focus:outline-none hover:bg-arena-surface transition-colors"
              >
                {language === 'JAVA' ? 'Java 21' : 'C (gcc)'}
                <ChevronDown className="w-3 h-3 text-arena-muted" />
              </button>
              {showLanguageDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLanguageDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 w-28 bg-arena-surface border border-arena-border rounded-lg shadow-xl z-50 overflow-hidden">
                    <button onClick={() => handleLanguageChange('JAVA')} className={`w-full text-left px-3 py-2 text-xs font-mono hover:bg-white/5 transition-colors ${language === 'JAVA' ? 'text-arena-accent font-bold' : 'text-arena-text-dim'}`}>Java 21</button>
                    <button onClick={() => handleLanguageChange('C')} className={`w-full text-left px-3 py-2 text-xs font-mono hover:bg-white/5 transition-colors ${language === 'C' ? 'text-arena-accent font-bold' : 'text-arena-text-dim'}`}>C (gcc)</button>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 relative">
              <span className="text-xs text-arena-muted flex items-center gap-1.5 px-2 py-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-arena-green/70" />
                Saved automatically
              </span>
              {showResetConfirm ? (
                <div className="flex items-center gap-1 bg-arena-red/10 border border-arena-red/20 rounded px-2 py-0.5">
                  <span className="text-xs text-arena-red font-medium mr-1">Reset code?</span>
                  <button onClick={confirmResetCode} className="text-xs text-arena-red font-bold hover:underline">Yes</button>
                  <span className="text-arena-red/50">|</span>
                  <button onClick={() => setShowResetConfirm(false)} className="text-xs text-arena-text-dim hover:text-arena-text">No</button>
                </div>
              ) : (
                <button onClick={() => setShowResetConfirm(true)} className="flex items-center gap-1 text-xs text-arena-muted hover:text-arena-text transition-colors px-2 py-1">
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language === 'JAVA' ? 'java' : 'c'}
              value={code}
              onChange={val => setCodes(prev => ({ ...prev, [language]: val || '' }))}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                padding: { top: 8, bottom: 8 },
                contextmenu: false,
                dragAndDrop: false,
              }}
            />
          </div>

          {/* Bottom panel — input/output with drag-resize handle */}
          <div style={{ height: `${bottomPanelHeight}px` }} className="border-t border-arena-border flex flex-col relative select-none">
            {/* Drag Handle */}
            <div
              onMouseDown={handleMouseDownOnResizer}
              className="w-full h-2 cursor-row-resize hover:bg-arena-accent/40 active:bg-arena-accent transition-colors flex items-center justify-center -mt-1 z-10 group"
            >
              <div className="w-12 h-1 bg-arena-border group-hover:bg-arena-accent rounded-full transition-colors" />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-arena-border">
              <button onClick={() => setActiveTab('input')}
                className={`text-xs px-3 py-1 rounded transition-colors ${activeTab === 'input' ? 'bg-arena-accent text-white' : 'text-arena-muted hover:text-arena-text'}`}>
                Input
              </button>
              <button onClick={() => setActiveTab('output')}
                className={`text-xs px-3 py-1 rounded transition-colors ${activeTab === 'output' ? 'bg-arena-accent text-white' : 'text-arena-muted hover:text-arena-text'}`}>
                Output
              </button>
              {submission && (
                <button onClick={() => setActiveTab('results')}
                  className={`text-xs px-3 py-1 rounded transition-colors ${activeTab === 'results' ? 'bg-arena-accent text-white' : 'text-arena-muted hover:text-arena-text'}`}>
                  Test Results
                </button>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === 'input' && (
                <textarea
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onCopy={!isAdmin ? (e) => { e.preventDefault(); showCopyPasteWarning(); } : undefined}
                  onCut={!isAdmin ? (e) => { e.preventDefault(); showCopyPasteWarning(); } : undefined}
                  onPaste={!isAdmin ? (e) => { e.preventDefault(); showCopyPasteWarning(); } : undefined}
                  onContextMenu={!isAdmin ? (e) => { e.preventDefault(); } : undefined}
                  onDrop={!isAdmin ? (e) => { e.preventDefault(); } : undefined}
                  className="w-full h-full p-3 bg-arena-bg text-arena-text font-mono text-xs
                             resize-none focus:outline-none border-0"
                  placeholder="Enter custom input here..."
                />
              )}

              {activeTab === 'output' && (
                <div className="p-3 font-mono text-xs h-full overflow-y-auto">
                  {running && (
                    <div className="flex items-center gap-2 text-arena-blue">
                      <span className="w-4 h-4 border-2 border-arena-blue border-t-transparent rounded-full animate-spin" />
                      Running...
                    </div>
                  )}
                  {runResult && (
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 font-semibold ${
                        ['ACCEPTED', 'Correct Output', 'Execution Successful'].includes(runResult.status) ? 'text-arena-green' :
                        (runResult.status?.includes('ERROR') || runResult.status === 'Wrong Output') ? 'text-arena-red' :
                        'text-arena-yellow'
                      }`}>
                        {['ACCEPTED', 'Correct Output', 'Execution Successful'].includes(runResult.status) ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {runResult.status}
                        {runResult.executionTimeMs > 0 && (
                          <span className="text-arena-muted font-normal">{runResult.executionTimeMs}ms</span>
                        )}
                      </div>
                      {runResult.stdout && (
                        <pre className="text-arena-text whitespace-pre-wrap">{runResult.stdout}</pre>
                      )}
                      {runResult.stderr && (
                        <pre className="text-arena-red/80 whitespace-pre-wrap">{runResult.stderr}</pre>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'results' && (
                <div className="p-3 font-mono text-xs h-full overflow-y-auto space-y-4">
                  {!submission ? (
                    <div className="text-arena-muted text-center py-4">No submission yet.</div>
                  ) : ['QUEUED', 'RUNNING'].includes(submission.status) ? (
                    <div className="flex items-center gap-2 text-arena-blue">
                      <span className="w-4 h-4 border-2 border-arena-blue border-t-transparent rounded-full animate-spin" />
                      Evaluating on test cases...
                    </div>
                  ) : submission.testResults?.length > 0 ? (
                    submission.testResults.map((tr: any) => (
                      <div key={tr.index} className="bg-arena-surface border border-arena-border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className={`flex items-center gap-2 font-semibold ${tr.status === 'ACCEPTED' ? 'text-arena-green' : 'text-arena-red'}`}>
                            {tr.status === 'ACCEPTED' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {tr.hidden ? 'Hidden Test Case' : `Test Case ${tr.index}`}
                          </div>
                          <div className="flex items-center gap-3 text-arena-muted">
                            {tr.executionTimeMs > 0 && <span>{tr.executionTimeMs}ms</span>}
                            <span className={tr.status === 'ACCEPTED' ? 'text-arena-green/80' : 'text-arena-red/80'}>{tr.status}</span>
                          </div>
                        </div>
                        
                        {!tr.hidden && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                            <div>
                              <p className="text-arena-muted mb-1 text-[10px] uppercase tracking-wider">Input</p>
                              <pre className="bg-arena-bg border border-arena-border rounded p-2 text-arena-text overflow-x-auto max-h-32 whitespace-pre-wrap">{tr.input}</pre>
                            </div>
                            <div>
                              <p className="text-arena-muted mb-1 text-[10px] uppercase tracking-wider">Expected Output</p>
                              <pre className="bg-arena-bg border border-arena-border rounded p-2 text-arena-text overflow-x-auto max-h-32 whitespace-pre-wrap">{tr.expectedOutput}</pre>
                            </div>
                            <div>
                              <p className="text-arena-muted mb-1 text-[10px] uppercase tracking-wider">Actual Output</p>
                              <pre className={`bg-arena-bg border border-arena-border rounded p-2 overflow-x-auto max-h-32 whitespace-pre-wrap ${tr.status === 'ACCEPTED' ? 'text-arena-text' : 'text-arena-red/90'}`}>{tr.actualOutput || ' '}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-arena-muted">
                      {submission.errorMessage || 'No test results available.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 px-3 py-2 border-t border-arena-border bg-arena-surface/50">
            <button
              onClick={handleRun}
              disabled={running || submitting}
              className="btn-secondary flex items-center gap-2 text-sm"
              id="run-btn"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
            <button
              onClick={handleSubmit}
              disabled={running || submitting}
              className="btn-primary flex items-center gap-2 text-sm"
              id="submit-btn"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <Send className="w-4 h-4" />}
              Submit
            </button>

            {submission && (
              <div className="flex-1 flex items-center justify-end gap-3">
                <StatusBadge status={submission.status} />
                {submission.status === 'ERROR' && submission.error && (
                  <span className="text-xs text-arena-red truncate max-w-xs" title={submission.error}>
                    {submission.error}
                  </span>
                )}
                {submission.passedTestCases !== undefined && submission.status !== 'ERROR' && (
                  <span className="text-sm font-mono text-arena-text">
                    {submission.passedTestCases}/{submission.totalTestCases} Tests
                  </span>
                )}
                {submission.executionTimeMs > 0 && submission.status !== 'ERROR' && (
                  <span className="text-xs text-arena-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {submission.executionTimeMs}ms
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {timeUp && (
        <div className="fixed inset-0 z-[9999] bg-arena-bg/95 backdrop-blur flex items-center justify-center">
          <div className="bg-arena-surface border border-arena-border p-8 rounded-xl max-w-sm w-full text-center shadow-2xl animate-scale-up">
            <Clock className="w-16 h-16 text-arena-red mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-arena-text mb-3">Time's Up!</h2>
            <p className="text-arena-text-dim mb-6">
              Your competition attempt has ended.
            </p>
            <button 
              onClick={() => {
                endAttempt();
                navigate('/competitions');
              }}
              className="btn-primary w-full"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
