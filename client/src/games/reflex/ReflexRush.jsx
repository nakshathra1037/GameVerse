import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  Timer,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Flame,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import gameService from '../../services/gameService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import GameLayout from '../../components/game/GameLayout';
import GameCountdown from '../../components/game/GameCountdown';
import GameResultScreen from '../../components/game/GameResultScreen';
import sounds from '../../utils/soundEffects';
import { formatDate } from '../../utils/formatters';

export const ReflexRush = () => {
  const { refreshUser } = useAuth();
  const { success, error: toastError } = useToast();

  // Screens: 'START' | 'COUNTDOWN' | 'PLAYING' | 'RESULT'
  const [screen, setScreen] = useState('START');
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);

  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [serverDelays, setServerDelays] = useState([]);

  // Gameplay state
  const [currentRound, setCurrentRound] = useState(1);
  // States: 'WAIT' | 'DISTRACTION' | 'YELLOW_TRAP' | 'READY' | 'TOO_SOON' | 'SUBMITTING'
  const [roundState, setRoundState] = useState('WAIT');
  const [mistakeReason, setMistakeReason] = useState('');
  const [roundTimes, setRoundTimes] = useState([]);
  const [resultData, setResultData] = useState(null);

  // Streak & Juicy feedback
  const [streak, setStreak] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [lastRoundMs, setLastRoundMs] = useState(null);

  // Timing references
  const delayTimeoutRef = useRef(null);
  const distractionTimeoutRef = useRef(null);
  const trapTimeoutRef = useRef(null);
  const greenTimestampRef = useRef(null);

  // Trigger screen shake
  const triggerShake = useCallback(() => {
    setIsShaking(true);
    sounds.playMistake();
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  // Clear all gameplay timeouts
  const clearAllTimers = useCallback(() => {
    if (delayTimeoutRef.current) clearTimeout(delayTimeoutRef.current);
    if (distractionTimeoutRef.current) clearTimeout(distractionTimeoutRef.current);
    if (trapTimeoutRef.current) clearTimeout(trapTimeoutRef.current);
  }, []);

  // Load history helper
  const loadHistory = useCallback(async () => {
    try {
      const data = await gameService.getReflexHistory();
      setHistoryData(data);
    } catch (err) {
      console.warn('Failed to load reflex history:', err?.message);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    return () => clearAllTimers();
  }, [loadHistory, clearAllTimers]);

  // Round scheduler
  const startRound = useCallback(
    (roundIndex, delays) => {
      clearAllTimers();
      setRoundState('WAIT');
      setMistakeReason('');

      const delaySec = delays[roundIndex - 1] || 2.0;
      const delayMs = Math.round(delaySec * 1000);

      // Rounds 4 & 5 have a 50% chance of a Yellow Trap before Green
      const isYellowTrapRound = roundIndex >= 4 && Math.random() > 0.45;
      // Rounds 2 & 3 have a 40% chance of a quick blue fake flash during wait
      const isDistractionRound = !isYellowTrapRound && roundIndex >= 2 && Math.random() > 0.55;

      if (isDistractionRound) {
        const distractionDelay = Math.max(400, Math.round(delayMs * 0.4));
        distractionTimeoutRef.current = setTimeout(() => {
          setRoundState('DISTRACTION');
          // Return to wait after 350ms
          distractionTimeoutRef.current = setTimeout(() => {
            setRoundState('WAIT');
          }, 350);
        }, distractionDelay);
      }

      if (isYellowTrapRound) {
        // Flash yellow first, then turn green 1.2s later
        const trapDelay = Math.max(500, Math.round(delayMs * 0.5));
        trapTimeoutRef.current = setTimeout(() => {
          setRoundState('YELLOW_TRAP');
          trapTimeoutRef.current = setTimeout(() => {
            setRoundState('READY');
            greenTimestampRef.current = performance.now();
            sounds.playSuccess();
          }, 1100);
        }, trapDelay);
      } else {
        // Normal green signal
        delayTimeoutRef.current = setTimeout(() => {
          setRoundState('READY');
          greenTimestampRef.current = performance.now();
          sounds.playSuccess();
        }, delayMs);
      }
    },
    [clearAllTimers]
  );

  // Initialize session and trigger countdown
  const handleStartGame = async () => {
    try {
      setLoading(true);
      const session = await gameService.startReflex();
      setSessionId(session.session_id);
      setServerDelays(session.delays);
      setCurrentRound(1);
      setRoundTimes([]);
      setStreak(0);
      setLastRoundMs(null);
      setResultData(null);
      setMistakeReason('');
      setScreen('COUNTDOWN');
    } catch (err) {
      toastError(err.response?.data?.error?.message || 'Failed to initialize session.');
    } finally {
      setLoading(false);
    }
  };

  // Called when 3-2-1 countdown finishes
  const handleCountdownComplete = () => {
    setScreen('PLAYING');
    startRound(1, serverDelays);
  };

  // Handle interaction (click or spacebar press)
  const handleInteraction = async () => {
    if (roundState === 'WAIT') {
      clearAllTimers();
      setStreak(0);
      setMistakeReason('Premature click! Signal was still RED.');
      setRoundState('TOO_SOON');
      triggerShake();
      return;
    }

    if (roundState === 'DISTRACTION') {
      clearAllTimers();
      setStreak(0);
      setMistakeReason('Distraction caught you! Fake signal must be ignored.');
      setRoundState('TOO_SOON');
      triggerShake();
      return;
    }

    if (roundState === 'YELLOW_TRAP') {
      clearAllTimers();
      setStreak(0);
      setMistakeReason('Trapped by YELLOW! In late rounds, click ONLY on GREEN.');
      setRoundState('TOO_SOON');
      triggerShake();
      return;
    }

    if (roundState === 'TOO_SOON') {
      // User acknowledged mistake -> restart current round
      startRound(currentRound, serverDelays);
      return;
    }

    if (roundState === 'READY') {
      // Legitimate reaction click
      const reactionMs = Math.round(performance.now() - greenTimestampRef.current);
      setLastRoundMs(reactionMs);

      // Play combo audio
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      sounds.playCombo(nextStreak);

      const updatedTimes = [...roundTimes, reactionMs];
      setRoundTimes(updatedTimes);

      if (currentRound < 5) {
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);
        startRound(nextRound, serverDelays);
      } else {
        // Finished all 5 rounds -> submit to server
        setRoundState('SUBMITTING');
        try {
          const finalResult = await gameService.finishReflex(sessionId, updatedTimes);
          setResultData(finalResult);
          setScreen('RESULT');
          if (finalResult.is_new_best) {
            success(`🔥 New Personal Record: ${finalResult.score} ms!`);
          } else {
            success(`Session Complete: Average ${finalResult.score} ms!`);
          }
          await refreshUser();
          loadHistory();
        } catch (err) {
          toastError(err.response?.data?.error?.message || 'Failed to submit session.');
          setScreen('START');
        }
      }
    }
  };

  // Spacebar hotkey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && screen === 'PLAYING') {
        e.preventDefault();
        handleInteraction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <GameLayout
      title="Reflex Rush"
      icon={Zap}
      personalBest={historyData?.personal_best}
      personalBestUnit="ms"
      lowerIsBetter
      badgeText="⚡ Reaction Speed"
    >
      {/* ============================================================== */}
      {/* COUNTDOWN OVERLAY */}
      {/* ============================================================== */}
      {screen === 'COUNTDOWN' && (
        <GameCountdown onComplete={handleCountdownComplete} seconds={3} />
      )}

      {/* ============================================================== */}
      {/* SCREEN 1: START SCREEN */}
      {/* ============================================================== */}
      {screen === 'START' && (
        <div className="space-y-8">
          <Card className="text-center p-8 sm:p-12 border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-6 shadow-xl shadow-cyan-500/10">
              <Zap className="w-10 h-10" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-wide font-heading mb-3">
              Reflex Rush
            </h1>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed mb-8">
              Test your nervous system response down to the millisecond across 5 rapid rounds.
              Watch out for random fake distraction flashes and the late-round yellow trap!
            </p>

            {/* Rules Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8 text-left">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-cyan-400 text-xs font-bold block mb-1">RULE 1: WAIT FOR SIGNAL</span>
                <p className="text-xs text-slate-300">Screen turns RED. Clicks before green trigger "Too soon!".</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-purple-400 text-xs font-bold block mb-1">RULE 2: IGNORE FAKES</span>
                <p className="text-xs text-slate-300">Blue distraction flashes will trick you. Do NOT click them!</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-amber-400 text-xs font-bold block mb-1">RULE 3: YELLOW TRAP</span>
                <p className="text-xs text-slate-300">Rounds 4-5 add Yellow traps. Strike ONLY when it turns GREEN!</p>
              </div>
            </div>

            {/* Launch Button */}
            <Button
              size="lg"
              variant="primary"
              onClick={handleStartGame}
              isLoading={loading}
              className="text-base px-8 py-4 shadow-xl shadow-cyan-500/25"
              id="btn-start-reflex"
            >
              Start Game (5 Rounds)
            </Button>
          </Card>

          {/* Past History List */}
          <HistorySection historyData={historyData} />
        </div>
      )}

      {/* ============================================================== */}
      {/* SCREEN 2: GAMEPLAY (5 ROUNDS) */}
      {/* ============================================================== */}
      {screen === 'PLAYING' && (
        <div className={`space-y-6 ${isShaking ? 'animate-shake' : ''}`}>
          {/* Header Bar during gameplay */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Timer className="w-4 h-4" /> Round {currentRound} of 5
              </span>
              {currentRound >= 4 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" /> TWIST ACTIVE: GREEN ONLY
                </span>
              )}
            </div>

            {/* Combo Streak Counter */}
            <div className="flex items-center gap-2">
              {streak > 1 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> {streak}x Streak
                </span>
              )}
              {lastRoundMs && (
                <span className="text-slate-300 text-xs">
                  Last: <strong className="text-cyan-400">{lastRoundMs} ms</strong>
                </span>
              )}
            </div>
          </div>

          {/* Big Interactive Arena Box */}
          <div
            onClick={roundState !== 'SUBMITTING' ? handleInteraction : undefined}
            id="reflex-clickable-arena"
            className={`w-full min-h-[380px] sm:min-h-[440px] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 shadow-2xl relative overflow-hidden border select-none ${
              roundState === 'WAIT'
                ? 'bg-rose-950/85 border-rose-500/50 text-rose-100 hover:bg-rose-950/90'
                : roundState === 'DISTRACTION'
                ? 'bg-purple-900/90 border-purple-400 text-purple-100'
                : roundState === 'YELLOW_TRAP'
                ? 'bg-amber-600/95 border-amber-300 text-white shadow-amber-500/30'
                : roundState === 'READY'
                ? 'bg-emerald-600 border-emerald-300 text-white scale-[1.01] shadow-emerald-500/30 ring-4 ring-emerald-400/40'
                : roundState === 'TOO_SOON'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                : 'bg-slate-900/90 border-cyan-500/40 text-slate-200'
            }`}
          >
            {/* WAIT STATE (RED) */}
            {roundState === 'WAIT' && (
              <div className="space-y-3 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 animate-pulse">
                  <Timer className="w-8 h-8" />
                </div>
                <h2 className="text-4xl sm:text-6xl font-black font-heading tracking-wider text-rose-200">
                  WAIT...
                </h2>
                <p className="text-xs sm:text-sm text-rose-200/80">
                  Hold your finger ready. Wait for the green light!
                </p>
              </div>
            )}

            {/* DISTRACTION STATE (PURPLE FLASH) */}
            {roundState === 'DISTRACTION' && (
              <div className="space-y-3 pointer-events-none animate-pulse">
                <div className="w-16 h-16 rounded-full bg-purple-500/30 border border-purple-400 flex items-center justify-center mx-auto text-purple-300">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-3xl sm:text-5xl font-black font-heading tracking-wider text-purple-200">
                  FAKE SIGNAL!
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-purple-100">
                  DO NOT CLICK! WAIT FOR GREEN!
                </p>
              </div>
            )}

            {/* YELLOW TRAP STATE */}
            {roundState === 'YELLOW_TRAP' && (
              <div className="space-y-3 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-amber-950/60 border border-amber-300 flex items-center justify-center mx-auto text-amber-200 animate-bounce">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-3xl sm:text-5xl font-black font-heading tracking-wider text-white">
                  YELLOW! HOLD!
                </h2>
                <p className="text-xs sm:text-sm font-bold text-amber-100">
                  DO NOT CLICK YELLOW! WAIT FOR GREEN!
                </p>
              </div>
            )}

            {/* READY STATE (GREEN) */}
            {roundState === 'READY' && (
              <div className="space-y-3 pointer-events-none">
                <h2 className="text-5xl sm:text-7xl font-black font-heading tracking-widest text-white drop-shadow-lg animate-bounce">
                  CLICK NOW!
                </h2>
                <p className="text-sm font-bold text-emerald-100">
                  Strike as fast as you can!
                </p>
              </div>
            )}

            {/* TOO SOON (MISTAKE) */}
            {roundState === 'TOO_SOON' && (
              <div className="space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-amber-300">
                    Too soon!
                  </h2>
                  <p className="text-xs sm:text-sm text-amber-200/90 mt-1 font-medium">
                    {mistakeReason || 'You reacted before the green signal.'}
                  </p>
                </div>
                <Button variant="secondary" size="sm" className="shadow-lg">
                  Click to Retry Round {currentRound}
                </Button>
              </div>
            )}

            {/* SUBMITTING STATE */}
            {roundState === 'SUBMITTING' && (
              <div className="space-y-3">
                <Loader text="Verifying reaction times with server anti-cheat..." />
              </div>
            )}

            {/* Hint overlay */}
            <div className="absolute bottom-4 text-[11px] text-white/40 tracking-wider">
              Click anywhere or press Spacebar
            </div>
          </div>

          {/* Round Results Pills */}
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((idx) => {
              const recorded = roundTimes[idx - 1];
              const isCurrent = idx === currentRound;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-center border transition-all ${
                    recorded !== undefined
                      ? 'bg-slate-900 border-cyan-500/40 text-white'
                      : isCurrent
                      ? 'bg-slate-800/80 border-white/20 text-cyan-400 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/40 border-white/5 text-slate-500'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block mb-0.5 text-slate-400">
                    Round {idx}
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-heading">
                    {recorded !== undefined ? `${recorded} ms` : isCurrent ? 'Active' : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCREEN 3: RESULT SCREEN */}
      {/* ============================================================== */}
      {screen === 'RESULT' && resultData && (
        <GameResultScreen
          score={resultData.score}
          scoreUnit="ms"
          scoreLabel="Average Reaction Time"
          isNewBest={resultData.is_new_best}
          personalBest={resultData.personal_best}
          xpEarned={resultData.xp_earned}
          coinsEarned={resultData.coins_earned}
          onPlayAgain={handleStartGame}
        >
          {/* Round-by-Round Breakdown */}
          <div className="max-w-md mx-auto space-y-2 text-left">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3 flex items-center justify-between">
              <span>5-Round Performance</span>
              <span className="text-cyan-400">
                {resultData.score < 220 ? '⚡ Godlike Reflexes' : resultData.score < 300 ? '🔥 Fast Reflexes' : '👍 Good Reaction'}
              </span>
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {resultData.reaction_times.map((time, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center"
                >
                  <span className="text-[10px] text-slate-400 block font-medium">R{idx + 1}</span>
                  <span className="text-sm font-bold text-white font-heading">{time} ms</span>
                </div>
              ))}
            </div>
          </div>
        </GameResultScreen>
      )}
    </GameLayout>
  );
};

// Reusable History Section showing the last 10 sessions
const HistorySection = ({ historyData }) => {
  const sessions = historyData?.sessions || [];

  return (
    <Card className="p-6 border-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-heading tracking-wide">
          <Clock className="w-4 h-4 text-cyan-400" /> Recent Reflex Sessions
        </h3>
        <span className="text-xs text-slate-400">
          Total Plays: {historyData?.total_played || 0}
        </span>
      </div>

      {sessions.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">
          No sessions recorded yet. Launch your first game above!
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {sessions.map((item) => (
            <div
              key={item.session_id}
              className="py-3 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-heading text-sm font-bold text-white">
                  {item.score} ms
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

export default ReflexRush;
