import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Sparkles, Coins, RotateCcw, ArrowLeft, Trophy } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import sounds from '../../utils/soundEffects';

export const GameResultScreen = ({
  score,
  scoreUnit = 'pts',
  scoreLabel = 'Final Score',
  isNewBest = false,
  personalBest,
  xpEarned = 0,
  coinsEarned = 0,
  onPlayAgain,
  children,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    sounds.playVictory();
  }, []);

  return (
    <div className="space-y-8 relative">
      {/* Pure CSS Confetti Shower when New Best */}
      {isNewBest && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-40">
          {Array.from({ length: 40 }).map((_, i) => {
            const left = `${Math.random() * 100}%`;
            const delay = `${(Math.random() * 2).toFixed(2)}s`;
            const duration = `${(2.5 + Math.random() * 2).toFixed(2)}s`;
            const colors = ['#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6'];
            const bg = colors[i % colors.length];

            return (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left,
                  animationDelay: delay,
                  animationDuration: duration,
                  backgroundColor: bg,
                  width: `${8 + (i % 6)}px`,
                  height: `${10 + (i % 8)}px`,
                }}
              />
            );
          })}
        </div>
      )}

      <Card className="text-center p-8 sm:p-12 border-cyan-500/30 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 shadow-2xl relative z-10">
        {/* New Best Badge */}
        {isNewBest ? (
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold mb-6 animate-bounce shadow-lg shadow-amber-500/20">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>NEW PERSONAL RECORD!</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10 text-xs font-semibold mb-6">
            <Trophy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Session Complete</span>
          </div>
        )}

        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">
          {scoreLabel}
        </h2>

        {/* Big Score Display */}
        <div className="text-5xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 font-heading mb-3">
          {score} <span className="text-2xl sm:text-3xl text-slate-400 font-normal">{scoreUnit}</span>
        </div>

        {personalBest !== undefined && personalBest !== null && (
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-8">
            Personal Record: <strong className="text-white">{personalBest} {scoreUnit}</strong>
          </p>
        )}

        {/* Rewards Row */}
        <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
          <div className="px-5 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">XP Awarded</span>
              <span className="text-lg font-bold text-cyan-300 font-heading">+{xpEarned} XP</span>
            </div>
          </div>

          <div className="px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5">
            <Coins className="w-5 h-5 text-amber-400" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Coins Earned</span>
              <span className="text-lg font-bold text-amber-300 font-heading">+{coinsEarned}</span>
            </div>
          </div>
        </div>

        {/* Custom Game Specific Breakdown */}
        {children && <div className="mb-8">{children}</div>}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={onPlayAgain}
            icon={RotateCcw}
            className="w-full sm:w-auto shadow-lg shadow-cyan-500/20"
            id="btn-play-again"
          >
            Play Again
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/dashboard')}
            icon={ArrowLeft}
            className="w-full sm:w-auto"
            id="btn-back-dashboard"
          >
            Back to Arena
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default GameResultScreen;
