'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/contexts/toast';
import { Plus, Calendar, Users, Trash2, Edit, X, GraduationCap, Sparkles, RotateCcw, Archive } from 'lucide-react';
import api from '@/lib/api';
import type { BatchDto, CreateBatchRequest } from '@/types';

export default function BatchesPage() {
  const { addToast } = useToast();
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [archivedBatches, setArchivedBatches] = useState<BatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchDto | null>(null);
  const [newBatchYear, setNewBatchYear] = useState('');
  const [isDayBatch, setIsDayBatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; batch: BatchDto | null }>({ show: false, batch: null });
  const [deleting, setDeleting] = useState(false);
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState<{ show: boolean; batch: BatchDto | null }>({ show: false, batch: null });
  const [deletingPermanent, setDeletingPermanent] = useState(false);
  const [showArchivedSection, setShowArchivedSection] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const [activeBatchesRes, archivedBatchesRes] = await Promise.all([
        api.get<BatchDto[]>('/admin/institute/batches'),
        api.get<BatchDto[]>('/admin/institute/batches/archived')
      ]);
      setBatches(activeBatchesRes.data);
      setArchivedBatches(archivedBatchesRes.data);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Load Batches',
        message: 'Unable to fetch batch data. Please refresh the page.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchYear.trim()) return;

    setSubmitting(true);
    try {
      const request: CreateBatchRequest = {
        batchYear: parseInt(newBatchYear),
        isDayBatch: isDayBatch,
      };
      
      if (editingBatch) {
        // Update existing batch
        const response = await api.put<BatchDto>(`/admin/institute/batches/${editingBatch.id}`, request);
        setBatches(batches.map(b => b.id === editingBatch.id ? response.data : b));
      } else {
        // Create new batch
        const response = await api.post<BatchDto>('/admin/institute/batches', request);
        setBatches([...batches, response.data]);
      }
      
      setNewBatchYear('');
      setIsDayBatch(false);
      setShowForm(false);
      setEditingBatch(null);
    } catch (error: any) {
      // Handle specific error cases
      const errorMessage = error.response?.data?.message || '';
      
      if (errorMessage.includes('already exists')) {
        addToast({
          type: 'warning',
          title: '⚠️ Batch Already Exists',
          message: `Batch ${newBatchYear}${isDayBatch ? ' Day' : ''} already exists. Please use a different combination or edit the existing batch.`,
          duration: 6000
        });
      } else if (errorMessage.includes('Batch not found')) {
        addToast({
          type: 'error',
          title: '❌ Batch Not Found',
          message: 'The batch you are trying to update no longer exists. Please refresh the page.',
          duration: 5000
        });
      } else {
        // Generic error for unexpected cases
        addToast({
          type: 'error',
          title: 'Failed to Save Batch',
          message: errorMessage || 'Unable to save batch. Please try again.',
          duration: 5000
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBatch = (batch: BatchDto) => {
    setEditingBatch(batch);
    setNewBatchYear(batch.batchYear.toString());
    setIsDayBatch(batch.isDayBatch);
    setShowForm(true);
  };

  const handleArchiveBatch = (batch: BatchDto) => {
    setDeleteConfirm({ show: true, batch });
  };

  const confirmArchiveBatch = async () => {
    if (!deleteConfirm.batch) return;

    setDeleting(true);
    try {
      const response = await api.put<BatchDto>(`/admin/institute/batches/${deleteConfirm.batch.id}/archive`);
      setBatches(batches.filter(b => b.id !== deleteConfirm.batch!.id));
      setArchivedBatches([...archivedBatches, response.data]);
      setDeleteConfirm({ show: false, batch: null });
      addToast({
        type: 'success',
        title: 'Batch Archived',
        message: `Batch "${deleteConfirm.batch.displayName}" has been archived and can be recovered later.`,
        duration: 5000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Archive Batch',
        message: 'Unable to archive batch. Please try again.',
        duration: 5000
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleRecoverBatch = async (batch: BatchDto) => {
    try {
      const response = await api.put<BatchDto>(`/admin/institute/batches/${batch.id}/recover`);
      setArchivedBatches(archivedBatches.filter(b => b.id !== batch.id));
      setBatches([...batches, response.data]);
      addToast({
        type: 'success',
        title: 'Batch Recovered',
        message: `Batch "${batch.displayName}" has been recovered.`,
        duration: 5000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Recover Batch',
        message: 'Unable to recover batch. Please try again.',
        duration: 5000
      });
    }
  };

  const handlePermanentlyDeleteBatch = async (batch: BatchDto) => {
    setPermanentDeleteConfirm({ show: true, batch });
  };

  const confirmPermanentDeleteBatch = async () => {
    if (!permanentDeleteConfirm.batch) return;

    setDeletingPermanent(true);
    try {
      await api.delete(`/admin/institute/batches/${permanentDeleteConfirm.batch.id}/permanent`);
      setArchivedBatches(archivedBatches.filter(b => b.id !== permanentDeleteConfirm.batch!.id));
      setPermanentDeleteConfirm({ show: false, batch: null });
      addToast({
        type: 'success',
        title: 'Batch Deleted',
        message: `Batch "${permanentDeleteConfirm.batch.displayName}" has been permanently deleted.`,
        duration: 5000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Delete Batch',
        message: 'Unable to delete batch. Please try again.',
        duration: 5000
      });
    } finally {
      setDeletingPermanent(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, batch: null });
  };

  const cancelPermanentDelete = () => {
    setPermanentDeleteConfirm({ show: false, batch: null });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingBatch(null);
    setNewBatchYear('');
    setIsDayBatch(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - 5 + i);

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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">Batch Management</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <p className="text-white/90">Organize academic batches and years</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {archivedBatches.length > 0 && (
                    <button
                      onClick={() => setShowArchivedSection(!showArchivedSection)}
                      className="group flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:scale-105"
                      title="View Archived Batches"
                    >
                      <Archive className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                      <span className="hidden sm:inline">Archived</span>
                      <span className="ml-1 bg-white/30 px-2 py-1 rounded text-sm">{archivedBatches.length}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowForm(true)}
                    className="group flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:scale-105 hover:shadow-xl"
                  >
                    <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                    Add Batch
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Create Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 w-full max-w-lg">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{editingBatch ? 'Edit Batch' : 'Add New Batch'}</h2>
                    <p className="text-gray-600">{editingBatch ? 'Update batch information' : 'Create a new academic batch'}</p>
                  </div>
                </div>
                <form onSubmit={handleCreateBatch} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      Academic Year *
                    </label>
                    <div className="relative">
                      <select
                        value={newBatchYear}
                        onChange={(e) => setNewBatchYear(e.target.value)}
                        required
                        className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white text-lg appearance-none"
                      >
                        <option value="">Select Academic Year</option>
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <Calendar className="h-5 w-5 text-indigo-500" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Choose the year when students will be enrolled in this batch</p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="dayBatch"
                      checked={isDayBatch}
                      onChange={(e) => setIsDayBatch(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                    />
                    <label htmlFor="dayBatch" className="text-sm font-medium text-gray-800">
                      Day Batch
                    </label>
                    <p className="text-xs text-gray-500">Check if this is a day batch (vs regular batch)</p>
                  </div>
                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={submitting}
                      className="px-6 py-3 text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !newBatchYear.trim()}
                      className="group px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                          <span className="animate-pulse">{editingBatch ? 'Updating...' : 'Creating...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                          <span>{editingBatch ? 'Update Batch' : 'Create Batch'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm.show && deleteConfirm.batch && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex items-center mb-4">
                  <div className="bg-yellow-100 p-2 rounded-full mr-3">
                    <Archive className="h-5 w-5 text-yellow-600" />
                  </div>
                  <h2 className="text-lg font-medium text-gray-900">Archive Batch</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to archive batch "{deleteConfirm.batch.displayName}"? 
                  You can recover it later from the archived batches section.
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
                    onClick={confirmArchiveBatch}
                    disabled={deleting}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {deleting ? 'Archiving...' : 'Archive Batch'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Permanent Delete Confirmation Modal */}
          {permanentDeleteConfirm.show && permanentDeleteConfirm.batch && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex items-center mb-4">
                  <div className="bg-red-100 p-2 rounded-full mr-3">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <h2 className="text-lg font-medium text-gray-900">Permanently Delete Batch</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to permanently delete batch "{permanentDeleteConfirm.batch.displayName}"?
                  This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={cancelPermanentDelete}
                    disabled={deletingPermanent}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPermanentDeleteBatch}
                    disabled={deletingPermanent}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingPermanent ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Archived Batches Section - Collapsible at Top */}
          {archivedBatches.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
              <button
                onClick={() => setShowArchivedSection(!showArchivedSection)}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center">
                    <Archive className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-2xl font-bold text-gray-900">Archived Batches</h2>
                    <p className="text-gray-600">Total: {archivedBatches.length} {archivedBatches.length === 1 ? 'batch' : 'batches'}</p>
                  </div>
                </div>
                <div className={`transform transition-transform duration-300 ${showArchivedSection ? 'rotate-180' : ''}`}>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </button>

              {showArchivedSection && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  {archivedBatches.map((batch) => (
                    <div key={batch.id} className="group relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-200 hover:border-gray-400 opacity-75">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full -translate-y-10 translate-x-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
                      
                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                              <Calendar className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-700 group-hover:text-gray-900 transition-colors">
                                {batch.displayName}
                              </h3>
                              <p className="text-sm text-gray-500 font-medium">
                                Academic Year {batch.batchYear} {batch.isDayBatch ? '(Day Batch)' : ''}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">Archived</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center text-sm text-gray-500">
                            <Users className="h-4 w-4 mr-1" />
                            <span>Students: {batch.studentCount}</span>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleRecoverBatch(batch)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                              title="Recover Batch"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handlePermanentlyDeleteBatch(batch)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Permanently Delete Batch"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modern Batches Grid */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Academic Batches</h2>
                <p className="text-gray-600">Total: {batches.length} {batches.length === 1 ? 'batch' : 'batches'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map((batch) => (
                <div key={batch.id} className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 hover:border-indigo-200 transform hover:scale-105">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full -translate-y-10 translate-x-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                            {batch.displayName}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium">
                            Academic Year {batch.batchYear} {batch.isDayBatch ? '(Day Batch)' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        <span>Students: {batch.studentCount}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditBatch(batch)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                          title="Edit Batch"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleArchiveBatch(batch)}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all duration-200"
                          title="Archive Batch"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {batches.length === 0 && archivedBatches.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-12">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                  <Calendar className="h-12 w-12 text-sky-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Batches Created</h3>
                <p className="text-gray-600 mb-2">Start organizing your institution by creating academic batches.</p>
                <p className="text-sm text-gray-500 mb-8">Batches help you group students by enrollment year for better management.</p>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowForm(true)}
                    className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-xl hover:from-blue-600 hover:to-sky-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                    Create Your First Batch
                  </button>
                  <div className="text-xs text-gray-400">
                    Examples: 2024, 2025, 2026
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
