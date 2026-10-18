import React, { useState, useEffect } from 'react';
import sounds from '../../utils/soundEffects';

export const GameCountdown = ({ onComplete, seconds = 3 }) => {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    sounds.playCountdownTick();

    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          sounds.playCountdownGo();
          setTimeout(() => {
            onComplete();
          }, 450);
          return 0;
        }
        sounds.playCountdownTick();
        return prev - 1;
      });
    }, 850);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div className="text-center select-none">
        <div
          key={count}
          className="text-7xl sm:text-9xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-white to-cyan-500 animate-countdown-pop drop-shadow-[0_0_35px_rgba(6,182,212,0.6)]"
        >
          {count > 0 ? count : 'GO!'}
        </div>
        <p className="text-xs uppercase tracking-widest text-cyan-400/80 mt-4 font-semibold animate-pulse">
          Get Ready...
        </p>
      </div>
    </div>
  );
};

export default GameCountdown;
