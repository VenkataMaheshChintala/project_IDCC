import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Competition
  DRAFT:    { label: 'Draft',    className: 'badge-draft' },
  UPCOMING: { label: 'Upcoming', className: 'badge-upcoming' },
  LIVE:     { label: 'Live',     className: 'badge-live' },
  ENDED:    { label: 'Ended',    className: 'badge-ended' },
  ARCHIVED: { label: 'Archived', className: 'badge-archived' },
  // Submission
  QUEUED:               { label: 'Queued',           className: 'badge bg-gray-500/20 text-gray-400 border border-gray-500/30' },
  RUNNING:              { label: 'Judging...',        className: 'badge bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  PARTIAL:              { label: 'Partial',           className: 'badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  ACCEPTED:             { label: 'Accepted',          className: 'badge bg-green-500/20 text-green-400 border border-green-500/30' },
  WRONG_ANSWER:         { label: 'Wrong Answer',      className: 'badge bg-red-500/20 text-red-400 border border-red-500/30' },
  COMPILATION_ERROR:    { label: 'Compile Error',     className: 'badge bg-orange-500/20 text-orange-400 border border-orange-500/30' },
  RUNTIME_ERROR:        { label: 'Runtime Error',     className: 'badge bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  TIME_LIMIT_EXCEEDED:  { label: 'TLE',               className: 'badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  MEMORY_LIMIT_EXCEEDED:{ label: 'MLE',               className: 'badge bg-pink-500/20 text-pink-400 border border-pink-500/30' },
  SYSTEM_ERROR:         { label: 'System Error',      className: 'badge bg-gray-700/20 text-gray-500 border border-gray-700/30' },
  // Difficulty
  EASY:   { label: 'Easy',   className: 'badge bg-green-500/10 text-green-400 border border-green-500/20' },
  MEDIUM: { label: 'Medium', className: 'badge bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  HARD:   { label: 'Hard',   className: 'badge bg-red-500/10 text-red-400 border border-red-500/20' },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'badge bg-gray-500/20 text-gray-400' };
  return (
    <span className={`${config.className} ${className}`}>
      {config.label === 'Judging...' && (
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse mr-1.5 inline-block" />
      )}
      {config.label}
    </span>
  );
}
