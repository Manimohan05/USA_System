'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ArrowLeft, Save, Upload, UserPlus, Sparkles, Users, BookOpen, Phone, IdCard, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import type { BatchDto, SubjectDto, CreateStudentRequest } from '@/types';

export default function NewStudentPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    studentIdCode: '',
    fullName: '',
    parentPhone: '',
    studentPhone: '',
    batchId: '',
    subjectIds: [] as string[],
  });

  const [nextStudentId, setNextStudentId] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInitialData();
    fetchNextStudentId();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [batchesRes, subjectsRes] = await Promise.all([
        api.get<BatchDto[]>('/admin/institute/batches'),
        api.get<SubjectDto[]>('/admin/institute/subjects'),
      ]);
      setBatches(batchesRes.data);
      setSubjects(subjectsRes.data);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextStudentId = async () => {
    try {
      const response = await api.get<string>('/admin/students/next-student-id');
      setNextStudentId(response.data);
      // Auto-populate the form field
      setFormData(prev => ({ ...prev, studentIdCode: response.data }));
    } catch (error) {
      console.error('Failed to fetch next student ID:', error);
      setNextStudentId('STU001'); // fallback
      setFormData(prev => ({ ...prev, studentIdCode: 'STU001' }));
    }
  };

  const refreshPreview = () => {
    fetchNextStudentId();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.studentIdCode.trim()) {
      newErrors.studentIdCode = 'Student ID is required';
    } else if (!/^[A-Z0-9]{3,10}$/.test(formData.studentIdCode.toUpperCase())) {
      newErrors.studentIdCode = 'Student ID must be 3-10 characters, letters and numbers only';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.parentPhone.trim()) {
      newErrors.parentPhone = 'Parent phone number is required';
    } else {
      const cleanPhone = formData.parentPhone.replace(/\D/g, '');
      // Sri Lankan phone validation: 07XXXXXXXX (mobile) or 0XXXXXXXX (landline)
      if (!/^0[1-9]\d{7,8}$/.test(cleanPhone)) {
        newErrors.parentPhone = 'Please enter a valid Sri Lankan phone number (e.g., 0771234567)';
      }
    }

    if (formData.studentPhone) {
      const cleanStudentPhone = formData.studentPhone.replace(/\D/g, '');
      if (!/^0[1-9]\d{7,8}$/.test(cleanStudentPhone)) {
        newErrors.studentPhone = 'Please enter a valid Sri Lankan phone number (e.g., 0771234567)';
      }
    }

    if (!formData.batchId) {
      newErrors.batchId = 'Please select a batch';
    }

    if (formData.subjectIds.length === 0) {
      newErrors.subjectIds = 'Please select at least one subject';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const request: CreateStudentRequest = {
        studentIdCode: formData.studentIdCode.trim(),
        fullName: formData.fullName.trim(),
        parentPhone: formData.parentPhone.replace(/\D/g, ''),
        studentPhone: formData.studentPhone ? formData.studentPhone.replace(/\D/g, '') : undefined,
        batchId: parseInt(formData.batchId),
        subjectIds: formData.subjectIds.map(id => parseInt(id)),
      };
      
      const response = await api.post('/admin/students', request);
      
      // Show simple success message
      alert('✅ Student successfully added to the list!');
      
      // Redirect to students list
      router.push('/dashboard/students');
      
    } catch (error: any) {
      console.error('Failed to create student:', error);
      alert('Failed to create student. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter(id => id !== subjectId)
        : [...prev.subjectIds, subjectId],
    }));
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-600">Loading student data...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Modern Background */}
        <div className="min-h-screen relative overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50 animate-gradient-x"></div>
          
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[
              { left: '15%', top: '20%', delay: '0s', duration: '5s' },
              { left: '80%', top: '30%', delay: '2s', duration: '4.5s' },
              { left: '40%', top: '75%', delay: '1s', duration: '6s' },
              { left: '10%', top: '80%', delay: '3s', duration: '5.5s' }
            ].map((particle, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-indigo-200 rounded-full opacity-20 animate-float"
                style={{
                  left: particle.left,
                  top: particle.top,
                  animationDelay: particle.delay,
                  animationDuration: particle.duration
                }}
              ></div>
            ))}
          </div>

          <div className="relative z-10 max-w-4xl mx-auto space-y-8 p-6">
            {/* Modern Header */}
            <div className="backdrop-blur-md bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.back()}
                    className="group p-3 hover:bg-white/50 rounded-xl transition-all duration-300 hover:shadow-lg"
                  >
                    <ArrowLeft className="h-6 w-6 text-gray-600 group-hover:text-indigo-600 transition-colors" />
                  </button>
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
                      <UserPlus className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Add New Student
                      </h1>
                      <p className="text-gray-600 flex items-center mt-1">
                        <Sparkles className="h-4 w-4 mr-2 text-indigo-500" />
                        Create a new student record
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Next Student ID Preview */}
                <div className="text-center">
                  <div className="text-xl font-bold text-indigo-600">{nextStudentId}</div>
                  <div className="text-sm text-gray-500">Next Student ID</div>
                </div>
              </div>
            </div>

            {/* Modern Form */}
            <div className="backdrop-blur-md bg-white/70 rounded-2xl shadow-xl border border-white/20 p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Student ID Code - Modern Design */}
                <div className="space-y-3">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <IdCard className="h-5 w-5 mr-2 text-indigo-600" />
                    Student ID Code *
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={formData.studentIdCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentIdCode: e.target.value }))}
                      placeholder="Auto-generating..."
                      className={`w-full px-4 py-4 pr-14 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-lg font-medium ${
                        errors.studentIdCode ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-indigo-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={refreshPreview}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-all duration-200"
                      title="Generate new Student ID"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  </div>
                  {errors.studentIdCode && (
                    <p className="text-red-500 text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {errors.studentIdCode}
                    </p>
                  )}
                  <p className="text-gray-600 text-sm bg-blue-50/60 p-3 rounded-lg border border-blue-200">
                    💡 Auto-filled with next available ID. Click refresh icon to generate new ID or edit manually.
                  </p>
                </div>



                {/* Full Name - Modern Design */}
                <div className="space-y-3">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Full Name *
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Enter student's full name"
                      className={`w-full px-4 py-4 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-lg ${
                        errors.fullName ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-blue-300'
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-red-500 text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Phone Numbers - Modern Design */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="flex items-center text-lg font-semibold text-gray-800">
                      <Phone className="h-5 w-5 mr-2 text-green-600" />
                      Parent Phone Number *
                    </label>
                    <div className="relative group">
                      <input
                        type="tel"
                        value={formData.parentPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, parentPhone: e.target.value }))}
                        placeholder="0771234567"
                        className={`w-full px-4 py-4 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-lg ${
                          errors.parentPhone ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-green-300'
                        }`}
                      />
                    </div>
                    {errors.parentPhone && (
                      <p className="text-red-500 text-sm font-medium flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        {errors.parentPhone}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center text-lg font-semibold text-gray-800">
                      <Phone className="h-5 w-5 mr-2 text-purple-600" />
                      Student Phone (Optional)
                    </label>
                    <div className="relative group">
                      <input
                        type="tel"
                        value={formData.studentPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, studentPhone: e.target.value }))}
                        placeholder="0771234567"
                        className={`w-full px-4 py-4 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg ${
                          errors.studentPhone ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-purple-300'
                        }`}
                      />
                    </div>
                    {errors.studentPhone && (
                      <p className="text-red-500 text-sm font-medium flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        {errors.studentPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Batch Selection - Modern Design */}
                <div className="space-y-3">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <Users className="h-5 w-5 mr-2 text-orange-600" />
                    Batch * 
                    <span className="ml-2 text-sm font-normal text-gray-500">({batches.length} available)</span>
                  </label>
                  <div className="relative group">
                    <select
                      value={formData.batchId}
                      onChange={(e) => setFormData(prev => ({ ...prev, batchId: e.target.value }))}
                      className={`w-full px-4 py-4 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 text-lg cursor-pointer ${
                        errors.batchId ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-orange-300'
                      }`}
                    >
                      <option value="">Select a batch</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id.toString()}>
                          Batch {batch.batchYear}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.batchId && (
                    <p className="text-red-500 text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {errors.batchId}
                    </p>
                  )}
                </div>

                {/* Subject Selection - Modern Design */}
                <div className="space-y-4">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <BookOpen className="h-5 w-5 mr-2 text-teal-600" />
                    Subjects * 
                    <span className="ml-2 text-sm font-normal text-gray-500">({formData.subjectIds.length} selected)</span>
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((subject) => (
                      <label
                        key={subject.id}
                        className={`group relative flex items-center p-4 bg-white/40 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-white/60 hover:shadow-lg ${
                          formData.subjectIds.includes(subject.id.toString())
                            ? 'border-teal-400 bg-teal-50/60 shadow-md'
                            : 'border-gray-200 hover:border-teal-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.subjectIds.includes(subject.id.toString())}
                          onChange={() => handleSubjectToggle(subject.id.toString())}
                          className="sr-only"
                        />
                        <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center transition-all duration-200 ${
                          formData.subjectIds.includes(subject.id.toString())
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-gray-300 group-hover:border-teal-400'
                        }`}>
                          {formData.subjectIds.includes(subject.id.toString()) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={`font-medium transition-colors ${
                          formData.subjectIds.includes(subject.id.toString()) 
                            ? 'text-teal-800' 
                            : 'text-gray-700 group-hover:text-teal-700'
                        }`}>
                          {subject.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  
                  {errors.subjectIds && (
                    <p className="text-red-500 text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {errors.subjectIds}
                    </p>
                  )}
                  
                  <div className="text-sm text-gray-600 bg-teal-50/60 p-3 rounded-lg border border-teal-200">
                    💡 Select all subjects the student will be enrolled in. You can modify this later.
                  </div>
                </div>

                {/* Modern Form Actions */}
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-8 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="group px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl hover:from-indigo-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-lg"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        Creating Student...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                        Create Student
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Modern Bulk Import Section */}
            <div className="backdrop-blur-md bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-2xl shadow-xl border border-blue-200/50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">Bulk Import Available</h3>
                    <p className="text-sm text-blue-700">
                      Need to add multiple students? Import from CSV file.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/dashboard/students/import')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                >
                  Go to Bulk Import
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
