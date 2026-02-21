'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CsvFileUpload from '@/components/csv/CsvFileUpload';
import CsvImportResults from '@/components/csv/CsvImportResults';
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, Download, Users, BookOpen, Sparkles, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import type { CsvImportResult, BatchDto, SubjectDto } from '@/types';
import api from '@/lib/api';

export default function BulkImportPage() {
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [batchesRes, subjectsRes] = await Promise.all([
        api.get<BatchDto[]>('/admin/institute/batches'),
        api.get<SubjectDto[]>('/admin/institute/subjects'),
      ]);
      const activeBatches = batchesRes.data.filter(batch => !batch.isArchived);
      setBatches(activeBatches);
      setSubjects(subjectsRes.data);
      // Auto-select first batch if available
      if (activeBatches.length > 0) {
        setSelectedBatchId(activeBatches[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportComplete = (result: CsvImportResult) => {
    setImportResult(result);
  };

  const handleCloseResults = () => {
    setImportResult(null);
    setResetKey(prev => prev + 1); // Reset the upload form
  };

  const downloadTemplate = () => {
    const csvContent = [
      ['Batch Year', 'Admission Date (YYYY-MM-DD)', 'Full Name', 'Address', 'NIC (Optional)', 'School', 'Phone No', 'Subjects (comma-separated)'],
      ['2027', '2026-01-21', 'John Doe', '123 Main St, Colombo', '123456789V', 'Royal College', '0771234567', 'Mathematics,Physics'],
      ['2027', '2026-01-21', 'Jane Smith', '456 Lake Rd, Kandy', '', 'Dharmaraja College', '0762345678', 'Biology,Chemistry'],
    ].map((row: string[]) => row.join(',')).join('\\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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

  const selectedBatch = selectedBatchId ? batches.find((batch) => batch.id === selectedBatchId) : null;
  const selectedBatchFormatPrefix = selectedBatch
    ? `${selectedBatch.isDayBatch ? `D${selectedBatch.batchYear % 10}` : `${selectedBatch.batchYear % 10}`}`
    : null;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
            {/* Modern Header */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    href="/dashboard/students"
                    className="group p-3 hover:bg-gray-100 rounded-xl transition-all duration-300"
                  >
                    <ArrowLeft className="h-6 w-6 text-gray-600 group-hover:text-indigo-600 transition-colors" />
                  </Link>
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">
                        Bulk Student Import
                      </h1>
                      <p className="text-gray-600 flex items-center mt-1">
                        <Sparkles className="h-4 w-4 mr-2 text-indigo-500" />
                        Import multiple students from CSV file
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{batches.length}</div>
                    <div className="text-sm text-gray-500">Batches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{subjects.length}</div>
                    <div className="text-sm text-gray-500">Subjects</div>
                  </div>
                </div>
              </div>
            </div>

          {!importResult ? (
            <>
              {/* Batch Selection Section */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-lg">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Select Target Batch
                    </h2>
                    <p className="text-gray-600">Choose which batch to import these students into</p>
                  </div>
                </div>
                
                <div className="max-w-md">
                  <label htmlFor="batch-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Batch *
                  </label>
                  <select
                    id="batch-select"
                    value={selectedBatchId || ''}
                    onChange={(e) => setSelectedBatchId(Number(e.target.value) || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focused:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">-- Select a batch --</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.displayName} ({batch.studentCount} students)
                      </option>
                    ))}
                  </select>
                  {!selectedBatchId && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Please select a batch to proceed
                    </p>
                  )}
                  {selectedBatch && selectedBatchFormatPrefix && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <span className="font-semibold">Student ID Format:</span>{' '}
                        {`${selectedBatchFormatPrefix}XXX (e.g., ${selectedBatchFormatPrefix}001, ${selectedBatchFormatPrefix}002)`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modern Upload Section */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Upload CSV or Excel File
                    </h2>
                    <p className="text-gray-600">Drag and drop or click to select your file (.csv, .xlsx)</p>
                  </div>
                </div>
                
                {selectedBatchId ? (
                  <CsvFileUpload 
                    onImportComplete={handleImportComplete}
                    selectedBatchId={selectedBatchId}
                    key={resetKey}
                  />
                ) : (
                  <div className="flex items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">Select a batch first to upload students</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modern Instructions Card */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <div 
                  className="flex items-center justify-between cursor-pointer group"
                  onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      How to Import Students
                    </h2>
                  </div>
                  <div className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200">
                    {instructionsExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                </div>

                {instructionsExpanded && (
                  <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        {
                          step: '1',
                          title: 'Download Template',
                          desc: 'Get the CSV template with required format',
                          icon: Download
                        },
                        {
                          step: '2', 
                          title: 'Fill Data',
                          desc: 'Add your student information to the template',
                          icon: FileText
                        },
                        {
                          step: '3',
                          title: 'Upload File',
                          desc: 'Upload your completed CSV file',
                          icon: Upload
                        },
                        {
                          step: '4',
                          title: 'Review Results',
                          desc: 'Check import results and fix any errors',
                          icon: CheckCircle
                        }
                      ].map((item, i) => (
                        <div key={i} className="group p-4 rounded-xl hover:bg-gray-50 transition-all duration-300">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {item.step}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <item.icon className="h-4 w-4 text-indigo-600" />
                                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                              </div>
                              <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modern Requirements & Available Data */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Requirements Card */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-xl border border-yellow-200 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-yellow-900">Requirements</h3>
                  </div>
                  
                  <ul className="space-y-3 text-sm text-yellow-800">
                    {[
                      'Batch: Select from dropdown before uploading (no longer needed in file)',
                      selectedBatchFormatPrefix
                        ? `Student ID Code: Use format ${selectedBatchFormatPrefix}XXX for selected batch`
                        : 'Student ID Code: Required - format depends on selected batch',
                      'Full Name, Address, School, Phone No required',
                      'NIC is optional (leave empty if not available)',
                      'Admission Date: YYYY-MM-DD format (2026-01-21)',
                      'Phone numbers: Sri Lankan format (0771234567)',
                      'NIC format: 123456789V or 123456789012 (when provided)',
                      'Subjects: Column with 0,1 assignments based on prefered subjects',
                      'Index numbers: Auto-generated based on batch',
                      'Maximum file size: 10MB',
                      'File formats: CSV (.csv) or Excel (.xlsx, .xls)'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Available Data Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl border border-blue-200 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-blue-900">Available Data</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Batches ({batches.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {batches.slice(0, 4).map((batch) => (
                          <span key={batch.id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                            {batch.batchYear}
                          </span>
                        ))}
                        {batches.length > 4 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
                            +{batches.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Subjects ({subjects.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {subjects.slice(0, 3).map((subject) => (
                          <span key={subject.id} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium">
                            {subject.name}
                          </span>
                        ))}
                        {subjects.length > 3 && (
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">
                            +{subjects.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Modern Results Section */
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Import Results
                  </h2>
                  <p className="text-gray-600">Review your bulk import results</p>
                </div>
              </div>
              
              <CsvImportResults result={importResult} onClose={handleCloseResults} onRetry={handleCloseResults} />
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}