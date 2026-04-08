import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { BrandLogo } from '../components/ui/Brand';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  const [isResetSent, setIsResetSent] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (view === 'login') {
        await login(email, password);
        navigate('/');
      } else {
        // Forgot password flow
        // In a real app, you'd use sendPasswordResetEmail(auth, email)
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
      <div className="flex min-h-screen items-center justify-center bg-cream dark:bg-neutral-950 px-4 py-12 sm:px-6 lg:px-8 transition-colors">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-forest text-white text-4xl font-display font-bold shadow-2xl shadow-forest/20">
              S
            </div>
            <h2 className="mt-8 text-4xl font-display font-bold tracking-tight text-forest dark:text-white">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-forest/60 dark:text-neutral-400 font-medium">
              Enter your email to receive a reset link
            </p>
          </div>

          <div className="mt-8 rounded-[40px] bg-white dark:bg-neutral-900 p-10 shadow-2xl shadow-forest/5 border border-forest/5 dark:border-neutral-800">
            {isResetSent ? (
              <div className="text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <Mail className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-forest dark:text-white">Check your email</h3>
                <p className="text-sm text-forest/60 dark:text-neutral-400 leading-relaxed">
                  We've sent a password reset link to <span className="font-bold text-forest dark:text-white">{email}</span>
                </p>
                <button
                  onClick={() => setView('login')}
                  className="w-full rounded-2xl bg-forest dark:bg-white px-6 py-4 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 transition-all active:scale-95 shadow-xl shadow-forest/10"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-5 w-5 text-forest/20" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/30 dark:bg-neutral-950 py-4 pl-12 pr-4 text-sm font-bold placeholder-forest/20 focus:border-brown focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-4 focus:ring-brown/5 transition-all dark:text-white"
                      placeholder="name@university.edu"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center rounded-2xl bg-brown px-6 py-4 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark focus:outline-none focus:ring-4 focus:ring-brown/10 disabled:opacity-50 transition-all active:scale-95"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
                    className="text-sm font-bold text-brown hover:text-brown-dark transition-colors"
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
    <div className="flex min-h-screen items-center justify-center bg-cream dark:bg-neutral-950 px-4 py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <BrandLogo className="mx-auto h-20 w-auto text-forest dark:text-white" />
          <p className="mt-4 text-sm text-forest/60 dark:text-neutral-400 font-medium">
            Food Bank Inventory Management
          </p>
        </div>

        <div className="mt-8 rounded-[40px] bg-white dark:bg-neutral-900 p-10 shadow-2xl shadow-forest/5 border border-forest/5 dark:border-neutral-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center gap-3 rounded-2xl bg-red-50 dark:bg-red-900/20 p-4 text-sm font-bold text-brown dark:text-red-400 border border-red-100 dark:border-red-900/30">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail className="h-5 w-5 text-forest/20" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/30 dark:bg-neutral-950 py-4 pl-12 pr-4 text-sm font-bold placeholder-forest/20 focus:border-brown focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-4 focus:ring-brown/5 transition-all dark:text-white"
                    placeholder="name@university.edu"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="h-5 w-5 text-forest/20" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/30 dark:bg-neutral-950 py-4 pl-12 pr-4 text-sm font-bold placeholder-forest/20 focus:border-brown focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-4 focus:ring-brown/5 transition-all dark:text-white"
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
                  className="h-5 w-5 rounded-lg border-forest/10 dark:border-neutral-700 text-brown focus:ring-brown dark:bg-neutral-950 transition-all"
                />
                <label htmlFor="remember-me" className="ml-3 block text-sm font-bold text-forest/60 dark:text-neutral-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="font-bold text-brown hover:text-brown-dark transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-2xl bg-brown px-6 py-4 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark focus:outline-none focus:ring-4 focus:ring-brown/10 disabled:opacity-50 transition-all active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-forest/5 dark:border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                <span className="bg-white dark:bg-neutral-900 px-4 text-forest/20">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-forest/5 bg-white dark:bg-neutral-900 px-6 py-4 text-sm font-bold text-forest dark:text-white hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-95"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
