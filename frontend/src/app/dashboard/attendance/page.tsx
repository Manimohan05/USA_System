'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Calendar, Users, CheckCircle, XCircle, Download, Search, Play, Pause, Settings, Clock, BookOpen, GraduationCap, User, ExternalLink } from 'lucide-react';
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    // Fetch session status when current session changes
    if (currentSession) {
      fetchSessionStatus(currentSession.id);
    }
  }, [currentSession]);

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
      setSessions(response.data);
      
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
        setCurrentSession(response.data[0]);
        await fetchSessionStatus(response.data[0].id);
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
      alert('Please fill in all fields');
      return;
    }

    // Check if there's already an active session for this batch/subject/date
    const selectedBatch = batches.find(b => b.id === parseInt(sessionBatch));
    const selectedSubject = subjects.find(s => s.id === parseInt(sessionSubject));
    const existingSession = sessions.find(s => 
      s.batchId === parseInt(sessionBatch) && 
      s.subjectId === parseInt(sessionSubject) && 
      s.sessionDate === sessionDate &&
      s.isActive
    );

    if (existingSession) {
      const batchName = `Batch ${selectedBatch?.batchYear}`;
      const subjectName = selectedSubject?.name || 'Unknown Subject';
      const formattedDate = formatDate(sessionDate);
      
      alert(`⚠️ Session Already Exists!\n\nThere is already an active attendance session for:\n• ${batchName}\n• Subject: ${subjectName}\n• Date: ${formattedDate}\n\nPlease end the existing session first or select a different date/batch/subject combination.`);
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
      alert(`✅ Session Created Successfully!\n\n${batchName} - ${subjectName}\nDate: ${formatDate(sessionDate)}\n\nStudents can now mark their attendance for this session.`);
    } catch (error: any) {
      console.error('Failed to create session:', error);
      
      // Handle specific error types with meaningful messages
      if (error.response?.data?.message?.includes('already exists')) {
        const batchName = `Batch ${selectedBatch?.batchYear}`;
        const subjectName = selectedSubject?.name || 'Unknown Subject';
        const formattedDate = formatDate(sessionDate);
        
        alert(`⚠️ Session Already Exists!\n\nA session for ${batchName} - ${subjectName} on ${formattedDate} has already been created.\n\nThis could be:\n• An active session that is currently running\n• A completed session that has ended\n\nPlease check the sessions list or choose a different date.`);
      } else if (error.response?.data?.message?.includes('Batch not found')) {
        alert('❌ Error: Selected batch not found. Please refresh the page and try again.');
      } else if (error.response?.data?.message?.includes('Subject not found')) {
        alert('❌ Error: Selected subject not found. Please refresh the page and try again.');
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to create session. Please try again.';
        alert(`❌ Failed to Create Session\n\n${errorMessage}\n\nPlease try again or contact support if the problem persists.`);
      }
    } finally {
      setCreatingSession(false);
    }
  };

  const endSession = async (sessionId: number) => {
    // Find the session being ended for better confirmation message
    const sessionToEnd = sessions.find(s => s.id === sessionId);
    const sessionInfo = sessionToEnd 
      ? `Batch ${sessionToEnd.batchYear} - ${sessionToEnd.subjectName} (${formatDate(sessionToEnd.sessionDate)})`
      : 'this session';

    if (!confirm(`🛑 END Attendance Session PERMANENTLY?\n\nSession: ${sessionInfo}\n\n⚠️ CRITICAL ACTION - This will:\n• PERMANENTLY end the attendance session\n• Send SMS notifications to parents of absent students\n• Allow 10-minute recovery window for accidental clicks\n• Cannot be reopened after 10 minutes\n\n📱 Parents will receive meaningful messages about their child's absence from today's class.\n\nAre you absolutely sure you want to END this session?`)) {
      return;
    }

    try {
      console.log('Attempting to end session permanently:', sessionId, 'for session:', sessionInfo);
      await api.put(`/admin/attendance/sessions/${sessionId}/end`);
      
      console.log('Session ended successfully, refreshing sessions list');
      // Refresh sessions list
      await fetchTodaysSessions();
      
      // Clear current session if it was the one we ended
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setSessionStatus(null);
      }
      
      alert(`✅ Session Ended Successfully!\n\nSession: ${sessionInfo}\n\n📋 Summary:\n• The attendance session has been permanently ended\n• SMS notifications have been sent to parents of absent students\n• 10-minute recovery window is now active\n\n⏱️ You have 10 minutes to reactivate if this was accidental.\n📱 Parents received meaningful messages about their child's absence.`);
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
        sessionId: currentSession.id,
      };
      
      const response = await api.post<AttendanceValidationResponseDto>('/attendance/mark-by-index', request);
      setValidationResponse(response.data);
      
      if (response.data.success) {
        setIndexInput('');
        // Refresh session status to show the new attendance
        await fetchSessionStatus(currentSession.id);
        
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



  const fetchAttendanceReport = async () => {
    if (!reportDate || !reportBatch || !reportSubject) {
      alert('Please select date, batch, and subject');
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
      console.error('Failed to fetch attendance report:', error);
      alert('Failed to fetch attendance report. Please try again.');
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
                onClick={() => setActiveTab('mark')}
                className={`flex-1 flex items-center justify-center px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'mark'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Mark Attendance
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
              {/* Multi-Session Capability Notice */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-xl shadow-lg border border-emerald-200 p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
                
                <div className="relative">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                      <ExternalLink className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">✨ Multi-Session Support</h3>
                      <p className="text-gray-700 mb-3">
                        You can now run multiple attendance sessions simultaneously! Open different sessions in separate tabs 
                        to handle concurrent classes at the same time.
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm text-emerald-700">
                        <span className="flex items-center space-x-1 bg-emerald-100 px-2 py-1 rounded-full">
                          <ExternalLink className="h-3 w-3" />
                          <span>Open sessions in new tabs</span>
                        </span>
                        <span className="flex items-center space-x-1 bg-emerald-100 px-2 py-1 rounded-full">
                          <Users className="h-3 w-3" />
                          <span>Handle multiple classes</span>
                        </span>
                        <span className="flex items-center space-x-1 bg-emerald-100 px-2 py-1 rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          <span>No need to switch between sessions</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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
                    onClick={fetchTodaysSessions}
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

                <div className="p-6">
                  {sessions.length === 0 ? (
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
                      {sessions.map((session) => (
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
                                  : session.canReactivate
                                  ? 'bg-red-100 text-red-800 ring-1 ring-red-200 animate-pulse'
                                  : session.isClosed
                                  ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200'
                                  : 'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
                              }`}>
                                {session.isActive ? '● Active' : 
                                 session.canReactivate ? '⚠ Can Recover' :
                                 session.isClosed ? '⏸ Closed' :
                                 '○ Ended'}
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
            </div>
          )}

          {/* Mark Attendance Tab */}
          {activeTab === 'mark' && (
            <div className="space-y-6">
              {/* Session Selection */}
              {!currentSession ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <Settings className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">
                        No Active Session Selected
                      </h3>
                      <div className="mt-2 text-sm text-amber-700">
                        <p>Please go to the "Sessions" tab to create or select an active attendance session before marking attendance.</p>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => setActiveTab('sessions')}
                          className="bg-amber-100 text-amber-800 px-3 py-1 rounded text-sm hover:bg-amber-200 transition-colors"
                        >
                          Go to Sessions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Attendance Marking Form */}
                  <div className="xl:col-span-2">
                    <div className="bg-white backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                      {/* Current Session Info */}
                      <div className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="p-2 bg-white/10 rounded-xl">
                                <Users className="h-5 w-5" />
                              </div>
                              <h3 className="text-lg font-bold">Current Session</h3>
                            </div>
                            <div className="space-y-2 text-indigo-100">
                              <div className="flex items-center space-x-2">
                                <GraduationCap className="h-4 w-4" />
                                <span><span className="font-medium">Batch:</span> {currentSession.batchYear}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <BookOpen className="h-4 w-4" />
                                <span><span className="font-medium">Subject:</span> {currentSession.subjectName}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span><span className="font-medium">Date:</span> {formatDate(currentSession.sessionDate)}</span>
                              </div>
                            </div>
                          </div>
                          {currentSession.isActive && (
                            <button
                              onClick={() => endSession(currentSession.id)}
                              className="group bg-red-500/20 text-white border border-red-300/30 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-red-500/30 hover:border-red-300/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-all duration-200 transform hover:scale-105"
                            >
                              <Pause className="w-4 h-4 inline mr-2 group-hover:animate-pulse" />
                              End Session
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="p-2 bg-emerald-100 rounded-xl">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">Mark Your Attendance</h2>
                        </div>
                        
                        <form onSubmit={handleSessionAttendance} className="space-y-6">
                          {/* Student ID/Index Input */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-3">
                              Student ID or Index Number
                            </label>
                            <div className="relative group">
                              <input
                                type="text"
                                value={indexInput}
                                onChange={(e) => setIndexInput(e.target.value)}
                                placeholder="Enter ID (STU001) or Index (IDX001)"
                                className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-lg font-mono bg-gray-50 hover:bg-white transition-all duration-200 group-hover:border-indigo-300"
                                required
                              />
                              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <div className="p-1 bg-indigo-100 rounded-lg group-focus-within:bg-indigo-200 transition-colors">
                                  <Search className="h-5 w-5 text-indigo-600" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Submit Button */}
                          <button
                            type="submit"
                            disabled={marking}
                            className="group w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
                          >
                            {marking ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                                <span className="animate-pulse">Marking Attendance...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-6 w-6 mr-3 group-hover:animate-bounce" />
                                <span>Mark Present</span>
                              </>
                            )}
                          </button>
                        </form>

                        {/* Validation Response */}
                        {validationResponse && (
                          <div
                            className={`mt-6 p-6 rounded-2xl border-2 shadow-lg ${
                              validationResponse.success
                                ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                                : validationResponse.errorCode === 'ALREADY_MARKED'
                                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
                                : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start space-x-4">
                              <div className={`p-3 rounded-xl ${
                                validationResponse.success
                                  ? 'bg-emerald-100'
                                  : validationResponse.errorCode === 'ALREADY_MARKED'
                                  ? 'bg-amber-100'
                                  : 'bg-red-100'
                              }`}>
                                {validationResponse.success ? (
                                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                                ) : validationResponse.errorCode === 'ALREADY_MARKED' ? (
                                  <XCircle className="h-6 w-6 text-amber-600" />
                                ) : (
                                  <XCircle className="h-6 w-6 text-red-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className={`text-lg font-bold mb-2 ${
                                  validationResponse.success
                                    ? 'text-emerald-900'
                                    : validationResponse.errorCode === 'ALREADY_MARKED'
                                    ? 'text-amber-900'
                                    : 'text-red-900'
                                }`}>
                                  {validationResponse.success ? '✓ Attendance Marked Successfully!' : '⚠ Validation Error'}
                                </h3>
                                <div className={`text-sm ${
                                  validationResponse.success
                                    ? 'text-emerald-800'
                                    : validationResponse.errorCode === 'ALREADY_MARKED'
                                    ? 'text-amber-800'
                                    : 'text-red-800'
                                }`}>
                                  <p className="font-medium">{validationResponse.message}</p>
                                  
                                  {/* Show student info if available */}
                                  {validationResponse.student && (
                                    <div className="mt-3 p-4 bg-white/60 backdrop-blur rounded-xl border border-white/50">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <User className="h-4 w-4 text-gray-600" />
                                        <p className="font-bold text-gray-900">{validationResponse.student.fullName}</p>
                                      </div>
                                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                                        <span className="flex items-center space-x-1">
                                          <span className="font-medium">ID:</span> 
                                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">{validationResponse.student.studentIdCode}</span>
                                        </span>
                                        <span className="flex items-center space-x-1">
                                          <span className="font-medium">Index:</span> 
                                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">{validationResponse.student.indexNumber}</span>
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Instructions */}
                        <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-md">
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="p-2 bg-blue-100 rounded-xl">
                              <BookOpen className="h-5 w-5 text-blue-600" />
                            </div>
                            <h4 className="text-lg font-bold text-blue-900">How to Mark Attendance</h4>
                          </div>
                          <ul className="space-y-3 text-sm text-blue-800">
                            <li className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                              <span>Enter your <strong>Student ID</strong> (e.g., STU001) or <strong>Index Number</strong> (e.g., IDX001)</span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                              <span>Ensure you're enrolled in this batch and subject</span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                              <span>You can only mark attendance <strong>once per session</strong></span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                              <span>Parents will receive SMS notification upon successful attendance</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Status - Marked Students */}
                  <div className="xl:col-span-1">
                    <div className="bg-white backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                      <div className="px-6 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-white/10 rounded-xl">
                              <Users className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold">Session Attendance Status</h3>
                          </div>
                          <p className="text-purple-100">
                            {sessionStatus?.sessionInfo || "Live attendance tracking"}
                          </p>
                        </div>
                        <button
                          onClick={() => currentSession && fetchSessionStatus(currentSession.id)}
                          disabled={loadingStatus}
                          className="group flex items-center px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          {loadingStatus ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : (
                            <Play className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                          )}
                          Refresh
                        </button>
                      </div>

                      <div className="p-6">
                        {loadingStatus ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-600 animate-pulse">Loading attendance status...</p>
                          </div>
                        ) : sessionStatus ? (
                          <>
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-6 mb-8">
                              <div className="group bg-gradient-to-br from-emerald-50 to-green-100 border-2 border-emerald-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center justify-center mb-2">
                                  <div className="p-3 bg-emerald-100 rounded-xl">
                                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                                  </div>
                                </div>
                                <div className="text-3xl font-bold text-emerald-700 mb-1">{sessionStatus.presentCount}</div>
                                <div className="text-sm font-semibold text-emerald-600">Students Present</div>
                              </div>
                              <div className="group bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-slate-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center justify-center mb-2">
                                  <div className="p-3 bg-slate-100 rounded-xl">
                                    <Users className="h-8 w-8 text-slate-600" />
                                  </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-700 mb-1">{sessionStatus.totalEnrolledStudents}</div>
                                <div className="text-sm font-semibold text-slate-600">Total Enrolled</div>
                              </div>
                            </div>

                            {/* Marked Students List */}
                            <div>
                              <div className="flex items-center space-x-2 mb-6">
                                <div className="p-2 bg-indigo-100 rounded-xl">
                                  <CheckCircle className="h-5 w-5 text-indigo-600" />
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">
                                  Students Present ({sessionStatus.presentCount})
                                </h4>
                              </div>
                              {sessionStatus.markedStudents.length === 0 ? (
                                <div className="text-center py-12">
                                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                    <Users className="h-10 w-10 text-gray-400" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Marked Yet</h3>
                                  <p className="text-gray-500">Students will appear here as they mark their attendance.</p>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                  {sessionStatus.markedStudents.map((student, index) => (
                                    <div key={`${student.studentIdCode}-${student.indexNumber}`} 
                                         className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                                      <div className="flex-1">
                                        <div className="font-semibold text-gray-900 text-sm">{student.fullName}</div>
                                        <div className="text-xs text-gray-600 font-mono">{student.studentIdCode}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs font-medium text-emerald-700">
                                          {formatDate(student.markedAt, 'time')}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-12">
                            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-100 to-rose-200 rounded-full flex items-center justify-center mb-4">
                              <Users className="h-10 w-10 text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Status</h3>
                            <p className="text-gray-500 mb-1">Could not retrieve session attendance status.</p>
                            <p className="text-sm text-gray-400">Please try refreshing or contact support if the issue persists.</p>
                          </div>
                        )}
                      </div>
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
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Attendance Report</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch
                    </label>
                    <select
                      value={reportBatch}
                      onChange={(e) => setReportBatch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select batch</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id.toString()}>
                          Batch {batch.batchYear}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <select
                      value={reportSubject}
                      onChange={(e) => setReportSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingReport ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Generate Report'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Report Results */}
              {attendanceReport && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Report Header */}
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Attendance Report - {formatDate(attendanceReport.date)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Batch {batches.find(b => b.id.toString() === reportBatch)?.batchYear} - {' '}
                        {subjects.find(s => s.id.toString() === reportSubject)?.name}
                      </p>
                    </div>
                    <button
                      onClick={downloadReport}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </button>
                  </div>

                  {/* Summary Stats */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{attendanceReport.presentStudents.length + attendanceReport.absentStudents.length}</div>
                        <div className="text-sm text-gray-500">Total Students</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{attendanceReport.presentStudents.length}</div>
                        <div className="text-sm text-gray-500">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{attendanceReport.absentStudents.length}</div>
                        <div className="text-sm text-gray-500">Absent</div>
                      </div>
                    </div>
                  </div>

                  {/* Student Lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Present Students */}
                    <div className="p-6 border-r border-gray-200">
                      <h4 className="text-sm font-medium text-green-700 uppercase tracking-wide mb-4 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Present Students ({attendanceReport.presentStudents.length})
                      </h4>
                      <div className="space-y-3">
                        {attendanceReport.presentStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{student.fullName}</div>
                              <div className="text-sm text-gray-500">{student.studentIdCode}</div>
                            </div>
                            <div className="text-sm text-green-600">
                              {formatDate(student.markedAt, 'time')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Absent Students */}
                    <div className="p-6">
                      <h4 className="text-sm font-medium text-red-700 uppercase tracking-wide mb-4 flex items-center">
                        <XCircle className="h-4 w-4 mr-2" />
                        Absent Students ({attendanceReport.absentStudents.length})
                      </h4>
                      <div className="space-y-3">
                        {attendanceReport.absentStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{student.fullName}</div>
                              <div className="text-sm text-gray-500">{student.studentIdCode}</div>
                            </div>
                            <div className="text-sm text-red-600">Not marked</div>
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
