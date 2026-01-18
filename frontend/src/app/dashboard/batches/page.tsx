'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Plus, Calendar, Users, Trash2, Edit, X, GraduationCap, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import type { BatchDto, CreateBatchRequest } from '@/types';

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchDto | null>(null);
  const [newBatchYear, setNewBatchYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; batch: BatchDto | null }>({ show: false, batch: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await api.get<BatchDto[]>('/admin/institute/batches');
      setBatches(response.data);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
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
      setShowForm(false);
      setEditingBatch(null);
    } catch (error) {
      console.error('Failed to save batch:', error);
      alert('Failed to save batch. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBatch = (batch: BatchDto) => {
    setEditingBatch(batch);
    setNewBatchYear(batch.batchYear.toString());
    setShowForm(true);
  };

  const handleDeleteBatch = (batch: BatchDto) => {
    setDeleteConfirm({ show: true, batch });
  };

  const confirmDeleteBatch = async () => {
    if (!deleteConfirm.batch) return;

    setDeleting(true);
    try {
      await api.delete(`/admin/institute/batches/${deleteConfirm.batch.id}`);
      setBatches(batches.filter(b => b.id !== deleteConfirm.batch!.id));
      setDeleteConfirm({ show: false, batch: null });
    } catch (error) {
      console.error('Failed to delete batch:', error);
      alert('Failed to delete batch. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, batch: null });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingBatch(null);
    setNewBatchYear('');
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
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-600 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative px-8 py-12">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">Batch Management</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
                        <p className="text-white/90">Organize academic batches and years</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-white/80 text-lg max-w-2xl">
                    Create and manage academic batches to organize students by enrollment year and track their progress.
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="group flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-xl hover:from-blue-600 hover:to-sky-600 transition-all duration-200 font-medium shadow-lg hover:scale-105 hover:shadow-xl"
                >
                  <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                  Add Batch
                </button>
              </div>
            </div>
          </div>

          {/* Create Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 w-full max-w-lg">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl">
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
                        className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-500 transition-all duration-200 bg-gray-50 hover:bg-white text-lg appearance-none"
                      >
                        <option value="">Select Academic Year</option>
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <Calendar className="h-5 w-5 text-sky-500" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Choose the year when students will be enrolled in this batch</p>
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
                      className="group px-6 py-3 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-xl hover:from-blue-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
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
                  <div className="bg-red-100 p-2 rounded-full mr-3">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <h2 className="text-lg font-medium text-gray-900">Delete Batch</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete batch "{deleteConfirm.batch.batchYear}"? 
                  This action cannot be undone and may affect related student records.
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
                    onClick={confirmDeleteBatch}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete Batch'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modern Batches Grid */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Academic Batches</h2>
                <p className="text-gray-600">Total: {batches.length} {batches.length === 1 ? 'batch' : 'batches'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map((batch) => (
                <div key={batch.id} className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 hover:border-sky-200 transform hover:scale-105">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-sky-100 rounded-full -translate-y-10 translate-x-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl group-hover:scale-110 transition-transform duration-200">
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-sky-700 transition-colors">Batch {batch.batchYear}</h3>
                          <p className="text-sm text-gray-500 font-medium">Academic Year {batch.batchYear}</p>
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
                          className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200"
                          title="Edit Batch"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteBatch(batch)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete Batch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {batches.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-12">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-sky-100 rounded-full flex items-center justify-center mb-6">
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
