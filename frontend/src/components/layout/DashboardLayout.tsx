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
  UserCheck,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Attendance', href: '/dashboard/attendance', icon: Calendar },
  { name: 'Fee Management', href: '/dashboard/fees', icon: CreditCard },
  { name: 'Messaging', href: '/dashboard/messaging', icon: MessageSquare },
  { name: 'Students', href: '/dashboard/students', icon: Users },
  { name: 'Batches', href: '/dashboard/batches', icon: GraduationCap },
  { name: 'Subjects', href: '/dashboard/subjects', icon: BookOpen },
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
            <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/usa-logo.png" alt="USA Institute Logo" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">USA Student</h1>
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
                    onClick={() => setSidebarOpen(false)}
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

        {/* Compact User section and logout - Fixed at bottom */}
        <div className="relative p-3 flex-shrink-0">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3">
            <div className="flex items-center space-x-3 mb-3">
              <div className="relative h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Crown className="h-5 w-5 text-white" />
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 border-2 border-slate-800 rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">USA Admin</p>
              
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-slate-300 bg-red-500/10 rounded-lg hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 transition-all duration-200 group"
            >
              <LogOut className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
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
              {/* User Profile */}
              <div className="flex items-center space-x-3 bg-gray-50 rounded-xl px-3 py-2 hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">USA Admin</p>
               </div>
                <div className="relative">
                  <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-sm"></div>
                </div>
              </div>
              {/* Notifications */}
              <button className="relative p-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 group">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">3</span>
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
      </div>
    </div>
  );
}
