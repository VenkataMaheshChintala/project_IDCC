import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Maximize, AlertTriangle } from 'lucide-react';
import { competitionApi } from '../api/endpoints';

interface AttemptContextType {
  inAttempt: boolean;
  startAttempt: (compId: number) => Promise<void>;
  endAttempt: () => Promise<void>;
}

const AttemptContext = createContext<AttemptContextType | undefined>(undefined);

export function AttemptProvider({ children }: { children: ReactNode }) {
  const [inAttempt, setInAttempt] = useState(() => {
    return sessionStorage.getItem('in_attempt') === 'true';
  });
  const [activeCompId, setActiveCompId] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('attempt_comp_id');
    return saved ? Number(saved) : null;
  });
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (inAttempt && !document.fullscreenElement) {
        setShowWarning(true);
      } else if (inAttempt && document.fullscreenElement) {
        setShowWarning(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Check initial state if they reloaded while in attempt
    if (inAttempt && !document.fullscreenElement) {
      setShowWarning(true);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [inAttempt]);

  const startAttempt = async (compId: number) => {
    try {
      await competitionApi.startAttempt(compId);
      
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setInAttempt(true);
      setActiveCompId(compId);
      sessionStorage.setItem('in_attempt', 'true');
      sessionStorage.setItem('attempt_comp_id', String(compId));
      setShowWarning(false);
    } catch (err) {
      console.error("Error attempting to start attempt:", err);
      alert("Unable to start attempt. Please try again.");
    }
  };

  const endAttempt = async () => {
    if (activeCompId) {
      try {
        await competitionApi.endAttempt(activeCompId);
      } catch (err) {
        console.error("Failed to end attempt on backend:", err);
      }
    }
    setInAttempt(false);
    setActiveCompId(null);
    sessionStorage.removeItem('in_attempt');
    sessionStorage.removeItem('attempt_comp_id');
    setShowWarning(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err));
    }
    // Reload to apply attemptCompleted state
    window.location.reload();
  };

  const returnToFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setShowWarning(false);
    } catch (err) {
      console.error("Error attempting to re-enable full-screen mode:", err);
    }
  };

  return (
    <AttemptContext.Provider value={{ inAttempt, startAttempt, endAttempt }}>
      {children}
      
      {/* Proctoring Warning Overlay */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] bg-arena-bg/95 backdrop-blur flex items-center justify-center">
          <div className="bg-arena-surface border border-arena-border p-8 rounded-xl max-w-md w-full text-center shadow-2xl animate-scale-up">
            <AlertTriangle className="w-16 h-16 text-arena-red mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-arena-text mb-3">Attempt Paused</h2>
            <p className="text-arena-text-dim mb-6">
              You must remain in fullscreen mode while attempting the competition. Exiting fullscreen pauses your attempt and may be logged as suspicious behavior.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={returnToFullscreen}
                className="btn-primary flex justify-center items-center gap-2 py-3 text-lg"
              >
                <Maximize className="w-5 h-5" />
                Return to Fullscreen
              </button>
              <button 
                onClick={endAttempt}
                className="text-arena-muted hover:text-arena-red transition-colors text-sm mt-2"
              >
                End Competition Attempt
              </button>
            </div>
          </div>
        </div>
      )}
    </AttemptContext.Provider>
  );
}

export function useAttempt() {
  const context = useContext(AttemptContext);
  if (context === undefined) {
    throw new Error('useAttempt must be used within an AttemptProvider');
  }
  return context;
}
