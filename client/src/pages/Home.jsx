import React from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Brain,
  Layers,
  Terminal,
  Crosshair,
  Sparkles,
  Gamepad2,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

export const Home = () => {
  const { isAuthenticated } = useAuth();

  const games = [
    {
      title: 'Reflex Rush',
      desc: 'Test reaction speed down to the millisecond across 5 rounds. Dodge fake distraction flashes and late yellow traps.',
      badge: 'Reaction',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      icon: Zap,
      gradient: 'from-cyan-500 to-blue-600',
      accent: 'border-cyan-500/30 hover:border-cyan-400/60',
      slug: 'reflex-rush',
    },
    {
      title: 'Memory Vault',
      desc: 'Card-flip matching with juicy 3D flips, combo multipliers, 3 grid sizes, and a tactical Peek power-up.',
      badge: 'Memory',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      icon: Layers,
      gradient: 'from-purple-500 to-indigo-600',
      accent: 'border-purple-500/30 hover:border-purple-400/60',
      slug: 'memory-vault',
    },
    {
      title: 'Brain Battle',
      desc: '60s rapid-fire logic and math quiz. Build streaks, protect 3 lives, beat shrinking timers, and deploy Skip.',
      badge: 'Logic & Math',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: Brain,
      gradient: 'from-amber-500 to-orange-600',
      accent: 'border-amber-500/30 hover:border-amber-400/60',
      slug: 'brain-battle',
    },
    {
      title: 'Code Breaker',
      desc: 'Mastermind-style secret deduction in a hacker terminal. Crack the hidden 4-digit code in 8 attempts.',
      badge: 'Deduction',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: Terminal,
      gradient: 'from-emerald-500 to-teal-600',
      accent: 'border-emerald-500/30 hover:border-emerald-400/60',
      slug: 'code-breaker',
    },
    {
      title: 'Aim Challenge',
      desc: 'High-octane 30s HTML Canvas shooting gallery. Pop shrinking targets, combo streaks, and avoid bombs.',
      badge: 'Accuracy',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: Crosshair,
      gradient: 'from-rose-500 to-pink-600',
      accent: 'border-rose-500/30 hover:border-rose-400/60',
      slug: 'aim-challenge',
    },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Background glowing ambient light orbs */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-600/15 via-blue-600/10 to-purple-600/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-96 right-10 w-[300px] h-[300px] bg-purple-600/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-6 shadow-sm shadow-cyan-500/10 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>GameVerse Arena: 5 Mini-Games Fully Unlocked</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-none mb-6">
          Level Up Your Mind in the{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
            GameVerse Arena
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Compete across 5 intense mini-games, earn XP to level up, stack coins,
          unlock achievements, and climb personal and global leaderboards.
        </p>

        {/* Call to action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          {isAuthenticated ? (
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2" icon={Gamepad2}>
                Enter Game Arena
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2" icon={Flame}>
                  Create Free Account
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Player Sign In
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-16 pt-10 border-t border-white/5 text-left">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5">
            <div className="text-cyan-400 font-bold text-2xl font-heading">5 Arenas</div>
            <div className="text-xs text-slate-400 mt-0.5">Reaction, Memory, Logic, Code, Aim</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5">
            <div className="text-purple-400 font-bold text-2xl font-heading">Server Auth</div>
            <div className="text-xs text-slate-400 mt-0.5">JWT & Bcrypt Security</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5">
            <div className="text-amber-400 font-bold text-2xl font-heading">+50 Coins</div>
            <div className="text-xs text-slate-400 mt-0.5">Starter Bonus Balance</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5">
            <div className="text-emerald-400 font-bold text-2xl font-heading">Anti-Cheat</div>
            <div className="text-xs text-slate-400 mt-0.5">Server Validation & XP</div>
          </div>
        </div>
      </section>

      {/* Mini-Games Showcase Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white tracking-wide font-heading">
            Featured Mini-Games
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Skill-based micro-challenges tested and verified server-side with anti-cheat protection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((g, i) => {
            const Icon = g.icon;
            return (
              <Card
                key={i}
                hoverable
                className={`border ${g.accent} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${g.gradient} p-0.5 shadow-lg flex items-center justify-center`}
                    >
                      <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${g.badgeColor}`}
                    >
                      {g.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 font-heading tracking-wide">
                    {g.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    {g.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span>Anti-cheat verified</span>
                  <Link
                    to={isAuthenticated ? `/games/${g.slug}` : '/login'}
                    className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    Play Game <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Home;
