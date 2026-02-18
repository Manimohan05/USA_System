'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/contexts/toast';
import { Plus, Search, Filter, Users, Edit, Trash2, AlertCircle, RefreshCw, Upload, Archive, Download, Info, X } from 'lucide-react';
import api from '@/lib/api';
import { formatPhoneNumber } from '@/lib/utils';
import type { StudentDto, BatchDto, SubjectDto } from '@/types';

export default function StudentsPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; student: StudentDto | null }>({ show: false, student: null });
  const [deleting, setDeleting] = useState(false);
  const [infoPopover, setInfoPopover] = useState<{ show: boolean; student: StudentDto | null }>({ show: false, student: null });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [selectedBatch, selectedSubject]);

  const fetchInitialData = async () => {
    try {
      const [batchesRes, subjectsRes] = await Promise.all([
        api.get<BatchDto[]>('/admin/institute/batches'),
        api.get<SubjectDto[]>('/admin/institute/subjects'),
      ]);
      setBatches(batchesRes.data);
      setSubjects(subjectsRes.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      setError('Failed to load batch and subject data');
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedBatch) params.append('batchId', selectedBatch);
      if (selectedSubject) params.append('subjectId', selectedSubject);
      
      const response = await api.get<StudentDto[]>(`/admin/students?${params.toString()}`);
      setStudents(response.data);
      
      // If no students found and filters are applied, show informative message
      if (response.data.length === 0 && (selectedBatch || selectedSubject)) {
        console.log('No students found for the selected filters');
      }
    } catch (error: any) {
      console.error('Failed to fetch students:', error);
      // Provide more specific error messages
      if (error.response?.status === 403) {
        setError('Access denied. Please make sure you are logged in with proper permissions.');
      } else if (error.response?.status === 404) {
        setError('The requested batch or subject was not found.');
      } else if (error.response?.status >= 500) {
        setError('Server error occurred. Please try again later.');
      } else {
        setError('Failed to load students data. Please check your connection and try again.');
      }
      setStudents([]); // Clear students on error
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = (student: StudentDto) => {
    setDeleteConfirm({ show: true, student });
  };

  const confirmDeleteStudent = async () => {
    if (!deleteConfirm.student) return;

    setDeleting(true);
    try {
      // Archive student instead of permanently deleting
      await api.patch(`/admin/students/${deleteConfirm.student.id}/deactivate`);
      setStudents(students.filter(s => s.id !== deleteConfirm.student!.id));
      setDeleteConfirm({ show: false, student: null });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Archive Student',
        message: 'Unable to archive student. Please try again.',
        duration: 5000
      });
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, student: null });
  };

  const filteredStudents = students.filter(student => {
    const term = searchTerm.toLowerCase();
    return (
      student.fullName.toLowerCase().includes(term)
      || student.studentIdCode.toLowerCase().includes(term)
    );
  });

  const getExportFileBaseName = () => {
    const selectedBatchName = selectedBatch
      ? (batches.find(batch => batch.id.toString() === selectedBatch)?.displayName || selectedBatch)
      : 'all_batches';

    const safeBatchName = selectedBatchName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_\-]/g, '');

    return `${safeBatchName || 'all_batches'}_student_details`;
  };

  const buildStudentExportRows = () => {
    return filteredStudents.map(student => {
      const subjectColumns = subjects.reduce<Record<string, string>>((acc, subject) => {
        const isEnrolled = student.subjects.some(studentSubject => studentSubject.id === subject.id);
        acc[subject.name] = isEnrolled ? 'Yes' : '';
        return acc;
      }, {});

      return {
        'Student ID Code': student.studentIdCode,
        'Admission Date (YYYY-MM-DD or DD/MM/YYYY)': student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : '',
        'Full Name': student.fullName,
        'Address': student.address || '',
        'NIC (Optional)': student.nic || '',
        'School': student.school || '',
        'Phone No': student.parentPhone || '',
        ...subjectColumns,
        'Status': student.isActive ? 'Active' : 'Inactive',
      };
    });
  };

  const exportToCSV = () => {
    if (filteredStudents.length === 0) {
      addToast({ type: 'warning', title: 'No Data', message: 'No students to export' });
      return;
    }

    const csvData = buildStudentExportRows();

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getExportFileBaseName()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    addToast({ type: 'success', title: 'Exported', message: 'Students exported as CSV' });
  };

  const exportToExcel = () => {
    if (filteredStudents.length === 0) {
      addToast({ type: 'warning', title: 'No Data', message: 'No students to export' });
      return;
    }

    const excelData = buildStudentExportRows();

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    const headers = Object.keys(excelData[0]);
    ws['!cols'] = headers.map((header) => ({
      wch: Math.max(header.length + 2, 16)
    }));

    XLSX.writeFile(wb, `${getExportFileBaseName()}.xlsx`);
    addToast({ type: 'success', title: 'Exported', message: 'Students exported as Excel' });
  };

  if (loading && students.length === 0) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading students...</p>
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
          {/* Modern Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative px-8 py-12">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">Student Details</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <p className="text-white/90">Manage students, batches, and subjects</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-3">
                  {/* First row: Add Student and Bulk Import */}
                  <div className="flex space-x-3">
                    <Link
                      href="/dashboard/students/new"
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:scale-105 hover:shadow-xl"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Student
                    </Link>
                    <Link
                      href="/dashboard/students/import"
                      className="flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-200 text-white font-medium hover:scale-105"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Bulk Import
                    </Link>
                  </div>
                  
                  {/* Second row: Archived Students (centered) */}
                  <div className="flex justify-center">
                    <Link
                      href="/dashboard/students/archived"
                      className="flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-200 text-white font-medium hover:scale-105"
                    >
                      <Archive className="h-5 w-5 mr-2" />
                      Archived Students
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Filters Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Advanced Filters</h2>
                <p className="text-sm text-gray-600">Refine your search and find students quickly</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Search */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search Students</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Name or student ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 hover:border-indigo-300"
                  />
                </div>
              </div>

              {/* Batch Filter */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Batch</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 hover:border-indigo-300"
                >
                  <option value="">All Batches</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id.toString()}>
                      {batch.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 bg-white/70 hover:border-indigo-300"
                >
                  <option value="">All Subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Actions</label>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedBatch('');
                    setSelectedSubject('');
                  }}
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group-hover:scale-105"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    fetchStudents();
                  }}
                  className="ml-auto text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Students Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Students ({filteredStudents.length})
              </h3>
              <div className="flex items-center space-x-2">
                {loading && (
                  <div className="flex items-center text-sm text-gray-500">
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Loading...
                  </div>
                )}
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
            
            {filteredStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subjects
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parent Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-indigo-600">
                                {student.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {student.fullName}
                              </div>
                              {student.studentPhone && (
                                <div className="text-sm text-gray-500">
                                  {formatPhoneNumber(student.studentPhone)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {student.studentIdCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.batch.displayName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {student.subjects.map((subject) => (
                              <span
                                key={subject.id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {subject.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPhoneNumber(student.parentPhone)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {student.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setInfoPopover({ show: true, student })}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                              title="More Info"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/students/edit/${student.id}`)}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded transition-colors"
                              title="Edit Student"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                              title="Archive Student"
                              onClick={() => handleDeleteStudent(student)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {(() => {
                    if (searchTerm && (selectedBatch || selectedSubject)) {
                      const batchText = selectedBatch ? `Batch ${batches.find(b => b.id.toString() === selectedBatch)?.displayName || selectedBatch}` : '';
                      const subjectText = selectedSubject ? `Subject ${subjects.find(s => s.id.toString() === selectedSubject)?.name || selectedSubject}` : '';
                      const filterText = [batchText, subjectText].filter(Boolean).join(' and ');
                      return `No students found matching "${searchTerm}" in ${filterText}.`;
                    } else if (searchTerm) {
                      return `No students found matching "${searchTerm}". Try a different search term.`;
                    } else if (selectedBatch && selectedSubject) {
                      const batchName = batches.find(b => b.id.toString() === selectedBatch)?.displayName || selectedBatch;
                      const subjectName = subjects.find(s => s.id.toString() === selectedSubject)?.name || selectedSubject;
                      return `No students found in Batch ${batchName} enrolled in ${subjectName}.`;
                    } else if (selectedBatch) {
                      const batchName = batches.find(b => b.id.toString() === selectedBatch)?.displayName || selectedBatch;
                      return `No students found in Batch ${batchName}. This batch may not have any enrolled students yet.`;
                    } else if (selectedSubject) {
                      const subjectName = subjects.find(s => s.id.toString() === selectedSubject)?.name || selectedSubject;
                      return `No students found enrolled in ${subjectName}. This subject may not have any students assigned yet.`;
                    } else {
                      return 'Get started by adding your first student.';
                    }
                  })()}
                </p>
                {searchTerm || selectedBatch || selectedSubject ? (
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedBatch('');
                        setSelectedSubject('');
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors mr-3"
                    >
                      Clear All Filters
                    </button>
                    <Link
                      href="/dashboard/students/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Add Student
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6">
                    <Link
                      href="/dashboard/students/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Add Student
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Archive Confirmation Modal */}
        {deleteConfirm.show && deleteConfirm.student && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 p-2 rounded-full mr-3">
                  <Trash2 className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-medium text-gray-900">Archive Student</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to archive student "{deleteConfirm.student.fullName}"? 
                This will move them to the archived section but their data will be preserved.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteStudent}
                  disabled={deleting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {deleting ? 'Archiving...' : 'Archive Student'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* More Info Popover */}
        {infoPopover.show && infoPopover.student && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <Info className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{infoPopover.student.fullName}</h2>
                </div>
                <button
                  onClick={() => setInfoPopover({ show: false, student: null })}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 mb-6">
                {/* Student ID */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Student ID</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{infoPopover.student.studentIdCode}</p>
                </div>

                {/* Address */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Address</p>
                  <p className="text-sm text-gray-900 mt-2 leading-relaxed">
                    {infoPopover.student.address || '-'}
                  </p>
                </div>

                {/* NIC Number */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">NIC Number</p>
                  <p className="text-sm text-gray-900 mt-2 font-mono">
                    {infoPopover.student.nic || '-'}
                  </p>
                </div>

                {/* School */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">School</p>
                  <p className="text-sm text-gray-900 mt-2">
                    {infoPopover.student.school || '-'}
                  </p>
                </div>

                {/* Admission Date */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Admission Date</p>
                  <p className="text-sm text-gray-900 mt-2">
                    {infoPopover.student.admissionDate 
                      ? new Date(infoPopover.student.admissionDate).toLocaleDateString() 
                      : '-'
                    }
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInfoPopover({ show: false, student: null })}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
