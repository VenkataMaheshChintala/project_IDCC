import React from 'react';
import { X, BookOpen, AlertTriangle, Play, CheckCircle, Navigation } from 'lucide-react';

interface SystemGuideModalProps {
  onClose: () => void;
}

export function SystemGuideModal({ onClose }: SystemGuideModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-arena-bg border border-arena-border rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-arena-border flex items-center gap-3 bg-arena-surface">
          <BookOpen className="w-6 h-6 text-arena-accent" />
          <h2 className="text-xl font-bold text-arena-text">Welcome to CodeArena - System Guide</h2>
          <button onClick={onClose} className="ml-auto text-arena-muted hover:text-arena-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          <section>
            <h3 className="text-lg font-semibold text-arena-text mb-3 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-arena-blue" />
              Platform Navigation
            </h3>
            <ul className="list-disc pl-5 text-sm text-arena-text-dim space-y-2">
              <li><strong>Dashboard:</strong> Browse all upcoming, live, and past competitions from the main dashboard.</li>
              <li><strong>Joining:</strong> You must <em>join</em> a competition before you can view its questions or attempt it.</li>
              <li><strong>Attempting:</strong> Once a competition is LIVE, click <em>Start Attempt</em>. Your timer starts immediately and cannot be paused.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-arena-text mb-3 flex items-center gap-2">
              <Play className="w-5 h-5 text-arena-green" />
              Code Editor & Submissions
            </h3>
            <ul className="list-disc pl-5 text-sm text-arena-text-dim space-y-2">
              <li><strong>Write Code:</strong> Use the built-in editor to write your solution in your preferred language.</li>
              <li><strong>Run Code:</strong> You can run your code against custom input at any time to verify its behavior before submitting.</li>
              <li><strong>Submit:</strong> When you submit, your code is tested against hidden and sample test cases. Your score is based on the test cases passed.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-arena-red mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Anti-Cheating Rules (Strict)
            </h3>
            <div className="bg-arena-red/10 border border-arena-red/20 rounded-lg p-4 space-y-3">
              <p className="text-sm text-arena-red font-medium">To ensure a fair environment, the following rules are strictly enforced during a LIVE attempt:</p>
              <ul className="list-disc pl-5 text-sm text-arena-red/90 space-y-1">
                <li>You must remain in <strong>Fullscreen Mode</strong> for the duration of your attempt.</li>
                <li><strong>Do NOT switch tabs or minimize the browser.</strong> The system will detect if the window loses focus.</li>
                <li><strong>3-Strike Rule:</strong> If you leave the environment, you will receive a strike. Upon receiving 3 strikes, your attempt is permanently terminated.</li>
                <li><strong>10-Second Return:</strong> If you exit fullscreen, you have 10 seconds to return before your attempt is automatically ended.</li>
              </ul>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-arena-border bg-arena-surface flex justify-end">
          <button onClick={onClose} className="btn-primary flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
