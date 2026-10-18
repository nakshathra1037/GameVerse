import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal,
  Clock,
  Key,
  HelpCircle,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  History,
  Check,
  Delete,
  CornerDownLeft,
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

// Mulberry32 PRNG seeded from current UTC date (YYYYMMDD)
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generates the daily secret code: 4 distinct digits
const generateDailySecret = () => {
  const seed = Number(new Date().toISOString().slice(0, 10).replaceAll('-', ''));
  const rng = mulberry32(seed);
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, 4).map(String);
};

// Evaluate guess against secret (exact position match vs misplaced)
function evaluateGuess(secret, guess) {
  let exact = 0;
  const sRest = [];
  const gRest = [];

  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      exact++;
    } else {
      sRest.push(secret[i]);
      gRest.push(guess[i]);
    }
  }

  let misplaced = 0;
  for (const g of gRest) {
    const idx = sRest.indexOf(g);
    if (idx > -1) {
      misplaced++;
      sRest.splice(idx, 1);
    }
  }

  return { exact, misplaced };
}

export const CodeBreaker = () => {
  const { refreshUser } = useAuth();
  const { success, error: toastError } = useToast();

  // Phase: 'ready' | 'countdown' | 'playing' | 'submitting' | 'finished'
  const [phase, setPhase] = useState('ready');
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [isDailyAvailable, setIsDailyAvailable] = useState(true);

  // Gameplay state
  const [currentGuess, setCurrentGuess] = useState('');
  const [logs, setLogs] = useState([]);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedHints, setRevealedHints] = useState([null, null, null, null]);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [secretCode, setSecretCode] = useState([]);
  const [resultData, setResultData] = useState(null);
  const [isWon, setIsWon] = useState(false);

  // References
  const sessionIdRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const terminalLogEndRef = useRef(null);

  // Clear timers
  const clearAllTimers = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  // Fetch recent game history
  const loadHistory = useCallback(async () => {
    try {
      const data = await gameService.getGameHistory('code-breaker');
      setHistoryData(data);
    } catch (err) {
      console.warn('Failed to load code-breaker history:', err?.message);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    return () => clearAllTimers();
  }, [loadHistory, clearAllTimers]);

  // Auto-scroll terminal log to bottom
  useEffect(() => {
    if (terminalLogEndRef.current) {
      terminalLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Start game session
  const handleStartGame = async () => {
    try {
      setLoading(true);
      const session = await gameService.startGame('code-breaker');
      sessionIdRef.current = session.session_id;
      if (session.is_daily_available !== undefined) {
        setIsDailyAvailable(session.is_daily_available);
      }

      const dailySecret = generateDailySecret();
      setSecretCode(dailySecret);
      setCurrentGuess('');
      setLogs([
        'SYS_KERNEL_V4.19 INITIALIZED',
        'TARGET: ENCRYPTED 4-DIGIT SECURITY KEY',
        'MAX ATTEMPTS: 8 | TIME WINDOW: 90 SECONDS',
        'STATUS: READY FOR OPERATOR INPUT...',
      ]);
      setAttemptsUsed(0);
      setHintsUsed(0);
      setRevealedHints([null, null, null, null]);
      setSecondsLeft(90);
      setIsWon(false);
      setResultData(null);

      setPhase('countdown');
    } catch (err) {
      toastError(err.response?.data?.error?.message || 'Failed to initialize session.');
    } finally {
      setLoading(false);
    }
  };

  // Submit score
  const handleFinishGame = useCallback(
    async (won, finalAttemptsUsed, finalHintsUsed, finalSecondsLeft) => {
      clearAllTimers();
      setPhase('submitting');

      const attemptsLeft = 8 - finalAttemptsUsed;
      let computedScore = 0;
      if (won) {
        computedScore = Math.max(100, attemptsLeft * 100 + finalSecondsLeft * 5 - finalHintsUsed * 50);
      }

      const durationMs = Math.round(performance.now() - (startTimeRef.current || performance.now()));

      try {
        const result = await gameService.submitScore('code-breaker', {
          sessionId: sessionIdRef.current,
          score: computedScore,
          durationMs,
          meta: {
            won,
            attemptsUsed: finalAttemptsUsed,
            hintsUsed: finalHintsUsed,
            daily: isDailyAvailable,
            secondsLeft: finalSecondsLeft,
          },
        });

        setIsWon(won);
        setResultData({
          ...result,
          won,
          attemptsUsed: finalAttemptsUsed,
          hintsUsed: finalHintsUsed,
          secret: secretCode.join(''),
        });
        setPhase('finished');

        if (won) {
          if (result.is_new_best) {
            success(`🔥 Terminal Cracked! New Record: ${result.score} pts!`);
          } else {
            success(`Code Breaker Victory: ${result.score} pts!`);
          }
        } else {
          toastError(`ACCESS DENIED. The code was: ${secretCode.join('')}`);
        }

        await refreshUser();
        loadHistory();
      } catch (err) {
        toastError(err.response?.data?.error?.message || 'Failed to submit score.');
        setPhase('ready');
      }
    },
    [clearAllTimers, isDailyAvailable, secretCode, refreshUser, loadHistory, success, toastError]
  );

  // Countdown completed -> begin 90s countdown
  const handleCountdownComplete = () => {
    setPhase('playing');
    startTimeRef.current = performance.now();

    clearAllTimers();
    timerIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Watch for 90s timer expiration
  useEffect(() => {
    if (phase === 'playing' && secondsLeft === 0) {
      handleFinishGame(false, attemptsUsed, hintsUsed, 0);
    }
  }, [secondsLeft, phase, attemptsUsed, hintsUsed, handleFinishGame]);

  // Keypad / Typing handlers
  const handleInputDigit = (digit) => {
    if (phase !== 'playing') return;
    if (currentGuess.length < 4) {
      sounds.playClick();
      setCurrentGuess((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (phase !== 'playing') return;
    sounds.playTone(300, 0.05, 'square', 0.05);
    setCurrentGuess((prev) => prev.slice(0, -1));
  };

  const handleSubmitGuess = () => {
    if (phase !== 'playing') return;
    if (currentGuess.length !== 4) {
      sounds.playMistake();
      toastError('Guess must be exactly 4 digits.');
      return;
    }

    const nextAttempts = attemptsUsed + 1;
    setAttemptsUsed(nextAttempts);

    const { exact, misplaced } = evaluateGuess(secretCode, currentGuess.split(''));
    const logLine = `> [TRY #${nextAttempts}] ${currentGuess}  --> [${exact} EXACT, ${misplaced} MISPLACED]`;

    setLogs((prev) => [...prev, logLine]);
    setCurrentGuess('');

    if (exact === 4) {
      // Victory!
      sounds.playSuccess();
      handleFinishGame(true, nextAttempts, hintsUsed, secondsLeft);
    } else {
      if (nextAttempts >= 8) {
        // Run out of attempts
        sounds.playMistake();
        handleFinishGame(false, nextAttempts, hintsUsed, secondsLeft);
      } else {
        sounds.playTone(450, 0.1, 'sawtooth', 0.08);
      }
    }
  };

  // Hint button (reveals 1 unrevealed position, costs 1 attempt, max 2)
  const handleUseHint = () => {
    if (phase !== 'playing' || hintsUsed >= 2) return;
    if (attemptsUsed >= 7) {
      toastError('Cannot use hint on final attempt.');
      return;
    }

    // Find indices not yet revealed
    const unrevealedIndices = [];
    revealedHints.forEach((val, i) => {
      if (val === null) unrevealedIndices.push(i);
    });

    if (unrevealedIndices.length === 0) return;

    sounds.playTone(700, 0.2, 'triangle', 0.1);
    const targetIdx = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
    const revealedDigit = secretCode[targetIdx];

    const updatedRevealed = [...revealedHints];
    updatedRevealed[targetIdx] = revealedDigit;
    setRevealedHints(updatedRevealed);

    const nextHints = hintsUsed + 1;
    const nextAttempts = attemptsUsed + 1;
    setHintsUsed(nextHints);
    setAttemptsUsed(nextAttempts);

    setLogs((prev) => [
      ...prev,
      `[HINT DEPLOYED] Digit at position #${targetIdx + 1} is: '${revealedDigit}' (-1 Attempt)`,
    ]);
  };

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase !== 'playing') return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleInputDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitGuess();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const attemptsLeft = 8 - attemptsUsed;

  return (
    <GameLayout
      title="Code Breaker"
      icon={Terminal}
      personalBest={historyData?.personal_best}
      personalBestUnit="pts"
      lowerIsBetter={false}
      badgeText="💻 Terminal Deduction"
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
          <Card className="text-center p-8 sm:p-12 border-emerald-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-6 shadow-xl shadow-emerald-500/10">
              <Terminal className="w-10 h-10" />
            </div>

            {/* Daily Code Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isDailyAvailable ? 'DAILY CODE ACTIVE • 1 SCORED RUN' : 'PRACTICE MODE ACTIVE'}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-wide font-heading mb-3">
              Code Breaker
            </h1>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed mb-8">
              Infiltrate the mainframe by deducing the secret 4-digit security code.
              Every player on GameVerse shares the same Daily Code seed today! You have 8 attempts and 90 seconds.
            </p>

            {/* Rules Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8 text-left">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-emerald-400 text-xs font-bold block mb-1">RULE 1: EXACT MATCHES</span>
                <p className="text-xs text-slate-300">Exact indicates the correct digit in the correct position.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-amber-400 text-xs font-bold block mb-1">RULE 2: MISPLACED</span>
                <p className="text-xs text-slate-300">Misplaced means the digit is in the code, but in a different slot.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-cyan-400 text-xs font-bold block mb-1">RULE 3: TACTICAL HINTS</span>
                <p className="text-xs text-slate-300">Deploy up to 2 hints. Each hint reveals 1 position but costs 1 attempt!</p>
              </div>
            </div>

            {/* Launch Button */}
            <Button
              size="lg"
              variant="primary"
              onClick={handleStartGame}
              isLoading={loading}
              className="text-base px-8 py-4 shadow-xl shadow-cyan-500/25"
              id="btn-start-code-breaker"
            >
              Initialize Terminal (90s)
            </Button>
          </Card>

          {/* Past History */}
          <HistorySection historyData={historyData} />
        </div>
      )}

      {/* ============================================================== */}
      {/* PHASE 2: PLAYING SCREEN (HACKER TERMINAL UI) */}
      {/* ============================================================== */}
      {(phase === 'playing' || phase === 'submitting') && (
        <div className="space-y-6">
          {/* Top Status Bar */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-white/10 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs uppercase text-slate-400 font-bold">Time Window:</span>
              <span className={`text-base font-mono font-extrabold ${secondsLeft <= 15 ? 'text-rose-400 animate-pulse' : 'text-emerald-300'}`}>
                {secondsLeft}s
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">
                ATTEMPTS: <strong className={attemptsLeft <= 2 ? 'text-rose-400' : 'text-emerald-400'}>{attemptsLeft} / 8</strong>
              </span>
              <span className="text-slate-400">
                HINTS: <strong className="text-amber-400">{hintsUsed} / 2</strong>
              </span>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleUseHint}
              disabled={hintsUsed >= 2 || attemptsLeft <= 1}
              icon={HelpCircle}
              className={`text-xs ${hintsUsed >= 2 ? 'opacity-40 cursor-not-allowed' : 'hover:border-amber-400'}`}
              title="Reveal 1 position (costs 1 attempt)"
              id="btn-use-hint"
            >
              Hint (-1 Attempt)
            </Button>
          </div>

          {/* Main Hacker Terminal Screen */}
          <div className="rounded-3xl border border-emerald-500/30 bg-[#061009] p-6 shadow-2xl relative overflow-hidden font-mono text-emerald-400">
            {/* Terminal Header */}
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3 mb-4 text-xs text-emerald-500">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 font-bold tracking-wider">GAMEVERSE_MAINFRAME_V4</span>
              </div>
              <span className="text-[10px] text-emerald-600">ENCRYPTION: SEED_MULBERRY32</span>
            </div>

            {/* Revealed Hints Display */}
            <div className="mb-4 p-3 rounded-xl bg-black/60 border border-emerald-900/40 flex items-center justify-between">
              <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">KNOWN NODES:</span>
              <div className="flex items-center gap-3">
                {revealedHints.map((digit, idx) => (
                  <div
                    key={idx}
                    className={`w-9 h-10 rounded-lg flex items-center justify-center font-bold text-lg border ${
                      digit !== null
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/40'
                        : 'bg-black/80 border-white/10 text-slate-600'
                    }`}
                  >
                    {digit !== null ? digit : '?'}
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable Terminal Output Console */}
            <div className="min-h-[160px] max-h-[220px] overflow-y-auto space-y-1.5 p-3 rounded-xl bg-black/70 border border-emerald-950 text-xs sm:text-sm select-text">
              {logs.map((log, idx) => {
                const isExact = log.includes('4 EXACT');
                const isHint = log.includes('[HINT');
                return (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      isExact
                        ? 'text-cyan-300 font-bold animate-pulse'
                        : isHint
                        ? 'text-amber-400 font-semibold'
                        : log.startsWith('>')
                        ? 'text-emerald-300'
                        : 'text-emerald-600'
                    }`}
                  >
                    {log}
                  </div>
                );
              })}
              <div ref={terminalLogEndRef} />
            </div>

            {/* Current Input Line */}
            <div className="mt-4 pt-4 border-t border-emerald-900/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-base sm:text-xl font-bold">
                <span className="text-emerald-500">INPUT:</span>
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3].map((slotIdx) => {
                    const char = currentGuess[slotIdx];
                    return (
                      <span
                        key={slotIdx}
                        className={`w-10 h-12 rounded-xl flex items-center justify-center border text-2xl font-bold ${
                          char !== undefined
                            ? 'bg-emerald-950/60 border-emerald-400 text-white'
                            : 'bg-black/60 border-emerald-900/60 text-emerald-800'
                        }`}
                      >
                        {char !== undefined ? char : '_'}
                      </span>
                    );
                  })}
                </div>
                <span className="inline-block w-2.5 h-6 bg-emerald-400 animate-pulse ml-1" />
              </div>

              <div className="text-[11px] text-emerald-600 hidden sm:block">
                Type 0-9, Backspace, Enter
              </div>
            </div>

            {/* On-Screen Hacker Keypad */}
            <div className="mt-6 pt-4 border-t border-emerald-900/60 max-w-sm mx-auto select-none">
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleInputDigit(digit)}
                    className="p-3.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 hover:border-emerald-400 text-white font-bold text-xl active:scale-95 transition-all cursor-pointer shadow"
                    id={`keypad-${digit}`}
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-rose-400 text-rose-400 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  title="Backspace"
                  id="keypad-backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleInputDigit('0')}
                  className="p-3.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 hover:border-emerald-400 text-white font-bold text-xl active:scale-95 transition-all cursor-pointer"
                  id="keypad-0"
                >
                  0
                </button>
                <button
                  onClick={handleSubmitGuess}
                  className="p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-black font-extrabold flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                  title="Submit Guess"
                  id="keypad-submit"
                >
                  <CornerDownLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {phase === 'submitting' && (
            <div className="p-8 text-center">
              <Loader text="Authenticating decryption with GameVerse..." />
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
          scoreLabel={isWon ? 'ACCESS GRANTED • DECRYPTION COMPLETE' : 'ACCESS DENIED • SYSTEM LOCKED'}
          isNewBest={resultData.is_new_best}
          personalBest={resultData.personal_best}
          xpEarned={resultData.xp_earned}
          coinsEarned={resultData.coins_earned}
          onPlayAgain={handleStartGame}
        >
          {/* Performance Breakdown */}
          <div className="max-w-md mx-auto space-y-3 text-left">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
              <span>Mainframe Decryption Log</span>
              <span className={isWon ? 'text-emerald-400' : 'text-rose-400'}>
                {isWon ? '🔓 Infiltration Successful' : '🔒 Terminal Locked'}
              </span>
            </h3>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Secret Target Code:</span>
              <span className="font-mono text-base font-bold text-emerald-400 tracking-widest">
                {resultData.secret}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Attempts Used</span>
                <span className="text-sm font-bold text-white font-heading">{resultData.attemptsUsed} / 8</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Hints Used</span>
                <span className="text-sm font-bold text-amber-400 font-heading">{resultData.hintsUsed}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Mode</span>
                <span className="text-sm font-bold text-cyan-300 font-heading">
                  {resultData.is_practice ? 'Practice' : 'Scored'}
                </span>
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
          <History className="w-4 h-4 text-emerald-400" /> Recent Infiltration Sessions
        </h3>
        <span className="text-xs text-slate-400">
          Total Plays: {historyData?.total_played || 0}
        </span>
      </div>

      {sessions.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">
          No intrusions recorded yet. Crack the mainframe above!
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

export default CodeBreaker;
