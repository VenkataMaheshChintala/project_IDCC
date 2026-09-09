import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { competitionApi } from '../api/endpoints';
import { StatusBadge } from '../components/StatusBadge';
import { Trophy, Users, Clock, ChevronRight, Plus, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Competition {
  id: number;
  name: string;
  description: string;
  status: string;
  participantCount: number;
  joined: boolean;
  attemptCompleted: boolean;
}

export default function CompetitionsPage() {
  const { isAdmin } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    competitionApi.list().then(setCompetitions).finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const liveComps = competitions.filter(c => c.status === 'LIVE');
  const upcomingComps = competitions.filter(c => c.status === 'UPCOMING');
  const otherComps = competitions.filter(c => !['LIVE', 'UPCOMING'].includes(c.status));

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-8 h-8 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-arena-text flex items-center gap-2">
            <Trophy className="w-6 h-6 text-arena-accent" />
            Competitions
          </h1>
          <p className="text-arena-text-dim text-sm mt-1">
            {competitions.length} competition{competitions.length !== 1 ? 's' : ''} available
          </p>
        </div>
        {isAdmin && (
          <Link to="/admin/competitions/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Competition
          </Link>
        )}
      </div>

      {competitions.length === 0 ? (
        <div className="card text-center py-16">
          <Trophy className="w-12 h-12 text-arena-muted mx-auto mb-4" />
          <p className="text-arena-text-dim">No competitions yet</p>
          {isAdmin && (
            <Link to="/admin/competitions/new" className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create First Competition
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Live */}
          {liveComps.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-arena-text-dim uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-arena-green rounded-full animate-pulse" />
                Live Now
              </h2>
              <div className="space-y-3">
                {liveComps.map(c => <CompetitionCard key={c.id} competition={c} formatDate={formatDate} />)}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {upcomingComps.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-arena-text-dim uppercase tracking-wider mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcomingComps.map(c => <CompetitionCard key={c.id} competition={c} formatDate={formatDate} />)}
              </div>
            </section>
          )}

          {/* Past */}
          {otherComps.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-arena-text-dim uppercase tracking-wider mb-3">Past & Draft</h2>
              <div className="space-y-3">
                {otherComps.map(c => <CompetitionCard key={c.id} competition={c} formatDate={formatDate} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function CompetitionCard({ competition: c, formatDate }: { competition: Competition; formatDate: (s: string) => string }) {
  return (
    <Link to={`/competitions/${c.id}`}
      className="block card hover:border-arena-accent/40 transition-all duration-200 group cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-arena-text group-hover:text-arena-accent transition-colors truncate">
              {c.name}
            </h3>
            <StatusBadge status={c.status} />
          </div>
          {c.description && (
            <p className="text-arena-text-dim text-sm line-clamp-2 mb-3">{c.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-arena-muted">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {c.participantCount} participants
            </span>
          </div>
        </div>
        {c.attemptCompleted ? (
          <span className="px-3 py-1 bg-arena-accent/20 text-arena-accent text-xs rounded-full font-medium ml-4 flex-shrink-0">
            Attempted
          </span>
        ) : (
          <ChevronRight className="w-5 h-5 text-arena-muted group-hover:text-arena-accent transition-colors flex-shrink-0 ml-4" />
        )}
      </div>
    </Link>
  );
}
