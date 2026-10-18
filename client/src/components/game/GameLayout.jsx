import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, Trophy } from 'lucide-react';
import sounds from '../../utils/soundEffects';

export const GameLayout = ({
  title,
  icon: Icon,
  personalBest,
  personalBestUnit = 'pts',
  lowerIsBetter = false,
  badgeText,
  children,
  headerExtra,
}) => {
  const navigate = useNavigate();
  const [muted, setMuted] = useState(sounds.isMuted());

  useEffect(() => {
    return sounds.subscribe((isMuted) => setMuted(isMuted));
  }, []);

  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setMuted(next);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 select-none">
      {/* Top Navigation & Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
          id="btn-back-arena"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Arena</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Game Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{badgeText || title}</span>
          </div>

          {/* Personal Best Pill */}
          {personalBest !== null && personalBest !== undefined && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Best: {personalBest} {personalBestUnit}
              </span>
            </div>
          )}

          {/* Sound Mute Toggle */}
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 transition-all cursor-pointer"
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
            id="btn-sound-toggle"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {headerExtra && <div className="w-full">{headerExtra}</div>}

      {/* Main Game Card / Viewport */}
      <div>{children}</div>
    </div>
  );
};

export default GameLayout;
