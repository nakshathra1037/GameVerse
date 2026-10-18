import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Coins,
  AlertCircle,
  Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import { AVATAR_OPTIONS, AVATAR_MAP } from '../utils/constants';

export const Register = () => {
  const { register } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatar: 'cyber-ninja',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const selectAvatar = (id) => {
    setFormData((prev) => ({ ...prev, avatar: id }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation checks
    if (!formData.username.trim() || !formData.email.trim() || !formData.password) {
      setError('All fields are required.');
      return;
    }

    if (formData.username.length < 3 || formData.username.length > 20) {
      setError('Username must be between 3 and 20 characters.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await register({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        avatar: formData.avatar,
      });
      success(`Welcome to GameVerse, ${data.user?.username || 'Player'}! 50 bonus coins added!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        'Registration failed. Please check your information.';
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedAvatarInfo = AVATAR_MAP[formData.avatar] || AVATAR_MAP['cyber-ninja'];

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide font-heading">
            Join GameVerse
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Create your player profile, choose an avatar, and claim 50 starter coins.
          </p>
        </div>

        {/* Register Card */}
        <Card className="border border-white/10 shadow-2xl">
          {/* Bonus Banner */}
          <div className="mb-6 p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent border border-amber-500/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300">Starter Bonus Gift</p>
              <p className="text-[11px] text-amber-200/70">
                You'll receive 50 Free Coins and Level 1 status automatically upon signup!
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Avatar Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300 tracking-wide uppercase">
                Choose Your Avatar: <span className="text-cyan-400 font-bold">{selectedAvatarInfo.label}</span>
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((av) => {
                  const isSelected = formData.avatar === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => selectAvatar(av.id)}
                      className={`relative aspect-square rounded-xl flex items-center justify-center text-2xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 ring-2 ring-cyan-400 scale-105 shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800'
                      }`}
                      title={av.label}
                    >
                      <span>{av.icon}</span>
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center text-black">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Player Username"
              id="username"
              name="username"
              type="text"
              placeholder="e.g. ApexPredator"
              icon={User}
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              helperText="3 to 20 alphanumeric characters or underscores"
              required
            />

            <Input
              label="Email Address"
              id="email"
              name="email"
              type="email"
              placeholder="player@gameverse.io"
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={Lock}
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />

              <Input
                label="Confirm Password"
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={Lock}
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
              icon={UserPlus}
            >
              Complete Registration
            </Button>
          </form>

          {/* Footer link to Login */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-slate-400">
            Already have a player account?{' '}
            <Link
              to="/login"
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4"
            >
              Sign In Instead
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;
