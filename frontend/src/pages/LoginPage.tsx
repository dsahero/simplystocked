import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { BrandLogo } from '../components/ui/Brand';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };


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
                <label htmlFor="username" className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                  Username
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-5 w-5 text-forest/20" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/30 dark:bg-neutral-950 py-4 pl-12 pr-4 text-sm font-bold placeholder-forest/20 focus:border-brown focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-4 focus:ring-brown/5 transition-all dark:text-white"
                    placeholder="Enter your username"
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

          </form>
        </div>
      </div>
    </div>
  );
}
