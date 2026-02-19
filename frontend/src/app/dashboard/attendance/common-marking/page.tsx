'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/contexts/toast';
import { Calendar, CheckCircle, XCircle, ScanLine, User, Search, Flag, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AttendanceSessionDto, AttendanceValidationResponseDto, SessionAttendanceStatusDto } from '@/types';

export default function CommonMarkingPage() {
  const { addToast } = useToast();
  const router = useRouter();

  const [sessions, setSessions] = useState<AttendanceSessionDto[]>([]);
  const [sessionStatuses, setSessionStatuses] = useState<SessionAttendanceStatusDto[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [indexInput, setIndexInput] = useState('');
  const [marking, setMarking] = useState(false);
  const [validationResponse, setValidationResponse] = useState<AttendanceValidationResponseDto | null>(null);
  const [barcodeEnabled, setBarcodeEnabled] = useState(false);

  const barcodeBufferRef = useRef('');
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBarcodeKeyTimeRef = useRef<number>(0);
  const barcodeStartTimeRef = useRef<number>(0);
  const feeDueAudioRef = useRef<HTMLAudioElement | null>(null);
  const feeDueAudioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFeeDuePeriod = () => {
    const today = new Date();
    return today.getDate() >= 5;
  };

  const playFeeDueAlert = useCallback(async () => {
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
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const response = await api.get<AttendanceSessionDto[]>('/admin/attendance/sessions/all');
      const activeSessions = response.data.filter(session => session.isActive);
      setSessions(activeSessions);

      const statuses = await Promise.all(
        activeSessions.map(async (session) => {
          const statusRes = await api.get<SessionAttendanceStatusDto>(`/attendance/sessions/${session.id}/status`);
          return statusRes.data;
        })
      );
      setSessionStatuses(statuses);
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to Load Sessions',
        message: 'Unable to load active sessions. Please refresh.',
        duration: 5000,
      });
    } finally {
      setLoadingSessions(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const totalEnrolled = sessionStatuses.reduce((sum, status) => sum + status.totalEnrolledStudents, 0);
  const totalPresent = sessionStatuses.reduce((sum, status) => sum + status.presentCount, 0);
  const totalAbsent = Math.max(0, totalEnrolled - totalPresent);

  const markedStudentsWithSession = sessionStatuses
    .flatMap((status) =>
      status.markedStudents.map((student) => ({
        ...student,
        sessionInfo: status.sessionInfo,
      }))
    )
    .sort((a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime());

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

  const markAttendance = useCallback(async (rawIndex: string) => {
    const normalizedIndex = rawIndex.trim().toUpperCase();
    if (!normalizedIndex) {
      setValidationResponse({
        success: false,
        message: 'Please enter your student ID or index number.',
        errorCode: 'EMPTY_INPUT',
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
        if (response.data.hasFeePaymentIssue && response.data.playFeeDueSound && isFeeDuePeriod()) {
          await playFeeDueAlert();
        }
        setIndexInput('');
        setTimeout(() => setValidationResponse(null), 5000);
      }

      setTimeout(async () => {
        await fetchSessions();
      }, 100);
    } catch (error: unknown) {
      let responseData: unknown;
      if (typeof error === 'object' && error !== null && 'response' in error) {
        responseData = (error as { response?: { data?: unknown } }).response?.data;
      }

      if (responseData && typeof responseData === 'object' && 'success' in responseData) {
        setValidationResponse(responseData as AttendanceValidationResponseDto);
      } else {
        let errorMessage = 'Failed to mark attendance. Please try again.';
        if (responseData && typeof responseData === 'object' && 'message' in responseData) {
          const message = (responseData as Record<string, unknown>).message;
          if (typeof message === 'string' && message.trim()) {
            errorMessage = message;
          }
        }

        setValidationResponse({
          success: false,
          message: errorMessage,
          errorCode: 'NETWORK_ERROR',
        });
      }
      setTimeout(async () => {
        await fetchSessions();
      }, 100);
    } finally {
      setMarking(false);
    }
  }, [fetchSessions, playFeeDueAlert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await markAttendance(indexInput);
  };

  const handleBarcodeScan = useCallback(async (rawValue: string) => {
    if (marking) return;

    const normalizedValue = rawValue.trim().toUpperCase();
    if (!normalizedValue) return;

    setIndexInput(normalizedValue);
    await markAttendance(normalizedValue);
  }, [markAttendance, marking]);

  const handleCloseMarking = () => {
    if (window.opener) {
      window.close();
      return;
    }
    router.push('/dashboard/attendance?tab=sessions');
  };

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
      if (!document.hasFocus() || marking) return;
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
  }, [barcodeEnabled, handleBarcodeScan, marking]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 rounded-2xl shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>

            <div className="relative px-6 py-6 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Attendance Marking</h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <p className="text-white/90">Scan or enter student ID to mark attendance quickly</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCloseMarking}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-white/20 text-white font-semibold hover:bg-white/30 transition-colors"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Close Marking
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-white" />
                <h2 className="text-l font-bold text-white">Attendance Marking</h2>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${
                    barcodeEnabled
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-white/10 text-white border-white/20'
                  }`}
                >
                  <ScanLine className="h-3.5 w-3.5 mr-1" />
                  {barcodeEnabled ? 'Barcode Active' : 'Barcode Waiting'}
                </span>
                <button
                  onClick={fetchSessions}
                  disabled={loadingSessions}
                  className="px-3 py-1 text-sm font-semibold rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingSessions ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 text-indigo-500" />
                    <span className="font-bold">Student ID</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={indexInput}
                      onChange={(e) => setIndexInput(e.target.value.toUpperCase())}
                      placeholder="Scan barcode or enter student ID"
                      className="w-full pl-10 pr-4 py-3 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                      disabled={marking}
                      autoComplete="off"
                      autoFocus
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={marking || !indexInput.trim()}
                    className="flex items-center justify-center py-3 px-5 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {marking ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="animate-pulse">Marking...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span>Mark Present</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-sm text-gray-500">
                  Barcode reader is auto-detected. Start scanning and status switches to <span className="font-semibold text-emerald-700">Barcode Active</span> automatically.
                </p>

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
                          <Flag className="h-7 w-7 text-red-600" />
                          <p className="text-red-600 font-bold ml-1">Fees Overdue</p>
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
            </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600">
                <h2 className="text-l font-bold text-white">Session Status</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-gray-900">{totalEnrolled}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-2">
                    <p className="text-xs text-green-600">Present</p>
                    <p className="text-lg font-bold text-green-700">{totalPresent}</p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2">
                    <p className="text-xs text-red-600">Absent</p>
                    <p className="text-lg font-bold text-red-700">{totalAbsent}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Marked Students ({markedStudentsWithSession.length})
                  </h3>
                  {markedStudentsWithSession.length === 0 ? (
                    <p className="text-sm text-gray-500">No attendance marked yet.</p>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                      {markedStudentsWithSession.map((student, index) => (
                        <div key={`${student.studentIdCode}-${student.markedAt}-${index}`} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {student.fullName}
                                <span className="ml-1 text-[11px] font-bold text-gray-700">({student.studentIdCode})</span>
                              </p>
                              <div className="mt-0.5 flex items-center justify-between gap-2">
                                <p className="text-[11px] text-gray-500 truncate">{student.sessionInfo}</p>
                                <p className="text-[11px] font-semibold text-green-700 whitespace-nowrap">Marked {formatDate(student.markedAt, 'time')}</p>
                              </div>
                            </div>
                            <div className="w-5 flex-shrink-0 flex justify-center pt-0.5">
                              {student.hasFeePaymentIssue ? (
                                <div className="relative group">
                                  <div className="absolute -inset-1 bg-gradient-to-r from-red-200 to-red-300 rounded-full opacity-50 group-hover:opacity-75 blur-sm"></div>
                                  <div className="relative bg-gradient-to-br from-red-400 to-red-600 rounded-full p-1 shadow-lg border border-red-300">
                                    <Flag className="h-3 w-3 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <span className="h-3.5 w-3.5" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600">
              <h2 className="text-base font-bold text-white">Active Sessions ({sessions.length})</h2>
            </div>
            <div className="p-4">
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500">No active sessions right now.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-sm font-semibold text-gray-900 truncate">{session.batchDisplayName || session.batchYear}</p>
                      <p className="text-sm text-gray-700 truncate">{session.subjectName}</p>
                      <p className="text-xs text-gray-500 mt-1">Date: {formatDate(session.sessionDate, 'short')}</p>
                      <p className="text-xs text-gray-500">Started: {formatDate(session.createdAt, 'datetime')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
