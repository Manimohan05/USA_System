'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Menu,
  X,
  Home,
  Users,
  BookOpen,
  Calendar,
  MessageSquare,
  CreditCard,
  Settings,
  LogOut,
  GraduationCap,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Students', href: '/dashboard/students', icon: Users },
  { name: 'Batches', href: '/dashboard/batches', icon: GraduationCap },
  { name: 'Subjects', href: '/dashboard/subjects', icon: BookOpen },
  { name: 'Attendance', href: '/dashboard/attendance', icon: Calendar },
  { name: 'Messaging', href: '/dashboard/messaging', icon: MessageSquare },
  { name: 'Fee Management', href: '/dashboard/fees', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-slate-700/50 flex flex-col',
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
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">USA Attendance</h1>
              <p className="text-xs text-slate-400">Management System</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation Container */}
        <div className="flex-1 flex flex-col min-h-0">
          <nav className="flex-1 mt-8 px-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            <div className="space-y-2 pb-24">
              {navigationItems.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-200 hover:translate-x-1',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    )}
                    onClick={() => setSidebarOpen(false)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full opacity-80"></div>
                    )}
                    
                    <div className={cn(
                      'mr-4 p-2 rounded-xl transition-all duration-200',
                      isActive 
                        ? 'bg-white/20 shadow-lg' 
                        : 'bg-slate-700/50 group-hover:bg-white/10 group-hover:scale-110'
                    )}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    
                    <span className="flex-1">{item.name}</span>
                    
                    {/* Hover glow effect */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-purple-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        {/* User section and logout - Fixed at bottom */}
        <div className="relative p-4 flex-shrink-0">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="relative">
                <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-lg font-bold text-white">A</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">Admin User</p>
                <p className="text-xs text-slate-400">Administrator</p>
                <div className="flex items-center space-x-1 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-400">Online</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-slate-300 bg-slate-700/50 rounded-xl hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-slate-600/50 transition-all duration-200 group"
            >
              <LogOut className="mr-3 h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:pl-72">
        {/* Top header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200/50">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 group">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">3</span>
              </button>
              
              {/* User Profile */}
              <div className="flex items-center space-x-3 bg-gray-50 rounded-xl px-3 py-2 hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <div className="relative">
                  <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-sm font-bold text-white">A</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-3 sm:p-4 max-w-none">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
