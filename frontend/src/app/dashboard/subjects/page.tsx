'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/contexts/toast';
import { Plus, BookOpen, Users, Trash2, Edit, Search, Filter, Sparkles, GraduationCap, Star, Archive, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import type { SubjectDto, CreateSubjectRequest } from '@/types';

const PREDEFINED_SUBJECTS = [
  'Combined Maths',
  'Biology', 
  'Physics',
  'Chemistry'
];

export default function SubjectsPage() {
  const { addToast } = useToast();
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [archivedSubjects, setArchivedSubjects] = useState<SubjectDto[]>([]);
  const [showArchivedSection, setShowArchivedSection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectDto | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [useCustomName, setUseCustomName] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; subject: SubjectDto | null }>({
    show: false,
    subject: null
  });
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState<{ show: boolean; subject: SubjectDto | null }>({
    show: false,
    subject: null
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSubjects();
    fetchArchivedSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await api.get<SubjectDto[]>('/admin/institute/subjects');
      setSubjects(response.data);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Load Subjects',
        message: 'Unable to fetch subject data. Please refresh the page.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedSubjects = async () => {
    try {
      const response = await api.get<SubjectDto[]>('/admin/institute/subjects/archived');
      setArchivedSubjects(response.data);
    } catch (error) {
      console.error('Failed to load archived subjects:', error);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    setSubmitting(true);
    try {
      const request: CreateSubjectRequest = {
        name: newSubjectName.trim(),
      };
      
      if (editingSubject) {
        // Update existing subject
        const response = await api.put<SubjectDto>(`/admin/institute/subjects/${editingSubject.id}`, request);
        setSubjects(subjects.map(s => s.id === editingSubject.id ? response.data : s));
      } else {
        // Create new subject
        const response = await api.post<SubjectDto>('/admin/institute/subjects', request);
        setSubjects([...subjects, response.data]);
      }
      
      setNewSubjectName('');
      setShowForm(false);
      setEditingSubject(null);
    } catch (error: any) {
      // Check if it's a duplicate subject error
      if (error.response?.status === 409 || 
          error.response?.data?.message?.includes('already exists')) {
        addToast({
          type: 'warning',
          title: 'Subject Already Exists',
          message: `A subject with the name "${newSubjectName}" already exists. Please choose a different name.`,
          duration: 5000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Failed to Save Subject',
          message: 'Unable to save subject. Please try again.',
          duration: 5000
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubject = (subject: SubjectDto) => {
    setEditingSubject(subject);
    setNewSubjectName(subject.name);
    // Check if it's a predefined subject or custom
    setUseCustomName(!PREDEFINED_SUBJECTS.includes(subject.name));
    setShowForm(true);
  };

  const handleDeleteSubject = async (subject: SubjectDto) => {
    setDeleting(true);
    try {
      await api.delete(`/admin/institute/subjects/${subject.id}`);
      setSubjects(subjects.filter(s => s.id !== subject.id));
      fetchArchivedSubjects(); // Refresh archived list
      addToast({
        type: 'success',
        title: 'Subject Archived',
        message: `${subject.name} has been archived successfully.`,
        duration: 5000
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Unable to archive subject. Please try again.';
      addToast({
        type: 'error',
        title: 'Failed to Archive Subject',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleArchiveSubject = async (subject: SubjectDto) => {
    try {
      await api.put(`/admin/institute/subjects/${subject.id}/archive`);
      setSubjects(subjects.filter(s => s.id !== subject.id));
      fetchArchivedSubjects(); // Refresh archived list
      addToast({
        type: 'success',
        title: 'Subject Archived',
        message: `${subject.name} has been archived successfully.`,
        duration: 5000
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Unable to archive subject. Please try again.';
      addToast({
        type: 'error',
        title: 'Failed to Archive Subject',
        message: errorMessage,
        duration: 5000
      });
    }
  };

  const handleRecoverSubject = async (subject: SubjectDto) => {
    try {
      await api.put(`/admin/institute/subjects/${subject.id}/recover`);
      setArchivedSubjects(archivedSubjects.filter(s => s.id !== subject.id));
      fetchSubjects(); // Refresh active list
      addToast({
        type: 'success',
        title: 'Subject Recovered',
        message: `${subject.name} has been recovered successfully.`,
        duration: 5000
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Unable to recover subject. Please try again.';
      addToast({
        type: 'error',
        title: 'Failed to Recover Subject',
        message: errorMessage,
        duration: 5000
      });
    }
  };

  const handlePermanentlyDeleteSubject = (subject: SubjectDto) => {
    setPermanentDeleteConfirm({ show: true, subject });
  };

  const confirmPermanentlyDeleteSubject = async () => {
    if (!permanentDeleteConfirm.subject) return;

    setDeleting(true);
    try {
      await api.delete(`/admin/institute/subjects/${permanentDeleteConfirm.subject.id}/permanent`);
      setArchivedSubjects(archivedSubjects.filter(s => s.id !== permanentDeleteConfirm.subject!.id));
      setPermanentDeleteConfirm({ show: false, subject: null });
      addToast({
        type: 'success',
        title: 'Subject Permanently Deleted',
        message: `${permanentDeleteConfirm.subject.name} has been permanently deleted.`,
        duration: 5000
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Unable to delete subject permanently. Please try again.';
      addToast({
        type: 'error',
        title: 'Failed to Delete Subject',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setDeleting(false);
    }
  };

  const cancelPermanentDelete = () => {
    setPermanentDeleteConfirm({ show: false, subject: null });
  };

  const confirmDeleteSubject = async () => {
    if (!deleteConfirm.subject) return;

    setDeleting(true);
    try {
      await api.delete(`/admin/institute/subjects/${deleteConfirm.subject.id}`);
      setSubjects(subjects.filter(s => s.id !== deleteConfirm.subject!.id));
      fetchArchivedSubjects(); // Refresh archived list
      setDeleteConfirm({ show: false, subject: null });
      addToast({
        type: 'success',
        title: 'Subject Archived',
        message: `${deleteConfirm.subject.name} has been archived successfully.`,
        duration: 5000
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Unable to archive subject. Please try again.';
      addToast({
        type: 'error',
        title: 'Failed to Archive Subject',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, subject: null });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingSubject(null);
    setNewSubjectName('');
    setUseCustomName(false);
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
        <div className="space-y-6">
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
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">Subjects</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <p className="text-white/90">Manage academic subjects and curriculum</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowForm(true)}
                    className="group flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:scale-105 hover:shadow-xl"
                  >
                    <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                    Add Subject
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
                    <h2 className="text-2xl font-bold text-gray-900">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
                    <p className="text-gray-600">{editingSubject ? 'Update subject information' : 'Create a new academic subject'}</p>
                  </div>
                </div>
                <form onSubmit={handleCreateSubject} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      Subject Name *
                    </label>
                    
                    {/* Dropdown for predefined subjects */}
                    <div className="space-y-4">
                      <div className="relative">
                        <select
                          value={useCustomName ? 'custom' : newSubjectName}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'custom') {
                              setUseCustomName(true);
                              setNewSubjectName('');
                            } else {
                              setUseCustomName(false);
                              setNewSubjectName(value);
                            }
                          }}
                          className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white text-lg appearance-none"
                        >
                          <option value="">Select a subject...</option>
                          {PREDEFINED_SUBJECTS.map((subject) => (
                            <option key={subject} value={subject}>
                              {subject}
                            </option>
                          ))}
                          <option value="custom">Other (Custom Name)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <BookOpen className="h-5 w-5 text-indigo-500" />
                        </div>
                      </div>

                      {/* Custom input field - only shown when 'Other' is selected */}
                      {useCustomName && (
                        <div className="relative">
                          <input
                            type="text"
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            placeholder="Enter custom subject name"
                            required={useCustomName}
                            className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white text-lg"
                          />
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <Edit className="h-5 w-5 text-indigo-500" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {useCustomName 
                        ? 'Enter a custom subject name'
                        : 'Select from predefined subjects or choose "Other" for custom input'
                      }
                    </p>
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
                      disabled={submitting || !newSubjectName.trim()}
                      className="group px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                          <span className="animate-pulse">{editingSubject ? 'Updating...' : 'Creating...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                          <span>{editingSubject ? 'Update Subject' : 'Create Subject'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm.show && deleteConfirm.subject && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-red-100 p-8 w-full max-w-md">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl">
                    <Trash2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Delete Subject</h2>
                    <p className="text-red-600">This action cannot be undone</p>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <p className="text-gray-800 font-medium mb-2">
                    Are you sure you want to delete the subject:
                  </p>
                  <p className="text-lg font-bold text-red-700 mb-3">
                    "{deleteConfirm.subject.name}"
                  </p>
                  <p className="text-sm text-red-600">
                    This will permanently remove the subject and may affect related student records and attendance data.
                  </p>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={cancelDelete}
                    disabled={deleting}
                    className="px-6 py-3 text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteSubject}
                    disabled={deleting}
                    className="group px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  >
                    {deleting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                        <span className="animate-pulse">Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                        <span>Delete Subject</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Permanent Delete Confirmation Modal */}
          {permanentDeleteConfirm.show && permanentDeleteConfirm.subject && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-rose-200 p-8 w-full max-w-md">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-rose-600 to-red-700 rounded-xl">
                    <Trash2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Permanently Delete Subject</h2>
                    <p className="text-rose-600 font-semibold">This action is irreversible</p>
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 mb-6">
                  <p className="text-gray-800 font-medium mb-3">
                    Are you sure you want to PERMANENTLY DELETE:
                  </p>
                  <p className="text-lg font-bold text-rose-700 mb-4 px-2 py-2 bg-white rounded-lg border border-rose-200">
                    "{permanentDeleteConfirm.subject.name}"
                  </p>
                  <div className="space-y-2 text-sm text-rose-700">
                    <p className="flex items-start">
                      <span className="mr-2 mt-1">⚠️</span>
                      <span>This will completely remove the subject from the database.</span>
                    </p>
                    <p className="flex items-start">
                      <span className="mr-2 mt-1">✓</span>
                      <span>Students enrolled in this subject will NOT be deleted.</span>
                    </p>
                    <p className="flex items-start">
                      <span className="mr-2 mt-1">⚠️</span>
                      <span>This action cannot be undone.</span>
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={cancelPermanentDelete}
                    disabled={deleting}
                    className="px-6 py-3 text-gray-700 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPermanentlyDeleteSubject}
                    disabled={deleting}
                    className="group px-6 py-3 bg-gradient-to-r from-rose-600 to-red-700 text-white rounded-xl hover:from-rose-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  >
                    {deleting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                        <span className="animate-pulse">Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                        <span>Permanently Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modern Subjects Grid */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Active Subjects</h2>
                <p className="text-gray-600">Total: {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <div key={subject.id} className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 hover:border-indigo-200 transform hover:scale-105">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full -translate-y-10 translate-x-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                          <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{subject.name}</h3>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => handleEditSubject(subject)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 group-hover:scale-110"
                          title="Edit Subject"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleArchiveSubject(subject)}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all duration-200 group-hover:scale-110"
                          title="Archive Subject"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-indigo-600" />
                          <span className="text-sm font-medium text-indigo-800">Enrolled Students</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-indigo-700">{subject.studentCount}</span>
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Archived Subjects Section - Collapsible Below Active */}
          {archivedSubjects.length > 0 && (
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
                    <h2 className="text-2xl font-bold text-gray-900">Archived Subjects</h2>
                    <p className="text-gray-600">Total: {archivedSubjects.length} {archivedSubjects.length === 1 ? 'subject' : 'subjects'}</p>
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
                  {archivedSubjects.map((subject) => (
                    <div key={subject.id} className="group relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-200 hover:border-gray-400 opacity-75">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full -translate-y-10 translate-x-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
                      
                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                              <BookOpen className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{subject.name}</h3>
                              <p className="text-xs text-gray-400 mt-1">Archived</p>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button 
                              onClick={() => handleRecoverSubject(subject)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                              title="Recover Subject"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handlePermanentlyDeleteSubject(subject)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Permanently Delete Subject"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-gray-100 rounded-xl border border-gray-200">
                            <div className="flex items-center space-x-2">
                              <Users className="h-5 w-5 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">Enrolled Students</span>
                            </div>
                            <span className="text-2xl font-bold text-gray-700">{subject.studentCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {subjects.length === 0 && archivedSubjects.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-12">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mb-6">
                  <BookOpen className="h-12 w-12 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Subjects Created</h3>
                <p className="text-gray-600 mb-2">Start building your curriculum by adding academic subjects.</p>
                <p className="text-sm text-gray-500 mb-6">Subjects are essential for organizing students and tracking attendance.</p>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowForm(true)}
                    className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                    Create Your First Subject
                  </button>
                  <div className="text-xs text-gray-400">
                    Examples: Mathematics, Physics, Chemistry, Biology, English Literature
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
