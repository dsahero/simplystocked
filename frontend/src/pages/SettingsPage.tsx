import React, { useState, useEffect } from 'react';
import { User, Shield, ShieldCheck, Mail, Plus, Trash2, Search, UserPlus, Settings, MapPin, Building2, X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../contexts/InventoryContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { UserRole, User as UserType } from '../types';
import { ApiUser } from '../api/auth';

export default function SettingsPage() {
  const { user: currentUser, getAllUsers, createUser: apiCreateUser, updateUserRole: apiUpdateUserRole, deleteUser: apiDeleteUser } = useAuth();
  const { locations } = useInventory();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'users' | 'locations' | 'general'>('users');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', role: 'user' as UserRole });
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newLocationName, setNewLocationName] = useState('');

  useEffect(() => {
    if (activeTab === 'users') {
      setUsersLoading(true);
      getAllUsers().then(setUsers).catch(console.error).finally(() => setUsersLoading(false));
    }
  }, [activeTab]);

  const filteredUsers = users.filter(u =>
    u.Username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'manager' : 'admin';
    try {
      const updated = await apiUpdateUserRole(userId, newRole);
      setUsers(users.map(u => u.UserId === userId ? updated : u));
    } catch (err) { console.error(err); }
  };

  const handleDeleteUser = async (userId: number) => {
    if (String(userId) === currentUser?.id) return;
    try {
      await apiDeleteUser(userId);
      setUsers(users.filter(u => u.UserId !== userId));
    } catch (err) { console.error(err); }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiCreateUser(newUser.username, 'password123', newUser.email, newUser.role);
      setUsers([...users, created]);
      setIsAddUserModalOpen(false);
      setNewUser({ username: '', email: '', role: 'user' });
      alert(`User created! Temporary password: password123`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create user.');
    }
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    // Locations are fixed (open_market / grocery) — no custom locations supported
    alert('Custom locations are not supported. The system uses Open Market and Grocery Store as fixed locations.');
    setNewLocationName('');
  };


  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {currentUser?.role === 'admin' ? 'Settings & Administration' : 'Settings'}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {currentUser?.role === 'admin' 
              ? 'Manage user permissions and application configuration.' 
              : 'View application settings and user directory.'}
          </p>
        </div>
        {activeTab === 'users' && currentUser?.role === 'admin' && (
          <button 
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1 space-y-1">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all",
              activeTab === 'users' 
                ? "bg-brown/5 dark:bg-brown/10 font-bold text-brown" 
                : "font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            )}
          >
            <User className="h-5 w-5" />
            {currentUser?.role === 'admin' ? 'User Management' : 'User Directory'}
          </button>
          <button 
            onClick={() => setActiveTab('locations')}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all",
              activeTab === 'locations' 
                ? "bg-brown/5 dark:bg-brown/10 font-bold text-brown" 
                : "font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            )}
          >
            <Building2 className="h-5 w-5" />
            Storage Locations
          </button>
          <button 
            onClick={() => setActiveTab('general')}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all",
              activeTab === 'general' 
                ? "bg-brown/5 dark:bg-brown/10 font-bold text-brown" 
                : "font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            )}
          >
            <Settings className="h-5 w-5" />
            General Settings
          </button>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'users' && (
            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold dark:text-white">User Accounts</h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
                      />
                    </div>
                </div>

                <div className="space-y-4">
                  {usersLoading ? (
                    <p className="text-center text-sm text-neutral-400 py-8">Loading users...</p>
                  ) : filteredUsers.map((u) => (
                    <div key={u.UserId} className="flex items-center justify-between p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brown/10 text-brown font-bold text-sm">
                          {u.Username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">
                            {u.Username} {String(u.UserId) === currentUser?.id && <span className="text-xs font-normal text-neutral-400 ml-1">(You)</span>}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {u.Username}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {currentUser?.role === 'admin' ? (
                          <button
                            onClick={() => toggleRole(u.UserId, u.Role)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all",
                              u.Role === 'admin'
                                ? "bg-brown/10 dark:bg-brown/20 text-brown hover:bg-brown/20 dark:hover:bg-brown/30"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            )}
                          >
                            {u.Role === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                            {u.Role.toUpperCase()}
                          </button>
                        ) : (
                          <div className={cn(
                            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                            u.Role === 'admin'
                              ? "bg-brown/5 dark:bg-brown/10 text-brown"
                              : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400"
                          )}>
                            {u.Role === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                            {u.Role.toUpperCase()}
                          </div>
                        )}

                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u.UserId)}
                            disabled={String(u.UserId) === currentUser?.id}
                            className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-0 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Showing {filteredUsers.length} of {users.length} total users.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="space-y-6">
              {currentUser?.role === 'admin' && (
                <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                  <h2 className="text-lg font-bold mb-2 dark:text-white">Storage Locations</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Locations are fixed to the two distribution programs below. Custom locations are managed in the database.
                  </p>
                </div>
              )}

              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-bold mb-4 dark:text-white">Existing Locations</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {locations.map((loc) => (
                      <div key={loc.id} className="flex items-center justify-between p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-neutral-900 text-neutral-400 shadow-sm">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <span className="font-bold text-neutral-900 dark:text-white">{loc.name}</span>
                        </div>
                        {/* Fixed locations cannot be deleted */}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-4 dark:text-white">Appearance</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold dark:text-white">Dark Mode</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Switch between light and dark themes.</p>
                    </div>
                    <button
                      onClick={toggleDarkMode}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brown focus:ring-offset-2",
                        isDarkMode ? "bg-brown" : "bg-neutral-200"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          isDarkMode ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-4 dark:text-white">System Notifications</h2>
                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-bold dark:text-white">Low Stock Alerts</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Notify admins when items fall below minimum stock level.</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800 text-brown" />
                  </label>
                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-bold dark:text-white">Expiration Warnings</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Notify staff 7 days before an item expires.</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800 text-brown" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddUserModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 p-8 shadow-2xl border border-neutral-100 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold dark:text-white">Add New Account</h2>
                <button 
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Username (used to log in with password)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      placeholder="jane_doe"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Email (used for Google sign-in)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="jane@gmail.com"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Initial Role
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all appearance-none"
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl bg-brown/5 dark:bg-brown/10 p-4 border border-brown/10 dark:border-brown/20">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-brown mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-brown dark:text-brown/80">Temporary Password</p>
                      <p className="text-xs text-brown/60 dark:text-brown/40">The new user will use <code className="font-mono font-bold">password123</code> to log in for the first time.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-neutral-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
