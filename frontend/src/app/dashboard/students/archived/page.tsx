'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ArrowLeft, Search, Filter, Archive, RotateCcw, AlertCircle, RefreshCw, Users } from 'lucide-react';
import api from '@/lib/api';
import { formatPhoneNumber } from '@/lib/utils';
import type { StudentDto, BatchDto, SubjectDto } from '@/types';

export default function ArchivedStudentsPage() {
  const [archivedStudents, setArchivedStudents] = useState<StudentDto[]>([]);
  const [allArchivedStudents, setAllArchivedStudents] = useState<StudentDto[]>([]);
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [reactivateConfirm, setReactivateConfirm] = useState<{ show: boolean; student: StudentDto | null }>({ show: false, student: null });
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedBatch, selectedSubject, allArchivedStudents]);

  const fetchInitialData = async () => {
    try {
      const [archivedRes, batchesRes, subjectsRes] = await Promise.all([
        api.get<StudentDto[]>('/admin/students/archived'),
        api.get<BatchDto[]>('/admin/institute/batches'),
        api.get<SubjectDto[]>('/admin/institute/subjects'),
      ]);
      setAllArchivedStudents(archivedRes.data);
      setArchivedStudents(archivedRes.data);
      setBatches(batchesRes.data);
      setSubjects(subjectsRes.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch archived students:', error);
      setError('Failed to load archived students data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allArchivedStudents;
    
    if (selectedBatch) {
      filtered = filtered.filter(s => s.batch.id === parseInt(selectedBatch));
    }
    
    if (selectedSubject) {
      filtered = filtered.filter(s => s.subjects.some(subj => subj.id === parseInt(selectedSubject)));
    }
    
    setArchivedStudents(filtered);
  };

  const handleReactivateStudent = (student: StudentDto) => {
    setReactivateConfirm({ show: true, student });
  };

  const confirmReactivateStudent = async () => {
    if (!reactivateConfirm.student) return;

    setReactivating(true);
    try {
      await api.patch(`/admin/students/${reactivateConfirm.student.id}/reactivate`);
      const updatedStudents = allArchivedStudents.filter(s => s.id !== reactivateConfirm.student!.id);
      setAllArchivedStudents(updatedStudents);
      setReactivateConfirm({ show: false, student: null });
    } catch (error) {
      console.error('Failed to reactivate student:', error);
      alert('Failed to reactivate student. Please try again.');
    } finally {
      setReactivating(false);
    }
  };

  const cancelReactivate = () => {
    setReactivateConfirm({ show: false, student: null });
  };

  const filteredStudents = archivedStudents.filter(student =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentIdCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading archived students...</p>
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
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-600 via-slate-600 to-gray-700 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative px-8 py-12">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    href="/dashboard/students"
                    className="group p-3 hover:bg-white/20 rounded-xl transition-all duration-300"
                  >
                    <ArrowLeft className="h-6 w-6 text-white group-hover:text-gray-200 transition-colors" />
                  </Link>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Archive className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">Archived Students</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                        <p className="text-white/90">Students who have left the tuition</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{allArchivedStudents.length}</div>
                  <div className="text-sm text-white/80">Total Archived</div>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Filters Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl flex items-center justify-center">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Search & Filter</h2>
                <p className="text-sm text-gray-600">Find archived students quickly</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Search */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search Students</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Name, ID, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-200 bg-white/70 hover:border-gray-300"
                  />
                </div>
              </div>

              {/* Batch Filter */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Batch</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-200 bg-white/70 hover:border-gray-300"
                >
                  <option value="">All Batches</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id.toString()}>
                      Batch {batch.batchYear}
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all duration-200 bg-white/70 hover:border-gray-300"
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
                  fetchInitialData();
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
              Archived Students ({filteredStudents.length})
            </h3>
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
                      ID Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Index Number
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
                          <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.studentIdCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {student.indexNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Batch {student.batch.batchYear}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {student.subjects.map((subject) => (
                            <span
                              key={subject.id}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Archived
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                          title="Reactivate Student"
                          onClick={() => handleReactivateStudent(student)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Archive className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No archived students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedBatch || selectedSubject
                  ? 'Try adjusting your filters or search terms.'
                  : 'No students have been archived yet.'}
              </p>
            </div>
          )}
        </div>

        {/* Reactivate Confirmation Modal */}
        {reactivateConfirm.show && reactivateConfirm.student && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <RotateCcw className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-lg font-medium text-gray-900">Reactivate Student</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to reactivate student "{reactivateConfirm.student.fullName}" ({reactivateConfirm.student.studentIdCode})? 
                This will move them back to the active students list.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelReactivate}
                  disabled={reactivating}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReactivateStudent}
                  disabled={reactivating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {reactivating ? 'Reactivating...' : 'Reactivate Student'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}