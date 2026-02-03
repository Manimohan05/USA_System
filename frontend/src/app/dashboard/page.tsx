'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Users, BookOpen, Calendar, TrendingUp, AlertCircle, RefreshCw, Clock, Play, GraduationCap, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import type { StudentDto, BatchDto, SubjectDto, AttendanceSessionDto } from '@/types';

interface DashboardStats {
  totalStudents: number;
  totalBatches: number;
  totalSubjects: number;
  todayAttendance: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalBatches: 0,
    totalSubjects: 0,
    todayAttendance: 0,
  });
  const [activeSessions, setActiveSessions] = useState<AttendanceSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to check if session has expired (60 minutes from creation)
  const isSessionExpired = (session: AttendanceSessionDto): boolean => {
    try {
      const sessionCreatedAt = new Date(session.createdAt).getTime();
      const now = Date.now();
      const sessionDuration = 60 * 60 * 1000; // 60 minutes in milliseconds
      const elapsed = now - sessionCreatedAt;
      const isExpired = elapsed > sessionDuration;
      
      console.log(`Dashboard - Session ${session.id} (Batch ${session.batchYear} ${session.subjectName}) - Elapsed: ${Math.round(elapsed / 60000)}min, Expired: ${isExpired}`);
      
      return isExpired;
    } catch (error) {
      console.error('Dashboard - Error checking session expiration:', error, session);
      return false;
    }
  };

  // Filter sessions to exclude expired ones
  const getValidSessions = (sessions: AttendanceSessionDto[]): AttendanceSessionDto[] => {
    const validSessions = sessions.filter(session => !isSessionExpired(session));
    
    if (validSessions.length !== sessions.length) {
      console.log(`Dashboard - Filtered ${sessions.length - validSessions.length} expired sessions out of ${sessions.length} total`);
    }
    
    return validSessions;
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Periodically check and remove expired sessions on dashboard
    const checkExpiredSessions = () => {
      setActiveSessions(prevSessions => {
        if (prevSessions.length === 0) return prevSessions;
        
        const validSessions = getValidSessions(prevSessions);
        if (validSessions.length !== prevSessions.length) {
          console.log('Dashboard - Removed expired sessions:', prevSessions.length - validSessions.length);
          // Update stats as well
          setStats(prevStats => ({
            ...prevStats,
            todayAttendance: validSessions.length
          }));
          return validSessions;
        }
        return prevSessions;
      });
    };
    
    // Check immediately on mount
    setTimeout(checkExpiredSessions, 2000);
    
    // Then check every 30 seconds
    const interval = setInterval(checkExpiredSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setError(null);
      } else {
        setLoading(true);
      }

      const [studentsRes, batchesRes, subjectsRes, sessionsRes] = await Promise.all([
        api.get<StudentDto[]>('/admin/students/all'),
        api.get<BatchDto[]>('/admin/institute/batches'),
        api.get<SubjectDto[]>('/admin/institute/subjects'),
        api.get<AttendanceSessionDto[]>('/admin/attendance/sessions/today'),
      ]);

      // Filter out expired sessions before setting state
      const validSessions = getValidSessions(sessionsRes.data);
      console.log('Dashboard - Raw sessions from backend:', sessionsRes.data.length);
      console.log('Dashboard - Valid (non-expired) sessions:', validSessions.length);

      setStats({
        totalStudents: studentsRes.data.length,
        totalBatches: batchesRes.data.length,
        totalSubjects: subjectsRes.data.length,
        todayAttendance: validSessions.length, // Use filtered sessions count
      });
      
      setActiveSessions(validSessions);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const statCards = [
    {
      name: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      href: '/dashboard/students',
      description: 'Enrolled students',
    },
    {
      name: 'Active Batches',
      value: stats.totalBatches,
      icon: BookOpen,
      gradient: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      href: '/dashboard/batches',
      description: 'Current batches',
    },
    {
      name: 'Subjects',
      value: stats.totalSubjects,
      icon: Calendar,
      gradient: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      href: '/dashboard/subjects',
      description: 'Available subjects',
    },
    {
      name: "Today's Attendance",
      value: stats.todayAttendance,
      icon: TrendingUp,
      gradient: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      href: '/dashboard/attendance',
      description: 'Sessions active',
    },
  ];

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center min-h-96">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Dashboard</h3>
              <p className="text-gray-600">Fetching your latest data...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center min-h-96">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Oops! Something went wrong</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                {refreshing ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="-ml-1 mr-2 h-5 w-5" />
                    Try Again
                  </>
                )}
              </button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Hero Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative px-8 py-12">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">Dashboard</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <p className="text-white/90">USA Attendance Management System</p>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-white font-medium"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.name}
                  href={card.href}
                  className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer block border border-gray-100"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Background gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                  
                  {/* Floating background elements */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full -translate-y-10 translate-x-10 opacity-30"></div>
                  
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`${card.bgColor} p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-7 w-7 ${card.textColor}`} />
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform duration-300">{card.value}</p>
                        <p className={`text-sm font-medium ${card.textColor} mt-1`}>{card.description}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">{card.name}</h3>
                      <div className={`h-1 bg-gradient-to-r ${card.gradient} rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                    </div>
                  </div>
                  
                  {/* Hover arrow indicator */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className={`w-6 h-6 ${card.bgColor} rounded-full flex items-center justify-center`}>
                      <TrendingUp className={`h-3 w-3 ${card.textColor}`} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-100 px-8 py-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Active Attendance Sessions</h2>
                      <p className="text-sm text-gray-600">Open sessions in new tabs for multi-class management</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        const activeOrRecoverableSessions = activeSessions.filter(session => session.isActive || session.canReactivate);
                        activeOrRecoverableSessions.forEach(session => {
                          window.open(`/dashboard/attendance/session/${session.id}`, '_blank');
                        });
                      }}
                      className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm border border-emerald-200 rounded-xl hover:bg-white hover:border-emerald-300 transition-all duration-200 text-emerald-700 font-medium text-sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open All Sessions
                    </button>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-emerald-700">{activeSessions.filter(s => s.isActive).length} Active</span>
                      {activeSessions.filter(s => s.canReactivate).length > 0 && (
                        <>
                          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-red-700">{activeSessions.filter(s => s.canReactivate).length} Recoverable</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeSessions.map((session) => {
                    const isRecoverable = !session.isActive && session.canReactivate;
                    const isClosed = session.isClosed;
                    const cardBorderClass = session.isActive 
                      ? 'border-emerald-200 hover:border-emerald-400' 
                      : isRecoverable 
                      ? 'border-red-200 hover:border-red-400' 
                      : isClosed
                      ? 'border-yellow-200 hover:border-yellow-400'
                      : 'border-gray-200 hover:border-gray-400';
                    const gradientClass = session.isActive 
                      ? 'from-white to-emerald-50/30' 
                      : isRecoverable 
                      ? 'from-white to-red-50/30'
                      : isClosed
                      ? 'from-white to-yellow-50/30'
                      : 'from-white to-gray-50/30';
                    
                    return (
                    <div
                      key={session.id}
                      className={`group relative overflow-hidden p-6 border-2 ${cardBorderClass} rounded-2xl bg-gradient-to-br ${gradientClass} hover:shadow-lg transition-all duration-300`}
                    >
                      {/* Background decoration */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100 rounded-full -translate-y-10 translate-x-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
                      
                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform duration-200 ${
                              session.isActive ? 'bg-gradient-to-br from-emerald-500 to-teal-500' :
                              isRecoverable ? 'bg-gradient-to-br from-red-500 to-rose-500' :
                              isClosed ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                              'bg-gradient-to-br from-gray-500 to-gray-600'
                            }`}>
                              <GraduationCap className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                Batch {session.batchYear}
                              </h3>
                              <p className="text-sm font-medium text-gray-600">{session.subjectName}</p>
                            </div>
                          </div>
                          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${
                            session.isActive ? 'bg-emerald-100' :
                            isRecoverable ? 'bg-red-100' :
                            isClosed ? 'bg-yellow-100' :
                            'bg-gray-100'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              session.isActive ? 'bg-emerald-500 animate-pulse' :
                              isRecoverable ? 'bg-red-500 animate-pulse' :
                              isClosed ? 'bg-yellow-500' :
                              'bg-gray-500'
                            }`}></div>
                            <span className={`text-xs font-semibold ${
                              session.isActive ? 'text-emerald-700' :
                              isRecoverable ? 'text-red-700' :
                              isClosed ? 'text-yellow-700' :
                              'text-gray-700'
                            }`}>
                              {session.isActive ? 'ACTIVE' :
                               isRecoverable ? 'RECOVER' :
                               isClosed ? 'CLOSED' :
                               'ENDED'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(session.sessionDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(session.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Session ID: {session.id}</span>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-2">
                              <button
                                onClick={() => window.open(`/dashboard/attendance/session/${session.id}`, '_blank')}
                                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                                  session.isActive ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600' :
                                  isRecoverable ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 animate-pulse' :
                                  isClosed ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600' :
                                  'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700'
                                }`}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                {isRecoverable ? 'RECOVER' : session.isActive ? 'Open Session' : isClosed ? 'REOPEN' : 'View Session'}
                              </button>
                              <Link
                                href={`/dashboard/attendance?sessionId=${session.id}&tab=mark`}
                                className="flex items-center justify-center px-4 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-200 text-sm font-medium"
                                title="Quick mark attendance"
                              >
                                <Play className="h-4 w-4" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );})}
                </div>
                
                {/* Multi-Session Tips */}
                <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <ExternalLink className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-900 mb-1">💡 Multi-Session Tip</h4>
                      <p className="text-sm text-emerald-700">
                        Use "Open All Sessions" to quickly access all active sessions in separate tabs. 
                        Perfect for managing multiple concurrent classes without switching contexts!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                  <p className="text-sm text-gray-600">Streamline your daily tasks</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link
                  href="/dashboard/students/new"
                  className="group relative overflow-hidden p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4 group-hover:bg-blue-200 transition-colors duration-300 group-hover:scale-110">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-700">Add New Student</h3>
                    <p className="text-sm text-gray-600 group-hover:text-blue-600">Register new students to the system</p>
                  </div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full -translate-y-10 translate-x-10 opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                </Link>
                
                <Link
                  href="/dashboard/attendance"
                  className="group relative overflow-hidden p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4 group-hover:bg-emerald-200 transition-colors duration-300 group-hover:scale-110">
                      <Calendar className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-700">Mark Attendance</h3>
                    <p className="text-sm text-gray-600 group-hover:text-emerald-600">Track student attendance sessions</p>
                  </div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100 rounded-full -translate-y-10 translate-x-10 opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                </Link>
                
                <Link
                  href="/dashboard/messaging"
                  className="group relative overflow-hidden p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4 group-hover:bg-purple-200 transition-colors duration-300 group-hover:scale-110">
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-700">Send Message</h3>
                    <p className="text-sm text-gray-600 group-hover:text-purple-600">Communicate with parents and students</p>
                  </div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-purple-100 rounded-full -translate-y-10 translate-x-10 opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
