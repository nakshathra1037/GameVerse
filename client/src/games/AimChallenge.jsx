import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Crosshair,
  Clock,
  Flame,
  Sparkles,
  Trophy,
  History,
  Target,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import gameService from '../services/gameService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import GameLayout from '../components/game/GameLayout';
import GameCountdown from '../components/game/GameCountdown';
import GameResultScreen from '../components/game/GameResultScreen';
import sounds from '../utils/soundEffects';
import { formatDate } from '../utils/formatters';

export const AimChallenge = () => {
  const { refreshUser } = useAuth();
  const { success, error: toastError } = useToast();

  // Phase: 'ready' | 'countdown' | 'playing' | 'submitting' | 'finished'
  const [phase, setPhase] = useState('ready');
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [resultData, setResultData] = useState(null);

  // HUD stats for React display if needed
  const [hudStats, setHudStats] = useState({ score: 0, combo: 0, timeLeft: 30 });
  const [isScreenShaking, setIsScreenShaking] = useState(false);

  // Canvas and game refs
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const sessionIdRef = useRef(null);
  const isRunningRef = useRef(false);

  // Game state stored in refs to prevent render lag
  const stateRef = useRef({
    targets: [],
    particles: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    clicks: 0,
    goldHits: 0,
    elapsed: 0,
    lastSpawn: 0,
    lastTime: 0,
    shake: 0,
    mousePos: { x: -100, y: -100 },
  });

  // Fetch recent game history
  const loadHistory = useCallback(async () => {
    try {
      const data = await gameService.getGameHistory('aim-challenge');
      setHistoryData(data);
    } catch (err) {
      console.warn('Failed to load aim-challenge history:', err?.message);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    return () => {
      isRunningRef.current = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [loadHistory]);

  // Handle tab visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isRunningRef.current) {
        // Tab hidden -> pause or clamp elapsed
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Trigger screen shake
  const triggerShake = useCallback(() => {
    stateRef.current.shake = 12;
    setIsScreenShaking(true);
    sounds.playMistake();
    setTimeout(() => setIsScreenShaking(false), 400);
  }, []);

  // Submit score on round completion
  const handleFinishGame = useCallback(async () => {
    isRunningRef.current = false;
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);

    setPhase('submitting');
    const finalState = stateRef.current;
    const finalScore = Math.max(0, finalState.score);
    const accuracy = finalState.clicks > 0 ? Math.round((finalState.hits / finalState.clicks) * 100) : 0;

    try {
      const result = await gameService.submitScore('aim-challenge', {
        sessionId: sessionIdRef.current,
        score: finalScore,
        durationMs: 30000,
        meta: {
          accuracy,
          hits: finalState.hits,
          clicks: finalState.clicks,
          maxCombo: finalState.maxCombo,
          goldHits: finalState.goldHits,
        },
      });

      setResultData({
        ...result,
        accuracy,
        hits: finalState.hits,
        clicks: finalState.clicks,
        maxCombo: finalState.maxCombo,
        goldHits: finalState.goldHits,
      });
      setPhase('finished');

      if (result.is_new_best) {
        success(`🔥 Sharpshooter! New Record: ${result.score} pts!`);
      } else {
        success(`Round Complete: ${result.score} pts!`);
      }

      await refreshUser();
      loadHistory();
    } catch (err) {
      toastError(err.response?.data?.error?.message || 'Failed to submit score.');
      setPhase('ready');
    }
  }, [refreshUser, loadHistory, success, toastError]);

  // Main canvas animation and game loop using dt
  const gameLoop = useCallback(
    (timestamp) => {
      if (!isRunningRef.current) return;

      const state = stateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!state.lastTime) state.lastTime = timestamp;
      const dt = timestamp - state.lastTime;
      state.lastTime = timestamp;

      // Update elapsed time (limit dt to prevent huge jumps)
      const clampedDt = Math.min(dt, 100);
      state.elapsed += clampedDt;
      const elapsedSeconds = state.elapsed / 1000;
      const remainingSeconds = Math.max(0, 30 - elapsedSeconds);

      // Decay shake
      if (state.shake > 0) {
        state.shake = Math.max(0, state.shake - clampedDt * 0.03);
      }

      // Check if 30s game over
      if (state.elapsed >= 30000) {
        handleFinishGame();
        return;
      }

      // 1. Spawning targets
      const spawnInterval = Math.max(350, 800 - elapsedSeconds * 15);
      if (timestamp - state.lastSpawn >= spawnInterval) {
        state.lastSpawn = timestamp;

        // Choose target type: normal 75%, gold 10%, bomb 15%
        const roll = Math.random();
        let type = 'normal';
        let r0 = 36;
        let life = 1900;

        if (roll < 0.1) {
          type = 'gold';
          r0 = 24;
          life = 1250;
        } else if (roll < 0.25) {
          type = 'bomb';
          r0 = 32;
          life = 2400;
        } else {
          type = 'normal';
          r0 = 36 + Math.random() * 8;
          life = Math.max(1200, 2000 - elapsedSeconds * 20);
        }

        const padding = r0 + 15;
        const x = padding + Math.random() * (canvas.width - padding * 2);
        const y = padding + Math.random() * (canvas.height - padding * 2);

        state.targets.push({
          x,
          y,
          r0,
          born: timestamp,
          life,
          type,
        });
      }

      // 2. Update targets (shrink & remove expired)
      const survivingTargets = [];
      for (const t of state.targets) {
        const age = timestamp - t.born;
        if (age < t.life) {
          t.r = Math.max(1, t.r0 * (1 - age / t.life));
          survivingTargets.push(t);
        } else {
          // Target expired
          if (t.type === 'normal') {
            // Normal target expired without click -> reset combo
            state.combo = 0;
          }
        }
      }
      state.targets = survivingTargets;

      // 3. Update floating hit particles
      const survivingParticles = [];
      for (const p of state.particles) {
        p.age += clampedDt;
        p.y -= clampedDt * 0.06;
        if (p.age < p.life) {
          survivingParticles.push(p);
        }
      }
      state.particles = survivingParticles;

      // 4. Render
      ctx.save();
      // Apply screen shake
      if (state.shake > 0) {
        const ox = (Math.random() - 0.5) * state.shake * 2;
        const oy = (Math.random() - 0.5) * state.shake * 2;
        ctx.translate(ox, oy);
      }

      // Clear Canvas with sleek high-tech background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle tech background grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Targets
      for (const t of state.targets) {
        ctx.save();
        ctx.translate(t.x, t.y);

        if (t.type === 'normal') {
          // Cyan Glowing Target
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 12;

          // Outer ring
          ctx.beginPath();
          ctx.arc(0, 0, t.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
          ctx.fill();
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Inner ring
          ctx.beginPath();
          ctx.arc(0, 0, t.r * 0.5, 0, Math.PI * 2);
          ctx.strokeStyle = '#67e8f9';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Center dot
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        } else if (t.type === 'gold') {
          // Yellow Golden Bonus Target
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 20;

          ctx.beginPath();
          ctx.arc(0, 0, t.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
          ctx.fill();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Rotating gold star / inner icon
          ctx.beginPath();
          ctx.arc(0, 0, t.r * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.fill();
        } else if (t.type === 'bomb') {
          // Red Hazard Bomb
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 15;

          ctx.beginPath();
          ctx.arc(0, 0, t.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(225, 29, 72, 0.3)';
          ctx.fill();
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Draw 'X' inside bomb
          const xSize = t.r * 0.45;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-xSize, -xSize);
          ctx.lineTo(xSize, xSize);
          ctx.moveTo(xSize, -xSize);
          ctx.lineTo(-xSize, xSize);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw Floating Particles (Hit Texts)
      for (const p of state.particles) {
        const alpha = 1 - p.age / p.life;
        ctx.save();
        ctx.font = 'bold 15px Rajdhani, Outfit, sans-serif';
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.textAlign = 'center';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }

      // Draw Custom Crosshair
      const mx = state.mousePos.x;
      const my = state.mousePos.y;
      if (mx >= 0 && mx <= canvas.width && my >= 0 && my <= canvas.height) {
        ctx.save();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 6;

        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(mx - 18, my);
        ctx.lineTo(mx - 6, my);
        ctx.moveTo(mx + 6, my);
        ctx.lineTo(mx + 18, my);
        ctx.moveTo(mx, my - 18);
        ctx.lineTo(mx, my - 6);
        ctx.moveTo(mx, my + 6);
        ctx.lineTo(mx, my + 18);
        ctx.stroke();

        ctx.restore();
      }

      // Draw On-Canvas Heads-Up Display (HUD)
      ctx.save();
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`TIME: ${remainingSeconds.toFixed(1)}s`, 20, 30);
      ctx.fillText(`SCORE: ${state.score}`, 130, 30);
      if (state.combo > 1) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`COMBO: ${state.combo}x`, 240, 30);
      }
      ctx.restore();

      ctx.restore();

      // Sync React HUD state
      setHudStats({
        score: state.score,
        combo: state.combo,
        timeLeft: Math.ceil(remainingSeconds),
      });

      animFrameIdRef.current = requestAnimationFrame(gameLoop);
    },
    [handleFinishGame]
  );

  // Resize canvas for devicePixelRatio
  const syncCanvasResolution = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  // Initialize game session
  const handleStartGame = async () => {
    try {
      setLoading(true);
      const session = await gameService.startGame('aim-challenge');
      sessionIdRef.current = session.session_id;

      stateRef.current = {
        targets: [],
        particles: [],
        score: 0,
        combo: 0,
        maxCombo: 0,
        hits: 0,
        clicks: 0,
        goldHits: 0,
        elapsed: 0,
        lastSpawn: 0,
        lastTime: 0,
        shake: 0,
        mousePos: { x: -100, y: -100 },
      };

      setHudStats({ score: 0, combo: 0, timeLeft: 30 });
      setResultData(null);
      setPhase('countdown');
    } catch (err) {
      toastError(err.response?.data?.error?.message || 'Failed to initialize session.');
    } finally {
      setLoading(false);
    }
  };

  // 3-2-1 countdown completed -> launch requestAnimationFrame loop
  const handleCountdownComplete = () => {
    setPhase('playing');
    isRunningRef.current = true;
    syncCanvasResolution();
    animFrameIdRef.current = requestAnimationFrame(gameLoop);
  };

  // Handle click or touch interaction
  const handlePointerInteraction = (clientX, clientY) => {
    if (!isRunningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    const state = stateRef.current;
    state.clicks++;

    let targetHit = null;
    let hitIndex = -1;

    // Search targets from top to bottom
    for (let i = state.targets.length - 1; i >= 0; i--) {
      const t = state.targets[i];
      const dist = Math.hypot(mx - t.x, my - t.y);
      if (dist <= t.r) {
        targetHit = t;
        hitIndex = i;
        break;
      }
    }

    if (targetHit) {
      // Remove the hit target
      state.targets.splice(hitIndex, 1);
      state.hits++;

      if (targetHit.type === 'normal') {
        // Normal hit
        sounds.playSuccess();
        state.combo++;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        sounds.playCombo(state.combo);

        const gained = 10 + state.combo * 2;
        state.score += gained;

        state.particles.push({
          x: targetHit.x,
          y: targetHit.y,
          text: `+${gained}`,
          color: '#22d3ee',
          age: 0,
          life: 600,
        });
      } else if (targetHit.type === 'gold') {
        // Gold target hit (+50 pts)
        sounds.playVictory();
        state.goldHits++;
        state.combo++;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.score += 50;

        state.particles.push({
          x: targetHit.x,
          y: targetHit.y,
          text: '+50 GOLD!',
          color: '#facc15',
          age: 0,
          life: 800,
        });
      } else if (targetHit.type === 'bomb') {
        // Bomb hit (-30 pts, reset combo, screen shake)
        triggerShake();
        state.combo = 0;
        state.score = Math.max(0, state.score - 30);

        state.particles.push({
          x: targetHit.x,
          y: targetHit.y,
          text: '-30 BOMB!',
          color: '#f43f5e',
          age: 0,
          life: 800,
        });
      }
    } else {
      // Clicked on empty space
      sounds.playMistake();
      state.combo = 0;
    }
  };

  const handleMouseDown = (e) => {
    handlePointerInteraction(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      handlePointerInteraction(touch.clientX, touch.clientY);
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    stateRef.current.mousePos = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  return (
    <GameLayout
      title="Aim Challenge"
      icon={Crosshair}
      personalBest={historyData?.personal_best}
      personalBestUnit="pts"
      lowerIsBetter={false}
      badgeText="🎯 Precision Shooter"
    >
      {/* ============================================================== */}
      {/* COUNTDOWN OVERLAY */}
      {/* ============================================================== */}
      {phase === 'countdown' && (
        <GameCountdown onComplete={handleCountdownComplete} seconds={3} />
      )}

      {/* ============================================================== */}
      {/* PHASE 1: READY SCREEN */}
      {/* ============================================================== */}
      {phase === 'ready' && (
        <div className="space-y-8">
          <Card className="text-center p-8 sm:p-12 border-rose-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-6 shadow-xl shadow-rose-500/10">
              <Crosshair className="w-10 h-10" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-wide font-heading mb-3">
              Aim Challenge
            </h1>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed mb-8">
              Fast-paced 30-second HTML Canvas shooting range. Strike shrinking targets before they vanish,
              build combo multipliers, snatch golden bonus targets, and evade destructive bombs!
            </p>

            {/* Rules Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8 text-left">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-cyan-400 text-xs font-bold block mb-1">CYAN: NORMAL (+COMBO)</span>
                <p className="text-xs text-slate-300">Shrinks over lifetime. Hits award 10 + combo*2 points.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-amber-400 text-xs font-bold block mb-1">GOLD: BONUS (+50 PTS)</span>
                <p className="text-xs text-slate-300">Smaller, faster expiry. Massive +50 instant score boost.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-rose-400 text-xs font-bold block mb-1">RED BOMB: HAZARD (-30)</span>
                <p className="text-xs text-slate-300">Marked with an X. Clicking costs 30 points and resets your combo!</p>
              </div>
            </div>

            {/* Launch Button */}
            <Button
              size="lg"
              variant="primary"
              onClick={handleStartGame}
              isLoading={loading}
              className="text-base px-8 py-4 shadow-xl shadow-cyan-500/25"
              id="btn-start-aim-challenge"
            >
              Enter Shooting Range (30s)
            </Button>
          </Card>

          {/* Past History */}
          <HistorySection historyData={historyData} />
        </div>
      )}

      {/* ============================================================== */}
      {/* PHASE 2: PLAYING SCREEN (HTML CANVAS) */}
      {/* ============================================================== */}
      {(phase === 'playing' || phase === 'submitting') && (
        <div className={`space-y-4 ${isScreenShaking ? 'animate-shake' : ''}`}>
          {/* Top HUD Bar */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-white/10 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-xs uppercase text-slate-400 font-bold">Time Left:</span>
              <span className={`text-base font-extrabold font-heading ${hudStats.timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                {hudStats.timeLeft}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hudStats.combo > 1 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> {hudStats.combo}x Combo
                </span>
              )}
              <span className="text-xs font-bold text-slate-300">
                Score: <strong className="text-cyan-400 text-base">{hudStats.score}</strong>
              </span>
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[500px] rounded-3xl overflow-hidden border border-cyan-500/30 shadow-2xl bg-[#060a12] cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onMouseMove={handleMouseMove}
              className="w-full h-full block"
              id="aim-challenge-canvas"
            />
          </div>

          {phase === 'submitting' && (
            <div className="p-8 text-center">
              <Loader text="Calculating accuracy and recording score..." />
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PHASE 3: FINISHED SCREEN */}
      {/* ============================================================== */}
      {phase === 'finished' && resultData && (
        <GameResultScreen
          score={resultData.score}
          scoreUnit="pts"
          scoreLabel="Aim Challenge Score"
          isNewBest={resultData.is_new_best}
          personalBest={resultData.personal_best}
          xpEarned={resultData.xp_earned}
          coinsEarned={resultData.coins_earned}
          onPlayAgain={handleStartGame}
        >
          {/* Performance Breakdown */}
          <div className="max-w-md mx-auto space-y-3 text-left">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
              <span>Shooting Performance</span>
              <span className="text-cyan-400">
                {resultData.accuracy >= 80 ? '🎯 Deadeye Sniper' : resultData.accuracy >= 60 ? '⚡ Sharp Shooter' : '👍 Good Aim'}
              </span>
            </h3>

            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Accuracy</span>
                <span className="text-sm font-bold text-cyan-300 font-heading">{resultData.accuracy}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Hits / Clicks</span>
                <span className="text-sm font-bold text-white font-heading">{resultData.hits} / {resultData.clicks}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Max Combo</span>
                <span className="text-sm font-bold text-amber-400 font-heading">{resultData.maxCombo}x</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Gold Targets</span>
                <span className="text-sm font-bold text-yellow-300 font-heading">{resultData.goldHits}</span>
              </div>
            </div>
          </div>
        </GameResultScreen>
      )}
    </GameLayout>
  );
};

// Reusable History Component
const HistorySection = ({ historyData }) => {
  const sessions = historyData?.sessions || [];

  return (
    <Card className="p-6 border-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-heading tracking-wide">
          <History className="w-4 h-4 text-rose-400" /> Recent Target Runs
        </h3>
        <span className="text-xs text-slate-400">
          Total Plays: {historyData?.total_played || 0}
        </span>
      </div>

      {sessions.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">
          No target sessions logged yet. Test your aim above!
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {sessions.map((item) => (
            <div key={item.session_id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-heading text-sm font-bold text-white">
                  {item.score} pts
                </span>
                <span className="text-[11px] text-slate-500">
                  {formatDate(item.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 font-medium">
                <span className="text-cyan-400">+{item.xp_earned} XP</span>
                <span className="text-amber-400">+{item.coins_earned} 💰</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AimChallenge;
