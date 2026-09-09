import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { competitionApi, problemApi } from '../api/endpoints';
import { CompetitionTimer } from '../components/CompetitionTimer';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useAttempt } from '../context/AttemptContext';
import {
  Trophy, CheckCircle, Circle, ChevronRight,
  Users, Award, ArrowRight, Info, Clock
} from 'lucide-react';

interface Competition {
  id: number;
  name: string;
  description: string;
  rules: string;
  status: string;
  participantCount: number;
  serverTime: string;
  timeLimitMinutes?: number;
  attemptStartedAt?: string;
  attemptCompleted?: boolean;
}

interface Problem {
  id: number;
  title: string;
  slug: string;
  difficulty: string;
  points: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  userStatus?: string;
}

export default function CompetitionPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const { inAttempt, startAttempt, endAttempt } = useAttempt();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'problems' | 'leaderboard'>('problems');

  const compId = Number(id);

  useEffect(() => {
    Promise.all([
      competitionApi.get(compId),
      problemApi.listByCompetition(compId).catch(() => [])
    ]).then(([comp, probs]) => {
      setCompetition(comp);
      setProblems(probs);
      if (comp.joined) {
        setJoined(true);
      }
    }).finally(() => setLoading(false));
  }, [compId]);

  const handleJoin = async () => {
    setJoining(true);
    setError('');
    try {
      await competitionApi.join(compId);
      setJoined(true);
      setCompetition(c => c ? { ...c, participantCount: c.participantCount + 1 } : c);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-8 h-8 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!competition) return <div className="text-center py-16 text-arena-muted">Competition not found</div>;

  const canJoin = !isAdmin && !joined && ['UPCOMING', 'LIVE'].includes(competition.status);
  const canSubmit = competition.status === 'LIVE';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={competition.status} />
              <span className="text-arena-muted text-sm flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {competition.participantCount} participants
              </span>
              {competition.timeLimitMinutes && (
                <span className="text-arena-muted text-sm flex items-center gap-1 ml-2">
                  <Clock className="w-3.5 h-3.5" />
                  Time Limit: {competition.timeLimitMinutes}m
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-arena-text mb-2">{competition.name}</h1>
            {competition.description && (
              <p className="text-arena-text-dim text-sm">{competition.description}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
            {competition.timeLimitMinutes && (
              <CompetitionTimer
                serverTime={competition.serverTime}
                status={competition.status}
                attemptStartedAt={competition.attemptStartedAt}
                timeLimitMinutes={competition.timeLimitMinutes}
                onExpire={() => {
                  alert('Time is up! Your attempt has ended.');
                  endAttempt();
                  navigate('/competitions');
                }}
              />
            )}

            {competition.attemptCompleted ? (
              <span className="flex items-center gap-1.5 text-arena-accent text-sm font-medium px-3 py-1.5 bg-arena-accent/10 rounded-lg border border-arena-accent/20">
                <CheckCircle className="w-4 h-4" />
                Attempted
              </span>
            ) : (
              <>
                {canJoin && (
                  <button onClick={handleJoin} disabled={joining} className="btn-primary flex items-center gap-2">
                    {joining ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : <ArrowRight className="w-4 h-4" />}
                    Join Competition
                  </button>
                )}
                {joined && canSubmit && !inAttempt && (
                  <button onClick={() => startAttempt(Number(compId))} className="btn-primary flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Start Attempt
                  </button>
                )}
                {joined && inAttempt && (
                  <button onClick={endAttempt} className="btn-secondary flex items-center gap-2 border-arena-red/50 text-arena-red hover:bg-arena-red/10">
                    End Attempt
                  </button>
                )}
                {joined && !canSubmit && (
                  <span className="flex items-center gap-1.5 text-arena-green text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Joined!
                  </span>
                )}
              </>
            )}
            {isAdmin && (
              <Link to={`/admin/competitions/${compId}`} className="btn-secondary text-sm">
                Edit Competition
              </Link>
            )}
          </div>
        </div>
        {error && <p className="text-arena-red text-sm mt-3">{error}</p>}
      </div>

      {/* Main content area */}
      {competition.attemptCompleted ? (
        <div className="card text-center py-16">
          <CheckCircle className="w-16 h-16 text-arena-green mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-arena-text mb-2">Attempt Completed</h2>
          <p className="text-arena-text-dim">You have already completed your attempt for this competition.</p>
        </div>
      ) : competition.status === 'UPCOMING' && !isAdmin ? (
        <div className="card text-center py-16">
          <Clock className="w-16 h-16 text-arena-accent mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-arena-text mb-2">Competition Starting Soon</h2>
          <p className="text-arena-text-dim">Problems will be revealed when the competition begins.</p>
        </div>
      ) : competition.status === 'LIVE' && !isAdmin && (!joined || !inAttempt) ? (
        <div className="card text-center py-16">
          <Trophy className="w-16 h-16 text-arena-accent mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-arena-text mb-2">
            {!joined ? 'Join to Compete' : 'Ready to Start?'}
          </h2>
          <p className="text-arena-text-dim mb-6 max-w-md mx-auto">
            {!joined ? 'You must join the competition to view problems and submit solutions.' :
             'You must enter fullscreen mode to view problems and submit solutions. Exiting fullscreen will pause your attempt.'}
          </p>
          {!joined ? (
            <button onClick={handleJoin} disabled={joining} className="btn-primary text-lg px-8 py-3">
              {joining ? 'Joining...' : 'Join Competition'}
            </button>
          ) : (
            <button onClick={() => startAttempt(Number(compId))} className="btn-primary text-lg px-8 py-3">
              Start Attempt in Fullscreen
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-arena-surface rounded-lg p-1 border border-arena-border w-fit">
            <button onClick={() => setTab('problems')}
              className={`px-4 py-2 text-sm rounded-md font-medium transition-all duration-200 capitalize ${
                tab === 'problems' ? 'bg-arena-accent text-white' : 'text-arena-text-dim hover:text-arena-text'
              }`}>
              problems
            </button>
            {isAdmin && (
              <button onClick={() => setTab('leaderboard')}
                className={`px-4 py-2 text-sm rounded-md font-medium transition-all duration-200 capitalize ${
                  tab === 'leaderboard' ? 'bg-arena-accent text-white' : 'text-arena-text-dim hover:text-arena-text'
                }`}>
                leaderboard
              </button>
            )}
          </div>

          {tab === 'problems' && (
            <div className="card">
              {problems.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-10 h-10 text-arena-muted mx-auto mb-3" />
                  <p className="text-arena-text-dim">No problems added yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-arena-muted uppercase tracking-wider">
                        <th className="text-left py-3 pr-6 font-medium w-8">#</th>
                        <th className="text-left py-3 pr-6 font-medium">Problem</th>
                        <th className="text-left py-3 pr-6 font-medium hidden sm:table-cell">Difficulty</th>
                        <th className="text-center py-3 pr-6 font-medium">Status</th>
                        <th className="text-right py-3 pr-6 font-medium">Points</th>
                        <th className="text-right py-3 font-medium hidden md:table-cell">Limits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map((p, i) => (
                        <tr key={p.id} className="table-row group">
                          <td className="py-4 pr-6">
                            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-arena-bg
                                             border border-arena-border text-sm font-mono font-bold text-arena-accent
                                             group-hover:border-arena-accent/50 transition-colors">
                              {p.slug}
                            </span>
                          </td>
                          <td className="py-4 pr-6">
                            <Link
                              to={`/competitions/${compId}/problems/${p.id}`}
                              className="font-medium text-arena-text hover:text-arena-accent transition-colors"
                            >
                              {p.title}
                            </Link>
                          </td>
                          <td className="py-4 pr-6 hidden sm:table-cell">
                            <StatusBadge status={p.difficulty} />
                          </td>
                          <td className="py-4 pr-6 text-center">
                            {p.userStatus === 'SOLVED' ? (
                              <span className="inline-flex items-center gap-1 text-arena-green text-xs font-semibold px-2 py-1 bg-arena-green/10 rounded-md">
                                <CheckCircle className="w-3.5 h-3.5" /> Solved
                              </span>
                            ) : p.userStatus === 'ATTEMPTED' ? (
                              <span className="inline-flex items-center gap-1 text-arena-accent text-xs font-semibold px-2 py-1 bg-arena-accent/10 rounded-md">
                                <Circle className="w-3.5 h-3.5" /> Attempted
                              </span>
                            ) : (
                              <span className="text-arena-muted text-xs font-medium">-</span>
                            )}
                          </td>
                          <td className="py-4 pr-6 text-right">
                            <span className="text-arena-text font-mono text-sm font-semibold">{p.points}</span>
                            <span className="text-arena-muted text-xs ml-1">pts</span>
                          </td>
                          <td className="py-4 text-right hidden md:table-cell">
                            <span className="text-arena-muted text-xs">
                              {p.timeLimitMs}ms / {p.memoryLimitMb}MB
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'leaderboard' && isAdmin && (
            <LeaderboardTab competitionId={compId} />
          )}
        </>
      )}
    </div>
  );
}

function LeaderboardTab({ competitionId }: { competitionId: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../api/endpoints').then(({ leaderboardApi }) =>
      leaderboardApi.get(competitionId).then(setData).finally(() => setLoading(false))
    );
  }, [competitionId]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-arena-text mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-arena-accent" />
        Leaderboard
      </h2>
      {!data?.entries?.length ? (
        <p className="text-arena-muted text-center py-8">No submissions yet</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-xs text-arena-muted uppercase tracking-wider border-b border-arena-border">
              <th className="text-left py-3 pr-6 font-medium">Rank</th>
              <th className="text-left py-3 pr-6 font-medium">Participant</th>
              <th className="text-right py-3 pr-6 font-medium">Score</th>
              <th className="text-right py-3 font-medium">Solved</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e: any) => (
              <tr key={e.userId} className="table-row">
                <td className="py-3 pr-6">
                  <span className={`font-bold text-sm ${
                    e.rank === 1 ? 'text-yellow-400' :
                    e.rank === 2 ? 'text-gray-300' :
                    e.rank === 3 ? 'text-orange-400' : 'text-arena-muted'
                  }`}>
                    #{e.rank}
                  </span>
                </td>
                <td className="py-3 pr-6 font-medium text-arena-text">{e.username}</td>
                <td className="py-3 pr-6 text-right font-mono font-bold text-arena-accent">{e.totalScore}</td>
                <td className="py-3 text-right text-arena-text-dim text-sm">{e.problemsSolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
