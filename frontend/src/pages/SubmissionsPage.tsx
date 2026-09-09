import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { submissionApi } from '../api/endpoints';
import { StatusBadge } from '../components/StatusBadge';
import { ClipboardList, Clock, ChevronRight } from 'lucide-react';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    submissionApi.mySubmissions().then(setSubmissions).finally(() => setLoading(false));
  }, []);

  const formatTime = (iso: string) => new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-arena-text flex items-center gap-2 mb-6">
        <ClipboardList className="w-6 h-6 text-arena-accent" />
        My Submissions
      </h1>

      {submissions.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList className="w-12 h-12 text-arena-muted mx-auto mb-4" />
          <p className="text-arena-text-dim">No submissions yet</p>
          <p className="text-sm text-arena-muted mt-2">Join a competition and start coding!</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-arena-muted uppercase tracking-wider border-b border-arena-border">
                <th className="text-left py-3 pr-4 font-medium">Problem</th>
                <th className="text-left py-3 pr-4 font-medium hidden sm:table-cell">Status</th>
                <th className="text-right py-3 pr-4 font-medium">Tests Passed</th>
                <th className="text-right py-3 pr-4 font-medium hidden md:table-cell">Time</th>
                <th className="text-right py-3 font-medium hidden md:table-cell">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="table-row group">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-arena-accent bg-arena-accent/10 px-1.5 py-0.5 rounded">
                        {s.problemSlug}
                      </span>
                      <Link
                        to={`/submissions/${s.id}`}
                        className="text-sm text-arena-text hover:text-arena-accent transition-colors font-medium"
                      >
                        {s.problemTitle}
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-sm font-semibold text-arena-text">
                    {s.passedTestCases !== undefined ? `${s.passedTestCases}/${s.totalTestCases}` : '—'}
                  </td>
                  <td className="py-3 pr-4 text-right text-arena-muted text-xs hidden md:table-cell">
                    {s.executionTimeMs ? `${s.executionTimeMs}ms` : '—'}
                  </td>
                  <td className="py-3 text-right text-arena-muted text-xs hidden md:table-cell">
                    {formatTime(s.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
