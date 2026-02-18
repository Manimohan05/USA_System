'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import NotificationDropdown from '@/components/ui/NotificationDropdown';
import Footer from '@/components/layout/Footer';
import {
  Menu,
  X,
  Home,
  Users,
  BookOpen,
  Calendar,
  MessageSquare,
  CreditCard,
  LogOut,
  GraduationCap,
  Moon,
  Sun,
  Camera,
  Mail,
  User,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import axios from 'axios';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Attendance Management', href: '/dashboard/attendance', icon: Calendar },
  { name: 'Fee Management', href: '/dashboard/fees', icon: CreditCard },
  { name: 'Messaging', href: '/dashboard/messaging', icon: MessageSquare },
  { name: 'Student Management', href: '/dashboard/students', icon: Users },
  { name: 'Batch Management', href: '/dashboard/batches', icon: GraduationCap },
  { name: 'Subject Management', href: '/dashboard/subjects', icon: BookOpen },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const DEFAULT_PROFILE_IMAGE = '/usa-logo.png';
  const PROFILE_EMAIL = 'universalscienceacademyjaffna@gmail.com';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(DEFAULT_PROFILE_IMAGE);
  const [profileUsername, setProfileUsername] = useState('USA Admin');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [updatingProfileImage, setUpdatingProfileImage] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (document.documentElement.classList.contains('dark-mode')) return true;
    return localStorage.getItem('usa-theme') === 'dark';
  });
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('usa-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('usa-theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get<{ username: string; profilePicture: string | null }>('/auth/profile');
        if (response.data?.username) {
          setProfileUsername(response.data.username);
        }
        if (response.data?.profilePicture) {
          setProfileImage(response.data.profilePicture);
        }
      } catch {
        setProfileUsername('USA Admin');
      }
    };

    loadProfile();
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,100}$/;

  const resetPasswordFormState = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  };

  const openMenuSidebar = () => {
    setProfileSidebarOpen(false);
    setSidebarOpen(!sidebarOpen);
  };

  const openProfileSidebar = () => {
    setSidebarOpen(false);
    setProfileSidebarOpen(!profileSidebarOpen);
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Please fill all password fields.');
      return;
    }

    if (!passwordPolicyRegex.test(newPassword)) {
      setPasswordError('New password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and re-entered password do not match.');
      return;
    }

    try {
      setUpdatingPassword(true);
      const response = await api.post<{ message: string }>('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmNewPassword,
      });

      setPasswordSuccess(response.data?.message || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: unknown) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setPasswordError(error.response?.data?.message || 'Failed to update password. Please try again.');
      } else {
        setPasswordError('Failed to update password. Please try again.');
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  const triggerProfileImagePicker = () => {
    setProfileError('');
    setProfileSuccess('');
    profileFileInputRef.current?.click();
  };

  const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setProfileError('Please select a valid image file.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      setProfileError('Profile picture must be 2MB or smaller.');
      event.target.value = '';
      return;
    }

    try {
      setUpdatingProfileImage(true);
      setProfileError('');
      setProfileSuccess('');

      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(selectedFile);
      });

      await api.put<{ message?: string }>('/auth/profile-picture', {
        profilePicture: imageDataUrl,
      });

      setProfileImage(imageDataUrl || DEFAULT_PROFILE_IMAGE);
      setProfileSuccess('Profile picture updated successfully.');
    } catch {
      setProfileError('Failed to update profile picture. Please try again.');
    } finally {
      setUpdatingProfileImage(false);
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 flex">
      {/* Mobile sidebar overlay */}
      {(sidebarOpen || profileSidebarOpen) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setSidebarOpen(false);
            setProfileSidebarOpen(false);
          }}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-16 bottom-0 left-0 z-25 w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-slate-700/50 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 rounded-full translate-y-12 -translate-x-12"></div>
        
        {/* Header - Fixed */}
        <div className="relative flex items-center justify-between h-20 px-6 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <Image src="/usa-logo.png" alt="USA Institute Logo" width={32} height={32} className="h-8 w-8 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">USA Student</h1>
              <p className="text-xs text-slate-400">Management System</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Container - No Scroll */}
        <div className="flex-1 flex flex-col min-h-0">
          <nav className="flex-1 mt-6 px-4">
            <div className="space-y-1">
              {navigationItems.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:translate-x-1',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    )}
                    onClick={() => {
                      // Close sidebar only on mobile
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full opacity-80"></div>
                    )}
                    
                    <div className={cn(
                      'mr-3 p-1.5 rounded-lg transition-all duration-200',
                      isActive 
                        ? 'bg-white/20 shadow-lg' 
                        : 'bg-slate-700/50 group-hover:bg-white/10 group-hover:scale-110'
                    )}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    
                    <span className="flex-1">{item.name}</span>
                    
                    {/* Hover glow effect */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-purple-500/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

      </div>

      {/* Right Profile Sidebar */}
      <div
        className={cn(
          'fixed top-16 bottom-0 right-0 z-25 w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-700/50 flex flex-col',
          profileSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -translate-y-16 -translate-x-16"></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 rounded-full translate-y-12 translate-x-12"></div>

        <div className="relative flex items-center justify-between h-20 px-6 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Profile</h2>
          <button
            onClick={() => {
              setProfileSidebarOpen(false);
              setShowPasswordForm(false);
              resetPasswordFormState();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-20 w-20 overflow-visible">
                <div className="h-20 w-20 rounded-full overflow-hidden border border-slate-600 bg-white shadow-lg">
                  <Image src={profileImage || DEFAULT_PROFILE_IMAGE} alt="Profile" width={80} height={80} className="h-full w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={triggerProfileImagePicker}
                  disabled={updatingProfileImage}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-indigo-600 border-2 border-slate-800 flex items-center justify-center text-white shadow-lg"
                  title="Update profile picture"
                  aria-label="Update profile picture"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={profileFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileImageChange}
                />
              </div>

              <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                Active
              </div>

              <div className="mt-4 w-full space-y-2 text-left">
                <div className="rounded-lg bg-slate-900/50 border border-slate-700/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Username</p>
                  <div className="flex items-center gap-2 text-slate-100 text-sm font-medium">
                    <User className="h-4 w-4 text-indigo-300" />
                    <span>{profileUsername || 'USA Admin'}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/50 border border-slate-700/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Email</p>
                  <div className="flex items-start gap-2 text-slate-100 text-sm break-all leading-relaxed">
                    <Mail className="h-4 w-4 mt-0.5 text-indigo-300" />
                    <span>{PROFILE_EMAIL}</span>
                  </div>
                </div>
              </div>

              {profileError && (
                <p className="mt-3 w-full text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-left">{profileError}</p>
              )}

              {profileSuccess && (
                <p className="mt-3 w-full text-xs text-green-300 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-left">{profileSuccess}</p>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(!showPasswordForm);
                setPasswordError('');
                setPasswordSuccess('');
              }}
              className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-slate-100 bg-indigo-600/80 rounded-lg hover:bg-indigo-600 transition-all duration-200"
            >
              <Lock className="mr-2 h-4 w-4" />
              Update Password
            </button>

            {showPasswordForm && (
              <form onSubmit={handleUpdatePassword} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Create New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Minimum 8 characters with uppercase, lowercase, number, and special character.
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Re-enter New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {passwordError && (
                  <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{passwordError}</p>
                )}

                {passwordSuccess && (
                  <p className="text-xs text-green-300 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">{passwordSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-60"
                >
                  {updatingPassword ? 'Updating...' : 'Save New Password'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="relative p-4 border-t border-slate-700/50 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-slate-300 bg-red-500/10 rounded-lg hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 transition-all duration-200 group"
          >
            <LogOut className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top header */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200/50">
          <div className="relative flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={openMenuSidebar}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 shadow-sm border border-gray-200 bg-white"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="pl-12 sm:pl-14" aria-hidden="true">
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="relative p-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              {/* Notifications */}
              <NotificationDropdown />
              {/* User Icon - Right corner */}
              <button
                type="button"
                onClick={openProfileSidebar}
                className="relative h-10 w-10 rounded-full overflow-hidden border border-gray-200 bg-white shadow-lg hover:scale-110 transition-transform duration-200 cursor-pointer"
                title="Open profile"
                aria-label="Open profile"
              >
                <Image src={profileImage || DEFAULT_PROFILE_IMAGE} alt="Profile" width={40} height={40} className="h-full w-full object-cover" />
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-sm"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Page content - Scrollable */}
        <main className="flex-1 p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
