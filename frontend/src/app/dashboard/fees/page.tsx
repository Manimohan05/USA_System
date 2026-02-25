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

type FeeExemptionType = 'ALARM_EXEMPTION' | 'FREE_CARD' | 'HALF_PAYMENT';

interface FeeExemptionRequest {
  studentIdCode: string;
  exemptionType: FeeExemptionType;
  appliesToAllSubjects?: boolean;
  subjectIds?: number[];
}

interface FeeExemptionDto {
  id: string;
  studentId: string;
  studentIdCode: string;
  fullName: string;
  nic?: string;
  exemptionType: FeeExemptionType;
  appliesToAllSubjects?: boolean;
  subjects?: { id: number; name: string }[];
  createdAt: string;
}

interface StudentSearchDto {
  id: string;
  studentIdCode: string;
  fullName: string;
  nic: string;
  subjects?: { id: number; name: string }[];
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
  exemptionType?: FeeExemptionType | null;
  exemptionApplies?: boolean;
}

type FeeReportStatusFilter = 'ALL' | 'PAID' | 'UNPAID' | 'PAID_HALF' | 'UNPAID_HALF' | 'FREE_CARD';

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
      const [reportSortBy, setReportSortBy] = useState<'studentId' | 'paidDate'>('studentId');
      const [reportStudentIdSort, setReportStudentIdSort] = useState<'asc' | 'desc'>('asc');
      const [reportPaidDateSort, setReportPaidDateSort] = useState<'asc' | 'desc'>('asc');
    const [exemptionStudentIdSort, setExemptionStudentIdSort] = useState<'asc' | 'desc'>('asc');
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
  const [selectedExemptionType, setSelectedExemptionType] = useState<FeeExemptionType>('ALARM_EXEMPTION');
  const [exemptionSubjects, setExemptionSubjects] = useState<{ id: number; name: string }[]>([]);
  const [selectedExemptionSubjectIds, setSelectedExemptionSubjectIds] = useState<number[]>([]);
  const [exemptionAppliesToAll, setExemptionAppliesToAll] = useState(true);
  const [loadingExemptionSubjects, setLoadingExemptionSubjects] = useState(false);
  const [addingExemptionType, setAddingExemptionType] = useState<FeeExemptionType | null>(null);
  const [removingExemptionId, setRemovingExemptionId] = useState<string | null>(null);
  const [feeExemptions, setFeeExemptions] = useState<FeeExemptionDto[]>([]);
  const [loadingExemptions, setLoadingExemptions] = useState(false);
  const [exemptionStudentIdFilter, setExemptionStudentIdFilter] = useState('');
  const [exemptionTypeFilter, setExemptionTypeFilter] = useState<'ALL' | FeeExemptionType>('ALL');

  // Fee Report State
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(currentYear);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState<FeeReportStatusFilter>('ALL');
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
  const [students, setStudents] = useState<StudentSearchDto[]>([]);

  const getReportStatus = (record: FeeReportDto) => {
    if (record.exemptionType === 'FREE_CARD') return 'Free Card';
    if (record.exemptionType === 'HALF_PAYMENT') return record.isPaid ? 'Paid(half)' : 'Unpaid(half)';
    if (record.exemptionType == null) return record.isPaid ? 'Paid' : 'Unpaid';
    return 'Unpaid';
  };

  const filteredReportData = reportData.filter((record) => {
    if (reportStatusFilter === 'ALL') return true;
    if (reportStatusFilter === 'PAID') return getReportStatus(record) === 'Paid';
    if (reportStatusFilter === 'UNPAID') return getReportStatus(record) === 'Unpaid';
    if (reportStatusFilter === 'PAID_HALF') return getReportStatus(record) === 'Paid(half)';
    if (reportStatusFilter === 'UNPAID_HALF') return getReportStatus(record) === 'Unpaid(half)';
    if (reportStatusFilter === 'FREE_CARD') return getReportStatus(record) === 'Free Card';
    return true;
  });

  // Sort filtered report data by Student ID
  // Sort by selected column
  const sortedReportData = [...filteredReportData].sort((a, b) => {
    if (reportSortBy === 'paidDate') {
      const aDate = a.paidAt || '';
      const bDate = b.paidAt || '';
      if (reportPaidDateSort === 'asc') {
        return aDate.localeCompare(bDate);
      } else {
        return bDate.localeCompare(aDate);
      }
    } else {
      if (reportStudentIdSort === 'asc') {
        return a.studentIdCode.localeCompare(b.studentIdCode, undefined, { numeric: true });
      } else {
        return b.studentIdCode.localeCompare(a.studentIdCode, undefined, { numeric: true });
      }
    }
  });

  const getExemptionTypeLabel = (type: FeeExemptionType) => {
    if (type === 'ALARM_EXEMPTION') return 'Alarm Exemption';
    if (type === 'HALF_PAYMENT') return 'Half Payment';
    return 'Free Card';
  };

  const filteredExemptions = feeExemptions.filter((exemption) => {
    const idFilter = exemptionStudentIdFilter.trim().toLowerCase();
    const matchesStudent =
      idFilter.length === 0 ||
      exemption.studentIdCode.toLowerCase().includes(idFilter) ||
      exemption.fullName.toLowerCase().includes(idFilter) ||
      (exemption.nic && exemption.nic.toLowerCase().includes(idFilter));
    const matchesType = exemptionTypeFilter === 'ALL' || exemption.exemptionType === exemptionTypeFilter;
    return matchesStudent && matchesType;
  });

  // Sort filtered exemptions by Student ID
  const sortedExemptions = [...filteredExemptions].sort((a, b) => {
    if (exemptionStudentIdSort === 'asc') {
      return a.studentIdCode.localeCompare(b.studentIdCode, undefined, { numeric: true });
    } else {
      return b.studentIdCode.localeCompare(a.studentIdCode, undefined, { numeric: true });
    }
  });

  const getExemptionsFileBaseName = () => {
    const typePart = exemptionTypeFilter === 'ALL'
      ? 'all_types'
      : sanitizeForFileName(getExemptionTypeLabel(exemptionTypeFilter));
    const idPart = exemptionStudentIdFilter.trim()
      ? `id_${sanitizeForFileName(exemptionStudentIdFilter)}`
      : 'all_ids';

    return `exempted_students_${typePart}_${idPart}`;
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

  useEffect(() => {
    setExemptionSubjects([]);
    setSelectedExemptionSubjectIds([]);
    setExemptionAppliesToAll(true);
  }, [selectedExemptionType]);

  const loadExemptionSubjects = async () => {
    if (!exemptionStudentIdCode.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Student ID',
        message: 'Please enter a student ID code first.',
      });
      return;
    }

    setLoadingExemptionSubjects(true);
    try {
      const response = await api.get<{ id: number; name: string }[]>(
        `/admin/fees/exemptions/subjects/${encodeURIComponent(exemptionStudentIdCode.trim())}`
      );
      setExemptionSubjects(response.data);
      setSelectedExemptionSubjectIds([]);
    } catch (error: any) {
      setExemptionSubjects([]);
      addToast({
        type: 'error',
        title: 'Failed to Load Subjects',
        message: error.response?.data?.message || 'Unable to load enrolled subjects.',
      });
    } finally {
      setLoadingExemptionSubjects(false);
    }
  };


  // Manual marking: move cursor to bill number after ID entry
  const handleManualIdEnter = async () => {
    const id = studentIdCode.trim();
    if (!id) return;
    // Check if student has free card for all subjects
    const student = students.find(s => s.studentIdCode === id);
    if (student) {
      const freeAll = feeExemptions.find(ex => ex.studentId === student.id && ex.exemptionType === 'FREE_CARD' && ex.appliesToAllSubjects);
      if (freeAll) {
        setBillNumber('');
        addToast({ type: 'info', title: 'Free Card', message: 'This student has Free Card for all subjects. No bill number required.' });
        setStudentIdCode('');
        requestAnimationFrame(() => billNumberInputRef.current?.blur());
        setBillNumber('');
        requestAnimationFrame(() => {
          const input = document.querySelector('input[name="studentIdCode"]') as HTMLInputElement | null;
          input?.focus();
        });
        return;
      }
    }
    requestAnimationFrame(() => billNumberInputRef.current?.focus());
  };

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
  }, [barcodeEnabled, activeTab]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [batchesRes, subjectsRes, studentsRes] = await Promise.all([
        api.get<Batch[]>('/admin/institute/batches'),
        api.get<Subject[]>('/admin/institute/subjects'),
        api.get<StudentSearchDto[]>('/admin/students'),
      ]);
      setBatches(batchesRes.data);
      setSubjects(subjectsRes.data);
      setStudents(studentsRes.data);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Load Data',
        message: 'Unable to load batches, subjects, and students',
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
      const searchText = reportStudentId.trim();
      let resolvedStudentIdCode: string | undefined;

      if (searchText) {
        const normalized = searchText.toLowerCase();
        const exactMatches = students.filter(
          (student) =>
            student.studentIdCode.toLowerCase() === normalized ||
            student.fullName.toLowerCase() === normalized ||
            (student.nic && student.nic.toLowerCase() === normalized)
        );

        if (exactMatches.length === 1) {
          resolvedStudentIdCode = exactMatches[0].studentIdCode;
        } else if (exactMatches.length > 1) {
          addToast({
            type: 'warning',
            title: 'Multiple Students Found',
            message: 'More than one student matches this value. Please enter the exact Student ID.',
          });
          setLoadingReport(false);
          return;
        } else {
          const partialMatches = students.filter(
            (student) =>
              student.studentIdCode.toLowerCase().includes(normalized) ||
              student.fullName.toLowerCase().includes(normalized) ||
              (student.nic && student.nic.toLowerCase().includes(normalized))
          );

          if (partialMatches.length === 1) {
            resolvedStudentIdCode = partialMatches[0].studentIdCode;
          } else if (partialMatches.length > 1) {
            addToast({
              type: 'warning',
              title: 'Multiple Students Found',
              message: 'More than one student matches this value. Please refine by Student ID.',
            });
            setLoadingReport(false);
            return;
          } else {
            addToast({
              type: 'warning',
              title: 'Student Not Found',
              message: 'No student matches the entered ID, NIC, or name.',
            });
            setLoadingReport(false);
            return;
          }
        }
      }

      const request: FeeReportRequest = {
        month: reportMonth,
        year: reportYear,
        ...(selectedBatch && { batchId: parseInt(selectedBatch) }),
        ...(selectedSubject && { subjectId: parseInt(selectedSubject) }),
        ...(resolvedStudentIdCode && { studentIdCode: resolvedStudentIdCode }),
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

  const handleAddExemption = async () => {
    if (!exemptionStudentIdCode.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Student ID',
        message: 'Please enter a student ID code',
      });
      return;
    }

    if (selectedExemptionType !== 'ALARM_EXEMPTION' && !exemptionAppliesToAll && selectedExemptionSubjectIds.length === 0) {
      addToast({
        type: 'warning',
        title: 'Missing Subjects',
        message: 'Select at least one enrolled subject or choose all subjects.',
      });
      return;
    }

    setAddingExemptionType(selectedExemptionType);
    try {
      const request: FeeExemptionRequest = {
        studentIdCode: exemptionStudentIdCode.trim(),
        exemptionType: selectedExemptionType,
        appliesToAllSubjects: selectedExemptionType === 'ALARM_EXEMPTION' ? true : exemptionAppliesToAll,
        subjectIds: selectedExemptionType === 'ALARM_EXEMPTION' || exemptionAppliesToAll
          ? []
          : selectedExemptionSubjectIds,
      };

      await api.post('/admin/fees/exemptions', request);
      setExemptionStudentIdCode('');
      setExemptionSubjects([]);
      setSelectedExemptionSubjectIds([]);
      setExemptionAppliesToAll(true);
      await loadFeeExemptions();

      const successMessage = selectedExemptionType === 'ALARM_EXEMPTION'
        ? 'Alarm exemption added successfully'
        : selectedExemptionType === 'HALF_PAYMENT'
          ? 'Half payment exemption added successfully'
          : 'Free card added successfully';

      addToast({
        type: 'success',
        title: 'Exemption Added',
        message: successMessage,
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
    if (filteredReportData.length === 0) {
      addToast({ type: 'warning', title: 'No Data', message: 'No data to export' });
      return;
    }

    const csvData = filteredReportData.map(record => ({
      'Student Name': record.studentName,
      'Student ID': record.studentIdCode,
      'Batch': record.batchName,
      'Subject(s)': (() => {
        // List all subjects enrolled, with exemption info
        const studentObj = students.find(s => s.id === record.studentId);
        if (!studentObj) return '-';
        return (studentObj.subjects || []).map(subject => {
          const exemption = feeExemptions.find(ex =>
            ex.studentId === record.studentId &&
            (ex.appliesToAllSubjects || (ex.subjects && ex.subjects.some(s => s.id === subject.id)))
          );
          if (exemption) {
            if (exemption.exemptionType === 'FREE_CARD') return `${subject.name} (Free)`;
            if (exemption.exemptionType === 'HALF_PAYMENT') return `${subject.name} (Half)`;
          }
          return subject.name;
        }).join('; ');
      })(),
      'Status': getReportStatus(record),
      'Bill Number': record.billNumber || '-',
      'Paid Date': record.paidAt ? new Date(record.paidAt).toLocaleDateString() : '-',
      'Exemption': (() => {
        const exemption = feeExemptions.find(ex => ex.studentId === record.studentId);
        if (!exemption) return '-';
        return `${exemption.exemptionType}${exemption.appliesToAllSubjects ? ' (All Subjects)' : ''}`;
      })(),
    }));

    // Calculate summary counts
    let paid = 0, unpaid = 0, paidHalf = 0, unpaidHalf = 0, freeCard = 0;
    filteredReportData.forEach(record => {
      const exemption = feeExemptions.find(ex => ex.studentId === record.studentId && (ex.appliesToAllSubjects || (ex.subjects && ex.subjects.some(s => s.name === record.subjectName))));
      if (exemption && exemption.exemptionType === 'FREE_CARD') {
        freeCard++;
      } else if (exemption && exemption.exemptionType === 'HALF_PAYMENT') {
        if (record.isPaid) paidHalf++;
        else unpaidHalf++;
      } else {
        if (record.isPaid) paid++;
        else unpaid++;
      }
    });
    const summaryRow = [
      `Paid: ${paid}`,
      `Unpaid: ${unpaid}`,
      `Paid(half): ${paidHalf}`,
      `Unpaid(half): ${unpaidHalf}`,
      `Free Card: ${freeCard}`
    ].join(',');
    const csv = [
      summaryRow,
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
    if (filteredReportData.length === 0) {
      addToast({ type: 'warning', title: 'No Data', message: 'No data to export' });
      return;
    }

    const excelData = filteredReportData.map(record => ({
      'Student Name': record.studentName,
      'Student ID': record.studentIdCode,
      'Batch': record.batchName,
      'Subject(s)': (() => {
        const studentObj = students.find(s => s.id === record.studentId);
        if (!studentObj) return '-';
        return (studentObj.subjects || []).map(subject => {
          const exemption = feeExemptions.find(ex =>
            ex.studentId === record.studentId &&
            (ex.appliesToAllSubjects || (ex.subjects && ex.subjects.some(s => s.id === subject.id)))
          );
          if (exemption) {
            if (exemption.exemptionType === 'FREE_CARD') return `${subject.name} (Free)`;
            if (exemption.exemptionType === 'HALF_PAYMENT') return `${subject.name} (Half)`;
          }
          return subject.name;
        }).join('; ');
      })(),
      'Status': getReportStatus(record),
      'Bill Number': record.billNumber || '-',
      'Paid Date': record.paidAt ? new Date(record.paidAt).toLocaleDateString() : '-',
      'Exemption': (() => {
        const exemption = feeExemptions.find(ex => ex.studentId === record.studentId);
        if (!exemption) return '-';
        return `${exemption.exemptionType}${exemption.appliesToAllSubjects ? ' (All Subjects)' : ''}`;
      })(),
    }));

    // Calculate summary counts
    let paid = 0, unpaid = 0, paidHalf = 0, unpaidHalf = 0, freeCard = 0;
    filteredReportData.forEach(record => {
      const exemption = feeExemptions.find(ex => ex.studentId === record.studentId && (ex.appliesToAllSubjects || (ex.subjects && ex.subjects.some(s => s.name === record.subjectName))));
      if (exemption && exemption.exemptionType === 'FREE_CARD') {
        freeCard++;
      } else if (exemption && exemption.exemptionType === 'HALF_PAYMENT') {
        if (record.isPaid) paidHalf++;
        else unpaidHalf++;
      } else {
        if (record.isPaid) paid++;
        else unpaid++;
      }
    });
    // Prepare sheet data: summary row, header row, then student rows
    const header = Object.keys(excelData[0]);
    const sheetData = [
      [`Paid: ${paid}`, `Unpaid: ${unpaid}`, `Paid(half): ${paidHalf}`, `Unpaid(half): ${unpaidHalf}`, `Free Card: ${freeCard}`],
      header,
      ...excelData.map(row => header.map(h => row[h]))
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    const baseFilename = getFeeReportFileBaseName();
    XLSX.utils.book_append_sheet(wb, ws, 'Fee Report');
    // Set column widths
    const colWidths = [30, 15, 12, 15, 12, 15, 15];
    ws['!cols'] = colWidths.map(width => ({ wch: width }));
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
    addToast({ type: 'success', title: 'Exported', message: 'Report exported as Excel' });
  };

  const exportExemptionsToCSV = () => {
    if (filteredExemptions.length === 0) {
      addToast({ type: 'warning', title: 'No Data', message: 'No exempted students to export' });
      return;
    }

    const csvData = filteredExemptions.map(exemption => ({
      'Student ID': exemption.studentIdCode,
      'Student Name': exemption.fullName,
      'Exemption Type': getExemptionTypeLabel(exemption.exemptionType),
      'Subjects': exemption.exemptionType === 'ALARM_EXEMPTION'
        ? 'N/A'
        : exemption.appliesToAllSubjects
          ? 'All Subjects'
          : (exemption.subjects?.map(subject => subject.name).join(', ') || '-'),
      'Added On': new Date(exemption.createdAt).toLocaleDateString(),
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const baseFilename = getExemptionsFileBaseName();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFilename}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    addToast({ type: 'success', title: 'Exported', message: 'Exempted students exported as CSV' });
  };

  const exportExemptionsToExcel = () => {
    if (filteredExemptions.length === 0) {
      addToast({ type: 'warning', title: 'No Data', message: 'No exempted students to export' });
      return;
    }

    const excelData = filteredExemptions.map(exemption => ({
      'Student ID': exemption.studentIdCode,
      'Student Name': exemption.fullName,
      'Exemption Type': getExemptionTypeLabel(exemption.exemptionType),
      'Subjects': exemption.exemptionType === 'ALARM_EXEMPTION'
        ? 'N/A'
        : exemption.appliesToAllSubjects
          ? 'All Subjects'
          : (exemption.subjects?.map(subject => subject.name).join(', ') || '-'),
      'Added On': new Date(exemption.createdAt).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Exempted Students');
    ws['!cols'] = [20, 30, 20, 40, 14].map(width => ({ wch: width }));

    const baseFilename = getExemptionsFileBaseName();
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
    addToast({ type: 'success', title: 'Exported', message: 'Exempted students exported as Excel' });
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
        <div className={activeTab === 'marking' ? 'space-y-4' : 'space-y-6'}>
          {/* Modern Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative px-6 py-6">
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
                <span
                  className={`inline-flex items-center px-4 py-2 text-xs font-semibold rounded-full border ${
                    barcodeEnabled
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  {barcodeEnabled ? 'Barcode Active' : 'Barcode Waiting'}
                </span>
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
                      name="studentIdCode"
                      value={studentIdCode}
                      onChange={(e) => setStudentIdCode(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleManualIdEnter();
                        }
                      }}
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
                        disabled={(() => {
                          const id = studentIdCode.trim();
                          if (!id) return false;
                          const student = students.find(s => s.studentIdCode === id);
                          if (student) {
                            const freeAll = feeExemptions.find(ex => ex.studentId === student.id && ex.exemptionType === 'FREE_CARD' && ex.appliesToAllSubjects);
                            if (freeAll) return true;
                          }
                          return false;
                        })()}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  {(() => {
                    const id = studentIdCode.trim();
                    if (!id) return null;
                    const student = students.find(s => s.studentIdCode === id);
                    if (student) {
                      const freeAll = feeExemptions.find(ex => ex.studentId === student.id && ex.exemptionType === 'FREE_CARD' && ex.appliesToAllSubjects);
                      if (freeAll) {
                        return (
                          <div className="w-full mb-2">
                            <div className="bg-teal-100 border border-teal-300 rounded-lg px-4 py-3 text-teal-800 font-semibold text-sm flex items-center">
                              <span className="mr-2">Free Card</span>
                              <span>This student has Free Card for all subjects. No bill number required.</span>
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
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
            <div className="space-y-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Fee Exemption</h2>
                    <p className="text-sm text-gray-600">Add student exemptions for all months until manually removed</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">Exemption Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedExemptionType('ALARM_EXEMPTION')}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          selectedExemptionType === 'ALARM_EXEMPTION'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Alarm Exemption
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedExemptionType('FREE_CARD')}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          selectedExemptionType === 'FREE_CARD'
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white border-transparent'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Free Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedExemptionType('HALF_PAYMENT')}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          selectedExemptionType === 'HALF_PAYMENT'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Half Payment
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">Student ID Code</label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={exemptionStudentIdCode}
                        onChange={(e) => {
                          setExemptionStudentIdCode(e.target.value);
                          setExemptionSubjects([]);
                          setSelectedExemptionSubjectIds([]);
                        }}
                        placeholder="Enter student ID (e.g., 5001, 8250)"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                      />
                      {selectedExemptionType !== 'ALARM_EXEMPTION' && (
                        <button
                          type="button"
                          onClick={loadExemptionSubjects}
                          disabled={loadingExemptionSubjects || !exemptionStudentIdCode.trim()}
                          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingExemptionSubjects ? 'Loading...' : 'Load Subjects'}
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedExemptionType !== 'ALARM_EXEMPTION' && (
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-800">
                        <input
                          type="checkbox"
                          checked={exemptionAppliesToAll}
                          onChange={(e) => {
                            setExemptionAppliesToAll(e.target.checked);
                            if (e.target.checked) {
                              setSelectedExemptionSubjectIds([]);
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Apply to all enrolled subjects</span>
                      </label>

                      {loadingExemptionSubjects ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : exemptionSubjects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                          {exemptionSubjects.map(subject => (
                            <label key={subject.id} className={`flex items-center space-x-2 rounded-lg border px-3 py-2 ${
                              exemptionAppliesToAll ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-200'
                            }`}>
                              <input
                                type="checkbox"
                                disabled={exemptionAppliesToAll}
                                checked={selectedExemptionSubjectIds.includes(subject.id)}
                                onChange={() => {
                                  setSelectedExemptionSubjectIds(prev =>
                                    prev.includes(subject.id)
                                      ? prev.filter(id => id !== subject.id)
                                      : [...prev, subject.id]
                                  );
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm font-medium">{subject.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Load subjects to choose partial exemptions.</p>
                      )}
                    </div>
                  )}

                  <div className="sticky bottom-0 flex justify-end bg-white/90 backdrop-blur-sm py-2">
                    <button
                      type="button"
                      onClick={handleAddExemption}
                      disabled={addingExemptionType !== null || !exemptionStudentIdCode.trim()}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {addingExemptionType ? 'Adding...' : 'Add Exemption'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">Exempted Students</h3>
                  <span className="text-sm text-gray-600">Showing: {filteredExemptions.length} / {feeExemptions.length}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Filter by Student (ID, Name, NIC)</label>
                    <input
                      type="text"
                      placeholder="Enter student ID, name, or NIC..."
                      value={exemptionStudentIdFilter}
                      onChange={(e) => setExemptionStudentIdFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Filter by Type</label>
                    <select
                      value={exemptionTypeFilter}
                      onChange={(e) => setExemptionTypeFilter(e.target.value as 'ALL' | FeeExemptionType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    >
                      <option value="ALL">All Types</option>
                      <option value="ALARM_EXEMPTION">Alarm Exemption</option>
                      <option value="FREE_CARD">Free Card</option>
                      <option value="HALF_PAYMENT">Half Payment</option>
                    </select>
                  </div>
                  <div className="xl:col-span-2 flex items-end gap-2">
                    <button
                      type="button"
                      onClick={exportExemptionsToCSV}
                      className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={exportExemptionsToExcel}
                      className="flex items-center px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Excel
                    </button>
                  </div>
                </div>

                {loadingExemptions ? (
                  <div className="flex items-center justify-center py-8">
                    {/* Modern scroll rolling spinner */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-sm text-indigo-500">Loading exemptions...</span>
                    </div>
                  </div>
                ) : feeExemptions.length === 0 ? (
                  <p className="text-gray-600">No fee exemptions available.</p>
                ) : filteredExemptions.length === 0 ? (
                  <p className="text-gray-600">No exempted students match the selected filters.</p>
                ) : (
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 cursor-pointer select-none" onClick={() => setExemptionStudentIdSort(exemptionStudentIdSort === 'asc' ? 'desc' : 'asc')}>
                            Student ID
                            <span className="ml-1 align-middle">{exemptionStudentIdSort === 'asc' ? '▲' : '▼'}</span>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Subjects</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Added On</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedExemptions.map((exemption) => (
                          <tr key={exemption.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-700">{exemption.studentIdCode}</td>
                            <td className="py-3 px-4 text-gray-900">{exemption.fullName}</td>
                            <td className="py-3 px-4">
                              {exemption.exemptionType === 'ALARM_EXEMPTION' ? (
                                <span className="fee-exemption-alarm inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                  Alarm Exemption
                                </span>
                              ) : exemption.exemptionType === 'HALF_PAYMENT' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                  Half Payment
                                </span>
                              ) : (
                                <span className="fee-exemption-free inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                                  Free Card
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {exemption.exemptionType === 'ALARM_EXEMPTION'
                                ? 'N/A'
                                : exemption.appliesToAllSubjects
                                  ? 'All Subjects'
                                  : (exemption.subjects?.map(subject => subject.name).join(', ') || '-')}
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
            <div className="space-y-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
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
                    <label className="block text-sm font-semibold text-gray-800">Student (Optional)</label>
                    <input
                      type="text"
                      value={reportStudentId}
                      onChange={(e) => setReportStudentId(e.target.value)}
                      placeholder="Enter student ID, name, or NIC"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-800">Status (Optional)</label>
                    <select
                      value={reportStatusFilter}
                      onChange={(e) => setReportStatusFilter(e.target.value as FeeReportStatusFilter)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PAID">Paid (Full Payment)</option>
                      <option value="UNPAID">Unpaid (Full Payment)</option>
                      <option value="PAID_HALF">Paid(half)</option>
                      <option value="UNPAID_HALF">Unpaid(half)</option>
                      <option value="FREE_CARD">Free Card</option>
                    </select>
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
                          {MONTHS[reportMonth - 1]} {reportYear} - {filteredReportData.length} records (from {reportData.length})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="w-full mb-4">
                        {subjects.map(subject => {
                          let paid = 0, unpaid = 0, paidHalf = 0, unpaidHalf = 0, freeCard = 0;
                          sortedReportData.forEach(record => {
                            // Only count if student is enrolled in subject
                            const studentObj = students.find(s => s.id === record.studentId);
                            if (!studentObj || !(studentObj.subjects || []).some(s => s.id === subject.id)) return;
                            // For 'All Subjects', only count records for this subject
                            if (!selectedSubject && record.subjectName !== subject.name) return;
                            // Apply subject filter
                            if (selectedSubject && subject.id.toString() !== selectedSubject) return;
                            // Apply batch filter
                            if (selectedBatch && record.batchName !== (batches.find(b => b.id.toString() === selectedBatch)?.displayName)) return;
                            // Apply student filter
                            if (reportStudentId && !record.studentIdCode.toLowerCase().includes(reportStudentId.toLowerCase()) && !record.studentName.toLowerCase().includes(reportStudentId.toLowerCase())) return;
                            // Apply status filter
                            if (reportStatusFilter !== 'ALL' && getReportStatus(record) !== reportStatusFilter.replace('_', ' ')) return;
                            // Find exemption for this subject
                            const exemption = feeExemptions.find(ex =>
                              ex.studentId === record.studentId &&
                              (ex.appliesToAllSubjects || (ex.subjects && ex.subjects.some(s => s.id === subject.id)))
                            );
                            // Find payment record for this subject
                            const subjectPaid = record.isPaid;
                            // Free Card
                            if (exemption && exemption.exemptionType === 'FREE_CARD') {
                              freeCard++;
                            } else if (exemption && exemption.exemptionType === 'HALF_PAYMENT') {
                              if (subjectPaid) paidHalf++;
                              else unpaidHalf++;
                            } else {
                              if (subjectPaid) paid++;
                              else unpaid++;
                            }
                          });
                          // Only show subject if at least one count is nonzero
                          if (paid + unpaid + paidHalf + unpaidHalf + freeCard === 0) return null;
                          return (
                            <div key={subject.id} className="flex items-center gap-2 py-2">
                              <span className="font-semibold text-gray-900 min-w-[100px]">{subject.name}</span>
                              <span className="fee-status-paid flex items-center space-x-1 px-2 py-1 bg-green-100 rounded-lg text-green-800">Paid: {paid}</span>
                              <span className="fee-status-unpaid flex items-center space-x-1 px-2 py-1 bg-red-100 rounded-lg text-red-800">Unpaid: {unpaid}</span>
                              <span className="fee-status-paid-half flex items-center space-x-1 px-2 py-1 bg-green-100 rounded-lg text-green-800">Paid(half): {paidHalf}</span>
                              <span className="fee-status-unpaid-half flex items-center space-x-1 px-2 py-1 bg-red-100 rounded-lg text-red-800">Unpaid(half): {unpaidHalf}</span>
                              <span className="fee-status-free flex items-center space-x-1 px-2 py-1 bg-teal-100 rounded-lg text-teal-800">Free Card: {freeCard}</span>
                            </div>
                          );
                        })}
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
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 cursor-pointer select-none" onClick={() => {
                            if (reportSortBy === 'studentId') {
                              setReportStudentIdSort(reportStudentIdSort === 'asc' ? 'desc' : 'asc');
                            } else {
                              setReportSortBy('studentId');
                            }
                          }}>
                            ID Code
                            <span className={`ml-1 align-middle ${reportSortBy === 'studentId' ? 'text-blue-700 font-bold' : 'text-gray-400'}`}>{reportStudentIdSort === 'asc' ? '▲' : '▼'}</span>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Batch</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Subject</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Bill No.</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 cursor-pointer select-none" onClick={() => {
                            if (reportSortBy === 'paidDate') {
                              setReportPaidDateSort(reportPaidDateSort === 'asc' ? 'desc' : 'asc');
                            } else {
                              setReportSortBy('paidDate');
                            }
                          }}>
                            Paid Date
                            <span className={`ml-1 align-middle ${reportSortBy === 'paidDate' ? 'text-blue-700 font-bold' : 'text-gray-400'}`}>{reportPaidDateSort === 'asc' ? '▲' : '▼'}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedReportData.map((record, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900">{record.studentName}</div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{record.studentIdCode}</td>
                            <td className="py-3 px-4 text-gray-600">{record.batchName}</td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {subjects.map((subject) => {
                                  // Find if this subject is enrolled for this student
                                  // and if there is an exemption for this subject
                                  // If the report is filtered by subject, only show that subject
                                  if (selectedSubject && subject.id.toString() !== selectedSubject) return null;
                                  // Find if this student has an exemption for this subject
                                  const exemption = feeExemptions.find(ex =>
                                    ex.studentId === record.studentId &&
                                    (ex.appliesToAllSubjects || (ex.subjects && ex.subjects.some(s => s.id === subject.id)))
                                  );
                                  let pillClass = 'bg-gray-100 text-gray-800';
                                  if (exemption) {
                                    if (exemption.exemptionType === 'FREE_CARD') pillClass = 'bg-teal-100 text-teal-800';
                                    else if (exemption.exemptionType === 'HALF_PAYMENT') pillClass = 'bg-indigo-100 text-indigo-800';
                                  }
                                  // If the student is not enrolled in this subject, skip
                                  const studentObj = students.find(s => s.id === record.studentId);
                                  if (!studentObj || !(studentObj.subjects || []).some(s => s.id === subject.id)) return null;
                                  return (
                                    <span key={subject.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pillClass}`}>
                                      {subject.name}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {subjects.map((subject) => {
                                  // Only show subjects the student is enrolled in
                                  const studentObj = students.find(s => s.id === record.studentId);
                                  if (!studentObj || !(studentObj.subjects || []).some(s => s.id === subject.id)) return null;
                                  // If the report is filtered by subject, only show that subject
                                  if (selectedSubject && subject.id.toString() !== selectedSubject) return null;

                                  // Find exemption for this subject
                                  const exemption = feeExemptions.find(ex =>
                                    ex.studentId === record.studentId &&
                                    (ex.appliesToAllSubjects || (ex.subjects && ex.subjects.some(s => s.id === subject.id)))
                                  );

                                  // Find payment record for this subject
                                  const subjectPaid = reportData.find(r =>
                                    r.studentId === record.studentId &&
                                    r.subjectName === subject.name &&
                                    r.month === record.month &&
                                    r.year === record.year
                                  )?.isPaid;

                                  // Determine pill color and label
                                  let pillClass = 'bg-gray-100 text-gray-800';
                                  let pillLabel = subject.name;
                                  // Check if this student has a bill number/isPaid for any subject (excluding free card)
                                  const studentHasPaid = reportData.some(r =>
                                    r.studentId === record.studentId && r.isPaid &&
                                    !feeExemptions.some(ex => ex.studentId === record.studentId && ex.exemptionType === 'FREE_CARD' && (ex.appliesToAllSubjects || (ex.subjects && ex.subjects.some(s => s.id === subject.id))))
                                  );

                                  if (exemption) {
                                    if (exemption.exemptionType === 'FREE_CARD') {
                                      // Free card: teal if unpaid, green if paid
                                      pillClass = subjectPaid ? 'bg-green-100 text-green-800' : 'bg-teal-100 text-teal-800';
                                      pillLabel = `${subject.name} (Free)`;
                                    } else if (exemption.exemptionType === 'HALF_PAYMENT') {
                                      // If student has paid for any subject (not free card), show green
                                      pillClass = studentHasPaid ? 'bg-green-100 text-green-800' : (subjectPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800');
                                      pillLabel = `${subject.name} (Half)`;
                                    }
                                  } else {
                                    // No exemption: full payment
                                    pillClass = studentHasPaid ? 'bg-green-100 text-green-800' : (subjectPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800');
                                    pillLabel = subject.name;
                                  }
                                  return (
                                    <span key={subject.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pillClass}`}>
                                      {pillLabel}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {(() => {
                                const freeAll = feeExemptions.find(ex =>
                                  ex.studentId === record.studentId &&
                                  ex.exemptionType === 'FREE_CARD' &&
                                  ex.appliesToAllSubjects
                                );
                                if (freeAll) {
                                  return <span className="italic text-gray-400">Free Card for all subjects</span>;
                                }
                                if (editingStudentId === record.studentId) {
                                  return (
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
                                  );
                                } else {
                                  return (
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
                                  );
                                }
                              })()}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {(() => {
                                const freeAll = feeExemptions.find(ex =>
                                  ex.studentId === record.studentId &&
                                  ex.exemptionType === 'FREE_CARD' &&
                                  ex.appliesToAllSubjects
                                );
                                if (freeAll) {
                                  return <span className="italic text-gray-400">Free Card for all subjects</span>;
                                }
                                if (editingDateStudentId === record.studentId) {
                                  return (
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
                                  );
                                } else {
                                  // Remove icon logic
                                  const canRemove = (() => {
                                    if (!record.paidAt) return false;
                                    const paidAt = new Date(record.paidAt);
                                    const now = new Date();
                                    return (now.getTime() - paidAt.getTime()) < 10 * 60 * 1000;
                                  })();
                                  return (
                                    <div className="flex items-center space-x-2">
                                      <span>{record.paidAt ? new Date(record.paidAt).toLocaleDateString() : '-'}</span>
                                      {record.isPaid && (
                                        <>
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
                                          {canRemove && (
                                            <button
                                              onClick={async () => {
                                                try {
                                                  setSavingEdit(true);
                                                  await api.delete('/admin/fees/remove-payment', {
                                                    data: {
                                                      studentIdCode: record.studentIdCode,
                                                      month: reportMonth,
                                                      year: reportYear,
                                                    }
                                                  });
                                                  setReportData(prev => prev.filter(r => r.studentId !== record.studentId));
                                                  addToast({ type: 'success', title: 'Removed', message: 'Fee payment removed' });
                                                } catch (error: any) {
                                                  addToast({ type: 'error', title: 'Remove Failed', message: error.response?.data?.message || 'Failed to remove fee payment' });
                                                } finally {
                                                  setSavingEdit(false);
                                                }
                                              }}
                                              className="p-1 hover:bg-red-100 rounded"
                                              title="Remove fee payment"
                                            >
                                              <X className="h-3 w-3 text-red-600" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  );
                                }
                              })()}
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
                    <p className="text-gray-600 mb-6">Click "Generate Report" to view fee payment data</p>
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