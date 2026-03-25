'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { backendAuthService } from '@/lib/services/backend-auth.service';
import { Eye, EyeOff, X } from 'lucide-react';

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpShowNew, setFpShowNew] = useState(false);
  const [fpShowConfirm, setFpShowConfirm] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email || !password) {
        setError('Email and password are required');
        setIsLoading(false);
        return;
      }

      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      // Show the actual error from the server instead of a generic message
      const message = err?.message || '';
      if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('no account')) {
        setError('No account found with this email address.');
      } else if (message.toLowerCase().includes('password') || message.toLowerCase().includes('invalid')) {
        setError('Incorrect password. Please try again.');
      } else if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network') || message.toLowerCase().includes('failed to fetch')) {
        setError('Cannot connect to the server. Please make sure the backend is running.');
      } else {
        setError(message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await login('admin@hrerp.com', 'demo123');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const openForgot = () => {
    setFpEmail(email); // Pre-fill with whatever they typed
    setFpNewPassword('');
    setFpConfirmPassword('');
    setFpError('');
    setFpSuccess(false);
    setForgotOpen(true);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    if (!fpEmail) { setFpError('Please enter your email address.'); return; }
    if (!fpNewPassword) { setFpError('Please enter a new password.'); return; }
    if (fpNewPassword.length < 6) { setFpError('Password must be at least 6 characters.'); return; }
    if (fpNewPassword !== fpConfirmPassword) { setFpError('Passwords do not match.'); return; }

    setFpLoading(true);
    try {
      await backendAuthService.resetPassword({ email: fpEmail, newPassword: fpNewPassword });
      setFpSuccess(true);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        setFpError('Cannot connect to the server. Please make sure the backend is running.');
      } else {
        setFpError(msg || 'Password reset failed. Please try again.');
      }
    } finally {
      setFpLoading(false);
    }
  };

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
              <span className="text-lg font-bold text-white">HR</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">HR ERP</h1>
              <p className="text-xs text-slate-500">Enterprise System</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In</h2>
          <p className="text-slate-600 text-sm mb-6">Welcome back to HR ERP</p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative" suppressHydrationWarning>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 rounded border-slate-300"
                disabled={isLoading}
              />
              <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
                Remember me
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-slate-300" />
            <span className="px-3 text-xs text-slate-500">OR</span>
            <div className="flex-1 border-t border-slate-300" />
          </div>

          {/* Demo Login */}
          <button
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors mb-6"
          >
            Try Demo Login
          </button>

          {/* Forgot Password */}
          <div className="text-center">
            <button
              type="button"
              onClick={openForgot}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Forgot your password?
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <a href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign up
              </a>
            </p>
          </div>
        </div>

        {/* Demo Credentials Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700 font-medium mb-2">Demo Credentials:</p>
          <p className="text-xs text-blue-600">Email: admin@hrerp.com</p>
          <p className="text-xs text-blue-600">Password: demo123</p>
        </div>
      </div>

      {/* ── Forgot Password Modal ─────────────────────────────────── */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
              <button onClick={() => setForgotOpen(false)} className="p-1.5 rounded hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-5">
              {fpSuccess ? (
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-slate-900 font-semibold mb-1">Password reset successfully!</p>
                  <p className="text-sm text-slate-500 mb-5">You can now sign in with your new password.</p>
                  <button
                    onClick={() => { setForgotOpen(false); setEmail(fpEmail); }}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-sm text-slate-500">Enter your email address and choose a new password.</p>

                  {fpError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{fpError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={fpLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <div className="relative" suppressHydrationWarning>
                      <input
                        type={fpShowNew ? 'text' : 'password'}
                        value={fpNewPassword}
                        onChange={(e) => setFpNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={fpLoading}
                      />
                      <button type="button" onClick={() => setFpShowNew(!fpShowNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {fpShowNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                    <div className="relative" suppressHydrationWarning>
                      <input
                        type={fpShowConfirm ? 'text' : 'password'}
                        value={fpConfirmPassword}
                        onChange={(e) => setFpConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={fpLoading}
                      />
                      <button type="button" onClick={() => setFpShowConfirm(!fpShowConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {fpShowConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setForgotOpen(false)}
                      className="flex-1 py-2 px-4 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={fpLoading}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 transition-colors">
                      {fpLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

