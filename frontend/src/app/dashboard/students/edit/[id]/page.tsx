'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ArrowLeft, Save, Edit2, Sparkles, Users, BookOpen, Phone, IdCard, MapPin, CreditCard, GraduationCap, Calendar } from 'lucide-react';
import api from '@/lib/api';
import type { BatchDto, SubjectDto, UpdateStudentRequest, StudentDto } from '@/types';

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;
  
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [student, setStudent] = useState<StudentDto | null>(null);
  
  const [formData, setFormData] = useState({
    batchId: '',
    date: '',
    indexNumber: '',
    fullName: '',
    address: '',
    nic: '',
    school: '',
    phoneNo: '',
    subjectIds: [] as string[],
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInitialData();
  }, [studentId]);

  const fetchInitialData = async () => {
    try {
      const [batchesRes, subjectsRes, studentRes] = await Promise.all([
        api.get<BatchDto[]>('/admin/institute/batches'),
        api.get<SubjectDto[]>('/admin/institute/subjects'),
        api.get<StudentDto>(`/admin/students/${studentId}`)
      ]);
      
      setBatches(batchesRes.data);
      setSubjects(subjectsRes.data);
      setStudent(studentRes.data);
      
      // Populate form with existing student data
      const studentData = studentRes.data;
      setFormData({
        batchId: studentData.batch.id.toString(),
        date: studentData.admissionDate || new Date().toISOString().split('T')[0],
        indexNumber: studentData.indexNumber || '',
        fullName: studentData.fullName,
        address: studentData.address || '',
        nic: studentData.nic || '',
        school: studentData.school || '',
        phoneNo: studentData.parentPhone,
        subjectIds: studentData.subjects.map(s => s.id.toString()),
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.batchId) {
      newErrors.batchId = 'Batch is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Admission date is required';
    }

    if (!formData.indexNumber?.trim()) {
      newErrors.indexNumber = 'Index number is required';
    }

    if (!formData.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.school?.trim()) {
      newErrors.school = 'School is required';
    }

    if (!formData.phoneNo.trim()) {
      newErrors.phoneNo = 'Phone number is required';
    } else {
      const cleanPhone = formData.phoneNo.replace(/\D/g, '');
      // Sri Lankan phone validation: 07XXXXXXXX (mobile) or 0XXXXXXXX (landline)
      if (!/^0[1-9]\d{7,8}$/.test(cleanPhone)) {
        newErrors.phoneNo = 'Please enter a valid Sri Lankan phone number (e.g., 0771234567)';
      }
    }

    if (formData.nic && !/^(\d{9}[VXvx]|\d{12})$/.test(formData.nic)) {
      newErrors.nic = 'Please enter a valid NIC (9 digits + V/X or 12 digits)';
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
      const updateRequest: UpdateStudentRequest = {
        fullName: formData.fullName.trim(),
        parentPhone: formData.phoneNo.trim(), // Keep original format for backend processing
        batchId: parseInt(formData.batchId),
        subjectIds: formData.subjectIds.map(id => parseInt(id)),
        address: formData.address.trim(),
        school: formData.school.trim(),
        admissionDate: formData.date,
        indexNumber: formData.indexNumber.trim(),
        ...(formData.nic.trim() && { nic: formData.nic.trim() }),
      };

      await api.put(`/admin/students/${studentId}`, updateRequest);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to update student:', error);
      alert('Failed to update student. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessOk = () => {
    setShowSuccessModal(false);
    router.push('/dashboard/students');
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

  if (!student) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50">
            <div className="text-center space-y-4">
              <p className="text-red-600">Student not found</p>
              <button
                onClick={() => router.push('/dashboard/students')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Go Back
              </button>
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
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                      <Edit2 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Edit Student
                      </h1>
                      <p className="text-gray-600 flex items-center mt-1">
                        <Sparkles className="h-4 w-4 mr-2 text-orange-500" />
                        Update student information
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Student ID Display */}
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">{student.studentIdCode}</div>
                  <div className="text-sm text-gray-500">Student ID</div>
                </div>
              </div>
            </div>

            {/* Modern Form */}
            <div className="backdrop-blur-md bg-white/70 rounded-2xl shadow-xl border border-white/20 p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Batch Selection */}
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
                          {batch.displayName}
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

                {/* 2. Date Field */}
                <div className="space-y-3">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                    Admission Date *
                  </label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className={`w-full px-4 py-4 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg ${
                        errors.date ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-purple-300'
                      }`}
                    />
                  </div>
                  {errors.date && (
                    <p className="text-red-500 text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {errors.date}
                    </p>
                  )}
                </div>

                {/* 3. Index Number */}
                <div className="space-y-3">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <IdCard className="h-5 w-5 mr-2 text-indigo-600" />
                    Index Number *
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={formData.indexNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, indexNumber: e.target.value }))}
                      placeholder="Enter index number"
                      className={`w-full px-4 py-4 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-lg font-medium ${
                        errors.indexNumber ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-indigo-300'
                      }`}
                    />
                  </div>
                  {errors.indexNumber && (
                    <p className="text-red-500 text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {errors.indexNumber}
                    </p>
                  )}
                </div>

                {/* 4. Full Name */}
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

                {/* 5. Address */}
                <div className="space-y-3">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <MapPin className="h-5 w-5 mr-2 text-teal-600" />
                    Address *
                  </label>
                  <div className="relative group">
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter student's address"
                      rows={3}
                      className={`w-full px-4 py-4 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 text-lg resize-none ${
                        errors.address ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-teal-300'
                      }`}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-red-500 text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {errors.address}
                    </p>
                  )}
                </div>

                {/* 6. NIC */}
                <div className="space-y-3">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <CreditCard className="h-5 w-5 mr-2 text-red-600" />
                    NIC Number (Optional)
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={formData.nic}
                      onChange={(e) => setFormData(prev => ({ ...prev, nic: e.target.value }))}
                      placeholder="123456789V or 123456789012"
                      className={`w-full px-4 py-4 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 text-lg ${
                        errors.nic ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-red-300'
                      }`}
                    />
                  </div>
                  {errors.nic && (
                    <p className="text-red-500 text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {errors.nic}
                    </p>
                  )}
                </div>

                {/* 7. School */}
                <div className="space-y-3">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <GraduationCap className="h-5 w-5 mr-2 text-yellow-600" />
                    School *
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={formData.school}
                      onChange={(e) => setFormData(prev => ({ ...prev, school: e.target.value }))}
                      placeholder="Enter student's school"
                      className={`w-full px-4 py-4 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300 text-lg ${
                        errors.school ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-yellow-300'
                      }`}
                    />
                  </div>
                  {errors.school && (
                    <p className="text-red-500 text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {errors.school}
                    </p>
                  )}
                </div>

                {/* 8. Phone Number */}
                <div className="space-y-3">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <Phone className="h-5 w-5 mr-2 text-green-600" />
                    Phone No *
                  </label>
                  <div className="relative group">
                    <input
                      type="tel"
                      value={formData.phoneNo}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNo: e.target.value }))}
                      placeholder="0771234567"
                      className={`w-full px-4 py-4 bg-white/60 border-2 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-lg ${
                        errors.phoneNo ? 'border-red-300 bg-red-50/60' : 'border-gray-200 group-hover:border-green-300'
                      }`}
                    />
                  </div>
                  {errors.phoneNo && (
                    <p className="text-red-500 text-sm font-medium flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {errors.phoneNo}
                    </p>
                  )}
                </div>

                {/* 9. Subject Selection */}
                <div className="space-y-4">
                  <label className="flex items-center text-lg font-semibold text-gray-800">
                    <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                    Subjects * 
                    <span className="ml-2 text-sm font-normal text-gray-500">({formData.subjectIds.length} selected)</span>
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((subject) => (
                      <label
                        key={subject.id}
                        className={`group relative flex items-center p-4 bg-white/40 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-white/60 hover:shadow-lg ${
                          formData.subjectIds.includes(subject.id.toString())
                            ? 'border-green-400 bg-green-50/60 shadow-md'
                            : 'border-gray-200 hover:border-green-300'
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
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 group-hover:border-green-400'
                        }`}>
                          {formData.subjectIds.includes(subject.id.toString()) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={`font-medium transition-colors ${
                          formData.subjectIds.includes(subject.id.toString()) 
                            ? 'text-green-800' 
                            : 'text-gray-700 group-hover:text-green-700'
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
                </div>

                {/* Form Actions */}
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
                    className="group flex items-center justify-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-lg"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        Updating Student...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                        Update Student
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Success Modal Overlay */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4">
              <div className="text-center space-y-4">
                {/* Success Icon */}
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                
                {/* Success Message */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">Student Updated Successfully!</h3>
                  <p className="text-gray-600">
                    <span className="font-semibold text-green-600">{formData.fullName}</span> has been updated in the system.
                  </p>
                </div>
                
                {/* OK Button */}
                <button
                  onClick={handleSuccessOk}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}