'use client';

import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, Search, Filter, CreditCard, BarChart3, CalendarDays, Building, BookOpen, Receipt, Clock, Sparkles, Users, CheckCircle2, XCircle, Edit3, Save, X, Download } from 'lucide-react';
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
  fullName: string;
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

export default function FeesPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'marking' | 'report'>('marking');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadInitialData();
  }, []);

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

  const exportToCSV = () => {
    if (reportData.length === 0) {
      addToast({ type: 'warning', title: 'No Data', message: 'No data to export' });
      return;
    }

    const csvData = reportData.map(record => ({
      'Student Name': record.fullName,
      'Student ID': record.studentIdCode,
      'Batch': record.batchName,
      'Subject': record.subjectName,
      'Status': record.isPaid ? 'Paid' : 'Unpaid',
      'Bill Number': record.billNumber || '-',
      'Paid Date': record.paidAt ? new Date(record.paidAt).toLocaleDateString() : '-',
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee-report-${MONTHS[reportMonth - 1]}-${reportYear}.csv`;
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
      'Student Name': record.fullName,
      'Student ID': record.studentIdCode,
      'Batch': record.batchName,
      'Subject': record.subjectName,
      'Status': record.isPaid ? 'Paid' : 'Unpaid',
      'Bill Number': record.billNumber || '-',
      'Paid Date': record.paidAt ? new Date(record.paidAt).toLocaleDateString() : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fee Report');

    // Set column widths
    const colWidths = [30, 15, 12, 15, 12, 15, 15];
    ws['!cols'] = colWidths.map(width => ({ wch: width }));

    XLSX.writeFile(wb, `fee-report-${MONTHS[reportMonth - 1]}-${reportYear}.xlsx`);
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
        <div className="space-y-8">
          {/* Modern Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative px-8 py-12">
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
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
            </div>
          </div>

          {/* Fee Marking Tab */}
          {activeTab === 'marking' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Mark Fee Payment</h2>
                  <p className="text-gray-600">Record student fee payments for specific months</p>
                </div>
              </div>

              <form onSubmit={handleMarkPayment} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={index} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      {yearRange.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Student ID Code*
                    </label>
                    <input
                      type="text"
                      value={studentIdCode}
                      onChange={(e) => setStudentIdCode(e.target.value)}
                      placeholder="Enter student ID (e.g., 5001, 8250)"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
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
                        className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
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

          {/* Fee Report Tab */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              {/* Filters Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Filter className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Fee Report Filters</h2>
                    <p className="text-gray-600">Filter fee payment reports by various criteria</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">Month</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={index} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">Year</label>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      {yearRange.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">Batch (Optional)</label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      <option value="">All Batches</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id.toString()}>
                          {batch.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">Subject (Optional)</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    >
                      <option value="">All Subjects</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">Student ID (Optional)</label>
                    <input
                      type="text"
                      value={reportStudentId}
                      onChange={(e) => setReportStudentId(e.target.value)}
                      placeholder="Enter student ID"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateReport}
                      disabled={loadingReport}
                      className="group w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-green-800">
                            Paid: {reportData.filter(r => r.isPaid).length}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 rounded-lg">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-red-800">
                            Unpaid: {reportData.filter(r => !r.isPaid).length}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
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
                              <div className="font-medium text-gray-900">{record.fullName}</div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{record.studentIdCode}</td>
                            <td className="py-3 px-4 text-gray-600">{record.batchName}</td>
                            <td className="py-3 px-4 text-gray-600">{record.subjectName}</td>
                            <td className="py-3 px-4 text-center">
                              {record.isPaid ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
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