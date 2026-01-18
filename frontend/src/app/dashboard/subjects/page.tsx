'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Plus, BookOpen, Users, Trash2, Edit, Search, Filter, Sparkles, GraduationCap, Star } from 'lucide-react';
import api from '@/lib/api';
import type { SubjectDto, CreateSubjectRequest } from '@/types';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectDto | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; subject: SubjectDto | null }>({
    show: false,
    subject: null
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await api.get<SubjectDto[]>('/admin/institute/subjects');
      setSubjects(response.data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setLoading(false);
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
    } catch (error) {
      console.error('Failed to save subject:', error);
      alert('Failed to save subject. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubject = (subject: SubjectDto) => {
    setEditingSubject(subject);
    setNewSubjectName(subject.name);
    setShowForm(true);
  };

  const handleDeleteSubject = async (subject: SubjectDto) => {
    setDeleteConfirm({ show: true, subject });
  };

  const confirmDeleteSubject = async () => {
    if (!deleteConfirm.subject) return;

    setDeleting(true);
    try {
      await api.delete(`/admin/institute/subjects/${deleteConfirm.subject.id}`);
      setSubjects(subjects.filter(s => s.id !== deleteConfirm.subject!.id));
      setDeleteConfirm({ show: false, subject: null });
    } catch (error) {
      console.error('Failed to delete subject:', error);
      alert('Failed to delete subject. Please try again.');
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
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl shadow-2xl">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative px-8 py-12">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white">Subject Management</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <p className="text-white/90">Manage academic subjects and curriculum</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-white/80 text-lg max-w-2xl">
                    Create, organize, and manage academic subjects to build a comprehensive curriculum for your institution.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowForm(true)}
                    className="group flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-medium shadow-lg hover:scale-105 hover:shadow-xl"
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
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
                    <p className="text-gray-600">{editingSubject ? 'Update subject information' : 'Create a new academic subject'}</p>
                  </div>
                </div>
                <form onSubmit={handleCreateSubject} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      Subject Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder="Enter subject name (e.g., Chemistry, Physics, Mathematics)"
                        required
                        className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 bg-gray-50 hover:bg-white text-lg"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <BookOpen className="h-5 w-5 text-emerald-500" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Choose a clear and descriptive name for the subject</p>
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
                      className="group px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
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

          {/* Modern Subjects Grid */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Active Subjects</h2>
                <p className="text-gray-600">Total: {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <div key={subject.id} className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 hover:border-emerald-200 transform hover:scale-105">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -translate-y-10 translate-x-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                          <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{subject.name}</h3>
                          <p className="text-sm text-gray-500 font-mono">ID: {subject.id}</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => handleEditSubject(subject)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 group-hover:scale-110"
                          title="Edit Subject"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSubject(subject)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group-hover:scale-110"
                          title="Delete Subject"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-800">Enrolled Students</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-emerald-700">{subject.studentCount}</span>
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 text-center">
                        Created: {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {subjects.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-12">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mb-6">
                  <BookOpen className="h-12 w-12 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Subjects Created</h3>
                <p className="text-gray-600 mb-2">Start building your curriculum by adding academic subjects.</p>
                <p className="text-sm text-gray-500 mb-8">Subjects are essential for organizing students and tracking attendance.</p>
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
