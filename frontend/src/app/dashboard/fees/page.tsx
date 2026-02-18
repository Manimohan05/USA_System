'use client';

import { useState, useEffect, useRef } from 'react';
import { DollarSign, CheckCircle, Search, Filter, CreditCard, BarChart3, CalendarDays, Building, BookOpen, Receipt, Clock, Sparkles, Users, CheckCircle2, XCircle, Edit3, Save, X, Download, ScanLine } from 'lucide-react';
import * as XLSX from 'xlsx';

import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/contexts/toast';
import api from '@/lib/api';

// Types for our new fees system
interface FeePaymentRequest {
  studentIdCode: string;
  billNumber: string;
  month: number;
  year: number;
}

type FeeExemptionType = 'ALARM_EXEMPTION' | 'FREE_CARD';

interface FeeExemptionRequest {
  studentIdCode: string;
  exemptionType: FeeExemptionType;
}

interface FeeExemptionDto {
  id: string;
  studentId: string;
  studentIdCode: string;
  fullName: string;
  exemptionType: FeeExemptionType;
  createdAt: string;
}

interface FeeReportRequest {
  month: number;
  year: number;
  batchId?: number;
  subjectId?: number;
  studentIdCode?: string;
}

interface FeeReportDto {
  studentId: string;
  studentIdCode: string;
  studentName: string;
  batchName: string;
  subjectName: string;
  month: number;
  year: number;
  isPaid: boolean;
  billNumber?: string;
  paidAt?: string;
}

interface Batch {
  id: number;
  batchYear: number;
  isDayBatch: boolean;
  displayName: string;
  studentCount: number;
}

interface Subject {
  id: number;
  name: string;
  studentCount: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const sanitizeForFileName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '') || 'unknown';

export default function FeesPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'marking' | 'report' | 'exemption'>('marking');
  const [loading, setLoading] = useState(false);
  const [barcodeEnabled, setBarcodeEnabled] = useState(false);
  const barcodeBufferRef = useRef('');
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBarcodeKeyTimeRef = useRef<number>(0);
  const barcodeStartTimeRef = useRef<number>(0);
  const billNumberInputRef = useRef<HTMLInputElement | null>(null);

  // Get current year from local machine and create year range
  const currentYear = new Date().getFullYear();
  const generateYearRange = () => {
    const years = [];
    // Show years from 2026 to 2040
    for (let year = 2026; year <= 2040; year++) {
      years.push(year);
    }
    return years;
  };
  const yearRange = generateYearRange();

  // Fee Marking State
  const [studentIdCode, setStudentIdCode] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [submitting, setSubmitting] = useState(false);
  const [exemptionStudentIdCode, setExemptionStudentIdCode] = useState('');
  const [addingExemptionType, setAddingExemptionType] = useState<FeeExemptionType | null>(null);
  const [removingExemptionId, setRemovingExemptionId] = useState<string | null>(null);
  const [feeExemptions, setFeeExemptions] = useState<FeeExemptionDto[]>([]);
  const [loadingExemptions, setLoadingExemptions] = useState(false);

  // Fee Report State
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(currentYear);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportData, setReportData] = useState<FeeReportDto[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingBillNumber, setEditingBillNumber] = useState('');
  const [editingDateStudentId, setEditingDateStudentId] = useState<string | null>(null);
  const [editingPaidDate, setEditingPaidDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Data State
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const isFreeCardStudent = (studentId: string) =>
    feeExemptions.some(
      exemption => exemption.studentId === studentId && exemption.exemptionType === 'FREE_CARD'
    );

  const getReportStatus = (record: FeeReportDto) => {
    if (record.isPaid) return 'Paid';
    if (isFreeCardStudent(record.studentId)) return 'Free Card';
    return 'Unpaid';
  };

  const getFeeReportFileBaseName = () => {
    const selectedBatchName = selectedBatch
      ? batches.find(batch => batch.id.toString() === selectedBatch)?.displayName || `batch_${selectedBatch}`
      : 'all_batches';

    const selectedSubjectName = selectedSubject
      ? subjects.find(subject => subject.id.toString() === selectedSubject)?.name || `subject_${selectedSubject}`
      : 'all_subjects';

    const monthName = MONTHS[reportMonth - 1] || `month_${reportMonth}`;

    return `${sanitizeForFileName(selectedBatchName)}_fees_report_${sanitizeForFileName(selectedSubjectName)}_${sanitizeForFileName(monthName)}_${reportYear}`;
  };

  useEffect(() => {
    loadInitialData();
    loadFeeExemptions();
  }, []);

  const handleBarcodeScan = (rawValue: string) => {
    const normalizedValue = rawValue.trim().toUpperCase();
    if (!normalizedValue) return;

    setStudentIdCode(normalizedValue);
    requestAnimationFrame(() => billNumberInputRef.current?.focus());
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
      if (!document.hasFocus() || activeTab !== 'marking') return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const key = event.key;
      const now = Date.now();
      const timeSinceLastKey = now - lastBarcodeKeyTimeRef.current;
      const resetDelayMs = 240;

      if (key === 'Enter') {
        const scannedValue = barcodeBufferRef.current;
        const scanDurationMs = barcodeStartTimeRef.current ? now - barcodeStartTimeRef.current : Number.POSITIVE_INFINITY;
        const isLikelyScan = barcodeEnabled || (scanDurationMs <= 500 && scannedValue.length >= 4);

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
  }, [barcodeEnabled, activeTab]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [batchesRes, subjectsRes] = await Promise.all([
        api.get<Batch[]>('/admin/institute/batches'),
        api.get<Subject[]>('/admin/institute/subjects'),
      ]);
      setBatches(batchesRes.data);
      setSubjects(subjectsRes.data);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Load Data',
        message: 'Unable to load batches and subjects',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentIdCode.trim() || !billNumber.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter student ID and bill number',
      });
      return;
    }

    setSubmitting(true);
    try {
      const request: FeePaymentRequest = {
        studentIdCode: studentIdCode.trim(),
        billNumber: billNumber.trim(),
        month: selectedMonth,
        year: selectedYear,
      };

      await api.post('/admin/fees/mark-payment', request);
      
      addToast({
        type: 'success',
        title: 'Payment Marked',
        message: `Fee payment has been marked successfully`,
      });

      // Reset form
      setStudentIdCode('');
      setBillNumber('');
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Payment Failed',
        message: error.response?.data?.message || 'Failed to mark payment',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const request: FeeReportRequest = {
        month: reportMonth,
        year: reportYear,
        ...(selectedBatch && { batchId: parseInt(selectedBatch) }),
        ...(selectedSubject && { subjectId: parseInt(selectedSubject) }),
        ...(reportStudentId.trim() && { studentIdCode: reportStudentId.trim() }),
      };

      const response = await api.post<FeeReportDto[]>('/admin/fees/report', request);
      setReportData(response.data);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Report Generation Failed',
        message: 'Unable to generate fee report',
      });
    } finally {
      setLoadingReport(false);
    }
  };

  const loadFeeExemptions = async () => {
    try {
      setLoadingExemptions(true);
      const response = await api.get<FeeExemptionDto[]>('/admin/fees/exemptions');
      setFeeExemptions(response.data);
    } catch {
      setFeeExemptions([]);
    } finally {
      setLoadingExemptions(false);
    }
  };

  const handleAddExemption = async (exemptionType: FeeExemptionType) => {
    if (!exemptionStudentIdCode.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Student ID',
        message: 'Please enter a student ID code',
      });
      return;
    }

    setAddingExemptionType(exemptionType);
    try {
      const request: FeeExemptionRequest = {
        studentIdCode: exemptionStudentIdCode.trim(),
        exemptionType,
      };

      await api.post('/admin/fees/exemptions', request);
      setExemptionStudentIdCode('');
      await loadFeeExemptions();

      addToast({
        type: 'success',
        title: 'Exemption Added',
        message: exemptionType === 'ALARM_EXEMPTION'
          ? 'Alarm exemption added successfully'
          : 'Free card added successfully',
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Add Failed',
        message: error.response?.data?.message || 'Failed to add fee exemption',
      });
    } finally {
      setAddingExemptionType(null);
    }
  };

  const handleRemoveExemption = async (exemptionId: string) => {
    setRemovingExemptionId(exemptionId);
    try {
      await api.delete(`/admin/fees/exemptions/${exemptionId}`);
      await loadFeeExemptions();
      addToast({
        type: 'success',
        title: 'Removed',
        message: 'Fee exemption removed successfully',
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Remove Failed',
        message: error.response?.data?.message || 'Failed to remove exemption',
      });
    } finally {
      setRemovingExemptionId(null);
    }
  };


  const exportToCSV = () => {
    if (reportData.length === 0) {
      addToast({ type: 'warning', title: 'No Data', message: 'No data to export' });
      return;
    }

    const csvData = reportData.map(record => ({
      'Student Name': record.studentName,
      'Student ID': record.studentIdCode,
      'Batch': record.batchName,
      'Subject': record.subjectName,
      'Status': getReportStatus(record),
      'Bill Number': record.billNumber || '-',
      'Paid Date': record.paidAt ? new Date(record.paidAt).toLocaleDateString() : '-',
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const baseFilename = getFeeReportFileBaseName();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFilename}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    addToast({ type: 'success', title: 'Exported', message: 'Report exported as CSV' });
  };

  const exportToExcel = () => {
    if (reportData.length === 0) {
      addToast({ type: 'warning', title: 'No Data', message: 'No data to export' });
      return;
    }

    const excelData = reportData.map(record => ({
      'Student Name': record.studentName,
      'Student ID': record.studentIdCode,
      'Batch': record.batchName,
      'Subject': record.subjectName,
      'Status': getReportStatus(record),
      'Bill Number': record.billNumber || '-',
      'Paid Date': record.paidAt ? new Date(record.paidAt).toLocaleDateString() : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    const baseFilename = getFeeReportFileBaseName();
    XLSX.utils.book_append_sheet(wb, ws, 'Fee Report');

    // Set column widths
    const colWidths = [30, 15, 12, 15, 12, 15, 15];
    ws['!cols'] = colWidths.map(width => ({ wch: width }));

    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
    addToast({ type: 'success', title: 'Exported', message: 'Report exported as Excel' });
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
        <div className={activeTab === 'marking' ? 'space-y-4' : 'space-y-8'}>
          {/* Modern Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className={activeTab === 'marking' ? 'relative px-8 py-6' : 'relative px-8 py-12'}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">Fee Management</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <p className="text-white/90">Track and manage student fee payments</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={activeTab === 'marking' ? 'bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-3' : 'bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6'}>
            <div className="flex items-center space-x-1 bg-gray-100/60 backdrop-blur-sm rounded-xl p-1">
              <button
                onClick={() => setActiveTab('marking')}
                className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'marking'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                
                Fee Marking
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'report'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Fee Report
              </button>
              <button
                onClick={() => setActiveTab('exemption')}
                className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'exemption'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <Users className="h-5 w-5 mr-2" />
                Fee Exemption
              </button>
            </div>
          </div>

          {/* Fee Marking Tab */}
          {activeTab === 'marking' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-5 lg:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Mark Fee Payment</h2>
                    <p className="text-gray-600">Record student fee payments for specific months</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBarcodeEnabled(prev => !prev)}
                  className={`inline-flex items-center px-4 py-2 text-xs font-semibold rounded-full border transition-colors ${
                    barcodeEnabled
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  aria-pressed={barcodeEnabled}
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  {barcodeEnabled ? 'Barcode On' : 'Barcode Off'}
                </button>
              </div>

              <form onSubmit={handleMarkPayment} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={index} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      {yearRange.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">
                      Student ID Code*
                    </label>
                    <input
                      type="text"
                      value={studentIdCode}
                      onChange={(e) => setStudentIdCode(e.target.value)}
                      placeholder="Enter student ID (e.g., 5001, 8250)"
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">
                      Bill Number *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={billNumber}
                        onChange={(e) => setBillNumber(e.target.value)}
                        placeholder="Enter bill number"
                        required
                        ref={billNumberInputRef}
                        className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submitting || !studentIdCode.trim() || !billNumber.trim()}
                    className="group px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                        <span className="animate-pulse">Marking Payment...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                        <span>Mark as Paid</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Fee Exemption Tab */}
          {activeTab === 'exemption' && (
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Fee Exemption</h2>
                    <p className="text-gray-600">Add student exemptions for all months until manually removed</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">Student ID Code</label>
                    <input
                      type="text"
                      value={exemptionStudentIdCode}
                      onChange={(e) => setExemptionStudentIdCode(e.target.value)}
                      placeholder="Enter student ID (e.g., 5001, 8250)"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => handleAddExemption('ALARM_EXEMPTION')}
                      disabled={addingExemptionType !== null || !exemptionStudentIdCode.trim()}
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {addingExemptionType === 'ALARM_EXEMPTION' ? 'Adding...' : 'Alarm Exemption'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddExemption('FREE_CARD')}
                      disabled={addingExemptionType !== null || !exemptionStudentIdCode.trim()}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {addingExemptionType === 'FREE_CARD' ? 'Adding...' : 'Free Card'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">Exempted Students</h3>
                  <span className="text-sm text-gray-600">Total: {feeExemptions.length}</span>
                </div>

                {loadingExemptions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : feeExemptions.length === 0 ? (
                  <p className="text-gray-600">No fee exemptions available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Student ID</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Added On</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeExemptions.map((exemption) => (
                          <tr key={exemption.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-700">{exemption.studentIdCode}</td>
                            <td className="py-3 px-4 text-gray-900">{exemption.fullName}</td>
                            <td className="py-3 px-4">
                              {exemption.exemptionType === 'ALARM_EXEMPTION' ? (
                                <span className="fee-exemption-alarm inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                  Alarm Exemption
                                </span>
                              ) : (
                                <span className="fee-exemption-free inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                  Free Card
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-600">{new Date(exemption.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveExemption(exemption.id)}
                                disabled={removingExemptionId === exemption.id}
                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {removingExemptionId === exemption.id ? 'Removing...' : 'Remove'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fee Report Tab */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              {/* Filters Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-5 lg:p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Filter className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Fee Report Filters</h2>
                    <p className="text-gray-600">Filter fee payment reports by various criteria</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">Month</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={index} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">Year</label>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      {yearRange.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">Batch (Optional)</label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      <option value="">All Batches</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id.toString()}>
                          {batch.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">Subject (Optional)</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      <option value="">All Subjects</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">Student ID (Optional)</label>
                    <input
                      type="text"
                      value={reportStudentId}
                      onChange={(e) => setReportStudentId(e.target.value)}
                      placeholder="Enter student ID"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateReport}
                      disabled={loadingReport}
                      className="group w-full px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                    >
                      {loadingReport ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                          <span>Generate Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Report Results */}
              {reportData.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Fee Payment Report</h3>
                        <p className="text-gray-600">
                          {MONTHS[reportMonth - 1]} {reportYear} - {reportData.length} records
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="fee-status-paid flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-green-800">
                            Paid: {reportData.filter(r => r.isPaid).length}
                          </span>
                        </div>
                        <div className="fee-status-unpaid flex items-center space-x-2 px-3 py-1 bg-red-100 rounded-lg">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-red-800">
                            Unpaid: {reportData.filter(r => !r.isPaid && !isFreeCardStudent(r.studentId)).length}
                          </span>
                        </div>
                        <div className="fee-status-free flex items-center space-x-2 px-3 py-1 bg-teal-100 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-teal-600" />
                          <span className="text-teal-800">
                            Free Card: {reportData.filter(r => !r.isPaid && isFreeCardStudent(r.studentId)).length}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={exportToCSV}
                          className="flex items-center px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-all font-medium text-xs"
                          title="Export as CSV"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          CSV
                        </button>
                        <button
                          onClick={exportToExcel}
                          className="flex items-center px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all font-medium text-xs"
                          title="Export as Excel"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Excel
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Student</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">ID Code</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Batch</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Subject</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Bill No.</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Paid Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((record, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900">{record.studentName}</div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{record.studentIdCode}</td>
                            <td className="py-3 px-4 text-gray-600">{record.batchName}</td>
                            <td className="py-3 px-4 text-gray-600">{record.subjectName}</td>
                            <td className="py-3 px-4 text-center">
                              {getReportStatus(record) === 'Paid' ? (
                                <span className="fee-status-paid inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Paid
                                </span>
                              ) : getReportStatus(record) === 'Free Card' ? (
                                <span className="fee-status-free inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Free Card
                                </span>
                              ) : (
                                <span className="fee-status-unpaid inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Unpaid
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {editingStudentId === record.studentId ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={editingBillNumber}
                                    onChange={(e) => setEditingBillNumber(e.target.value)}
                                    className="px-2 py-1 border rounded w-32 text-sm"
                                  />
                                  <button
                                    onClick={async () => {
                                      if (!editingBillNumber.trim()) {
                                        addToast({ type: 'warning', title: 'Empty Bill', message: 'Please enter a bill number' });
                                        return;
                                      }
                                      try {
                                        setSavingEdit(true);
                                        await api.put('/admin/fees/update-bill', {
                                          studentIdCode: record.studentIdCode,
                                          month: reportMonth,
                                          year: reportYear,
                                          billNumber: editingBillNumber.trim(),
                                        });
                                        setReportData(prev => prev.map(r => r.studentId === record.studentId ? { ...r, billNumber: editingBillNumber.trim() } : r));
                                        addToast({ type: 'success', title: 'Updated', message: 'Bill number updated' });
                                        setEditingStudentId(null);
                                        setEditingBillNumber('');
                                      } catch (error: any) {
                                        addToast({ type: 'error', title: 'Update Failed', message: error.response?.data?.message || 'Failed to update bill number' });
                                      } finally {
                                        setSavingEdit(false);
                                      }
                                    }}
                                    disabled={savingEdit}
                                    className="p-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
                                  >
                                    {savingEdit ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="h-3 w-3" />}
                                  </button>
                                  <button
                                    onClick={() => { setEditingStudentId(null); setEditingBillNumber(''); }}
                                    className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                                  >
                                    <X className="h-3 w-3 text-gray-600" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <span>{record.billNumber || '-'}</span>
                                  {record.isPaid && (
                                    <button
                                      onClick={() => { setEditingStudentId(record.studentId); setEditingBillNumber(record.billNumber || ''); }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Edit bill number"
                                    >
                                      <Edit3 className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {editingDateStudentId === record.studentId ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="date"
                                    value={editingPaidDate}
                                    onChange={(e) => setEditingPaidDate(e.target.value)}
                                    className="px-2 py-1 border rounded w-32 text-sm"
                                  />
                                  <button
                                    onClick={async () => {
                                      if (!editingPaidDate.trim()) {
                                        addToast({ type: 'warning', title: 'Empty Date', message: 'Please enter a date' });
                                        return;
                                      }
                                      try {
                                        setSavingEdit(true);
                                        const date = new Date(editingPaidDate);
                                        await api.put('/admin/fees/update-paid-date', {
                                          studentIdCode: record.studentIdCode,
                                          month: reportMonth,
                                          year: reportYear,
                                          paidAt: date.toISOString(),
                                        });
                                        setReportData(prev => prev.map(r => r.studentId === record.studentId ? { ...r, paidAt: date.toISOString() } : r));
                                        addToast({ type: 'success', title: 'Updated', message: 'Paid date updated' });
                                        setEditingDateStudentId(null);
                                        setEditingPaidDate('');
                                      } catch (error: any) {
                                        addToast({ type: 'error', title: 'Update Failed', message: error.response?.data?.message || 'Failed to update paid date' });
                                      } finally {
                                        setSavingEdit(false);
                                      }
                                    }}
                                    disabled={savingEdit}
                                    className="p-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
                                  >
                                    {savingEdit ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="h-3 w-3" />}
                                  </button>
                                  <button
                                    onClick={() => { setEditingDateStudentId(null); setEditingPaidDate(''); }}
                                    className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                                  >
                                    <X className="h-3 w-3 text-gray-600" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <span>{record.paidAt ? new Date(record.paidAt).toLocaleDateString() : '-'}</span>
                                  {record.isPaid && (
                                    <button
                                      onClick={() => {
                                        const paidDate = record.paidAt ? new Date(record.paidAt).toISOString().split('T')[0] : '';
                                        setEditingDateStudentId(record.studentId);
                                        setEditingPaidDate(paidDate);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Edit paid date"
                                    >
                                      <Edit3 className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportData.length === 0 && !loadingReport && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-12">
                  <div className="text-center">
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                      <BarChart3 className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h3>
                    <p className="text-gray-600 mb-8">Click "Generate Report" to view fee payment data</p>
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