'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/contexts/toast';
import { useNotifications } from '@/contexts/notification';
import { Calendar, Users, CheckCircle, XCircle, Download, Search, Play, Pause, Settings, Clock, BookOpen, GraduationCap, User, AlertTriangle, RotateCcw, ScanLine, Flag } from 'lucide-react';
import * as XLSX from 'xlsx';
import api, { messagingApi } from '@/lib/api';
import { formatDate, formatDateForAPI } from '@/lib/utils';
import type { 
  BatchDto, 
  SubjectDto, 
  AttendanceMarkRequest, 
  AttendanceReportDto,
  AttendanceReportRequest,
  EnhancedAttendanceReportDto,
  AttendanceSessionDto,
  AttendanceSessionCreateRequest,
  AttendanceValidationResponseDto,
  SessionAttendanceStatusDto,
  MarkedStudentDto,
  StudentDto
} from '@/types';

type TabType = 'sessions' | 'mark' | 'report';

type ReportMode = 'single' | 'student';

const sanitizeForFileName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '') || 'unknown';

const getSessionRunningDuration = (createdAt: string) => {
  const elapsedMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

function AttendancePageContent() {
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
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
  const [previousSessions, setPreviousSessions] = useState<AttendanceSessionDto[]>([]);
  // Removed showAllSessions toggle; always show today's sessions
  const [commonMarkingOpen, setCommonMarkingOpen] = useState(false);
  
  // Create Session State
  const [sessionBatch, setSessionBatch] = useState<string>('');
  const [sessionSubject, setSessionSubject] = useState<string>('');
  // Session date is always today and not user-editable
  const today = formatDateForAPI(new Date());
  const [sessionDate] = useState(today);
  const [creatingSession, setCreatingSession] = useState(false);
  
  // Mark Attendance State (Enhanced Session-based)
  const [indexInput, setIndexInput] = useState('');
  const [marking, setMarking] = useState(false);
  const [validationResponse, setValidationResponse] = useState<AttendanceValidationResponseDto | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionAttendanceStatusDto | null>(null);
  const [sessionStatusMap, setSessionStatusMap] = useState<Record<number, SessionAttendanceStatusDto>>({});
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [barcodeEnabled, setBarcodeEnabled] = useState(false);
  const barcodeBufferRef = useRef('');
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBarcodeKeyTimeRef = useRef<number>(0);
  const barcodeStartTimeRef = useRef<number>(0);
  
  // Report State
  const [reportDate, setReportDate] = useState(formatDateForAPI(new Date()));
  const [reportBatch, setReportBatch] = useState<string>('');
  const [reportSubject, setReportSubject] = useState<string>('');
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReportDto | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Enhanced Report State
  const [reportMode, setReportMode] = useState<ReportMode>('single');
  const [reportStartDate, setReportStartDate] = useState(formatDateForAPI(new Date()));
  const [reportEndDate, setReportEndDate] = useState(formatDateForAPI(new Date()));
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentDto | null>(null);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [enhancedReport, setEnhancedReport] = useState<EnhancedAttendanceReportDto | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmButtonText, setConfirmButtonText] = useState('Yes, Confirm');

  useEffect(() => {
    fetchInitialData();
    
    // Set up polling to detect auto-expired sessions
    const sessionPollingInterval = setInterval(() => {
      fetchTodaysSessions();
    }, 2 * 60 * 1000); // Poll every 2 minutes to detect auto-expirations
    
    return () => clearInterval(sessionPollingInterval);
  }, []);

  useEffect(() => {
    // Fetch sessions when showAllSessions toggle changes
    if (!loading) {
      fetchTodaysSessions();
    }
  }, [showAllSessions]);

  useEffect(() => {
    // Fetch session status when current session changes
    if (currentSession) {
      fetchSessionStatus(currentSession.id);
    }
  }, [currentSession]);

  useEffect(() => {
    const resetBuffer = () => {
      barcodeBufferRef.current = '';
      lastBarcodeKeyTimeRef.current = 0;
      barcodeStartTimeRef.current = 0;
      if (barcodeTimerRef.current) {
        clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = null;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!document.hasFocus() || !commonMarkingOpen || marking) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const key = event.key;
      const now = Date.now();
      const timeSinceLastKey = now - lastBarcodeKeyTimeRef.current;
      const resetDelayMs = 240;

      if (key === 'Enter') {
        const scannedValue = barcodeBufferRef.current;
        const scanDurationMs = barcodeStartTimeRef.current
          ? now - barcodeStartTimeRef.current
          : Number.POSITIVE_INFINITY;
        const isLikelyScan = barcodeEnabled || (scanDurationMs <= 1200 && scannedValue.length >= 4);

        resetBuffer();

        if (isLikelyScan && scannedValue.length >= 4) {
          event.preventDefault();
          event.stopPropagation();
          if (!barcodeEnabled) {
            setBarcodeEnabled(true);
          }
          handleBarcodeScan(scannedValue);
        }
        return;
      }

      if (key.length !== 1) return;

      if (timeSinceLastKey > resetDelayMs) {
        barcodeBufferRef.current = key;
        barcodeStartTimeRef.current = now;
      } else {
        barcodeBufferRef.current += key;
      }
      lastBarcodeKeyTimeRef.current = now;

      if (barcodeTimerRef.current) {
        clearTimeout(barcodeTimerRef.current);
      }
      barcodeTimerRef.current = setTimeout(() => {
        resetBuffer();
      }, resetDelayMs + 60);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resetBuffer();
    };
  }, [barcodeEnabled, commonMarkingOpen, marking]);

  // Handle clicks outside student dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showStudentDropdown && !target.closest('.student-search-container')) {
        setShowStudentDropdown(false);
      }
    };

    if (showStudentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStudentDropdown]);

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
      const endpoint = showAllSessions ? '/admin/attendance/sessions/all' : '/admin/attendance/sessions';
      const response = await api.get<AttendanceSessionDto[]>(endpoint);
      console.log('Raw sessions from backend:', response.data);
      
      // Check for auto-expired sessions (sessions that were in previousSessions but not in current response)
      if (previousSessions.length > 0) {
        const currentSessionIds = response.data.map(s => s.id);
        const expiredSessions = previousSessions.filter(prevSession => 
          !currentSessionIds.includes(prevSession.id) && 
          prevSession.isActive && // Was active before
          new Date().getTime() - new Date(prevSession.createdAt).getTime() > 60 * 60 * 1000 // Created more than 1 hour ago
        );
        
        // Add notifications for auto-expired sessions
        expiredSessions.forEach(expiredSession => {
          addNotification({
            type: 'warning',
            title: '⏰ Session Auto-Expired',
            message: `Session for ${expiredSession.batchDisplayName || `Batch ${expiredSession.batchYear}`} - ${expiredSession.subjectName} has been automatically expired after 1 hour.\n\n📱 SMS notifications sent to parents of absent students.`,
            sessionId: expiredSession.id,
            batchYear: expiredSession.batchDisplayName || expiredSession.batchYear,
            subjectName: expiredSession.subjectName
          });
        });
      }
      
      // Save current sessions as previous for next comparison
      setPreviousSessions(response.data);
      
      // Log each session's details for debugging
      response.data.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          id: session.id,
          batch: session.batchDisplayName,
          batchYear: session.batchYear,
          subject: session.subjectName,
          createdAt: session.createdAt,
          isActive: session.isActive,
          canReactivate: session.canReactivate,
          isClosed: session.isClosed,
          sessionDate: session.sessionDate
        });
      });
      
      // Trust the backend for session management - no frontend filtering
      console.log('All sessions from backend:', response.data);
      console.log('Active sessions:', response.data.filter(s => s.isActive));
      console.log('Ended sessions:', response.data.filter(s => !s.isActive));
      setSessions(response.data);

      const activeSessions = response.data.filter(session => session.isActive);
      if (activeSessions.length === 0) {
        setSessionStatusMap({});
      } else {
        const statusEntries = await Promise.all(
          activeSessions.map(async (session) => {
            try {
              const statusRes = await api.get<SessionAttendanceStatusDto>(`/attendance/sessions/${session.id}/status`);
              return [session.id, statusRes.data] as const;
            } catch {
              return [session.id, null] as const;
            }
          })
        );

        const nextStatusMap: Record<number, SessionAttendanceStatusDto> = {};
        statusEntries.forEach(([id, status]) => {
          if (status) {
            nextStatusMap[id] = status;
          }
        });
        setSessionStatusMap(nextStatusMap);
      }
      
      // Auto-select session from URL parameter if available
      if (sessionIdFromUrl) {
        const targetSession = response.data.find(s => s.id === parseInt(sessionIdFromUrl));
        if (targetSession) {
          setCurrentSession(targetSession);
          await fetchSessionStatus(targetSession.id);
          return;
        }
      }
      
      // Auto-select the first active session if available and no URL param
      if (response.data.length > 0 && !currentSession) {
        const firstActiveSession = response.data.find(s => s.isActive) || response.data[0];
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
    
    // Check for existing active session
    const existingSession = sessions.find(s => 
      s.batchId === parseInt(sessionBatch) && 
      s.subjectId === parseInt(sessionSubject) && 
      s.sessionDate === sessionDate &&
      s.isActive
    );

    if (existingSession) {
      const batchName = selectedBatch?.displayName || 'Unknown Batch';
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
      
      const batchName = selectedBatch?.displayName || 'Unknown Batch';
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
        const batchName = selectedBatch?.displayName || 'Unknown Batch';
        const subjectName = selectedSubject?.name || 'Unknown Subject';
        const formattedDate = formatDate(sessionDate);
        
        // Debug: Check what sessions actually exist
        console.log('Session creation failed - Current sessions:', sessions);
        console.log('Looking for:', { batchId: parseInt(sessionBatch), subjectId: parseInt(sessionSubject), sessionDate });
        
        // Use the backend's error message if it's about active sessions
        if (error.response?.data?.message?.includes('ACTIVE attendance session already exists')) {
          const backendMessage = error.response.data.message;
          // Extract session ID from message if present
          const sessionIdMatch = backendMessage.match(/Session ID: (\d+)/);
          const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;
          
          addToast({
            type: 'warning',
            title: '⚠️ Active Session Already Running',
            message: `There is already an ACTIVE session for:\n\n• ${batchName}\n• Subject: ${subjectName}\n• Date: ${formattedDate}${sessionId ? `\n• Session ID: ${sessionId}` : ''}\n\n💡 You need to END the current session first before creating a new one.\n\n🔍 Check the "Today's Active Sessions" section above.`,
            duration: 12000
          });
          return;
        }
        
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
            title: '⚠️ Active Session Detected',
            message: `There is already an ACTIVE session running for:\n\n• ${batchName}\n• Subject: ${subjectName}\n• Date: ${formattedDate}\n• Session ID: ${activeSession.id}\n\n💡 Please END the current session first before creating a new one.\n\n🔍 Look in the "Today's Active Sessions" section above.`,
            duration: 10000
          });
        } else if (endedSession) {
          addToast({
            type: 'info',
            title: '🔄 Session Already Exists (Ended)',
            message: `A session for ${batchName} - ${subjectName} on ${formattedDate} was already created and Fully Ended.`,
            duration: 12000
          });
        } else {
          // If we can't find the conflicting session in our current list, it might be a sync issue
          addToast({
            type: 'warning',
            title: '🔄 Session Data Out of Sync',
            message: `Unable to create session for ${batchName} - ${subjectName} on ${formattedDate}.\n\n🔄 The session list might be outdated.`,
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

    const sessionInfo = sessionToEnd 
      ? `${sessionToEnd.batchDisplayName || `Batch ${sessionToEnd.batchYear}`} - ${sessionToEnd.subjectName} (${formatDate(sessionToEnd.sessionDate)})`
      : 'this session';

    // Show confirmation modal
    setConfirmTitle('⏸️ End Session Confirmation');
    setConfirmMessage(`**${sessionInfo}**\n\n⚠️ This will temporarily end the session  , \n\n🔄 Ended sessions can be reopened anytime from the recovery section.\n\n💡Note: Sessions fully ended within 5 minutes of creation will be deleted without SMS.`);
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
        title: '⏸️ Session Ended',
        message: `${sessionInfo} has been temporarily ended.\n\n Session can be reopened anytime.`,
        duration: 10000
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
    const sessionInfo = `${session.batchDisplayName || `Batch ${session.batchYear}`} - ${session.subjectName} (${formatDate(session.sessionDate)})`;

    // Calculate minutes since session creation
    const sessionCreatedAt = new Date(session.createdAt);
    const now = new Date();
    const minutesSinceCreation = Math.floor((now.getTime() - sessionCreatedAt.getTime()) / (1000 * 60));
    
    const isWithin5Minutes = minutesSinceCreation < 5;

    if (isWithin5Minutes) {
      // Within 5 minutes - will be deleted without SMS
      setConfirmTitle('🗑️ Delete Session?');
      setConfirmMessage(`Session created ${minutesSinceCreation} minute(s) ago.\n\n${sessionInfo}\n\n🗑️ This session will be COMPLETELY DELETED:\n\n💡 This is safe for mistakenly created sessions within 5 minutes.`);
      setConfirmButtonText('Yes, Delete Session');
    } else {
      // After 5 minutes - will send SMS
      setConfirmTitle('🔒 Permanently End Session?');
      setConfirmMessage(`Session created ${minutesSinceCreation} minute(s) ago.\n\n${sessionInfo}\n\n📱 This action will:\n• Permanently close the session (cannot be reopened)\n• Send SMS notifications to parents of absent students\n• Remove the session from the dashboard\n\n⚠️ This action cannot be undone!`);
      setConfirmButtonText('Yes, Permanently End & Send SMS');
    }
    
    setConfirmAction(() => async () => {
      setShowConfirmModal(false);
      try {
        await messagingApi.delete(`/admin/attendance/sessions/${sessionId}/fully-end`);
        
        // Remove the session from the list since it's now fully ended or deleted
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        
        if (isWithin5Minutes) {
          addToast({
            type: 'success',
            title: '🗑️ Session Deleted Successfully',
            message: 'The session has been completely deleted.\n\nNo SMS notifications were sent to parents.',
            duration: 8000
          });
        } else {
          addToast({
            type: 'success',
            title: '🔒 Session Permanently Ended',
            message: 'The session has been permanently closed and removed.\n\nSMS notifications have been sent to parents of absent students.\n\nThis action cannot be undone.',
            duration: 12000
          });
        }
      } catch (error: any) {
        const timeoutMessage = error.code === 'ECONNABORTED'
          ? 'Request timed out while processing SMS notifications. Please wait a moment and refresh sessions to confirm the final state.'
          : null;

        addToast({
          type: 'error',
          title: '❌ Failed to Process Session',
          message: `Error: ${timeoutMessage || error.response?.data?.message || 'Please try again.'}`,
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
      
      const batchName = session.batchDisplayName || `Batch ${session.batchYear}`;
      const subjectName = session.subjectName;
      const sessionInfo = `${batchName} - ${subjectName} (${formatDate(session.sessionDate)})`;
      
      // Show confirmation modal - make sure this is for REOPENING, not ending
      setConfirmTitle('🔄 Reopen Session Confirmation');
      setConfirmMessage(`**${sessionInfo}**\n\n✨ This will REACTIVATE the session for continued attendance marking.`);
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
      const updatedSessions = await api.get<AttendanceSessionDto[]>('/admin/attendance/sessions');
      const reopenedSession = updatedSessions.data.find(s => s.id === sessionId);
      if (reopenedSession) {
        setCurrentSession(reopenedSession);
        await fetchSessionStatus(reopenedSession.id);
      }
      
      addToast({
        type: 'success',
        title: '🔄 Session Reopened Successfully!',
        message: `**${sessionInfo}** is now active again.\n\n Students can mark attendance.`,
        duration: 10000
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

  const markAttendanceByCommon = async (rawIndex: string) => {
    if (!commonMarkingOpen) {
      setValidationResponse({
        success: false,
        message: 'Open Attendance Marking from the Today\'s Sessions card first.',
        errorCode: 'COMMON_MARKING_NOT_OPEN'
      });
      return;
    }

    const normalizedIndex = rawIndex.trim().toUpperCase();
    if (!normalizedIndex) {
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
      const response = await api.post<AttendanceValidationResponseDto>('/attendance/mark-by-index-auto', {
        indexNumber: normalizedIndex,
      });
      setValidationResponse(response.data);

      if (response.data.success) {
        setIndexInput('');
        setTimeout(() => setValidationResponse(null), 5000);
      }

      setTimeout(async () => {
        await fetchTodaysSessions();
        const message = response.data.message || '';
        const sessionIdMatch = message.match(/Session ID: (\d+)/);
        if (sessionIdMatch) {
          const detectedSessionId = parseInt(sessionIdMatch[1], 10);
          await fetchSessionStatus(detectedSessionId);
        }
      }, 100);
    } catch (error: any) {
      if (error.response?.data && typeof error.response.data === 'object' && 'success' in error.response.data) {
        setValidationResponse(error.response.data as AttendanceValidationResponseDto);
        setTimeout(async () => {
          await fetchTodaysSessions();
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

  const handleSessionAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    await markAttendanceByCommon(indexInput);
  };

  const handleBarcodeScan = async (rawValue: string) => {
    if (!commonMarkingOpen || marking) return;

    const normalizedValue = rawValue.trim().toUpperCase();
    if (!normalizedValue) return;

    setIndexInput(normalizedValue);
    await markAttendanceByCommon(normalizedValue);
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

  const downloadReport = (format: 'csv' | 'xlsx' = 'csv') => {
    if (!attendanceReport) return;

    const reportRows = [
      ...attendanceReport.presentStudents.map(student => ({
        'Student ID': student.studentIdCode,
        'Full Name': student.fullName,
        'Status': 'Present',
        'Marked At': formatDate(student.markedAt, 'time')
      })),
      ...attendanceReport.absentStudents.map(student => ({
        'Student ID': student.studentIdCode,
        'Full Name': student.fullName,
        'Status': 'Absent',
        'Marked At': '-'
      }))
    ];

    const selectedBatchName =
      batches.find(b => b.id.toString() === reportBatch)?.displayName || `batch_${reportBatch}`;
    const selectedSubjectName =
      subjects.find(s => s.id.toString() === reportSubject)?.name || `subject_${reportSubject}`;
    const baseFilename = `${sanitizeForFileName(selectedBatchName)}_attendance_report_${reportDate}_${sanitizeForFileName(selectedSubjectName)}`;

    if (format === 'csv') {
      const csvContent = [
        ['Student ID', 'Full Name', 'Status', 'Marked At'],
        ...reportRows.map(row => [row['Student ID'], row['Full Name'], row['Status'], row['Marked At']])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseFilename}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    const ws = XLSX.utils.json_to_sheet(reportRows);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 30 },
      { wch: 12 },
      { wch: 16 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
  };

  // Enhanced Report Functions
  const loadStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await api.get<StudentDto[]>('/admin/students');
      setStudents(response.data);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Load Students',
        message: 'Unable to fetch students list. Please try again.',
        duration: 5000
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchEnhancedReport = async () => {
    // Validate inputs based on report mode
    if (reportMode === 'student') {
      console.log('Validating student report fields:', {
        selectedStudent,
        reportStartDate,
        reportEndDate,
        studentIdCode: selectedStudent?.studentIdCode
      });
      
      if (!selectedStudent) {
        addToast({
          type: 'warning',
          title: 'Missing Information',
          message: 'Please select a student for the report.',
          duration: 4000
        });
        return;
      }
      
      if (!reportStartDate || !reportEndDate) {
        addToast({
          type: 'warning',
          title: 'Missing Information',
          message: 'Please select both start and end dates for the report.',
          duration: 4000
        });
        return;
      }
      
      if (new Date(reportStartDate) > new Date(reportEndDate)) {
        addToast({
          type: 'warning',
          title: 'Invalid Date Range',
          message: 'Start date must be before or equal to end date.',
          duration: 4000
        });
        return;
      }
    }

    setLoadingReport(true);
    try {
      const requestBody: AttendanceReportRequest = {};

      // Set date parameters for student mode
      if (reportMode === 'student') {
        requestBody.startDate = reportStartDate;
        requestBody.endDate = reportEndDate;
        requestBody.studentIdCode = selectedStudent?.studentIdCode;
        if (reportSubject) {
          requestBody.subjectId = parseInt(reportSubject);
        }
      }

      console.log('Sending enhanced report request:', requestBody);
      const response = await api.post<EnhancedAttendanceReportDto>('/admin/attendance/enhanced-report', requestBody);
      setEnhancedReport(response.data);
      setAttendanceReport(null); // Clear old report
    } catch (error) {
      console.error('Enhanced report error:', error);
      addToast({
        type: 'error',
        title: 'Failed to Generate Enhanced Report',
        message: 'Unable to fetch enhanced attendance report. Please try again.',
        duration: 5000
      });
    } finally {
      setLoadingReport(false);
    }
  };

  const downloadEnhancedReport = (format: 'csv' | 'xlsx' = 'csv') => {
    if (!enhancedReport) return;
    
    // Separate present and absent records
    const presentRecords = enhancedReport.attendanceRecords.filter(r => r.status === 'Present');
    const absentRecords = enhancedReport.attendanceRecords.filter(r => r.status === 'Absent');
    
    // Create CSV content with clear sections
    const csvHeaders = ['Date', 'Student ID', 'Student Name', 'Subject', 'Status', 'Marked At'];
    
    // Build CSV rows with separate sections
    const csvRows = [
      csvHeaders,
      [], // Empty row
      ['PRESENT STUDENTS (' + presentRecords.length + ')'],
      csvHeaders,
      ...presentRecords.map(record => [
        record.sessionDate,
        record.studentIdCode,
        record.studentName,
        record.subjectName,
        record.status,
        record.markedAt ? formatDate(record.markedAt, 'datetime') : '-'
      ]),
      [], // Empty row
      ['ABSENT STUDENTS (' + absentRecords.length + ')'],
      csvHeaders,
      ...absentRecords.map(record => [
        record.sessionDate,
        record.studentIdCode,
        record.studentName,
        record.subjectName,
        record.status,
        record.markedAt ? formatDate(record.markedAt, 'datetime') : '-'
      ])
    ];
    
    // Generate filename based on report type
    const dateRange = `${enhancedReport.startDate}_to_${enhancedReport.endDate}`;
    const filename = enhancedReport.studentName
      ? `${sanitizeForFileName(enhancedReport.studentIdCode || 'student')}_${sanitizeForFileName(enhancedReport.studentName)}_attendance_report_${dateRange}`
      : `${sanitizeForFileName(enhancedReport.batchName)}_attendance_report_${sanitizeForFileName(enhancedReport.subjectName)}_${dateRange}`;

    if (format === 'csv') {
      const csvContent = csvRows.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    const presentSheetData = presentRecords.map(record => ({
      Date: record.sessionDate,
      'Student ID': record.studentIdCode,
      'Student Name': record.studentName,
      Subject: record.subjectName,
      Status: record.status,
      'Marked At': record.markedAt ? formatDate(record.markedAt, 'datetime') : '-'
    }));

    const absentSheetData = absentRecords.map(record => ({
      Date: record.sessionDate,
      'Student ID': record.studentIdCode,
      'Student Name': record.studentName,
      Subject: record.subjectName,
      Status: record.status,
      'Marked At': record.markedAt ? formatDate(record.markedAt, 'datetime') : '-'
    }));

    const summarySheetData = [
      { Metric: 'Start Date', Value: enhancedReport.startDate },
      { Metric: 'End Date', Value: enhancedReport.endDate },
      { Metric: 'Present Students', Value: presentRecords.length },
      { Metric: 'Absent Students', Value: absentRecords.length },
      { Metric: 'Total Records', Value: enhancedReport.attendanceRecords.length }
    ];

    const wb = XLSX.utils.book_new();
    const summaryWs = XLSX.utils.json_to_sheet(summarySheetData);
    const presentWs = XLSX.utils.json_to_sheet(presentSheetData);
    const absentWs = XLSX.utils.json_to_sheet(absentSheetData);

    summaryWs['!cols'] = [{ wch: 20 }, { wch: 30 }];
    presentWs['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 22 }];
    absentWs['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 22 }];

    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    XLSX.utils.book_append_sheet(wb, presentWs, 'Present');
    XLSX.utils.book_append_sheet(wb, absentWs, 'Absent');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const filterStudents = (searchTerm: string) => {
    const normalizedTerm = searchTerm.toLowerCase();
    return students.filter(student =>
      student.fullName.toLowerCase().includes(normalizedTerm) ||
      student.studentIdCode.toLowerCase().includes(normalizedTerm) ||
      (student.nic && student.nic.toLowerCase().includes(normalizedTerm))
    );
  };

  const handleStudentSearch = (value: string) => {
    setStudentSearch(value);
    setShowStudentDropdown(true);
    if (!students.length) {
      loadStudents();
    }
  };

  const selectStudent = (student: StudentDto) => {
    setSelectedStudent(student);
    setStudentSearch(student.fullName);
    setShowStudentDropdown(false);
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
        <div className="space-y-4">
          {/* Modern Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative px-6 py-6">
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
            <div className="space-y-4">
              {/* Create New Session */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl shadow-lg border border-indigo-100 p-4">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-200 to-indigo-200 rounded-full translate-y-12 -translate-x-12 opacity-20"></div>
                
                {/* Header */}
                <div className="relative mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Create Attendance Session</h2>
                      <p className="text-xs text-gray-600">Start a new session to track student attendance</p>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={createSession} className="relative grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 mb-2">
                      <Users className="h-4 w-4 text-indigo-500" />
                      <span>Batch</span>
                    </label>
                    <select
                      value={sessionBatch}
                      onChange={(e) => setSessionBatch(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 text-sm"
                      required
                    >
                      <option value="">Select batch</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id.toString()}>
                          {batch.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      <span>Subject</span>
                    </label>
                    <select
                      value={sessionSubject}
                      onChange={(e) => setSessionSubject(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 text-sm"
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
                    <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      <span>Date</span>
                    </label>
                    <div className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-700 text-sm cursor-not-allowed select-none">
                      {today}
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={creatingSession}
                      className="group w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-xl active:scale-95"
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
                <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      Today's Active Sessions
                    </h2>
                  </div>
                  {/* Removed Show All Sessions toggle button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        window.open('/dashboard/attendance/common-marking', '_blank');
                      }}
                      disabled={sessions.filter(session => session.isActive).length === 0}
                      className="group flex items-center px-4 py-2 text-sm font-semibold bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Users className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                      Open Marking
                    </button>
                    <button
                      onClick={() => {
                        console.log('Manual refresh clicked');
                        fetchTodaysSessions();
                      }}
                      disabled={loadingSessions}
                      className="group flex items-center px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {loadingSessions ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <Play className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                      )}
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {sessions.filter(session => session.isActive).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Sessions</h3>
                      <p className="text-gray-500 mb-1">No sessions are currently running for today.</p>
                      <p className="text-sm text-gray-400">Create a new session above to start marking attendance.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sessions.filter(session => session.isActive).map((session) => {
                        const sessionCardStatus = sessionStatusMap[session.id];
                        const absentCount = sessionCardStatus
                          ? Math.max(0, sessionCardStatus.totalEnrolledStudents - sessionCardStatus.presentCount)
                          : '--';

                        return (
                        <div
                          key={session.id}
                          className={`active-session-card group relative p-3 rounded-xl border-2 transition-all duration-300 hover:shadow-lg flex flex-col ${
                            currentSession?.id === session.id
                              ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg ring-2 ring-indigo-100'
                              : 'border-gray-100 hover:border-indigo-200 bg-white hover:shadow-md hover:bg-gradient-to-br hover:from-gray-50 hover:to-indigo-50'
                          }`}
                        >
                          <div 
                            className="cursor-pointer flex-1 min-h-0"
                            onClick={() => {
                              setCurrentSession(session);
                              fetchSessionStatus(session.id);
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-1.5">
                                <div className={`p-1.5 rounded-lg ${currentSession?.id === session.id ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-indigo-100'}`}>
                                  <Users className={`h-4 w-4 ${currentSession?.id === session.id ? 'text-indigo-600' : 'text-gray-600 group-hover:text-indigo-600'}`} />
                                </div>
                                <h3 className="font-bold text-sm text-gray-900">
                                  {session.batchDisplayName || `Batch ${session.batchYear}`}
                                </h3>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`active-session-badge px-3 py-1 text-xs font-semibold rounded-full ${
                                  session.isActive 
                                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' 
                                    : 'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
                                }`}>
                                  {session.isActive ? '● Active' : '○ Ended'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                    Present: {sessionCardStatus ? sessionCardStatus.presentCount : '--'}
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                    Absent: {absentCount}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-gray-900 truncate">{session.subjectName}</p>
                              <p className="text-xs text-gray-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDate(session.sessionDate)}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Running: {getSessionRunningDuration(session.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            {session.isActive && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  endSession(session.id);
                                }}
                                className="active-session-end-btn group w-full bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200 rounded-lg px-2 py-1.5 text-xs font-semibold hover:from-red-100 hover:to-rose-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                                title="End session without sending SMS (can be reopened)"
                              >
                                <Pause className="w-3 h-3 inline mr-1 group-hover:animate-pulse" />
                                END SESSION
                              </button>
                            )}
                          </div>
                        </div>
                      );})}
                    </div>
                  )}
                </div>
              </div>

              {/* Recovery Section - Ended Sessions */}
              <div className="bg-white backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <RotateCcw className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Recovery Section</h2>
                      <p className="text-orange-100 text-sm">Ended sessions that can be reopened anytime</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {sessions.filter(session => session.canReactivate).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-200 rounded-full flex items-center justify-center mb-4">
                        <RotateCcw className="h-12 w-12 text-orange-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recoverable Sessions</h3>
                      <p className="text-gray-500 mb-1">All ended sessions are either active or permanently ended.</p>
                      <p className="text-sm text-gray-400">Only temporarily ended sessions appear here for recovery.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sessions.filter(session => session.canReactivate).map((session) => (
                        <div
                          key={`ended-${session.id}`}
                          className="recovery-session-card group relative p-3 rounded-xl border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 hover:border-orange-200 transition-all duration-300 hover:shadow-lg flex flex-col"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-1.5">
                              <div className="p-1.5 rounded-lg bg-orange-100">
                                <Users className="h-4 w-4 text-orange-600" />
                              </div>
                              <h3 className="font-bold text-sm text-gray-900">
                                {session.batchDisplayName || `Batch ${session.batchYear}`}
                              </h3>
                            </div>
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 ring-1 ring-gray-200">
                              ○ Ended
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-2 flex-1 min-h-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{session.subjectName}</p>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(session.sessionDate)}
                            </p>
                          </div>
                          
                          <div className="space-y-1.5">
                            <button
                              onClick={() => reopenSession(session.id)}
                              className="recovery-session-reopen-btn group w-full bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200 rounded-lg px-2 py-1.5 text-xs font-semibold hover:from-orange-100 hover:to-amber-100 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                            >
                              <RotateCcw className="w-3 h-3 inline mr-1 group-hover:animate-spin" />
                              Reopen Session
                            </button>
                            <button
                              onClick={() => fullyEndSession(session.id, session)}
                              className="recovery-session-end-btn group w-full bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200 rounded-lg px-2 py-1.5 text-xs font-semibold hover:from-red-100 hover:to-rose-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                              title="Permanently end session and send SMS notifications"
                            >
                              <XCircle className="w-3 h-3 inline mr-1 group-hover:animate-pulse" />
                              Fully End
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'report' && (
            <div className="space-y-4">
              {/* Report Mode Selection */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-4">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Enhanced Attendance Reports</h2>
                    <p className="text-gray-600">Generate comprehensive reports with advanced filtering options</p>
                  </div>
                </div>
                
                {/* Report Mode Tabs */}
                <div className="flex space-x-1 mb-4 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setReportMode('single')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      reportMode === 'single'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Single Day
                  </button>
                  <button
                    onClick={() => setReportMode('student')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                      reportMode === 'student'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Student Report
                  </button>
                </div>

                {/* Single Day Report Form */}
                {reportMode === 'single' && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 mb-2">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        <span>Date</span>
                      </label>
                      <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 text-sm"
                      />
                    </div>
                    
                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 mb-2">
                        <Users className="h-4 w-4 text-indigo-500" />
                        <span>Batch</span>
                      </label>
                      <select
                        value={reportBatch}
                        onChange={(e) => setReportBatch(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 text-sm"
                      >
                        <option value="">Select batch</option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id.toString()}>
                            {batch.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 mb-2">
                        <BookOpen className="h-4 w-4 text-indigo-500" />
                        <span>Subject</span>
                      </label>
                      <select
                        value={reportSubject}
                        onChange={(e) => setReportSubject(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 text-sm"
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
                        className="group w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-xl active:scale-95"
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
                )}



                {/* Student Report Form */}
                {reportMode === 'student' && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="group relative">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 mb-2">
                        <User className="h-4 w-4 text-indigo-500" />
                        <span>Student</span>
                      </label>
                      <div className="relative student-search-container">
                        <input
                          type="text"
                          placeholder="Search student by name, ID, or NIC..."
                          value={studentSearch}
                          onChange={(e) => handleStudentSearch(e.target.value)}
                          onFocus={() => setShowStudentDropdown(true)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 text-sm"
                        />
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        
                        {showStudentDropdown && studentSearch && (
                          <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                            {loadingStudents ? (
                              <div className="p-4 text-center">
                                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                <span className="text-sm text-gray-500">Loading students...</span>
                              </div>
                            ) : (
                              filterStudents(studentSearch).slice(0, 10).map((student) => (
                                <div
                                  key={student.id}
                                  onClick={() => selectStudent(student)}
                                  className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-semibold text-gray-900">{student.fullName}</div>
                                  <div className="text-sm text-gray-600">{student.studentIdCode}</div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 mb-2">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        <span>Start Date</span>
                      </label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 text-sm"
                      />
                    </div>
                    
                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 mb-2">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        <span>End Date</span>
                      </label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 text-sm"
                      />
                    </div>
                    
                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 mb-2">
                        <BookOpen className="h-4 w-4 text-indigo-500" />
                        <span>Subject (Optional)</span>
                      </label>
                      <select
                        value={reportSubject}
                        onChange={(e) => setReportSubject(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-indigo-300 text-sm"
                      >
                        <option value="">All subjects</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                {reportMode === 'student' && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={fetchEnhancedReport}
                      disabled={loadingReport}
                      className="group flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-xl active:scale-95"
                    >
                      {loadingReport ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                          <span className="animate-pulse">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Settings className="h-5 w-5 mr-3 group-hover:animate-bounce" />
                          <span>Generate Student Report</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Legacy Report Results (Single Day) */}
              {attendanceReport && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Attendance Report</h3>
                        <p className="text-emerald-100">
                          {formatDate(attendanceReport.date)} • {batches.find(b => b.id.toString() === reportBatch)?.displayName} • {subjects.find(s => s.id.toString() === reportSubject)?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadReport('csv')}
                        className="flex items-center px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-200 text-white font-semibold hover:scale-105 shadow-lg"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        CSV
                      </button>
                      <button
                        onClick={() => downloadReport('xlsx')}
                        className="flex items-center px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-200 text-white font-semibold hover:scale-105 shadow-lg"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Excel
                      </button>
                    </div>
                  </div>

                  <div className="px-4 py-4 bg-gradient-to-br from-gray-50 to-indigo-50">
                    <div className="grid grid-cols-3 gap-6">
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

                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="p-4 border-r border-gray-200">
                      <h4 className="text-lg font-bold text-emerald-700 mb-4 flex items-center">
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

                    <div className="p-4">
                      <h4 className="text-lg font-bold text-red-700 mb-4 flex items-center">
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

              {/* Enhanced Report Results */}
              {enhancedReport && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          {enhancedReport.studentName ? 'Student Attendance Report' : 'Enhanced Attendance Report'}
                        </h3>
                        <p className="text-purple-100">
                          {formatDate(enhancedReport.startDate)} to {formatDate(enhancedReport.endDate)}
                          {enhancedReport.studentName && ` • ${enhancedReport.studentName}`}
                          {enhancedReport.batchName && ` • ${enhancedReport.batchName}`}
                          {enhancedReport.subjectName && ` • ${enhancedReport.subjectName}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadEnhancedReport('csv')}
                        className="flex items-center px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-200 text-white font-semibold hover:scale-105 shadow-lg"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        CSV
                      </button>
                      <button
                        onClick={() => downloadEnhancedReport('xlsx')}
                        className="flex items-center px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-200 text-white font-semibold hover:scale-105 shadow-lg"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Excel
                      </button>
                    </div>
                  </div>

                  {/* Student-specific stats */}
                  {enhancedReport.studentName && enhancedReport.totalClassDays > 0 && (
                    <div className="px-4 py-4 bg-gradient-to-br from-gray-50 to-purple-50">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Calendar className="h-8 w-8 text-white" />
                          </div>
                          <div className="text-3xl font-bold text-gray-900">{enhancedReport.totalClassDays}</div>
                          <div className="text-sm font-medium text-gray-600">Total Classes</div>
                        </div>
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="h-8 w-8 text-white" />
                          </div>
                          <div className="text-3xl font-bold text-emerald-600">{enhancedReport.totalPresentDays}</div>
                          <div className="text-sm font-medium text-gray-600">Present</div>
                        </div>
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <XCircle className="h-8 w-8 text-white" />
                          </div>
                          <div className="text-3xl font-bold text-red-600">{enhancedReport.totalClassDays - enhancedReport.totalPresentDays}</div>
                          <div className="text-sm font-medium text-gray-600">Absent</div>
                        </div>
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <GraduationCap className="h-8 w-8 text-white" />
                          </div>
                          <div className="text-3xl font-bold text-purple-600">{enhancedReport.attendancePercentage.toFixed(1)}%</div>
                          <div className="text-sm font-medium text-gray-600">Attendance Rate</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Present and Absent Students Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="p-8 border-r border-gray-200">
                      <h4 className="text-lg font-bold text-emerald-700 mb-6 flex items-center">
                        <CheckCircle className="h-6 w-6 mr-3" />
                        Present Records ({enhancedReport.attendanceRecords.filter(r => r.status === 'Present').length})
                      </h4>
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {enhancedReport.attendanceRecords
                          .filter(record => record.status === 'Present')
                          .map((record, index) => (
                            <div key={`present-${index}`} className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 hover:from-emerald-100 hover:to-green-100 transition-all duration-200">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm">{record.studentName.charAt(0)}</span>
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900">{record.studentName}</div>
                                  <div className="text-sm text-gray-600">{record.studentIdCode}</div>
                                  <div className="text-xs text-emerald-600">
                                    {formatDate(record.sessionDate)} • {record.subjectName}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-emerald-700">
                                  {record.markedAt ? formatDate(record.markedAt, 'time') : 'Present'}
                                </div>
                                <div className="text-xs text-emerald-600">Marked</div>
                              </div>
                            </div>
                          ))}
                        {enhancedReport.attendanceRecords.filter(r => r.status === 'Present').length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No present records found</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-8">
                      <h4 className="text-lg font-bold text-red-700 mb-6 flex items-center">
                        <XCircle className="h-6 w-6 mr-3" />
                        Absent Records ({enhancedReport.attendanceRecords.filter(r => r.status === 'Absent').length})
                      </h4>
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {enhancedReport.attendanceRecords
                          .filter(record => record.status === 'Absent')
                          .map((record, index) => (
                            <div key={`absent-${index}`} className="flex items-center justify-between p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200 hover:from-red-100 hover:to-rose-100 transition-all duration-200">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm">{record.studentName.charAt(0)}</span>
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900">{record.studentName}</div>
                                  <div className="text-sm text-gray-600">{record.studentIdCode}</div>
                                  <div className="text-xs text-red-600">
                                    {formatDate(record.sessionDate)} • {record.subjectName}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-red-700">Not Marked</div>
                                <div className="text-xs text-red-600">Absent</div>
                              </div>
                            </div>
                          ))}
                        {enhancedReport.attendanceRecords.filter(r => r.status === 'Absent').length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <XCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No absent records found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attendance Records Table */}
                  <div className="p-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                      <Users className="h-6 w-6 mr-3" />
                      Attendance Records ({enhancedReport.attendanceRecords.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full table-auto">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Subject</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Marked At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {enhancedReport.attendanceRecords.map((record, index) => (
                              <tr key={index} className={`hover:bg-gray-50 ${record.status === 'Present' ? 'bg-green-50' : 'bg-red-50'}`}>
                                <td className="px-4 py-3 text-sm text-gray-900">{formatDate(record.sessionDate)}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${record.status === 'Present' ? 'bg-green-500' : 'bg-red-500'}`}>
                                      <span className="text-white font-semibold text-xs">{record.studentName.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900">{record.studentName}</div>
                                      <div className="text-xs text-gray-500">{record.studentIdCode}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{record.subjectName}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    record.status === 'Present' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {record.status === 'Present' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                    {record.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {record.markedAt ? formatDate(record.markedAt, 'time') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
