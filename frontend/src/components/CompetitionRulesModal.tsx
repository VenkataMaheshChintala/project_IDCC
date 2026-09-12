import React from 'react';
import { X, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CompetitionRulesModalProps {
  competitionName: string;
  rules: string;
  timeLimitMinutes?: number;
  onAgree: () => void;
  onClose: () => void;
  starting: boolean;
}

export function CompetitionRulesModal({
  competitionName,
  rules,
  timeLimitMinutes,
  onAgree,
  onClose,
  starting
}: CompetitionRulesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-arena-bg border border-arena-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-arena-border flex items-center gap-3 bg-arena-surface">
          <ShieldAlert className="w-6 h-6 text-arena-accent" />
          <div>
            <h2 className="text-xl font-bold text-arena-text">Competition Rules</h2>
            <p className="text-sm text-arena-muted mt-0.5">{competitionName}</p>
          </div>
          <button onClick={onClose} disabled={starting} className="ml-auto text-arena-muted hover:text-arena-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {timeLimitMinutes && (
            <div className="mb-6 flex items-center gap-2 p-3 bg-arena-accent/10 border border-arena-accent/20 rounded-lg text-arena-accent text-sm">
              <Clock className="w-4 h-4" />
              <strong>Time Limit:</strong> You will have exactly {timeLimitMinutes} minutes to complete the problems once you start.
            </div>
          )}

          <div className="markdown-body text-sm">
            {rules && rules.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {rules}
              </ReactMarkdown>
            ) : (
              <p className="text-arena-muted italic">No specific rules have been provided for this competition.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-arena-border bg-arena-surface flex justify-end gap-3">
          <button onClick={onClose} disabled={starting} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onAgree} disabled={starting} className="btn-primary flex items-center gap-2">
            {starting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            I Agree, Start Attempt
          </button>
        </div>
      </div>
    </div>
  );
}
