'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/contexts/toast';
import { Calendar, Users, CheckCircle, XCircle, Download, Search, Play, Pause, Settings, Clock, BookOpen, GraduationCap, User, ExternalLink, AlertTriangle, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatDateForAPI } from '@/lib/utils';
import type { 
  BatchDto, 
  SubjectDto, 
  AttendanceMarkRequest, 
  AttendanceReportDto,
  AttendanceSessionDto,
  AttendanceSessionCreateRequest,
  AttendanceMarkByIndexRequest,
  AttendanceValidationResponseDto,
  SessionAttendanceStatusDto,
  MarkedStudentDto
} from '@/types';

type TabType = 'sessions' | 'mark' | 'report';

function AttendancePageContent() {
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get URL parameters
  const sessionIdFromUrl = searchParams.get('sessionId');
  const tabFromUrl = searchParams.get('tab') as TabType;
  
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || 'sessions');
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Session Management State
  const [sessions, setSessions] = useState<AttendanceSessionDto[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [currentSession, setCurrentSession] = useState<AttendanceSessionDto | null>(null);
  
  // Create Session State
  const [sessionBatch, setSessionBatch] = useState<string>('');
  const [sessionSubject, setSessionSubject] = useState<string>('');
  const [sessionDate, setSessionDate] = useState(formatDateForAPI(new Date()));
  const [creatingSession, setCreatingSession] = useState(false);
  
  // Mark Attendance State (Enhanced Session-based)
  const [indexInput, setIndexInput] = useState('');
  const [marking, setMarking] = useState(false);
  const [validationResponse, setValidationResponse] = useState<AttendanceValidationResponseDto | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionAttendanceStatusDto | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  
  // Report State
  const [reportDate, setReportDate] = useState(formatDateForAPI(new Date()));
  const [reportBatch, setReportBatch] = useState<string>('');
  const [reportSubject, setReportSubject] = useState<string>('');
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReportDto | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmButtonText, setConfirmButtonText] = useState('Yes, Confirm');

  // Helper function to check if session has expired (60 minutes from creation)
  const isSessionExpired = (session: AttendanceSessionDto): boolean => {
    try {
      // Add extensive logging to debug
      console.log('=== CHECKING SESSION EXPIRATION ===');
      console.log('Session ID:', session.id);
      console.log('Session createdAt (raw):', session.createdAt);
      console.log('Session sessionDate:', session.sessionDate);
      console.log('Session batch/subject:', `Batch ${session.batchYear} ${session.subjectName}`);
      
      const sessionCreatedAt = new Date(session.createdAt).getTime();
      const now = Date.now();
      const sessionDuration = 60 * 60 * 1000; // 60 minutes in milliseconds
      const elapsed = now - sessionCreatedAt;
      const isExpired = elapsed > sessionDuration;
      
      // More detailed logging
      console.log('Created timestamp:', sessionCreatedAt);
      console.log('Current timestamp:', now);
      console.log('Created Date:', new Date(sessionCreatedAt).toISOString());
      console.log('Current Date:', new Date(now).toISOString());
      console.log('Elapsed milliseconds:', elapsed);
      console.log('Elapsed minutes:', Math.round(elapsed / 60000));
      console.log('Duration limit (60 min in ms):', sessionDuration);
      console.log('Is Expired?', isExpired);
      console.log('=====================================');
      
      return isExpired;
    } catch (error) {
      console.error('Error checking session expiration:', error, session);
      return false; // Don't remove sessions if there's an error parsing dates
    }
  };

  // Filter sessions to exclude expired ones
  const getValidSessions = (sessions: AttendanceSessionDto[]): AttendanceSessionDto[] => {
    const validSessions = sessions.filter(session => {
      const isValid = !isSessionExpired(session);
      if (!isValid) {
        console.log(`Filtering out expired session: ${session.id} - Batch ${session.batchYear} ${session.subjectName}`);
      }
      return isValid;
    });
    
    if (validSessions.length !== sessions.length) {
      console.log(`Filtered ${sessions.length - validSessions.length} expired sessions out of ${sessions.length} total`);
    }
    
    return validSessions;
  };

  useEffect(() => {
    fetchInitialData();
    
    // Immediately filter out any expired sessions that might be in state
    setTimeout(() => {
      console.log('Component mounted - forcing expired session cleanup');
      setSessions(prevSessions => {
        const validSessions = getValidSessions(prevSessions);
        if (validSessions.length !== prevSessions.length) {
          console.log(`Removed ${prevSessions.length - validSessions.length} expired sessions on mount`);
        }
        return validSessions;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    // Fetch session status when current session changes
    if (currentSession) {
      fetchSessionStatus(currentSession.id);
    }
  }, [currentSession]);

  useEffect(() => {
    // Periodically check and remove expired sessions
    const checkExpiredSessions = () => {
      setSessions(prevSessions => {
        const validSessions = getValidSessions(prevSessions);
        // Only update state if there are changes to avoid unnecessary re-renders
        if (validSessions.length !== prevSessions.length) {
          console.log('Expired sessions removed:', prevSessions.length - validSessions.length);
          const expiredCount = prevSessions.length - validSessions.length;
          if (expiredCount > 0) {
            addToast({
              type: 'warning',
              title: '⏰ Sessions Expired',
              message: `${expiredCount} session${expiredCount > 1 ? 's' : ''} exceeded the 60-minute limit and ${expiredCount > 1 ? 'have' : 'has'} been removed.`,
              duration: 6000
            });
          }
          return validSessions;
        }
        return prevSessions;
      });
    };
    
    // Check immediately on mount
    console.log('Initial expired session check on component mount');
    checkExpiredSessions();
    
    // Then check every 5 seconds for immediate feedback
    const interval = setInterval(() => {
      console.log('Periodic check for expired sessions...');
      checkExpiredSessions();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    try {
      const [batchesRes, subjectsRes] = await Promise.all([
        api.get<BatchDto[]>('/admin/institute/batches'),
        api.get<SubjectDto[]>('/admin/institute/subjects'),
      ]);
      setBatches(batchesRes.data);
      setSubjects(subjectsRes.data);
      
      // Also fetch today's active sessions
      await fetchTodaysSessions();
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await api.get<AttendanceSessionDto[]>('/admin/attendance/sessions/today');
      console.log('Raw sessions from backend:', response.data);
      
      // Log each session's details for debugging
      response.data.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          id: session.id,
          batch: `Batch ${session.batchYear}`,
          subject: session.subjectName,
          createdAt: session.createdAt,
          isActive: session.isActive,
          sessionDate: session.sessionDate
        });
      });
      
      // Immediately filter out expired sessions
      const validSessions = getValidSessions(response.data);
      console.log('Valid (non-expired) sessions after filtering:', validSessions);
      console.log('Expired sessions removed:', response.data.length - validSessions.length);
      
      if (response.data.length > validSessions.length) {
        const expiredCount = response.data.length - validSessions.length;
        addToast({
          type: 'info',
          title: '🧹 Cleaned Up Sessions',
          message: `Removed ${expiredCount} expired session${expiredCount > 1 ? 's' : ''} that exceeded 60 minutes.`,
          duration: 5000
        });
      }
      
      console.log('Active valid sessions:', validSessions.filter(s => s.isActive));
      console.log('Ended valid sessions:', validSessions.filter(s => !s.isActive));
      setSessions(validSessions);
      
      // Auto-select session from URL parameter if available
      if (sessionIdFromUrl) {
        const targetSession = validSessions.find(s => s.id === parseInt(sessionIdFromUrl));
        if (targetSession) {
          setCurrentSession(targetSession);
          await fetchSessionStatus(targetSession.id);
          return;
        }
      }
      
      // Auto-select the first active session if available and no URL param
      if (validSessions.length > 0 && !currentSession) {
        const firstActiveSession = validSessions.find(s => s.isActive) || validSessions[0];
        setCurrentSession(firstActiveSession);
        await fetchSessionStatus(firstActiveSession.id);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchSessionStatus = async (sessionId: number) => {
    try {
      setLoadingStatus(true);
      const response = await api.get<SessionAttendanceStatusDto>(`/attendance/sessions/${sessionId}/status`);
      setSessionStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch session status:', error);
      setSessionStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionBatch || !sessionSubject || !sessionDate) {
      addToast({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in all fields to create a session.',
        duration: 4000
      });
      return;
    }

    // Check if there's already an ACTIVE session for this batch/subject/date
    // We allow creating new sessions if the previous one was ended (accidentally)
    const selectedBatch = batches.find(b => b.id === parseInt(sessionBatch));
    const selectedSubject = subjects.find(s => s.id === parseInt(sessionSubject));
    
    // Filter out expired sessions before checking for conflicts
    const validSessions = getValidSessions(sessions);
    const existingSession = validSessions.find(s => 
      s.batchId === parseInt(sessionBatch) && 
      s.subjectId === parseInt(sessionSubject) && 
      s.sessionDate === sessionDate &&
      s.isActive
    );

    if (existingSession) {
      const batchName = `Batch ${selectedBatch?.batchYear}`;
      const subjectName = selectedSubject?.name || 'Unknown Subject';
      const formattedDate = formatDate(sessionDate);
      
      addToast({
        type: 'warning',
        title: '⚠️ Active Session Exists!',
        message: `There is already an ACTIVE attendance session running for:\n\n• ${batchName}\n• Subject: ${subjectName}\n• Date: ${formattedDate}.`,
        duration: 8000
      });
      return;
    }

    setCreatingSession(true);
    try {
      const request: AttendanceSessionCreateRequest = {
        batchId: parseInt(sessionBatch),
        subjectId: parseInt(sessionSubject),
        sessionDate,
      };
      
      const response = await api.post<AttendanceSessionDto>('/admin/attendance/sessions', request);
      
      // Refresh sessions and select the new one
      await fetchTodaysSessions();
      setCurrentSession(response.data);
      await fetchSessionStatus(response.data.id);
      
      // Reset form
      setSessionBatch('');
      setSessionSubject('');
      setSessionDate(formatDateForAPI(new Date()));
      
      const batchName = `Batch ${selectedBatch?.batchYear}`;
      const subjectName = selectedSubject?.name || 'Unknown Subject';
      
      addToast({
        type: 'success',
        title: '✅ Session Created Successfully!',
        message: `${batchName} - ${subjectName}\nDate: ${formatDate(sessionDate)}\n\nStudents can now mark their attendance for this session.`,
        duration: 6000
      });
    } catch (error: any) {
      // Handle specific error types with meaningful messages
      if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
        // Don't log 409 errors as they are expected business logic conflicts
        const batchName = `Batch ${selectedBatch?.batchYear}`;
        const subjectName = selectedSubject?.name || 'Unknown Subject';
        const formattedDate = formatDate(sessionDate);
        
        // Debug: Check what sessions actually exist
        console.log('Session creation failed - Current sessions:', sessions);
        console.log('Looking for:', { batchId: parseInt(sessionBatch), subjectId: parseInt(sessionSubject), sessionDate });
        
        // Check if this might be an ended session that can be recreated
        const endedSession = sessions.find(s => 
          s.batchId === parseInt(sessionBatch) && 
          s.subjectId === parseInt(sessionSubject) && 
          s.sessionDate === sessionDate &&
          !s.isActive
        );
        
        const activeSession = sessions.find(s => 
          s.batchId === parseInt(sessionBatch) && 
          s.subjectId === parseInt(sessionSubject) && 
          s.sessionDate === sessionDate &&
          s.isActive
        );
        
        if (activeSession) {
          addToast({
            type: 'warning',
            title: '⚠️ Active Session Exists!',
            message: `There is already an ACTIVE session running for:\n\n• ${batchName}\n• Subject: ${subjectName}\n• Date: ${formattedDate}\n\nPlease end the current session first before creating a new one.`,
            duration: 8000
          });
        } else if (endedSession) {
          addToast({
            type: 'info',
            title: '🔄 Session Already Exists (Ended)',
            message: `A session for ${batchName} - ${subjectName} on ${formattedDate} was already created but ended.\n\n💡 You can reopen the existing session instead of creating a new one:\n\n• Look for "Ended Sessions" section below\n• Click "Reopen Session" for ${formattedDate}\n\nThis will reactivate the same session ID.`,
            duration: 12000
          });
        } else {
          addToast({
            type: 'error',
            title: '❌ Unexpected Session Conflict',
            message: `Session creation blocked for ${batchName} - ${subjectName} on ${formattedDate}.\n\nThis might be a database inconsistency. Please refresh the page and try again.\n\nIf the problem persists, contact support.`,
            duration: 10000
          });
        }
      } else if (error.response?.data?.message?.includes('Batch not found')) {
        console.error('Batch not found error:', error);
        addToast({
          type: 'error',
          title: '❌ Batch Not Found',
          message: 'Selected batch not found. Please refresh the page and try again.',
          duration: 5000
        });
      } else if (error.response?.data?.message?.includes('Subject not found')) {
        console.error('Subject not found error:', error);
        addToast({
          type: 'error',
          title: '❌ Subject Not Found',
          message: 'Selected subject not found. Please refresh the page and try again.',
          duration: 5000
        });
      } else {
        // Only log unexpected errors
        console.error('Unexpected error creating session:', error);
        const errorMessage = error.response?.data?.message || 'Failed to create session. Please try again.';
        addToast({
          type: 'error',
          title: '❌ Failed to Create Session',
          message: `${errorMessage}\n\nPlease try again or contact support if the problem persists.`,
          duration: 7000
        });
      }
    } finally {
      setCreatingSession(false);
    }
  };
  const endSession = async (sessionId: number) => {
    // Find the session being ended for better confirmation message
    const sessionToEnd = sessions.find(s => s.id === sessionId);
    if (!sessionToEnd) {
      console.error('Session not found in local state:', sessionId);
      return;
    }
    
    // Check if session has expired
    if (isSessionExpired(sessionToEnd)) {
      addToast({
        type: 'warning',
        title: '⏰ Session Already Expired',
        message: 'This session has exceeded the 60-minute limit and will be removed automatically.',
        duration: 5000
      });
      // Remove expired session from state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      return;
    }

    const sessionInfo = sessionToEnd 
      ? `Batch ${sessionToEnd.batchYear} - ${sessionToEnd.subjectName} (${formatDate(sessionToEnd.sessionDate)})`
      : 'this session';

    // Show confirmation modal
    setConfirmTitle('🎯 End Session Confirmation');
    setConfirmMessage(`**${sessionInfo}**\n\n✨ This will complete the attendance session and notify parents of absent students.`);
    setConfirmButtonText('Yes, End Session');
    setConfirmAction(() => async () => {
      setShowConfirmModal(false);
      await performEndSession(sessionId, sessionInfo);
    });
    setShowConfirmModal(true);
    return;
  };
  
  const performEndSession = async (sessionId: number, sessionInfo: string) => {

    try {
      await api.put(`/admin/attendance/sessions/${sessionId}/end`);
      
      // Refresh sessions list
      await fetchTodaysSessions();
      
      // Clear current session if it was the one we ended
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setSessionStatus(null);
      }
      
      addToast({
        type: 'success',
        title: '🎉 Session Completed Successfully!',
        message: `${sessionInfo} has been ended.\n\n📱 Parents have been notified about absent students.`,
        duration: 90000
      });
    } catch (error: any) {
      let errorMessage = 'Failed to end session. Please try again.';
      let debugInfo = '';
      
      if (error.response?.status === 404) {
        errorMessage = 'Session not found. It may have already been ended or deleted.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Internal server error occurred while ending the session.';
        debugInfo = `\n\nBackend Error: ${JSON.stringify(error.response?.data, null, 2)}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      addToast({
        type: 'error',
        title: '❌ Failed to End Session',
        message: `Could not end ${sessionInfo}.\n\n${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
        duration: 8000
      });
    }
  };

  const fullyEndSession = async (sessionId: number, session: AttendanceSessionDto) => {
    const sessionInfo = `Batch ${session.batchYear} - ${session.subjectName} (${formatDate(session.sessionDate)})`;

    setConfirmTitle('🔒 Fully End Session?');
    setConfirmMessage(`Are you sure you want to FULLY END this session?\n\n${sessionInfo}\n\n⚠️ This action cannot be undone and will:\n• Permanently close the session\n• Send SMS notifications to parents of absent students\n• Prevent any future reopening`);
    setConfirmButtonText('Yes, Fully End');
    setConfirmAction(() => async () => {
      setShowConfirmModal(false);
      try {
        await api.delete(`/admin/attendance/sessions/${sessionId}/fully-end`);
        
        // Remove the session from the list since it's now fully ended
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        
        addToast({
          type: 'success',
          title: '✅ Session Fully Ended',
          message: 'The session has been permanently closed.\n\n📱 SMS notifications have been sent to parents of absent students.',
          duration: 10000
        });
      } catch (error: any) {
        addToast({
          type: 'error',
          title: '❌ Failed to Fully End Session',
          message: `Error: ${error.response?.data?.message || 'Please try again.'}`,
          duration: 6000
        });
      }
    });
    setShowConfirmModal(true);
  };

  const reopenSession = async (sessionId: number) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        console.error('Session not found in local state:', sessionId);
        return;
      }
      
      // Check if session has expired before allowing reopen
      if (isSessionExpired(session)) {
        addToast({
          type: 'error',
          title: '⏰ Session Expired',
          message: 'This session has exceeded the 60-minute limit and can no longer be reopened.',
          duration: 6000
        });
        // Remove expired session from state
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        return;
      }
      
      const batchName = `Batch ${session.batchYear}`;
      const subjectName = session.subjectName;
      const sessionInfo = `${batchName} - ${subjectName} (${formatDate(session.sessionDate)})`;
      
      // Show confirmation modal - make sure this is for REOPENING, not ending
      setConfirmTitle('🔄 Reopen Session Confirmation');
      setConfirmMessage(`**${sessionInfo}**\n\n✨ This will REACTIVATE the session for continued attendance marking.\n\n⏱️ **Note:** Timer will continue from original creation time.`);
      setConfirmButtonText('Yes, Reopen Session');
      setConfirmAction(() => async () => {
        console.log('Executing REOPEN action for session:', sessionId);
        setShowConfirmModal(false);
        await performReopenSession(sessionId, sessionInfo);
      });
      setShowConfirmModal(true);
    } catch (error: any) {
      console.error('Error preparing reopen session:', error);
      addToast({
        type: 'error',
        title: '❌ Error',
        message: 'Failed to prepare session reopening. Please try again.',
        duration: 5000
      });
    }
  };
  
  const performReopenSession = async (sessionId: number, sessionInfo: string) => {
    try {
      await api.put(`/admin/attendance/sessions/${sessionId}/reopen`);
      
      // Refresh sessions list
      await fetchTodaysSessions();
      
      // Auto-select the reopened session
      const updatedSessions = await api.get<AttendanceSessionDto[]>('/admin/attendance/sessions/today');
      const reopenedSession = updatedSessions.data.find(s => s.id === sessionId);
      if (reopenedSession) {
        setCurrentSession(reopenedSession);
        await fetchSessionStatus(reopenedSession.id);
      }
      
      addToast({
        type: 'success',
        title: '🎉 Session Reopened Successfully!',
        message: `**${sessionInfo}** is now active again.\n\n✅ Students can mark attendance using the **same session ID**.\n🔄 All existing attendance records are preserved.`,
        duration: 8000
      });
    } catch (error: any) {
      let errorMessage = 'Failed to reopen session. Please try again.';
      
      if (error.response?.status === 404) {
        errorMessage = 'Session not found. It may have been deleted.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Session cannot be reopened.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      addToast({
        type: 'error',
        title: '❌ Failed to Reopen Session',
        message: `Could not reopen ${sessionInfo}.\n\n${errorMessage}\n\nPlease try again or contact support if needed.`,
        duration: 7000
      });
    }
  };

  const handleSessionAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentSession) {
      setValidationResponse({
        success: false,
        message: 'No active session selected. Please create or select a session first.',
        errorCode: 'NO_SESSION'
      });
      return;
    }

    if (!indexInput.trim()) {
      setValidationResponse({
        success: false,
        message: 'Please enter your Index Number.',
        errorCode: 'EMPTY_INPUT'
      });
      return;
    }

    setMarking(true);
    setValidationResponse(null);

    try {
      const request: AttendanceMarkByIndexRequest = {
        indexNumber: indexInput.trim().toUpperCase(),
        sessionId: currentSession!.id,
      };
      
      const response = await api.post<AttendanceValidationResponseDto>('/attendance/mark-by-index', request);
      setValidationResponse(response.data);
      
      if (response.data.success) {
        setIndexInput('');
        // Auto-clear success message after 5 seconds
        setTimeout(() => setValidationResponse(null), 5000);
      }
      
      // Always refresh session status to show current state
      // Add small delay to ensure backend transaction has completed
      setTimeout(async () => {
        await fetchSessionStatus(currentSession!.id);
      }, 100);
    } catch (error: any) {
      // Handle server validation response in error case
      if (error.response?.data && typeof error.response.data === 'object' && 'success' in error.response.data) {
        setValidationResponse(error.response.data as AttendanceValidationResponseDto);
        // Refresh session status even for structured error responses (like ALREADY_MARKED)
        // Add small delay to ensure backend transaction has completed
        setTimeout(async () => {
          await fetchSessionStatus(currentSession!.id);
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



  const fetchAttendanceReport = async () => {
    if (!reportDate || !reportBatch || !reportSubject) {
      addToast({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please select date, batch, and subject to generate a report.',
        duration: 4000
      });
      return;
    }

    setLoadingReport(true);
    try {
      const params = new URLSearchParams({
        date: reportDate,
        batchId: reportBatch,
        subjectId: reportSubject,
      });
      
      const response = await api.get<AttendanceReportDto>(`/admin/attendance/report?${params.toString()}`);
      setAttendanceReport(response.data);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Generate Report',
        message: 'Unable to fetch attendance report. Please try again.',
        duration: 5000
      });
    } finally {
      setLoadingReport(false);
    }
  };

  const downloadReport = () => {
    if (!attendanceReport) return;
    
    // Create CSV content
    const csvContent = [
      ['Student ID', 'Full Name', 'Status', 'Marked At'],
      ...attendanceReport.presentStudents.map(student => [
        student.studentIdCode,
        student.fullName,
        'Present',
        formatDate(student.markedAt, 'time')
      ]),
      ...attendanceReport.absentStudents.map(student => [
        student.studentIdCode,
        student.fullName,
        'Absent',
        '-'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${reportDate}_batch${reportBatch}_subject${reportSubject}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Modern Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative px-8 py-12">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">Attendance Management</h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <p className="text-white/90">Track student presence and generate reports</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Tabs */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-2">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`flex-1 flex items-center justify-center px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'sessions'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Settings className="h-5 w-5 mr-2" />
                Sessions
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`flex-1 flex items-center justify-center px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'report'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Calendar className="h-5 w-5 mr-2" />
                Reports
              </button>
            </nav>
          </div>

          {/* Sessions Management Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              {/* Create New Session */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl shadow-lg border border-indigo-100 p-6">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-200 to-indigo-200 rounded-full translate-y-12 -translate-x-12 opacity-20"></div>
                
                {/* Header */}
                <div className="relative mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Create Attendance Session</h2>
                      <p className="text-sm text-gray-600">Start a new session to track student attendance</p>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={createSession} className="relative grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="group">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                      <Users className="h-4 w-4 text-indigo-500" />
                      <span>Batch</span>
                    </label>
                    <select
                      value={sessionBatch}
                      onChange={(e) => setSessionBatch(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 group-hover:shadow-md"
                      required
                    >
                      <option value="">Select batch</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id.toString()}>
                          Batch {batch.batchYear}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="group">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      <span>Subject</span>
                    </label>
                    <select
                      value={sessionSubject}
                      onChange={(e) => setSessionSubject(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 group-hover:shadow-md"
                      required
                    >
                      <option value="">Select subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="group">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      <span>Date</span>
                    </label>
                    <input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 group-hover:shadow-md"
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={creatingSession}
                      className="group w-full flex items-center justify-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-xl active:scale-95"
                    >
                      {creatingSession ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          <span className="animate-pulse">Creating...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5 mr-2 group-hover:animate-bounce" />
                          <span>Create Session</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Today's Sessions */}
              <div className="bg-white backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-6 bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Today's Active Sessions</h2>
                  </div>
                  <button
                    onClick={() => {
                      console.log('Manual refresh clicked - checking for expired sessions');
                      // Force immediate expiration check
                      setSessions(prevSessions => {
                        const validSessions = getValidSessions(prevSessions);
                        if (validSessions.length !== prevSessions.length) {
                          console.log('Removed expired sessions on manual refresh:', prevSessions.length - validSessions.length);
                        }
                        return validSessions;
                      });
                      // Then fetch fresh data
                      fetchTodaysSessions();
                    }}
                    disabled={loadingSessions}
                    className="group flex items-center px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 mr-2"
                  >
                    {loadingSessions ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <Play className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                    )}
                    Refresh
                  </button>
                  
                   </div>

                <div className="p-6">
                  {getValidSessions(sessions).filter(session => session.isActive).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Sessions</h3>
                      <p className="text-gray-500 mb-1">No sessions are currently running for today.</p>
                      <p className="text-sm text-gray-400">Create a new session above to start marking attendance.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getValidSessions(sessions).filter(session => session.isActive).map((session) => (
                        <div
                          key={session.id}
                          className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
                            currentSession?.id === session.id
                              ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg ring-2 ring-indigo-100'
                              : 'border-gray-100 hover:border-indigo-200 bg-white hover:shadow-md hover:bg-gradient-to-br hover:from-gray-50 hover:to-indigo-50'
                          }`}
                        >
                          <div 
                            className="cursor-pointer"
                            onClick={() => {
                              setCurrentSession(session);
                              fetchSessionStatus(session.id);
                            }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className={`p-2 rounded-lg ${currentSession?.id === session.id ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-indigo-100'}`}>
                                  <Users className={`h-5 w-5 ${currentSession?.id === session.id ? 'text-indigo-600' : 'text-gray-600 group-hover:text-indigo-600'}`} />
                                </div>
                                <h3 className="font-bold text-gray-900">
                                  Batch {session.batchYear}
                                </h3>
                              </div>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                session.isActive 
                                  ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' 
                                  : 'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
                              }`}>
                                {session.isActive ? '● Active' : '○ Ended'}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="font-medium text-gray-800">{session.subjectName}</p>
                              <p className="text-sm text-gray-500 flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {formatDate(session.sessionDate)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/dashboard/attendance/session/${session.id}`, '_blank');
                              }}
                              className="group w-full bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 rounded-xl px-4 py-3 text-sm font-semibold hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                            >
                              <ExternalLink className="w-4 h-4 inline mr-2 group-hover:animate-pulse" />
                              Open Session
                            </button>
                            {session.isActive && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  endSession(session.id);
                                }}
                                className="group w-full bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm font-semibold hover:from-red-100 hover:to-rose-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                              >
                                <Pause className="w-4 h-4 inline mr-2 group-hover:animate-pulse" />
                                END SESSION
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ended Sessions - Can be Reopened */}
              {getValidSessions(sessions).filter(session => !session.isActive).length > 0 && (
                <div className="bg-white backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-6 bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/10 rounded-xl">
                        <RotateCcw className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Ended Sessions - Can Reopen</h2>
                        <p className="text-orange-100 text-sm">Click to reactivate and continue marking attendance</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getValidSessions(sessions).filter(session => !session.isActive).map((session) => (
                        <div
                          key={`ended-${session.id}`}
                          className="group relative p-6 rounded-2xl border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 hover:border-orange-200 transition-all duration-300 hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className="p-2 rounded-lg bg-orange-100">
                                <Users className="h-5 w-5 text-orange-600" />
                              </div>
                              <h3 className="font-bold text-gray-900">
                                Batch {session.batchYear}
                              </h3>
                            </div>
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 ring-1 ring-gray-200">
                              ○ Ended
                            </span>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <p className="font-medium text-gray-800">{session.subjectName}</p>
                            <p className="text-sm text-gray-500 flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatDate(session.sessionDate)}
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <button
                              onClick={() => reopenSession(session.id)}
                              className="group w-full bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200 rounded-xl px-4 py-3 text-sm font-semibold hover:from-orange-100 hover:to-amber-100 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                            >
                              <RotateCcw className="w-4 h-4 inline mr-2 group-hover:animate-spin" />
                              Reopen Session
                            </button>
                            <button
                              onClick={() => fullyEndSession(session.id, session)}
                              className="group w-full bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm font-semibold hover:from-red-100 hover:to-rose-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                              title="Permanently end session and send SMS notifications"
                            >
                              <XCircle className="w-4 h-4 inline mr-2 group-hover:animate-pulse" />
                              Fully End
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              {/* Report Filters */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Attendance Reports</h2>
                    <p className="text-gray-600">Generate and download attendance reports for specific sessions</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="group">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      <span>Date</span>
                    </label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 group-hover:shadow-md"
                    />
                  </div>
                  
                  <div className="group">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                      <Users className="h-4 w-4 text-indigo-500" />
                      <span>Batch</span>
                    </label>
                    <select
                      value={reportBatch}
                      onChange={(e) => setReportBatch(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 group-hover:shadow-md"
                    >
                      <option value="">Select batch</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id.toString()}>
                          Batch {batch.batchYear}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="group">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                      <BookOpen className="h-4 w-4 text-indigo-500" />
                      <span>Subject</span>
                    </label>
                    <select
                      value={reportSubject}
                      onChange={(e) => setReportSubject(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 group-hover:shadow-md"
                    >
                      <option value="">Select subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={fetchAttendanceReport}
                      disabled={loadingReport}
                      className="group w-full flex items-center justify-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-xl active:scale-95"
                    >
                      {loadingReport ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                          <span className="animate-pulse">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Settings className="h-5 w-5 mr-3 group-hover:animate-bounce" />
                          <span>Generate Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Report Results */}
              {attendanceReport && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  {/* Report Header */}
                  <div className="px-8 py-6 bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          Attendance Report
                        </h3>
                        <p className="text-emerald-100">
                          {formatDate(attendanceReport.date)} • Batch {batches.find(b => b.id.toString() === reportBatch)?.batchYear} • {subjects.find(s => s.id.toString() === reportSubject)?.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={downloadReport}
                      className="flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-200 text-white font-semibold hover:scale-105 shadow-lg"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Download CSV
                    </button>
                  </div>

                  {/* Summary Stats */}
                  <div className="px-8 py-6 bg-gradient-to-br from-gray-50 to-indigo-50">
                    <div className="grid grid-cols-3 gap-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Users className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{attendanceReport.presentStudents.length + attendanceReport.absentStudents.length}</div>
                        <div className="text-sm font-medium text-gray-600">Total Students</div>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <CheckCircle className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-emerald-600">{attendanceReport.presentStudents.length}</div>
                        <div className="text-sm font-medium text-gray-600">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <XCircle className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-red-600">{attendanceReport.absentStudents.length}</div>
                        <div className="text-sm font-medium text-gray-600">Absent</div>
                      </div>
                    </div>
                  </div>

                  {/* Student Lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Present Students */}
                    <div className="p-8 border-r border-gray-200">
                      <h4 className="text-lg font-bold text-emerald-700 mb-6 flex items-center">
                        <CheckCircle className="h-6 w-6 mr-3" />
                        Present Students ({attendanceReport.presentStudents.length})
                      </h4>
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {attendanceReport.presentStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 hover:from-emerald-100 hover:to-green-100 transition-all duration-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">{student.fullName.charAt(0)}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{student.fullName}</div>
                                <div className="text-sm text-gray-600">{student.studentIdCode}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-emerald-700">
                                {formatDate(student.markedAt, 'time')}
                              </div>
                              <div className="text-xs text-emerald-600">Marked</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Absent Students */}
                    <div className="p-8">
                      <h4 className="text-lg font-bold text-red-700 mb-6 flex items-center">
                        <XCircle className="h-6 w-6 mr-3" />
                        Absent Students ({attendanceReport.absentStudents.length})
                      </h4>
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {attendanceReport.absentStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200 hover:from-red-100 hover:to-rose-100 transition-all duration-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">{student.fullName.charAt(0)}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{student.fullName}</div>
                                <div className="text-sm text-gray-600">{student.studentIdCode}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-red-700">Not Marked</div>
                              <div className="text-xs text-red-600">Absent</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">{confirmTitle}</h3>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div className="text-gray-700 mb-6 whitespace-pre-line leading-relaxed">
                {confirmMessage.split('\n').map((line, index) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={index} className="font-bold text-gray-900 mb-3 text-lg">{line.slice(2, -2)}</p>;
                  }
                  if (line.startsWith('✨')) {
                    return <p key={index} className="text-purple-700 font-medium mb-2">{line}</p>;
                  }
                  if (line.startsWith('🕒')) {
                    return <p key={index} className="text-amber-700 font-medium">{line}</p>;
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
                  {confirmButtonText}
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

export default function AttendancePage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <AttendancePageContent />
    </Suspense>
  );
}
