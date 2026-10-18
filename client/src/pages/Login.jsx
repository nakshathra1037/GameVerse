import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';

export const Login = () => {
  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Target to redirect after successful login
  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.login.trim() || !formData.password) {
      setError('Please provide your username or email, and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await login({
        login: formData.login.trim(),
        password: formData.password,
      });
      success(`Welcome back, ${data.user?.username || 'Player'}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        'Authentication failed. Please verify your credentials.';
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide font-heading">
            Welcome Back, Player
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Sign into your GameVerse account to continue your progression.
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-white/10 shadow-2xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username or Email"
              id="login"
              name="login"
              type="text"
              placeholder="e.g. cyber_warrior or player@gameverse.io"
              icon={User}
              value={formData.login}
              onChange={handleChange}
              autoComplete="username"
              required
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={Lock}
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
              icon={LogIn}
            >
              Sign In
            </Button>
          </form>

          {/* Footer link to Register */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link
              to="/register"
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4"
            >
              Create Account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
