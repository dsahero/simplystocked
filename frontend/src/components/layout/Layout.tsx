import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Package, BarChart2, Upload, Settings, LogOut, User, ChevronDown, LayoutDashboard, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

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
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white font-bold">
                S
              </div>
              <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white hidden sm:block">
                SimplyStocked
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleDarkMode}
              className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 dark:text-neutral-400"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <img
                  src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                  alt="Profile"
                  className="h-8 w-8 rounded-full border border-neutral-200 dark:border-neutral-700"
                />
                <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition-transform", isProfileOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1 shadow-lg"
                    >
                      <div className="px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Account
                      </div>
                      <button 
                        onClick={() => {
                          navigate('/account');
                          setIsProfileOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </button>
                      <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-800" />
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
              className="fixed inset-0 z-[60] bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[70] w-72 bg-white dark:bg-neutral-900 shadow-2xl"
            >
              <div className="flex h-16 items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6">
                <span className="text-lg font-bold">Navigation</span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                      location.pathname === item.path
                        ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="absolute bottom-0 w-full border-t border-neutral-100 dark:border-neutral-800 p-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all"
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
