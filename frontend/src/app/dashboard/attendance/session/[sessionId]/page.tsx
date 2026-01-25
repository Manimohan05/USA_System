'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Search, 
  Pause, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  User,
  ArrowLeft,
  ExternalLink,
  Play,
  RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { 
  AttendanceMarkByIndexRequest,
  AttendanceSessionDto,
  AttendanceValidationResponseDto,
  SessionAttendanceStatusDto,
} from '@/types';

export default function AttendanceSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<AttendanceSessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mark Attendance State
  const [indexInput, setIndexInput] = useState('');
  const [marking, setMarking] = useState(false);
  const [validationResponse, setValidationResponse] = useState<AttendanceValidationResponseDto | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionAttendanceStatusDto | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  
  // Countdown Timer State
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
  const [isAutoEnding, setIsAutoEnding] = useState(false);
  
  // Success overlay state
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Countdown Timer Effect
  useEffect(() => {
    if (!session || !session.isActive) {
      setTimeRemaining(0);
      return;
    }

    // Calculate remaining time (60 minutes from creation)
    const sessionCreatedAt = new Date(session.createdAt).getTime();
    const now = Date.now();
    const sessionDuration = 60 * 60 * 1000; // 60 minutes in milliseconds
    const elapsed = now - sessionCreatedAt;
    const remaining = Math.max(0, sessionDuration - elapsed);
    
    setTimeRemaining(Math.floor(remaining / 1000)); // Convert to seconds

    // Set up countdown interval
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1);
        
        // Auto-end session when countdown reaches 0
        if (newTime === 0 && session.isActive && !isAutoEnding) {
          setIsAutoEnding(true);
          autoEndSession();
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session, isAutoEnding]);

  // Format countdown time display
  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-end session when countdown reaches 0
  const autoEndSession = async () => {
    if (!session) return;
    
    try {
      console.log('Auto-ending session after 60 minutes:', sessionId);
      await api.put(`/admin/attendance/sessions/${sessionId}/deactivate`);
      
      console.log('Session auto-ended successfully, refreshing session data');
      await fetchSessionData();
      
      alert(`⏰ Session Auto-Ended\n\nThe session has been automatically ended after 60 minutes.\n\n📱 SMS notifications have been sent to parents of absent students with actual attendance times.`);
    } catch (error: any) {
      console.error('Failed to auto-end session:', error);
    } finally {
      setIsAutoEnding(false);
    }
  };

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [sessionRes, statusRes] = await Promise.all([
        api.get<AttendanceSessionDto>(`/admin/attendance/sessions/${sessionId}`),
        api.get<SessionAttendanceStatusDto>(`/attendance/sessions/${sessionId}/status`)
      ]);
      
      setSession(sessionRes.data);
      setSessionStatus(statusRes.data);
    } catch (error: any) {
      console.error('Failed to fetch session data:', error);
      setError(error.response?.data?.message || 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionStatus = async () => {
    try {
      setLoadingStatus(true);
      const response = await api.get<SessionAttendanceStatusDto>(`/attendance/sessions/${sessionId}/status`);
      setSessionStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch session status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleAttendanceMark = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      setValidationResponse({
        success: false,
        message: 'Session not loaded. Please refresh the page.',
        errorCode: 'NO_SESSION'
      });
      return;
    }

    if (!indexInput.trim()) {
      setValidationResponse({
        success: false,
        message: 'Please enter your student ID or index number.',
        errorCode: 'EMPTY_INPUT'
      });
      return;
    }

    setMarking(true);
    setValidationResponse(null);

    try {
      const request: AttendanceMarkByIndexRequest = {
        indexNumber: indexInput.trim().toUpperCase(),
        sessionId: session.id,
      };
      
      const response = await api.post<AttendanceValidationResponseDto>('/attendance/mark-by-index', request);
      setValidationResponse(response.data);
      
      if (response.data.success) {
        setIndexInput('');
        // Refresh session status to show the new attendance
        await fetchSessionStatus();
        
        // Auto-clear success message after 5 seconds
        setTimeout(() => setValidationResponse(null), 5000);
      }
    } catch (error: any) {
      console.error('Failed to mark attendance:', error);
      
      // Handle server validation response in error case
      if (error.response?.data && typeof error.response.data === 'object' && 'success' in error.response.data) {
        setValidationResponse(error.response.data as AttendanceValidationResponseDto);
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to mark attendance. Please try again.';
        setValidationResponse({
          success: false,
          message: errorMessage,
          errorCode: 'NETWORK_ERROR'
        });
      }
    } finally {
      setMarking(false);
    }
  };

  // Close session temporarily (can be reopened)
  const closeSession = async () => {
    if (!session) return;
    
    const sessionInfo = `Batch ${session.batchYear} - ${session.subjectName} (${formatDate(session.sessionDate)})`;

    try {
      console.log('Attempting to close session temporarily:', sessionId);
      await api.put(`/admin/attendance/sessions/${sessionId}/close`);
      
      console.log('Session closed successfully');
      
      // Show success overlay instead of alert
      setSuccessTitle(`${sessionInfo} - Successfully Closed!`);
      setSuccessMessage('The session has been paused temporarily and can be reopened from the attendance page.');
      setShowSuccessOverlay(true);
      
    } catch (error: any) {
      console.error('Failed to close session:', error);
      alert(`❌ Failed to Close Session\n\nError: ${error.response?.data?.message || 'Please try again.'}`); 
    }
  };

  // Reactivate session (within 10-minute recovery window)
  const reactivateSession = async () => {
    if (!session) return;
    
    const sessionInfo = `Batch ${session.batchYear} - ${session.subjectName} (${formatDate(session.sessionDate)})`;
    
    if (!confirm(`🔄 Reactivate Attendance Session?\n\nSession: ${sessionInfo}\n\n📋 This will:\n• Reopen the session for attendance marking\n• Allow students to mark attendance again\n• Extend the session time\n\n⚠️ Note: This is only available within 10 minutes of ending.\n\nAre you sure you want to reactivate this session?`)) {
      return;
    }

    try {
      console.log('Attempting to reactivate session:', sessionId);
      await api.put(`/admin/attendance/sessions/${sessionId}/reactivate`);
      
      console.log('Session reactivated successfully, refreshing session data');
      await fetchSessionData();
      
      alert(`✅ Session Reactivated!\n\nSession: ${sessionInfo}\n\n📋 The session is now active again and students can mark attendance.`);
    } catch (error: any) {
      console.error('Failed to reactivate session:', error);
      alert(`❌ Failed to Reactivate Session\n\nError: ${error.response?.data?.message || 'Please try again. The 10-minute window may have expired.'}`);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading session data...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !session) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="max-w-md mx-auto mt-20">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Session Not Found</h2>
              <p className="text-gray-600 mb-6">{error || 'The requested attendance session could not be found.'}</p>
              <button
                onClick={() => router.push('/dashboard/attendance')}
                className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors mx-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Attendance
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
          {/* Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative px-8 py-12">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push('/dashboard/attendance')}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="h-6 w-6 text-white" />
                  </button>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">Attendance Session</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${session.isActive ? 'bg-green-400' : session.isClosed ? 'bg-yellow-400' : session.canReactivate ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`}></div>
                        <p className="text-white/90">
                          {session.isActive ? 'Active Session' : 
                           session.isClosed ? 'Session Closed (Temporary)' :
                           session.canReactivate ? 'Session Ended - Can Reactivate (10 min)' :
                           'Session Ended'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={fetchSessionData}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  
                  {/* Session Management Buttons */}
                  {session.isActive && (
                    <>
                      {/* Countdown Timer */}
                      <div className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
                        <Clock className="h-4 w-4 mr-2 text-white" />
                        <span className={`text-white font-mono font-bold ${
                          timeRemaining <= 300 ? 'animate-pulse text-red-200' : // Last 5 minutes
                          timeRemaining <= 600 ? 'text-yellow-200' : // Last 10 minutes
                          'text-white'
                        }`}>
                          {formatCountdown(timeRemaining)}
                        </span>
                      </div>
                      
                      <button
                        onClick={closeSession}
                        className="flex items-center px-4 py-2 bg-yellow-500/80 hover:bg-yellow-500 text-white rounded-xl transition-colors"
                        title="Temporarily close session (can be reopened) - NO SMS sent"
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Close Session
                      </button>
                    </>
                  )}
                  
                  {/* Notice for ended sessions */}
                  {!session.isActive && !session.canReactivate && (
                    <div className="flex items-center px-4 py-2 bg-gray-100 rounded-xl">
                      <XCircle className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-600">Session ended - Use dashboard to reactivate</span>
                    </div>
                  )}
                  
                  {/* Reactivate button for accidentally ended sessions (10-minute window) */}
                  {!session.isActive && session.canReactivate && (
                    <button
                      onClick={reactivateSession}
                      className="flex items-center px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-colors animate-pulse"
                      title="Reactivate session within 10-minute recovery window"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reactivate (10 min left)
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white/80">
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-5 w-5" />
                  <div>
                    <p className="text-sm text-white/60">Batch</p>
                    <p className="font-semibold">Batch {session.batchYear}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5" />
                  <div>
                    <p className="text-sm text-white/60">Subject</p>
                    <p className="font-semibold">{session.subjectName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5" />
                  <div>
                    <p className="text-sm text-white/60">Date</p>
                    <p className="font-semibold">{formatDate(session.sessionDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Mark Attendance Section */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-6 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Mark Attendance</h2>
                </div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  session.isActive 
                    ? 'bg-green-100 text-green-800'
                    : session.isClosed
                    ? 'bg-yellow-100 text-yellow-800' 
                    : session.canReactivate
                    ? 'bg-red-100 text-red-800 animate-pulse'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {session.isActive ? 'Active' : 
                   session.isClosed ? 'Closed' :
                   session.canReactivate ? 'Can Reactivate' :
                   'Ended'}
                </span>
              </div>

              <div className="p-6">
                {session.isActive ? (
                  <form onSubmit={handleAttendanceMark} className="space-y-6">
                    <div className="relative">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                        <User className="h-4 w-4 text-indigo-500" />
                        <span>Student ID / Index Number</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={indexInput}
                          onChange={(e) => setIndexInput(e.target.value)}
                          placeholder="Enter student ID or index number here"
                          className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                          disabled={marking}
                          autoComplete="off"
                        />
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={marking || !indexInput.trim()}
                      className="w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-xl active:scale-95"
                    >
                      {marking ? (
                        <>
                          <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                          <span className="animate-pulse">Marking Attendance...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-6 w-6 mr-3" />
                          <span>Mark Present</span>
                        </>
                      )}
                    </button>

                    {/* Countdown Warning */}
                    {timeRemaining <= 600 && timeRemaining > 0 && (
                      <div className={`p-4 rounded-xl border-l-4 ${
                        timeRemaining <= 300 
                          ? 'bg-red-50 border-red-500 text-red-800'
                          : 'bg-yellow-50 border-yellow-500 text-yellow-800'
                      }`}>
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 mr-2" />
                          <p className="font-medium">
                            {timeRemaining <= 300 
                              ? `⚠️ Session will end automatically in ${formatCountdown(timeRemaining)}!`
                              : `⏰ Session will end in ${formatCountdown(timeRemaining)}`
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Validation Response */}
                    {validationResponse && (
                      <div className={`p-4 rounded-xl border-l-4 ${
                        validationResponse.success
                          ? 'bg-green-50 border-green-500 text-green-800'
                          : 'bg-red-50 border-red-500 text-red-800'
                      }`}>
                        <div className="flex items-center">
                          {validationResponse.success ? (
                            <CheckCircle className="h-5 w-5 mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 mr-2" />
                          )}
                          <p className="font-medium">{validationResponse.message}</p>
                        </div>
                        {validationResponse.student && (
                          <div className="mt-2 text-sm opacity-90">
                            <p>Student: {validationResponse.student.fullName}</p>
                            <p>ID: {validationResponse.student.studentIdCode}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                ) : session.isClosed ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Pause className="h-8 w-8 text-yellow-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Temporarily Closed</h3>
                    <p className="text-gray-600 mb-4">This session has been temporarily closed by an administrator. Please use the attendance page to reopen it.</p>
                  </div>
                ) : session.canReactivate ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RefreshCw className="h-8 w-8 text-red-500 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Accidentally Ended</h3>
                    <p className="text-gray-600 mb-4">This session was ended but can still be reactivated within the 10-minute recovery window.</p>
                    <div className="space-y-3">
                      <button
                        onClick={reactivateSession}
                        className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium animate-pulse block mx-auto"
                      >
                        <RefreshCw className="h-4 w-4 inline mr-2" />
                        REACTIVATE SESSION
                      </button>
                      <p className="text-sm text-red-600 font-medium">⏰ Recovery window expires 10 minutes after ending</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <XCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Ended</h3>
                    <p className="text-gray-600">This attendance session has been permanently ended and is no longer accepting attendance marks.</p>
                    {session.endedAt && (
                      <p className="text-sm text-gray-500 mt-2">Ended on {formatDate(session.endedAt, 'datetime')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Session Status Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-6 bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Session Status</h2>
                </div>
                <button
                  onClick={fetchSessionStatus}
                  disabled={loadingStatus}
                  className="flex items-center px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loadingStatus ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="p-6">
                {sessionStatus ? (
                  <div className="space-y-6">
                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-900">{sessionStatus.presentCount}</p>
                            <p className="text-sm text-green-600">Present</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <XCircle className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-red-900">{sessionStatus.totalEnrolledStudents - sessionStatus.presentCount}</p>
                            <p className="text-sm text-red-600">Absent</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Present Students */}
                    {sessionStatus.markedStudents && sessionStatus.markedStudents.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Present Students</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {sessionStatus.markedStudents.map((student, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{student.fullName}</p>
                                  <p className="text-sm text-gray-600">{student.studentIdCode}</p>
                                </div>
                              </div>
                              <span className="text-sm text-green-600">
                                {formatDate(student.markedAt, 'time')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Status</h3>
                    <p className="text-gray-600">Please wait while we load the session status...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
      
      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Success!</h3>
                  <p className="text-gray-100 text-sm">Session Closed Temporarily</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h4 className="font-semibold text-gray-900 mb-3">{successTitle}</h4>
              <p className="text-gray-600 mb-6 whitespace-pre-line">{successMessage}</p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSuccessOverlay(false);
                    window.close();
                    if (!window.closed) {
                      router.push('/dashboard/attendance');
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close Tab
                </button>
                <button
                  onClick={() => {
                    setShowSuccessOverlay(false);
                    router.push('/dashboard/attendance');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all"
                >
                  Go to Attendance Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}