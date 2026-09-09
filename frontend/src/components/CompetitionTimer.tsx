import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface CompetitionTimerProps {
  serverTime: string;
  status: string;
  attemptStartedAt?: string;
  timeLimitMinutes?: number;
  onExpire?: () => void;
}

export function CompetitionTimer({ serverTime, status, attemptStartedAt, timeLimitMinutes, onExpire }: CompetitionTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [phase, setPhase] = useState<'live' | 'ended'>('live');
  const offsetRef = useRef(0);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    // Calculate server-client time offset for accuracy
    const serverNow = new Date(serverTime).getTime();
    const clientNow = Date.now();
    offsetRef.current = serverNow - clientNow;
  }, [serverTime]);

  useEffect(() => {
    const tick = () => {
      if (!attemptStartedAt || !timeLimitMinutes) {
        setTimeLeft('Unlimited');
        return;
      }
      
      const now = Date.now() + offsetRef.current;
      const attemptEnd = new Date(attemptStartedAt).getTime() + timeLimitMinutes * 60000;

      if (now < attemptEnd) {
        setPhase('live');
        setTimeLeft(formatDuration(attemptEnd - now));
      } else {
        setPhase('ended');
        setTimeLeft('Time Up');
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          if (onExpire) onExpire();
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attemptStartedAt, timeLimitMinutes, onExpire]);

  const formatDuration = (ms: number): string => {
    if (ms <= 0) return '00:00:00';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const color = phase === 'live'
    ? timeLeft < '00:30:00' ? 'text-arena-red' : 'text-arena-green'
    : 'text-arena-muted';

  return (
    <div className={`flex items-center gap-2 font-mono text-lg font-bold ${color}`}>
      <Clock className="w-5 h-5" />
      <span>{timeLeft}</span>
    </div>
  );
}
