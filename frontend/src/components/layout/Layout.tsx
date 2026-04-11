import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
<<<<<<< HEAD
import { Menu, X, Package, BarChart2, Upload, Settings, LogOut, User, ChevronDown, LayoutDashboard, Moon, Sun, Truck, ClipboardCheck, Brain, Users } from 'lucide-react';
=======
import { Menu, X, Package, BarChart2, Upload, Settings, LogOut, User, ChevronDown, LayoutDashboard, Moon, Sun, Truck, ClipboardCheck } from 'lucide-react';
>>>>>>> invoice
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';
import { BrandLogo } from '../ui/Brand';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Inventory', icon: Package, path: '/inventory' },
    { name: 'Analytics', icon: BarChart2, path: '/analytics' },
    { name: 'Upload Invoices', icon: Upload, path: '/upload' },
    { name: 'Vendors', icon: Truck, path: '/vendors' },
    { name: 'Checkpoints', icon: ClipboardCheck, path: '/checkpoints' },
<<<<<<< HEAD
    { name: 'Predictions', icon: Brain, path: '/predictions' },
    { name: 'Team', icon: Users, path: '/team' },
=======
>>>>>>> invoice
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 z-50 w-full border-b border-forest/5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl shadow-sm">
        <div className="flex h-20 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all text-forest dark:text-white group"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </button>
            <Link to="/" className="flex items-center gap-3 group">
              <BrandLogo className="h-12 w-auto text-forest dark:text-white group-hover:scale-105 transition-transform" />
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={toggleDarkMode}
              className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all text-forest/60 dark:text-neutral-400"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 rounded-[20px] p-1.5 pr-4 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all border border-forest/5"
              >
                <div className="relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl || '/icons/default-pfp.jpg'}
                      alt="Profile"
                      className="h-10 w-10 rounded-[16px] border-2 border-white dark:border-neutral-800 shadow-md object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-[16px] border-2 border-white dark:border-neutral-800 shadow-md bg-forest/5 flex items-center justify-center text-forest/20">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-neutral-900 bg-green-500" />
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-bold text-forest dark:text-white leading-none">{user?.name || 'User'}</span>
                  <span className="text-[10px] font-bold text-forest/40 dark:text-neutral-500 mt-1 uppercase tracking-wider">{user?.role || 'User'}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-forest/20 transition-transform", isProfileOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-2xl border border-forest/10 bg-white dark:bg-neutral-900 p-1 shadow-xl"
                    >
                      <div className="px-3 py-2 text-[10px] font-bold text-forest/40 dark:text-neutral-400 uppercase tracking-widest">
                        Account
                      </div>
                      <button 
                        onClick={() => {
                          navigate('/account');
                          setIsProfileOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-forest hover:bg-cream dark:hover:bg-neutral-800 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </button>
                      <div className="my-1 h-px bg-forest/5 dark:bg-neutral-800" />
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-brown hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-[60] bg-forest/20 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[70] w-72 bg-white dark:bg-neutral-900 shadow-2xl"
            >
              <div className="flex h-16 items-center justify-between border-b border-forest/5 dark:border-neutral-800 px-6">
                <span className="text-lg font-display font-bold text-forest">Navigation</span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-xl p-2 hover:bg-cream dark:hover:bg-neutral-800 transition-colors text-forest"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="p-4 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all",
                      location.pathname === item.path
                        ? "bg-forest text-white shadow-lg shadow-forest/20"
                        : "text-forest/60 dark:text-neutral-400 hover:bg-cream dark:hover:bg-neutral-800 hover:text-forest dark:hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="absolute bottom-0 w-full border-t border-forest/5 dark:border-neutral-800 p-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-forest/60 dark:text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="pt-16 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
