import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  const [isResetSent, setIsResetSent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (view === 'login') {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // For demo purposes, any email works. 
        // If email contains 'admin', role is admin.
        const role = email.includes('admin') ? 'admin' : 'user';
        await login(email, role);
        navigate('/');
      } else {
        // Forgot password flow
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsResetSent(true);
      }
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (view === 'forgot-password') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4 py-12 sm:px-6 lg:px-8 transition-colors">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-white text-3xl font-bold shadow-lg shadow-orange-200 dark:shadow-orange-900/20">
              S
            </div>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Enter your email to receive a reset link
            </p>
          </div>

          <div className="mt-8 rounded-3xl bg-white dark:bg-neutral-900 p-8 shadow-xl shadow-neutral-200/50 dark:shadow-black/20 border border-neutral-100 dark:border-neutral-800">
            {isResetSent ? (
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Check your email</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  We've sent a password reset link to <span className="font-bold text-neutral-900 dark:text-white">{email}</span>
                </p>
                <button
                  onClick={() => setView('login')}
                  className="w-full rounded-xl bg-neutral-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Email Address
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-5 w-5 text-neutral-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-3 pl-10 pr-3 text-sm placeholder-neutral-400 focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all dark:text-white"
                      placeholder="name@university.edu"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/20 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="text-sm font-medium text-orange-600 hover:text-orange-500"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4 py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-white text-3xl font-bold shadow-lg shadow-orange-200 dark:shadow-orange-900/20">
            S
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            SimplyStocked
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Food Bank Inventory Management
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-white dark:bg-neutral-900 p-8 shadow-xl shadow-neutral-200/50 dark:shadow-black/20 border border-neutral-100 dark:border-neutral-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Email Address
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-3 pl-10 pr-3 text-sm placeholder-neutral-400 focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all dark:text-white"
                    placeholder="name@university.edu"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Password
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-3 pl-10 pr-3 text-sm placeholder-neutral-400 focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-orange-600 focus:ring-orange-500 dark:bg-neutral-950"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700 dark:text-neutral-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="font-medium text-orange-600 hover:text-orange-500"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/20 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
