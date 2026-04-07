import React, { useState } from 'react';
import { User, Shield, ShieldCheck, Mail, Plus, Trash2, Search, UserPlus, Settings, MapPin, Building2, X, Moon, Sun, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../contexts/InventoryContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { UserRole, User as UserType } from '../types';

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const { locations, addLocation, deleteLocation } = useInventory();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'users' | 'locations' | 'general'>('users');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' as UserRole });
  
  const [users, setUsers] = useState<UserType[]>([
    { id: '1', name: 'Alex Admin', email: 'alex@university.edu', role: 'admin', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
    { id: '2', name: 'Sarah Staff', email: 'sarah@university.edu', role: 'user', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { id: '3', name: 'Mike Volunteer', email: 'mike@university.edu', role: 'user', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
    { id: '4', name: 'Jane Guest', email: 'jane@university.edu', role: 'guest', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [newLocationName, setNewLocationName] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleRole = (userId: string) => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        const newRole: UserRole = u.role === 'admin' ? 'user' : 'admin';
        return { ...u, role: newRole };
      }
      return u;
    }));
  };

  const deleteUser = (userId: string) => {
    if (userId === currentUser?.id) return;
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const userToAdd: UserType = {
      id: Math.random().toString(36).substr(2, 9),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.email}`,
    };
    setUsers([...users, userToAdd]);
    setIsAddUserModalOpen(false);
    setNewUser({ name: '', email: '', role: 'user' });
    alert(`User created! Temporary password: password123`);
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    addLocation(newLocationName.trim());
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
                ? "bg-orange-50 dark:bg-orange-900/20 font-bold text-orange-600" 
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
                ? "bg-orange-50 dark:bg-orange-900/20 font-bold text-orange-600" 
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
                ? "bg-orange-50 dark:bg-orange-900/20 font-bold text-orange-600" 
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
                      className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <img src={u.avatarUrl} alt={u.name} className="h-10 w-10 rounded-full border border-neutral-200 dark:border-neutral-700" />
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">{u.name} {u.id === currentUser?.id && <span className="text-xs font-normal text-neutral-400 ml-1">(You)</span>}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {currentUser?.role === 'admin' ? (
                          <button
                            onClick={() => toggleRole(u.id)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all",
                              u.role === 'admin' 
                                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50" 
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            )}
                          >
                            {u.role === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                            {u.role.toUpperCase()}
                          </button>
                        ) : (
                          <div className={cn(
                            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                            u.role === 'admin' 
                              ? "bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400" 
                              : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400"
                          )}>
                            {u.role === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                            {u.role.toUpperCase()}
                          </div>
                        )}
                        
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => deleteUser(u.id)}
                            disabled={u.id === currentUser?.id}
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
                  <h2 className="text-lg font-bold mb-4 dark:text-white">Add New Location</h2>
                  <form onSubmit={handleAddLocation} className="flex gap-3">
                    <input
                      type="text"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="Location name (e.g. Warehouse B)"
                      className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={!newLocationName.trim()}
                      className="rounded-xl bg-neutral-900 dark:bg-white px-6 py-2 text-sm font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 transition-all"
                    >
                      Add Location
                    </button>
                  </form>
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
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => deleteLocation(loc.id)}
                            className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
                        isDarkMode ? "bg-orange-600" : "bg-neutral-200"
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
                    <input type="checkbox" defaultChecked className="h-5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800 text-orange-600" />
                  </label>
                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-bold dark:text-white">Expiration Warnings</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Notify staff 7 days before an item expires.</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800 text-orange-600" />
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
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="john@university.edu"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white transition-all"
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
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white transition-all appearance-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Administrator</option>
                      <option value="guest">Guest</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 p-4 border border-orange-100 dark:border-orange-900/30">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-orange-800 dark:text-orange-300">Temporary Password</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">The new user will use <code className="font-mono font-bold">password123</code> to log in for the first time.</p>
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
