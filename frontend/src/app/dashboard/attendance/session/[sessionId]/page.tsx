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

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

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

  const endSession = async () => {
    if (!session) return;
    
    const sessionInfo = `Batch ${session.batchYear} - ${session.subjectName} (${formatDate(session.sessionDate)})`;
    
    if (!confirm(`🛑 End Attendance Session?\n\nSession: ${sessionInfo}\n\n⚠️ Important Information:\n• Students will no longer be able to mark attendance\n• Parents of absent students will automatically receive SMS notifications\n• This action cannot be undone\n\n📱 The system will send meaningful messages to parents informing them about their child's absence from today's class.\n\nAre you sure you want to end this session?`)) {
      return;
    }

    try {
      console.log('Attempting to end session:', sessionId, 'for session:', sessionInfo);
      await api.put(`/admin/attendance/sessions/${sessionId}/deactivate`);
      
      console.log('Session ended successfully, refreshing session data');
      // Refresh session data
      await fetchSessionData();
      
      alert(`✅ Session Ended Successfully!\n\nSession: ${sessionInfo}\n\n📋 Summary:\n• The attendance session has been closed\n• Students can no longer mark attendance\n• SMS notifications have been sent to parents of absent students\n\n📱 Parents received meaningful messages about their child's absence, including class details and the importance of regular attendance.`);
    } catch (error: any) {
      console.error('Failed to end session:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = 'Failed to end session. Please try again.';
      
      if (error.response?.status === 404) {
        errorMessage = 'Session not found. It may have already been ended or deleted.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      alert(`❌ Failed to End Session\n\nSession: ${sessionInfo}\n\nError: ${errorMessage}\n\n🔍 Debug Info:\nStatus: ${error.response?.status || 'Unknown'}\nSessionID: ${sessionId}\n\nNote: If the session was partially ended, some SMS notifications may have been sent. Please check the backend logs for more details.`);
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
                        <div className={`w-2 h-2 rounded-full animate-pulse ${session.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <p className="text-white/90">
                          {session.isActive ? 'Active Session' : 'Session Ended'}
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
                  {session.isActive && (
                    <button
                      onClick={endSession}
                      className="flex items-center px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-colors"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      End Session
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Mark Attendance Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
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
                    : 'bg-red-100 text-red-800'
                }`}>
                  {session.isActive ? 'Active' : 'Ended'}
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
                          placeholder="Enter student ID or index number (e.g., IDX001)"
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
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Pause className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Ended</h3>
                    <p className="text-gray-600">This attendance session has been ended and is no longer accepting attendance marks.</p>
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
    </ProtectedRoute>
  );
}