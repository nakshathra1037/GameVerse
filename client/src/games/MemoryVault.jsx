import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  Clock,
  Sparkles,
  Flame,
  Eye,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Trophy,
  History,
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

// Symbol pool for card matching
const SYMBOLS = ['💎', '⚡', '🚀', '🔮', '🛡️', '👑', '👾', '🔥', '🧬', '🌀', '🎯', '🗝️'];

// Grid size configurations
const GRID_CONFIGS = {
  '4x3': { label: 'Casual (4x3)', pairs: 6, cols: 'grid-cols-4', multiplier: 1.0 },
  '4x4': { label: 'Tactical (4x4)', pairs: 8, cols: 'grid-cols-4', multiplier: 1.25 },
  '6x4': { label: 'Master (6x4)', pairs: 12, cols: 'grid-cols-4 sm:grid-cols-6', multiplier: 1.5 },
};

export const MemoryVault = () => {
  const { refreshUser } = useAuth();
  const { success, error: toastError } = useToast();

  // Phase flow: 'ready' | 'countdown' | 'playing' | 'submitting' | 'finished'
  const [phase, setPhase] = useState('ready');
  const [gridSize, setGridSize] = useState('4x4');
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);

  // Gameplay state
  const [cards, setCards] = useState([]);
  const [flippedIds, setFlippedIds] = useState([]);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [peekUsed, setPeekUsed] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [resultData, setResultData] = useState(null);

  // Refs for timers and anti-cheat tracking
  const sessionIdRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const peekTimeoutRef = useRef(null);
  const resolveTimeoutRef = useRef(null);
  const startTimeRef = useRef(null);

  // Clear all pending timeouts / intervals
  const clearAllTimers = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
    if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current);
  }, []);

  // Fetch recent game history
  const loadHistory = useCallback(async () => {
    try {
      const data = await gameService.getGameHistory('memory-vault');
      setHistoryData(data);
    } catch (err) {
      console.warn('Failed to load memory-vault history:', err?.message);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    return () => clearAllTimers();
  }, [loadHistory, clearAllTimers]);

  // Tab visibility handling: end safely if hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && phase === 'playing') {
        // Tab was hidden while playing -> pause or prevent timing abuse
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [phase]);

  // Fisher-Yates card deck generator
  const buildDeck = (pairCount) => {
    const chosenSymbols = SYMBOLS.slice(0, pairCount);
    const cardPool = [];
    chosenSymbols.forEach((symbol, idx) => {
      cardPool.push({ id: `c_${idx}_a`, pairId: idx, symbol });
      cardPool.push({ id: `c_${idx}_b`, pairId: idx, symbol });
    });

    // Fisher-Yates Shuffle
    for (let i = cardPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPool[i], cardPool[j]] = [cardPool[j], cardPool[i]];
    }
    return cardPool;
  };

  // Start button clicked -> initiate session
  const handleStartClick = async () => {
    try {
      setLoading(true);
      const session = await gameService.startGame('memory-vault');
      sessionIdRef.current = session.session_id;

      const totalPairs = GRID_CONFIGS[gridSize].pairs;
      const newDeck = buildDeck(totalPairs);
      setCards(newDeck);
      setFlippedIds([]);
      setMatchedIds(new Set());
      setCombo(0);
      setMaxCombo(0);
      setScore(0);
      setMoves(0);
      setPeekUsed(false);
      setIsPeeking(false);
      setLocked(false);
      setTimeLeft(60);
      setResultData(null);

      setPhase('countdown');
    } catch (err) {
      toastError(err.response?.data?.error?.message || 'Failed to initialize session.');
    } finally {
      setLoading(false);
    }
  };

  // 3-2-1 countdown completed -> start round
  const handleCountdownComplete = () => {
    setPhase('playing');
    startTimeRef.current = performance.now();

    // Start 60s countdown
    clearAllTimers();
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Finish round and submit score
  const handleFinishGame = useCallback(
    async (finalRawScore, currentMoves, currentMaxCombo, currentMatchedCount, remainingSeconds) => {
      clearAllTimers();
      setPhase('submitting');

      const config = GRID_CONFIGS[gridSize];
      // Time bonus for matching all pairs
      const timeBonus = currentMatchedCount === config.pairs ? remainingSeconds * 10 : 0;
      const basePlusBonus = finalRawScore + timeBonus;
      const finalCalculatedScore = Math.round(basePlusBonus * config.multiplier);
      const durationMs = Math.round(performance.now() - (startTimeRef.current || performance.now()));

      try {
        const result = await gameService.submitScore('memory-vault', {
          sessionId: sessionIdRef.current,
          score: finalCalculatedScore,
          durationMs,
          meta: {
            gridSize,
            moves: currentMoves,
            maxCombo: currentMaxCombo,
            pairsMatched: currentMatchedCount,
            timeBonus,
            won: currentMatchedCount === config.pairs,
          },
        });

        setResultData({
          ...result,
          moves: currentMoves,
          maxCombo: currentMaxCombo,
          timeBonus,
          pairsMatched: currentMatchedCount,
          totalPairs: config.pairs,
        });
        setPhase('finished');

        if (result.is_new_best) {
          success(`🔥 New Personal Record: ${result.score} pts!`);
        } else {
          success(`Vault Cleared: ${result.score} pts!`);
        }
        await refreshUser();
        loadHistory();
      } catch (err) {
        toastError(err.response?.data?.error?.message || 'Failed to submit score.');
        setPhase('ready');
      }
    },
    [gridSize, clearAllTimers, refreshUser, loadHistory, success, toastError]
  );

  // Watch for timer expiry
  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) {
      const config = GRID_CONFIGS[gridSize];
      const matchedPairsCount = Math.floor(matchedIds.size / 2);
      handleFinishGame(score, moves, maxCombo, matchedPairsCount, 0);
    }
  }, [timeLeft, phase, score, moves, maxCombo, matchedIds, gridSize, handleFinishGame]);

  // Card click handler
  const handleCardClick = (card) => {
    if (phase !== 'playing' || locked || isPeeking) return;
    if (matchedIds.has(card.id) || flippedIds.includes(card.id)) return;

    sounds.playClick();
    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      setLocked(true);
      const nextMoves = moves + 1;
      setMoves(nextMoves);

      const firstCard = cards.find((c) => c.id === nextFlipped[0]);
      const secondCard = card;

      if (firstCard.pairId === secondCard.pairId) {
        // MATCH!
        sounds.playSuccess();
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setMaxCombo((prev) => Math.max(prev, nextCombo));
        sounds.playCombo(nextCombo);

        const earnedPoints = 100 * Math.min(nextCombo, 5);
        const nextScore = score + earnedPoints;
        setScore(nextScore);

        const nextMatched = new Set(matchedIds);
        nextMatched.add(firstCard.id);
        nextMatched.add(secondCard.id);
        setMatchedIds(nextMatched);
        setFlippedIds([]);
        setLocked(false);

        // Check if all pairs are matched
        const config = GRID_CONFIGS[gridSize];
        if (nextMatched.size === cards.length) {
          handleFinishGame(nextScore, nextMoves, Math.max(maxCombo, nextCombo), config.pairs, timeLeft);
        }
      } else {
        // MISS
        sounds.playMistake();
        setCombo(0);
        resolveTimeoutRef.current = setTimeout(() => {
          setFlippedIds([]);
          setLocked(false);
        }, 700);
      }
    }
  };

  // Peek Power-Up (costs 50 pts, once per game)
  const handlePeek = () => {
    if (peekUsed || locked || isPeeking || phase !== 'playing') return;

    const newScore = Math.max(0, score - 50);
    setScore(newScore);
    setPeekUsed(true);
    setIsPeeking(true);
    setLocked(true);
    sounds.playTone(600, 0.2, 'triangle', 0.1);

    peekTimeoutRef.current = setTimeout(() => {
      setIsPeeking(false);
      setLocked(false);
      setFlippedIds([]);
    }, 1500);
  };

  const config = GRID_CONFIGS[gridSize];

  return (
    <GameLayout
      title="Memory Vault"
      icon={Layers}
      personalBest={historyData?.personal_best}
      personalBestUnit="pts"
      lowerIsBetter={false}
      badgeText="🧠 Memory Matrix"
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
          <Card className="text-center p-8 sm:p-12 border-purple-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950">
            <div className="w-20 h-20 rounded-3xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-6 shadow-xl shadow-purple-500/10">
              <Layers className="w-10 h-10" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-wide font-heading mb-3">
              Memory Vault
            </h1>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed mb-8">
              Decipher the cyber vault by matching paired memory nodes within 60 seconds.
              Chain consecutive matches for up to a 5x combo multiplier and use your tactical Peek power-up wisely!
            </p>

            {/* Grid Size Selection */}
            <div className="max-w-md mx-auto mb-8">
              <label className="block text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">
                Select Grid Matrix Size
              </label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(GRID_CONFIGS).map(([key, item]) => {
                  const isSelected = gridSize === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setGridSize(key)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-400 text-white ring-2 ring-purple-500/40'
                          : 'bg-slate-900/80 border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span className="block text-xs font-bold font-heading">{item.label}</span>
                      <span className="text-[10px] text-purple-300">{item.multiplier}x Multiplier</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rules Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8 text-left">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-cyan-400 text-xs font-bold block mb-1">RULE 1: 60S TIMER</span>
                <p className="text-xs text-slate-300">Match all pairs before time expires. Remaining seconds grant bonus points!</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-amber-400 text-xs font-bold block mb-1">RULE 2: COMBO STREAK</span>
                <p className="text-xs text-slate-300">Each consecutive match ramps points up to 5x. Misses reset combo to 0.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
                <span className="text-purple-400 text-xs font-bold block mb-1">RULE 3: PEEK POWER-UP</span>
                <p className="text-xs text-slate-300">Costs 50 pts to flash all hidden nodes for 1.5 seconds once per round.</p>
              </div>
            </div>

            {/* Launch Button */}
            <Button
              size="lg"
              variant="primary"
              onClick={handleStartClick}
              isLoading={loading}
              className="text-base px-8 py-4 shadow-xl shadow-cyan-500/25"
              id="btn-start-memory-vault"
            >
              Start Game ({config.pairs} Pairs)
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
        <div className="space-y-6">
          {/* Header Stats Bar */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-white/10 flex-wrap">
            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-xs uppercase text-slate-400 font-bold">Time Left:</span>
              <span className={`text-base font-extrabold font-heading ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>

            {/* Moves & Pairs */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
              <span>Moves: <strong className="text-white">{moves}</strong></span>
              <span>Pairs: <strong className="text-cyan-400">{Math.floor(matchedIds.size / 2)} / {config.pairs}</strong></span>
            </div>

            {/* Combo Multiplier */}
            <div className="flex items-center gap-2">
              {combo > 1 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> {combo}x Combo!
                </span>
              )}
              <span className="text-xs font-bold text-slate-300">
                Score: <strong className="text-cyan-400 text-sm">{score}</strong>
              </span>
            </div>

            {/* Peek Power-Up Button */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePeek}
              disabled={peekUsed || locked || isPeeking}
              icon={Eye}
              className={`text-xs ${peekUsed ? 'opacity-40 cursor-not-allowed' : 'hover:border-purple-400'}`}
              title={peekUsed ? 'Peek already used' : 'Reveal cards for 1.5s (-50 pts)'}
              id="btn-peek-powerup"
            >
              {peekUsed ? 'Peek Used' : 'Peek (-50 pts)'}
            </Button>
          </div>

          {/* 3D Card Grid */}
          <div className={`grid ${config.cols} gap-3 sm:gap-4 max-w-3xl mx-auto select-none`}>
            {cards.map((card) => {
              const isFlipped = flippedIds.includes(card.id);
              const isMatched = matchedIds.has(card.id);
              const isShowing = isFlipped || isMatched || isPeeking;

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className="aspect-square perspective-1000 cursor-pointer"
                >
                  <div
                    className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                      isShowing ? 'rotate-y-180' : ''
                    }`}
                  >
                    {/* BACK FACE (Hidden node) */}
                    <div className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/20 hover:border-cyan-400/50 flex items-center justify-center shadow-lg transition-all">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400/60">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>

                    {/* FRONT FACE (Revealed node) */}
                    <div
                      className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-2xl transition-all ${
                        isMatched
                          ? 'bg-gradient-to-br from-emerald-950/80 to-slate-900 border-2 border-emerald-400 text-white shadow-emerald-500/20'
                          : 'bg-gradient-to-br from-purple-950/90 to-slate-900 border-2 border-purple-400/80 text-white shadow-purple-500/20'
                      }`}
                    >
                      {card.symbol}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {phase === 'submitting' && (
            <div className="p-8 text-center">
              <Loader text="Submitting score to GameVerse arena..." />
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
          scoreLabel="Memory Vault Score"
          isNewBest={resultData.is_new_best}
          personalBest={resultData.personal_best}
          xpEarned={resultData.xp_earned}
          coinsEarned={resultData.coins_earned}
          onPlayAgain={handleStartClick}
        >
          {/* Performance Breakdown */}
          <div className="max-w-md mx-auto space-y-3 text-left">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
              <span>Vault Cleared Summary</span>
              <span className="text-cyan-400">
                {resultData.pairsMatched === resultData.totalPairs ? '🎯 Perfect Match' : '⏰ Time Expired'}
              </span>
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Grid</span>
                <span className="text-sm font-bold text-white font-heading">{resultData.meta?.gridSize || gridSize}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Moves</span>
                <span className="text-sm font-bold text-white font-heading">{resultData.moves}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Max Combo</span>
                <span className="text-sm font-bold text-amber-400 font-heading">{resultData.maxCombo}x</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Time Bonus</span>
                <span className="text-sm font-bold text-cyan-300 font-heading">+{resultData.timeBonus || 0}</span>
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
          <History className="w-4 h-4 text-purple-400" /> Recent Vault Sessions
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

export default MemoryVault;
