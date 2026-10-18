import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  Clock,
  Heart,
  Flame,
  SkipForward,
  Sparkles,
  Trophy,
  History,
  AlertTriangle,
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

// Helper: Random integer in [min, max] inclusive
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generates 4 unique options including the correct answer
const generateOptions = (correct) => {
  const options = new Set([correct]);
  const offsets = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  // Shuffle offsets
  offsets.sort(() => Math.random() - 0.5);

  for (const offset of offsets) {
    if (options.size >= 4) break;
    const candidate = correct + offset;
    if (candidate >= 0 && !options.has(candidate)) {
      options.add(candidate);
    }
  }

  // Fallback if needed
  let fallback = correct + 1;
  while (options.size < 4) {
    if (!options.has(fallback)) options.add(fallback);
    fallback++;
  }

  const list = Array.from(options);
  // Fisher-Yates shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

// Question generator based on answered count / difficulty
const createQuestion = (answeredCount) => {
  const d = Math.floor(answeredCount / 4);
  const isMath = Math.random() < 0.6;

  if (isMath) {
    const operators = ['+', '-', '×', '÷'];
    const op = operators[randInt(0, 3)];

    if (op === '+') {
      const a = randInt(2, 9 + 5 * d);
      const b = randInt(2, 9 + 5 * d);
      const ans = a + b;
      return {
        prompt: `${a} + ${b} = ?`,
        type: 'Arithmetic',
        answer: ans,
        options: generateOptions(ans),
      };
    } else if (op === '-') {
      const b = randInt(2, 9 + 5 * d);
      const a = randInt(b, b + 9 + 5 * d);
      const ans = a - b;
      return {
        prompt: `${a} - ${b} = ?`,
        type: 'Arithmetic',
        answer: ans,
        options: generateOptions(ans),
      };
    } else if (op === '×') {
      const a = randInt(2, 6 + 2 * d);
      const b = randInt(2, 6 + 2 * d);
      const ans = a * b;
      return {
        prompt: `${a} × ${b} = ?`,
        type: 'Multiplication',
        answer: ans,
        options: generateOptions(ans),
      };
    } else {
      // Division with guaranteed integer quotient
      const divisor = randInt(2, 6 + 2 * d);
      const quotient = randInt(2, 6 + 3 * d);
      const dividend = divisor * quotient;
      return {
        prompt: `${dividend} ÷ ${divisor} = ?`,
        type: 'Division',
        answer: quotient,
        options: generateOptions(quotient),
      };
    }
  } else {
    // Logic patterns (40%)
    const logicType = randInt(0, 3);

    if (logicType === 0) {
      // Arithmetic sequence
      const start = randInt(2, 10 + d);
      const diff = randInt(2, 5 + d);
      const ans = start + 3 * diff;
      return {
        prompt: `Pattern: ${start}, ${start + diff}, ${start + 2 * diff}, ?`,
        type: 'Sequence (+)',
        answer: ans,
        options: generateOptions(ans),
      };
    } else if (logicType === 1) {
      // Geometric sequence
      const start = randInt(2, 4);
      const ratio = randInt(2, 3);
      const ans = start * ratio * ratio * ratio;
      return {
        prompt: `Pattern: ${start}, ${start * ratio}, ${start * ratio * ratio}, ?`,
        type: 'Geometric (×)',
        answer: ans,
        options: generateOptions(ans),
      };
    } else if (logicType === 2) {
      // Alternating pattern (+a, -b)
      const start = randInt(10, 25);
      const a = randInt(4, 7);
      const b = randInt(1, 3);
      const n1 = start;
      const n2 = n1 + a;
      const n3 = n2 - b;
      const n4 = n3 + a;
      const ans = n4 - b;
      return {
        prompt: `Pattern: ${n1}, ${n2}, ${n3}, ${n4}, ?`,
        type: 'Alternating',
        answer: ans,
        options: generateOptions(ans),
      };
    } else {
      // Odd one out from multiples
      const base = randInt(3, 8);
      const ans = base * 4 + randInt(1, base - 1); // Not a multiple
      const m1 = base * 2;
      const m2 = base * 3;
      const m3 = base * 5;
      const choices = [m1, m2, m3, ans].sort(() => Math.random() - 0.5);
      return {
        prompt: `Not divisible by ${base}:`,
        type: 'Logic Deduction',
        answer: ans,
        options: choices,
      };
    }
  }
};

export const BrainBattle = () => {
  const { refreshUser } = useAuth();
  const { success, error: toastError } = useToast();

  // Phase flow: 'ready' | 'countdown' | 'playing' | 'submitting' | 'finished'
  const [phase, setPhase] = useState('ready');
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);

  // Gameplay state
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [skipAvailable, setSkipAvailable] = useState(true);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(60);
  const [question, setQuestion] = useState(null);
  const [qTimeMax, setQTimeMax] = useState(10);
  const [qTimeLeft, setQTimeLeft] = useState(10);
  const [isShaking, setIsShaking] = useState(false);
  const [resultData, setResultData] = useState(null);

  // References
  const sessionIdRef = useRef(null);
  const globalTimerRef = useRef(null);
  const qTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const questionStartRef = useRef(null);

  // Clear timers
  const clearAllTimers = useCallback(() => {
    if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    if (qTimerRef.current) clearInterval(qTimerRef.current);
  }, []);

  // Fetch recent game history
  const loadHistory = useCallback(async () => {
    try {
      const data = await gameService.getGameHistory('brain-battle');
      setHistoryData(data);
    } catch (err) {
      console.warn('Failed to load brain-battle history:', err?.message);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    return () => clearAllTimers();
  }, [loadHistory, clearAllTimers]);

  // Shake trigger
  const triggerShake = useCallback(() => {
    setIsShaking(true);
    sounds.playMistake();
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  // Load next question with per-question timer
  const loadNextQuestion = useCallback(
    (answeredCount) => {
      const d = Math.floor(answeredCount / 4);
      const limit = Math.max(4, 10 - d);
      setQTimeMax(limit);
      setQTimeLeft(limit);
      const newQ = createQuestion(answeredCount);
      setQuestion(newQ);
      questionStartRef.current = performance.now();
    },
    []
  );

  // Start game
  const handleStartGame = async () => {
    try {
      setLoading(true);
      const session = await gameService.startGame('brain-battle');
      sessionIdRef.current = session.session_id;

      setLives(3);
      setStreak(0);
      setBestStreak(0);
      setScore(0);
      setAnswered(0);
      setCorrectCount(0);
      setSkipAvailable(true);
      setGlobalTimeLeft(60);
      setResultData(null);

      setPhase('countdown');
    } catch (err) {
      toastError(err.response?.data?.error?.message || 'Failed to initialize session.');
    } finally {
      setLoading(false);
    }
  };

  // Submit score to backend
  const handleFinishGame = useCallback(
    async (finalScore, totalAnswered, totalCorrect, highestStreak) => {
      clearAllTimers();
      setPhase('submitting');

      const durationMs = Math.round(performance.now() - (startTimeRef.current || performance.now()));
      const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

      try {
        const result = await gameService.submitScore('brain-battle', {
          sessionId: sessionIdRef.current,
          score: finalScore,
          durationMs,
          meta: {
            answered: totalAnswered,
            correct: totalCorrect,
            bestStreak: highestStreak,
            accuracy,
          },
        });

        setResultData({
          ...result,
          answered: totalAnswered,
          correct: totalCorrect,
          bestStreak: highestStreak,
          accuracy,
        });
        setPhase('finished');

        if (result.is_new_best) {
          success(`🔥 New Personal Record: ${result.score} pts!`);
        } else {
          success(`Quiz Complete: ${result.score} pts!`);
        }
        await refreshUser();
        loadHistory();
      } catch (err) {
        toastError(err.response?.data?.error?.message || 'Failed to submit score.');
        setPhase('ready');
      }
    },
    [clearAllTimers, refreshUser, loadHistory, success, toastError]
  );

  // Countdown completed -> begin gameplay loops
  const handleCountdownComplete = () => {
    setPhase('playing');
    startTimeRef.current = performance.now();
    loadNextQuestion(0);

    // Global 60s timer
    clearAllTimers();
    globalTimerRef.current = setInterval(() => {
      setGlobalTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(globalTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Question countdown tick (100ms interval for smooth progress bar)
    qTimerRef.current = setInterval(() => {
      setQTimeLeft((prev) => {
        if (prev <= 0.1) {
          return 0;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);
  };

  // Handle per-question timeout
  useEffect(() => {
    if (phase === 'playing' && qTimeLeft <= 0) {
      triggerShake();
      const nextLives = lives - 1;
      setLives(nextLives);
      setStreak(0);
      const nextAnswered = answered + 1;
      setAnswered(nextAnswered);

      if (nextLives <= 0) {
        handleFinishGame(score, nextAnswered, correctCount, bestStreak);
      } else {
        loadNextQuestion(nextAnswered);
      }
    }
  }, [qTimeLeft, phase, lives, answered, score, correctCount, bestStreak, triggerShake, handleFinishGame, loadNextQuestion]);

  // Handle global 60s timeout
  useEffect(() => {
    if (phase === 'playing' && globalTimeLeft === 0) {
      handleFinishGame(score, answered, correctCount, bestStreak);
    }
  }, [globalTimeLeft, phase, score, answered, correctCount, bestStreak, handleFinishGame]);

  // User selects an answer option
  const handleSelectOption = (choice) => {
    if (phase !== 'playing' || !question) return;

    const isCorrect = choice === question.answer;
    const nextAnswered = answered + 1;
    setAnswered(nextAnswered);

    if (isCorrect) {
      sounds.playSuccess();
      const nextStreak = streak + 1;
      const nextBestStreak = Math.max(bestStreak, nextStreak);
      setStreak(nextStreak);
      setBestStreak(nextBestStreak);
      sounds.playCombo(nextStreak);

      const multiplier = 1 + Math.floor(nextStreak / 3);
      const points = 10 * multiplier;
      const nextScore = score + points;
      const nextCorrect = correctCount + 1;

      setScore(nextScore);
      setCorrectCount(nextCorrect);
      loadNextQuestion(nextAnswered);
    } else {
      triggerShake();
      const nextLives = lives - 1;
      setLives(nextLives);
      setStreak(0);

      if (nextLives <= 0) {
        handleFinishGame(score, nextAnswered, correctCount, bestStreak);
      } else {
        loadNextQuestion(nextAnswered);
      }
    }
  };

  // Skip lifeline (once per game)
  const handleSkip = () => {
    if (!skipAvailable || phase !== 'playing') return;
    sounds.playTone(550, 0.15, 'sine', 0.1);
    setSkipAvailable(false);
    loadNextQuestion(answered);
  };

  // Keyboard 1-4 hotkey support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase !== 'playing' || !question) return;
      const keyMap = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
      if (e.code in keyMap) {
        const idx = keyMap[e.code];
        if (question.options[idx] !== undefined) {
          e.preventDefault();
          handleSelectOption(question.options[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const qPercent = qTimeMax > 0 ? Math.max(0, Math.min(100, (qTimeLeft / qTimeMax) * 100)) : 0;
  const currentMultiplier = 1 + Math.floor(streak / 3);

  return (
    <GameLayout
      title="Brain Battle"
      icon={Brain}
      personalBest={historyData?.personal_best}
      personalBestUnit="pts"
      lowerIsBetter={false}
      badgeText="⚡ Rapid-Fire Logic"
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
          <Card className="text-center p-8 sm:p-12 border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-6 shadow-xl shadow-amber-500/10">
              <Brain className="w-10 h-10" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-wide font-heading mb-3">
              Brain Battle
            </h1>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed mb-8">
              60 seconds of rapid-fire logic puzzles and speed math. Build massive streak multipliers,
              guard your 3 lives against shrinking question timers, and conquer the leaderboard!
            </p>

            {/* Rules Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8 text-left">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-cyan-400 text-xs font-bold block mb-1">RULE 1: STREAK MULTIPLIER</span>
                <p className="text-xs text-slate-300">Every 3 consecutive correct answers escalates your point multiplier (x1, x2, x3...).</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-rose-400 text-xs font-bold block mb-1">RULE 2: 3 LIVES</span>
                <p className="text-xs text-slate-300">Wrong answers or question timeouts cost 1 life and break your streak. 0 lives ends game!</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-amber-400 text-xs font-bold block mb-1">RULE 3: SPEED TIMER & KEYS</span>
                <p className="text-xs text-slate-300">Timers shrink as difficulty rises. Press keys 1-4 or click for hyper-fast inputs.</p>
              </div>
            </div>

            {/* Launch Button */}
            <Button
              size="lg"
              variant="primary"
              onClick={handleStartGame}
              isLoading={loading}
              className="text-base px-8 py-4 shadow-xl shadow-cyan-500/25"
              id="btn-start-brain-battle"
            >
              Start Battle (60 Seconds)
            </Button>
          </Card>

          {/* Past History */}
          <HistorySection historyData={historyData} />
        </div>
      )}

      {/* ============================================================== */}
      {/* PHASE 2: PLAYING SCREEN */}
      {/* ============================================================== */}
      {(phase === 'playing' || phase === 'submitting') && (
        <div className={`space-y-6 ${isShaking ? 'animate-shake' : ''}`}>
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-white/10 flex-wrap">
            {/* Global Timer */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-xs uppercase text-slate-400 font-bold">Round Time:</span>
              <span className={`text-base font-extrabold font-heading ${globalTimeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                {globalTimeLeft}s
              </span>
            </div>

            {/* 3 Lives Icons */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((heartIndex) => (
                <Heart
                  key={heartIndex}
                  className={`w-5 h-5 transition-transform ${
                    heartIndex <= lives
                      ? 'text-rose-500 fill-rose-500 scale-100 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                      : 'text-slate-700 fill-slate-900 scale-90'
                  }`}
                />
              ))}
            </div>

            {/* Streak & Multiplier */}
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> {currentMultiplier}x ({streak} Streak)
                </span>
              )}
              <span className="text-xs font-bold text-slate-300">
                Score: <strong className="text-cyan-400 text-sm">{score}</strong>
              </span>
            </div>

            {/* Skip Lifeline Button */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSkip}
              disabled={!skipAvailable}
              icon={SkipForward}
              className={`text-xs ${!skipAvailable ? 'opacity-40 cursor-not-allowed' : 'hover:border-amber-400'}`}
              title={skipAvailable ? 'Skip current question without penalty' : 'Skip already used'}
              id="btn-skip-lifeline"
            >
              {skipAvailable ? 'Skip Question' : 'Skip Used'}
            </Button>
          </div>

          {/* Question Shrinking Timer Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/5">
            <div
              className={`h-full transition-all duration-100 ${
                qPercent > 50
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                  : qPercent > 25
                  ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                  : 'bg-gradient-to-r from-rose-600 to-rose-400 animate-pulse'
              }`}
              style={{ width: `${qPercent}%` }}
            />
          </div>

          {/* Active Question Box */}
          {question && (
            <Card className="p-8 sm:p-12 border-cyan-500/30 bg-slate-900/90 text-center relative overflow-hidden shadow-2xl">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-cyan-400 border border-white/5 mb-4">
                {question.type}
              </span>

              <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-heading tracking-wide mb-8">
                {question.prompt}
              </h2>

              {/* 4 Options Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
                {question.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt)}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-800/90 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-400/80 active:scale-95 transition-all text-left flex items-center justify-between group cursor-pointer shadow-lg"
                    id={`opt-btn-${idx + 1}`}
                  >
                    <span className="text-xl sm:text-2xl font-bold font-heading text-white group-hover:text-cyan-300 transition-colors">
                      {opt}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-900 border border-white/10 text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/40">
                      Key {idx + 1}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 text-[11px] text-slate-500">
                Press keyboard keys <strong>1</strong>, <strong>2</strong>, <strong>3</strong>, or <strong>4</strong> for instant answers
              </div>
            </Card>
          )}

          {phase === 'submitting' && (
            <div className="p-8 text-center">
              <Loader text="Finalizing Brain Battle performance..." />
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
          scoreLabel="Brain Battle Score"
          isNewBest={resultData.is_new_best}
          personalBest={resultData.personal_best}
          xpEarned={resultData.xp_earned}
          coinsEarned={resultData.coins_earned}
          onPlayAgain={handleStartGame}
        >
          {/* Performance Breakdown */}
          <div className="max-w-md mx-auto space-y-3 text-left">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
              <span>Quiz Intelligence Report</span>
              <span className="text-cyan-400">
                {resultData.accuracy >= 80 ? '⚡ Genius Intellect' : resultData.accuracy >= 60 ? '🔥 Sharp Mind' : '👍 Good Effort'}
              </span>
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Answered</span>
                <span className="text-sm font-bold text-white font-heading">{resultData.answered}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Correct</span>
                <span className="text-sm font-bold text-emerald-400 font-heading">{resultData.correct}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Accuracy</span>
                <span className="text-sm font-bold text-cyan-300 font-heading">{resultData.accuracy}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Max Streak</span>
                <span className="text-sm font-bold text-amber-400 font-heading">{resultData.bestStreak}x</span>
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
          <History className="w-4 h-4 text-amber-400" /> Recent Brain Battles
        </h3>
        <span className="text-xs text-slate-400">
          Total Plays: {historyData?.total_played || 0}
        </span>
      </div>

      {sessions.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">
          No battles logged yet. Step into the arena above!
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

export default BrainBattle;
