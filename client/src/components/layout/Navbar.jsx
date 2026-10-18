import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Gamepad2,
  Coins,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Button from '../common/Button';
import { AVATAR_MAP } from '../../utils/constants';

export { AVATAR_MAP };

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    info('You have been signed out.');
    navigate('/');
  };

  const currentAvatar = AVATAR_MAP[user?.avatar] || AVATAR_MAP['cyber-ninja'];

  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-xl font-bold tracking-wider text-white flex items-center gap-1">
                GAME<span className="text-cyan-400">VERSE</span>
              </span>
              <span className="text-[10px] tracking-widest text-slate-400 uppercase -mt-1 font-medium">
                Arena Platform
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === '/'
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Home
            </Link>

            {isAuthenticated && (
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Game Arena
              </Link>
            )}
          </div>

          {/* Right Section: Player Stats & Profile OR Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {/* Coins Badge */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-sm"
                  title="Player Coins"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" style={{ animationDuration: '2s' }} />
                  <span>{user.coins.toLocaleString()}</span>
                </div>

                {/* Level & XP Badge */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold"
                  title={`Level ${user.level} (${user.xp} XP)`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>LVL {user.level}</span>
                </div>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${currentAvatar.color} flex items-center justify-center text-sm shadow`}
                    >
                      {currentAvatar.icon}
                    </div>
                    <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate">
                      {user.username}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-52 glass-panel border border-slate-700/80 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                      onMouseLeave={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-3 py-2 border-b border-white/5 mb-1">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-semibold text-white truncate">
                          {user.username}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {user.email}
                        </p>
                      </div>

                      <Link
                        to="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                      >
                        <Gamepad2 className="w-4 h-4 text-cyan-400" />
                        Arena Dashboard
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Create Account
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-t border-white/5 px-4 pt-3 pb-5 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
          >
            Home
          </Link>
          {isAuthenticated && (
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Game Arena
            </Link>
          )}

          <div className="pt-2 border-t border-white/5">
            {isAuthenticated && user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{currentAvatar.icon}</span>
                    <span className="text-sm font-semibold text-white">{user.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-cyan-300">LVL {user.level}</span>
                    <span className="text-xs text-amber-300">💰 {user.coins}</span>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={handleLogout}
                  icon={LogOut}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Create Account
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
