'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/contexts/toast';
import { useNotifications } from '@/contexts/notification';
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
  RefreshCw,
  Flag
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
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
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
  
  // Countdown Timer State (60 minutes = 3600 seconds)
  const [timeRemaining, setTimeRemaining] = useState<number>(3600); // countdown from 60 minutes
  const [isAutoEnding, setIsAutoEnding] = useState(false);
  
  // Success overlay state
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const feeDueAudioRef = useRef<HTMLAudioElement | null>(null);
  const feeDueAudioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playFeeDueAlert = async () => {
    try {
      if (!feeDueAudioRef.current) {
        feeDueAudioRef.current = new Audio('/audio/feesdue.mp3');
        feeDueAudioRef.current.preload = 'auto';
      }

      const audio = feeDueAudioRef.current;

      if (feeDueAudioTimeoutRef.current) {
        clearTimeout(feeDueAudioTimeoutRef.current);
      }

      audio.currentTime = 0;
      await audio.play();

      feeDueAudioTimeoutRef.current = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 2000);
    } catch (audioError) {
      console.warn('Unable to play fee due alert sound:', audioError);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (feeDueAudioTimeoutRef.current) {
        clearTimeout(feeDueAudioTimeoutRef.current);
      }
      if (feeDueAudioRef.current) {
        feeDueAudioRef.current.pause();
        feeDueAudioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Countdown Timer Effect
  useEffect(() => {
    if (!session || !session.isActive) {
      setTimeRemaining(3600); // Reset to 60 minutes
      return;
    }

    // Calculate remaining time from session creation
    const sessionCreatedAt = new Date(session.createdAt).getTime();
    const sessionDuration = 60 * 60 * 1000; // 60 minutes in milliseconds
    
    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = now - sessionCreatedAt;
      const remaining = Math.max(0, sessionDuration - elapsed);
      const remainingSeconds = Math.floor(remaining / 1000);
      
      setTimeRemaining(remainingSeconds);
      
      // Auto-end session when time reaches 0
      if (remainingSeconds === 0 && !isAutoEnding) {
        setIsAutoEnding(true);
        autoEndSession();
      }
    };

    // Set initial countdown
    updateCountdown();

    // Update countdown every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [session, isAutoEnding]);

  // Format countdown time display
  const formatCountdownTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-end session function (for timer expiration - sends SMS)
  const autoEndSession = async () => {
    if (!session) return;
    
    try {
      console.log('Auto-ending session (with SMS):', sessionId);
      await api.put(`/admin/attendance/sessions/${sessionId}/auto-end`);
      
      console.log('Session auto-ended successfully, refreshing session data');
      await fetchSessionData();
      
      // Add notification to header
      addNotification({
        type: 'warning',
        title: '⏰ Session Auto-Expired',
        message: `Session for Batch ${session.batchDisplayName || session.batchYear} - ${session.subjectName} has been automatically expired after 1 hour.\n\n📱 SMS notifications sent to parents of absent students.`,
        sessionId: session.id,
        batchYear: session.batchDisplayName || session.batchYear,
        subjectName: session.subjectName
      });
      
      addToast({
        type: 'warning',
        title: '⏰ Session Auto-Ended (SMS Sent)',
        message: 'The 60-minute session timer has expired and the session has been automatically ended.\n\n📱 SMS notifications have been sent to parents of absent students.\n\n💡 You can still reopen this session if needed.',
        duration: 12000
      });
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
      addToast({
        type: 'error',
        title: 'Failed to Load Session',
        message: 'Unable to load session data. Please refresh the page.',
        duration: 5000
      });
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
        if (response.data.hasFeePaymentIssue) {
          await playFeeDueAlert();
        }
        setIndexInput('');
        // Auto-clear success message after 5 seconds
        setTimeout(() => setValidationResponse(null), 5000);
      }
      
      // Always refresh session status to show current state
      // Add small delay to ensure backend transaction has completed
      setTimeout(async () => {
        await fetchSessionStatus();
      }, 100);
    } catch (error: any) {
      // Handle server validation response in error case
      if (error.response?.data && typeof error.response.data === 'object' && 'success' in error.response.data) {
        setValidationResponse(error.response.data as AttendanceValidationResponseDto);
        // Refresh session status even for structured error responses (like ALREADY_MARKED)
        // Add small delay to ensure backend transaction has completed
        setTimeout(async () => {
          await fetchSessionStatus();
        }, 100);
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
    
    const sessionInfo = `${session.batchDisplayName || `Batch ${session.batchYear}`} - ${session.subjectName} (${formatDate(session.sessionDate)})`;

    try {
      await api.put(`/admin/attendance/sessions/${sessionId}/close`);
      
      // Refresh session data to update the UI state
      await fetchSessionData();
      
      // Show success overlay after data refresh
      setSuccessTitle(`⏸️ ${sessionInfo} - Temporarily Closed!`);
      setSuccessMessage('You can reopen this session anytime or use "Fully End" to send SMS notifications to parents of absent students.');
      setShowSuccessOverlay(true);
      
    } catch (error: any) {
      addToast({
        type: 'error',
        title: '❌ Failed to Close Session',
        message: `Error: ${error.response?.data?.message || 'Please try again.'}`,
        duration: 6000
      });
    }
  };

  // Reactivate session (can reopen anytime until fully ended)
  const reactivateSession = async () => {
    if (!session) return;
    
    const sessionInfo = `${session.batchDisplayName || `Batch ${session.batchYear}`} - ${session.subjectName} (${formatDate(session.sessionDate)})`;
    
    // Show confirmation modal
    setConfirmTitle('🔄 Reactivate Attendance Session?');
    setConfirmMessage(`**Session:** ${sessionInfo}\n\n**📋 This will:**\n• Reopen the session for attendance marking\n• Allow students to mark attendance again\n• Preserve all existing attendance records\n\n💡 **Note:** Session can be reopened anytime until fully ended.`);
    setConfirmAction(() => async () => {
      setShowConfirmModal(false);
      await performReactivation(sessionInfo);
    });
    setShowConfirmModal(true);
    return;
  };
  
  const performReactivation = async (sessionInfo: string) => {

    try {
      console.log('Attempting to reactivate session:', sessionId);
      await api.put(`/admin/attendance/sessions/${sessionId}/reactivate`);
      
      console.log('Session reactivated successfully, refreshing session data');
      await fetchSessionData();
      
      // Clear any existing validation response
      setValidationResponse(null);
      setIndexInput('');
      
      // Reset auto-ending flag
      setIsAutoEnding(false);
      
      // Show success overlay
      setSuccessTitle(`🔄 Session Reactivated Successfully!`);
      setSuccessMessage(`${sessionInfo}\n\nThe session is now active again and students can mark attendance.\n\n💡 When ready to end permanently, use \"Fully End\" to send SMS notifications to parents of absent students.`);
      setShowSuccessOverlay(true);
    } catch (error: any) {
      console.error('Failed to reactivate session:', error);
      addToast({
        type: 'error',
        title: '❌ Failed to Reactivate Session',
        message: `Error: ${error.response?.data?.message || 'Please try again.'}`,
        duration: 8000
      });
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
        <div className="space-y-4">
          {/* Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 rounded-xl shadow-xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="relative px-6 py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push('/dashboard/attendance')}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="h-6 w-6 text-white" />
                  </button>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">Attendance Session</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${session.isActive ? 'bg-green-400' : session.isClosed ? 'bg-yellow-400' : session.canReactivate ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`}></div>
                        <p className="text-white/90 text-sm">
                          {session.isActive ? 'Active Session' : 
                           session.isClosed ? 'Session Closed (Temporary)' :
                           session.canReactivate ? 'Session Ended - Can Reactivate' :
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
                      <div className={`flex items-center px-4 py-2 backdrop-blur-sm rounded-xl ${
                        timeRemaining <= 300 ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/10'
                      }`}>
                        <Clock className={`h-4 w-4 mr-2 ${
                          timeRemaining <= 300 ? 'text-red-200 animate-pulse' : 'text-white'
                        }`} />
                        <span className={`font-mono font-bold ${
                          timeRemaining <= 300 ? 'text-red-200' : 'text-white'
                        }`}>
                          {formatCountdownTime(timeRemaining)}
                        </span>
                        {timeRemaining <= 300 && (
                          <span className="ml-2 text-xs text-red-200">
                            (Auto-end soon)
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={closeSession}
                        className="flex items-center px-4 py-2 bg-yellow-500/80 hover:bg-yellow-500 text-white rounded-xl transition-colors"
                        title="Temporarily end session (can be reopened) - NO SMS sent"
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        CLOSE SESSION
                      </button>                    </>
                  )}
                  
                  {/* Notice for ended sessions */}
                  {!session.isActive && !session.canReactivate && (
                    <div className="flex items-center px-4 py-2 bg-gray-100 rounded-xl">
                      <XCircle className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-gray-600">Session ended - Use dashboard to reactivate</span>
                    </div>
                  )}
                  
                  {/* Reactivate button for ended sessions */}
                  {!session.isActive && session.canReactivate && (
                    <button
                      onClick={reactivateSession}
                      className="flex items-center px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-colors animate-pulse"
                      title="Reactivate session anytime until fully ended"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reactivate Session
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white/80 mt-3">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="h-4 w-4" />
                  <div>
                    <p className="text-l text-bold text-white/60">Batch</p>
                    <p className="font-medium text-sm">{session.batchDisplayName || `Batch ${session.batchYear}`}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <div>
                    <p className="text-l text-bold text-white/60">Subject</p>
                    <p className="font-medium text-sm">{session.subjectName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <div>
                    <p className="text-l text-bold text-white/60">Date</p>
                    <p className="font-medium text-sm">{formatDate(session.sessionDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mark Attendance Section */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-white" />
                  <h2 className="text-l font-bold text-white">Mark Attendance</h2>
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

              <div className="p-3">
                {session.isActive ? (
                  <form onSubmit={handleAttendanceMark} className="space-y-3">
                    <div className="relative">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                        <User className="h-4 w-4 text-indigo-500" />
                        <span className="font-bold">Student ID</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={indexInput}
                          onChange={(e) => setIndexInput(e.target.value)}
                          placeholder="Enter student ID here"
                          className="w-full pl-10 pr-4 py-3 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                          disabled={marking}
                          autoComplete="off"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={marking || !indexInput.trim()}
                      className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-xl active:scale-95"
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

                    {/* Success/Error Message - Displayed below the button */}
                    {validationResponse && (
                      <div className={`p-3 rounded-lg border-l-4 ${
                        validationResponse.success
                          ? 'bg-green-50 border-green-500 text-green-800'
                          : 'bg-red-50 border-red-500 text-red-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {validationResponse.success ? (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            <p className="font-medium text-sm">{validationResponse.message}</p>
                          </div>
                          {validationResponse.success && validationResponse.hasFeePaymentIssue && (
                            <div className="flex items-center">
                              <Flag className="h-12 w-12 text-red-600" />
                              <p className="text-red-600 font-bold text-2xl">Fees Overdue</p>
                            </div>
                          )}
                        </div>
                        {validationResponse.student && (
                          <div className="mt-1 text-xs opacity-90">
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
                    <p className="text-gray-600 mb-4">This session has been temporarily closed (no SMS sent). It can be reopened anytime or permanently ended with SMS notifications.</p>
                    
                    <button
                      onClick={() => router.push('/dashboard/attendance')}
                      className="w-full flex items-center justify-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5 mr-2" />
                      Back to Attendance
                    </button>
                  </div>
                ) : session.canReactivate ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RefreshCw className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Ended - Can Reopen</h3>
                    <p className="text-gray-600 mb-4">This session was ended but can be reactivated anytime until fully ended.</p>
                    
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2">📋 Reopen Options:</h4>
                        <div className="text-sm text-blue-700 space-y-1">
                          <p>• <strong>Reopen Session:</strong> Continue attendance marking with same session ID</p>
                          <p>• <strong>Fully End:</strong> Permanently close and send SMS notifications to absent students</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={reactivateSession}
                        className="w-full flex items-center justify-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-medium"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Reopen Session
                      </button>
                      
                      <p className="text-sm text-gray-500 text-center">💡 "End Session" allows reopening without SMS. "Fully End" sends SMS to absent students' parents.</p>
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
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-white" />
                  <h2 className="text-l font-bold text-white">Session Status</h2>
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

              <div className="p-3">
                {sessionStatus ? (
                  <div className="space-y-3">
                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 bg-green-100 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-green-900">{sessionStatus.presentCount}</p>
                            <p className="text-xs text-green-600">Present</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 bg-red-100 rounded-lg">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-red-900">{sessionStatus.totalEnrolledStudents - sessionStatus.presentCount}</p>
                            <p className="text-xs text-red-600">Absent</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Present Students */}
                    {sessionStatus.markedStudents && sessionStatus.markedStudents.length > 0 && (
                      <div>
                        <h3 className="text-base font-medium text-gray-900 mb-2">Present Students</h3>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {[...sessionStatus.markedStudents].reverse().map((student, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-100">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <p className="font-medium text-gray-900">{student.fullName}</p>
                                    {/* Styled red flag for fee payment issues */}
                                    {student.hasFeePaymentIssue && (
                                      <div className="relative ml-2 group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-red-200 to-red-300 rounded-full opacity-50 group-hover:opacity-75 blur-sm"></div>
                                        <div className="relative bg-gradient-to-br from-red-400 to-red-600 rounded-full p-1.5 shadow-lg border border-red-300">
                                          <Flag className="h-3 w-3 text-white" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600">{student.studentIdCode}</p>
                                </div>
                              </div>
                              <span className="text-xs text-green-600">
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

              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">{confirmTitle}</h3>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div className="text-gray-700 mb-6 whitespace-pre-line leading-relaxed">
                {confirmMessage.split('\n').map((line, index) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={index} className="font-bold text-gray-900 mb-2">{line.slice(2, -2)}</p>;
                  }
                  if (line.startsWith('•')) {
                    return <p key={index} className="ml-4 mb-1">{line}</p>;
                  }
                  if (line.startsWith('⚠️')) {
                    return <p key={index} className="font-semibold text-amber-700 mt-3">{line}</p>;
                  }
                  return <p key={index} className="mb-2">{line}</p>;
                })}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (confirmAction) {
                      confirmAction();
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg"
                >
                  ✅ Yes, Reactivate
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}