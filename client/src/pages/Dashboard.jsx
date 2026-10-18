import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Brain,
  Layers,
  Terminal,
  Crosshair,
  Sparkles,
  Gamepad2,
  Calendar,
  Clock,
  Flame,
  Trophy,
  History,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ProgressBar from '../components/common/ProgressBar';
import { AVATAR_MAP } from '../utils/constants';
import { getLevelProgress, formatNumber, formatDate } from '../utils/formatters';
import gameService from '../services/gameService';

export const Dashboard = () => {
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState({ sessions: [], personal_bests: {} });
  const [loadingHistory, setLoadingHistory] = useState(true);

  const avatarInfo = AVATAR_MAP[user?.avatar] || AVATAR_MAP['cyber-ninja'];

  const currentLevel = user?.level || 1;
  const currentXp = user?.xp || 0;
  const { earnedInLevel, currentLevelXpRequired, prevLevelXpRequired, percentage } = getLevelProgress(
    currentXp,
    currentLevel
  );
  const neededInLevel = Math.max(1, currentLevelXpRequired - prevLevelXpRequired);

  const memberSince = user?.created_at ? formatDate(user.created_at) : 'Recently';

  useEffect(() => {
    let active = true;
    gameService
      .getRecentHistory()
      .then((data) => {
        if (active && data) {
          setHistoryData(data);
        }
      })
      .catch((err) => console.warn('Failed to load recent history:', err))
      .finally(() => {
        if (active) setLoadingHistory(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const personalBests = historyData.personal_bests || {};

  // 5 Games Configuration
  const games = [
    {
      id: 'reflex-rush',
      slug: 'reflex-rush',
      title: 'Reflex Rush',
      icon: Zap,
      color: 'cyan',
      themeBorder: 'hover:border-cyan-400/80 border-cyan-500/30',
      iconBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
      description:
        'Test biological reaction times down to the millisecond across 5 rounds. Dodge fake distraction flashes and the late yellow trap!',
      funTag: 'Distraction Flashes & Yellow Trap!',
      avgTime: '45s',
      personalBest: personalBests['reflex-rush'] ? `${personalBests['reflex-rush']} ms` : null,
      rounds: '5 Rounds • Reaction',
    },
    {
      id: 'memory-vault',
      slug: 'memory-vault',
      title: 'Memory Vault',
      icon: Layers,
      color: 'purple',
      themeBorder: 'hover:border-purple-400/80 border-purple-500/30',
      iconBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
      description:
        'Card-flip matching with juicy 3D flips, combo multipliers, 3 grid sizes (4x3, 4x4, 6x4), and a strategic Peek power-up.',
      funTag: 'Peek Power-Up & Combos!',
      avgTime: '60s',
      personalBest: personalBests['memory-vault'] ? `${personalBests['memory-vault']} pts` : null,
      rounds: '3 Grids • Memory',
    },
    {
      id: 'brain-battle',
      slug: 'brain-battle',
      title: 'Brain Battle',
      icon: Brain,
      color: 'amber',
      themeBorder: 'hover:border-amber-400/80 border-amber-500/30',
      iconBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      description:
        '60s rapid-fire logic and math quiz. Build huge streaks, manage 3 lives, beat shrinking timers, and deploy the Skip lifeline!',
      funTag: 'Streak Multiplier & 3 Lives!',
      avgTime: '60s',
      personalBest: personalBests['brain-battle'] ? `${personalBests['brain-battle']} pts` : null,
      rounds: '60s Round • Logic & Math',
    },
    {
      id: 'code-breaker',
      slug: 'code-breaker',
      title: 'Code Breaker',
      icon: Terminal,
      color: 'emerald',
      themeBorder: 'hover:border-emerald-400/80 border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      description:
        'Mastermind-style secret deduction in a hacker terminal. Crack the hidden 4-digit code in 8 attempts with hints and daily seeds.',
      funTag: 'Hacker Terminal & Daily Code!',
      avgTime: '90s',
      personalBest: personalBests['code-breaker'] ? `${personalBests['code-breaker']} pts` : null,
      rounds: '8 Guesses • Deduction',
    },
    {
      id: 'aim-challenge',
      slug: 'aim-challenge',
      title: 'Aim Challenge',
      icon: Crosshair,
      color: 'rose',
      themeBorder: 'hover:border-rose-400/80 border-rose-500/30',
      iconBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      description:
        'High-octane 30s HTML Canvas shooting gallery. Pop shrinking targets, chain combos, click bonus gold targets, and avoid bombs!',
      funTag: 'Gold Targets & Bomb Hazards!',
      avgTime: '30s',
      personalBest: personalBests['aim-challenge'] ? `${personalBests['aim-challenge']} pts` : null,
      rounds: '30s Canvas • Accuracy',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Player Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden glass-panel border border-cyan-500/20 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/30">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar Badge */}
            <div
              className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${avatarInfo.color} p-1 shadow-xl shadow-cyan-500/15 flex items-center justify-center shrink-0`}
            >
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-4xl">
                {avatarInfo.icon}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide font-heading">
                  {user?.username}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {avatarInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>{user?.email}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Member since {memberSince}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Stat Pill Display */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-center">
              <span className="text-xs text-slate-400 block">Level</span>
              <span className="text-xl font-bold text-cyan-400 font-heading">
                {user?.level}
              </span>
            </div>
            <div className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-center">
              <span className="text-xs text-slate-400 block">Coins</span>
              <span className="text-xl font-bold text-amber-400 font-heading">
                {formatNumber(user?.coins)}
              </span>
            </div>
            <div className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/5 text-center">
              <span className="text-xs text-slate-400 block">Total XP</span>
              <span className="text-xl font-bold text-purple-400 font-heading">
                {formatNumber(user?.xp)}
              </span>
            </div>
          </div>
        </div>

        {/* Level Progression Progress Bar */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <ProgressBar
            value={earnedInLevel}
            max={neededInLevel}
            variant="cyan"
            size="md"
            label={
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Level {currentLevel} Progression
              </span>
            }
            valueText={`${earnedInLevel} / ${neededInLevel} XP to Level ${currentLevel + 1} (${percentage}%)`}
          />
        </div>
      </div>

      {/* Mini-Games Arena Grid */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading tracking-wide flex items-center gap-2.5">
              <Gamepad2 className="w-7 h-7 text-cyan-400" /> Mini-Game Arena
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              All 5 mini-games are unlocked and playable with server-side validation and anti-cheat.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
            5 Playable Games Active
          </span>
        </div>

        {/* 5 Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((g) => {
            const Icon = g.icon;
            return (
              <Card
                key={g.id}
                hoverable
                glow
                className={`${g.themeBorder} flex flex-col justify-between transition-all group p-6`}
              >
                <div>
                  {/* Card Header: Icon + Fun Tag */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${g.iconBg}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-cyan-400" /> {g.funTag}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {g.avgTime} round
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-white mb-2 font-heading group-hover:text-cyan-300 transition-colors">
                    {g.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    {g.description}
                  </p>
                </div>

                {/* Footer: Personal Best & Play Button */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Personal Best
                    </span>
                    <span className="text-xs font-bold text-amber-300 font-heading">
                      {g.personalBest || 'No plays yet'}
                    </span>
                  </div>

                  <Link to={`/games/${g.slug}`}>
                    <Button size="sm" variant="primary" icon={Gamepad2}>
                      Play Now
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cross-Game Recent Gaming Sessions */}
      <Card className="p-6 border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading tracking-wide">
            <History className="w-4 h-4 text-cyan-400" /> Recent Activity (Across All Games)
          </h3>
          <span className="text-xs text-slate-400">
            {historyData.sessions.length} Recorded Sessions
          </span>
        </div>

        {loadingHistory ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading game history...</p>
        ) : historyData.sessions.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No gaming sessions recorded yet. Jump into an arena above to earn XP and coins!
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {historyData.sessions.map((item) => (
              <div
                key={item.session_id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/5 font-heading text-xs font-bold text-cyan-300 capitalize">
                    {item.game_id.replace('-', ' ')}
                  </span>
                  <span className="font-heading text-sm font-bold text-white">
                    Score: {item.score} {item.game_id === 'reflex-rush' ? 'ms' : 'pts'}
                  </span>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    {formatDate(item.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-slate-400 font-medium">
                  <span className="text-cyan-400 font-semibold">+{item.xp_earned} XP</span>
                  <span className="text-amber-400 font-semibold">+{item.coins_earned} 💰</span>
                  <span className="text-[11px] text-slate-500 sm:hidden">
                    {formatDate(item.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
