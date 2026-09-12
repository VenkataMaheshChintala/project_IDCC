import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Maximize, AlertTriangle, AlertCircle } from 'lucide-react';
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
  const [violations, setViolations] = useState(() => {
    const saved = sessionStorage.getItem('fullscreen_violations');
    return saved ? Number(saved) : 0;
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [terminationMessage, setTerminationMessage] = useState<string | null>(null);
  const [attemptError, setAttemptError] = useState<string | null>(null);

  const lastViolationTimeRef = useRef(0);

  useEffect(() => {
    const handleViolation = () => {
      if (!inAttempt) return;
      
      const now = Date.now();
      // Prevent double counting if events fire simultaneously (e.g. blur + fullscreenchange)
      if (now - lastViolationTimeRef.current < 1000) return;
      lastViolationTimeRef.current = now;

      setViolations(prev => {
        const newCount = prev + 1;
        sessionStorage.setItem('fullscreen_violations', String(newCount));
        if (newCount >= 3) {
          setShowWarning(false);
          setTerminationMessage('You have exited fullscreen or lost focus 3 times. Your competition attempt has been ended.');
        } else {
          setCountdown(10);
          setShowWarning(true);
        }
        return newCount;
      });
    };

    const handleFullscreenChange = () => {
      if (inAttempt && !document.fullscreenElement) {
        handleViolation();
      } else if (inAttempt && document.fullscreenElement) {
        setShowWarning(false);
      }
    };

    const handleBlur = () => {
      if (inAttempt) {
        handleViolation();
      }
    };

    const handleVisibilityChange = () => {
      if (inAttempt && document.visibilityState === 'hidden') {
        handleViolation();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check initial state if they reloaded while in attempt
    if (inAttempt && !document.fullscreenElement) {
      setShowWarning(true);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [inAttempt]);

  // Disable right click completely when competition attempt is active
  useEffect(() => {
    if (!inAttempt) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [inAttempt]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          setShowWarning(false);
          setTerminationMessage('You failed to return to fullscreen in time. Your competition attempt has been ended.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

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
    } catch (err: any) {
      console.error("Error attempting to start attempt:", err);
      const msg = err?.response?.data?.message || "Unable to start attempt. Please try again.";
      setAttemptError(msg);
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
    sessionStorage.removeItem('fullscreen_violations');
    setViolations(0);
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
      setCountdown(null);
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
            <div className="bg-arena-yellow/10 border border-arena-yellow/20 rounded-lg p-4 mb-4 text-center text-sm">
              <h3 className="text-arena-yellow font-bold mb-2">Warning: Fullscreen Exited or Focus Lost</h3>
              <p className="text-arena-text-dim mb-4">
                You must remain in fullscreen mode and keep this window in focus while attempting the competition. Exiting fullscreen or switching windows pauses your attempt and counts as a violation.
              </p>
              {countdown !== null && (
                <div className="bg-arena-red/10 border border-arena-red/20 rounded-lg p-4 my-2">
                  <p className="text-arena-red font-bold text-lg mb-1">
                    Return to fullscreen in {countdown} seconds
                  </p>
                  <p className="text-arena-red/80 text-xs">
                    Your attempt will be automatically ended if you do not return in time.
                  </p>
                </div>
              )}
            </div>
            <p className="text-arena-red font-bold mb-6">
              Warning {violations} of 3: At 3 warnings, your attempt will end automatically.
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

      {/* Attempt Terminated Modal (Replaces native alert) */}
      {terminationMessage && (
        <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-arena-surface border border-arena-red/40 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-arena-red/10 border border-arena-red/30 flex items-center justify-center mx-auto mb-5 text-arena-red">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-arena-text mb-2">Attempt Ended</h2>
            <p className="text-arena-text-dim text-sm mb-6 leading-relaxed">
              {terminationMessage}
            </p>
            <button
              onClick={async () => {
                setTerminationMessage(null);
                await endAttempt();
              }}
              className="btn-primary w-full py-3 text-base font-semibold"
            >
              Exit Competition
            </button>
          </div>
        </div>
      )}

      {/* Attempt Start Error Modal (Replaces native alert) */}
      {attemptError && (
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-arena-surface border border-arena-border p-6 rounded-xl max-w-md w-full text-center shadow-2xl animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-arena-red/10 border border-arena-red/20 flex items-center justify-center mx-auto mb-4 text-arena-red">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-arena-text mb-2">Failed to Start Attempt</h3>
            <p className="text-sm text-arena-text-dim mb-6">{attemptError}</p>
            <button
              onClick={() => setAttemptError(null)}
              className="btn-secondary w-full py-2.5"
            >
              Dismiss
            </button>
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
