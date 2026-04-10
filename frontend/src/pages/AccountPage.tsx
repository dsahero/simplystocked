import React, { useState, useRef } from 'react';
import { User, Mail, Lock, Camera, Save, Shield, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export default function AccountPage() {
  const { user, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    
    if (user?.role === 'admin' || name === user?.name) {
      updateProfile({ name });
      setStatus({ type: 'success', message: 'Profile updated successfully!' });
    } else {
      setStatus({ type: 'error', message: 'Only administrators can change their display name.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setStatus({ type: 'success', message: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to change password.' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      setIsUploading(true);
      setStatus(null);
      try {
        // Store avatar as data URL in localStorage (no cloud storage)
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result as string;
          await updateProfile({ avatarUrl: dataUrl });
          setStatus({ type: 'success', message: 'Profile picture updated!' });
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Upload error:', error);
        setStatus({ type: 'error', message: 'Failed to update avatar.' });
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Account Settings</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Manage your personal information and security preferences.</p>
      </div>

      {status && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl border",
            status.type === 'success' 
              ? "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400" 
              : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400"
          )}
        >
          {status.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <p className="text-sm font-medium">{status.message}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Picture Section */}
        <div className="md:col-span-1">
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm text-center">
            <div className="relative inline-block">
              <div className="relative">
                <img
                  src={user?.avatarUrl || '/icons/default-pfp.jpg'}
                  alt="Profile"
                  className={cn(
                    "h-32 w-32 rounded-full border-4 border-neutral-100 dark:border-neutral-800 object-cover transition-opacity",
                    isUploading && "opacity-50"
                  )}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
                  }}
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-brown" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-brown text-white shadow-lg hover:bg-brown-dark transition-all disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="mt-4">
              <h2 className="font-bold text-lg dark:text-white">{user?.name}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{user?.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brown/10 dark:bg-brown/20 px-3 py-1 text-xs font-bold text-brown dark:text-brown/80">
                <Shield className="h-3 w-3" />
                {user?.role.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Info Section */}
        <div className="md:col-span-2 space-y-8">
          {/* Profile Information */}
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 dark:text-white">Profile Information</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={user?.role !== 'admin'}
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 disabled:opacity-50 dark:text-white transition-all"
                    />
                  </div>
                  {user?.role !== 'admin' && (
                    <p className="mt-1 text-xs text-neutral-500">Only administrators can change display names.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="email"
                      value={user?.email}
                      disabled
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm opacity-50 cursor-not-allowed dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-6 py-2 text-sm font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Security Section */}
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold dark:text-white">Security</h3>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPasswords ? 'Hide' : 'Show'}
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-brown px-6 py-2 text-sm font-semibold text-white hover:bg-brown-dark shadow-lg shadow-brown/20 dark:shadow-brown/40 transition-all"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
