'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import type { CsvImportResult, CsvUploadProgress } from '@/types';

interface CsvFileUploadProps {
  onImportComplete: (result: CsvImportResult) => void;
  selectedBatchId: number;
}

export default function CsvFileUpload({ onImportComplete, selectedBatchId }: CsvFileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<CsvUploadProgress>({
    uploading: false,
    progress: 0,
    completed: false,
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Reset previous state
    setUploadProgress({
      uploading: false,
      progress: 0,
      completed: false,
    });

    // Validate file type (CSV or Excel)
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setUploadProgress(prev => ({
        ...prev,
        error: 'Please select a CSV or Excel file (.csv, .xlsx, .xls)'
      }));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadProgress(prev => ({
        ...prev,
        error: 'File size must be less than 10MB'
      }));
      return;
    }

    setSelectedFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadProgress({
      uploading: true,
      progress: 0,
      completed: false,
    });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('batchId', selectedBatchId.toString());

      const response = await api.post<CsvImportResult>('/admin/students/import-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({
              ...prev,
              progress,
            }));
          }
        },
      });

      setUploadProgress({
        uploading: false,
        progress: 100,
        completed: true,
      });

      onImportComplete(response.data);

      // Reset file selection after successful upload
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('CSV upload failed:', error);
      setUploadProgress({
        uploading: false,
        progress: 0,
        completed: false,
        error: error.response?.data?.message || error.message || 'Upload failed. Please try again.',
      });
    }
  };

  const downloadTemplate = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      const endpoint = format === 'excel' ? '/admin/students/excel-template' : '/admin/students/csv-template';
      const response = await api.get(endpoint, {
        responseType: 'blob',
      });

      const mimeType = format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : 'text/csv';
      const fileName = format === 'excel' 
        ? 'student-import-template.xlsx' 
        : 'student-import-template.csv';

      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadProgress({
      uploading: false,
      progress: 0,
      completed: false,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Download Template Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              Download Import Template
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Download the template file to see the required format. Student ID codes will be auto-generated during import.
            </p>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => downloadTemplate('csv')}
                className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                CSV Template
              </button>
              <button
                onClick={() => downloadTemplate('excel')}
                className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                Excel Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="space-y-4">
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="csv-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Drop your CSV or Excel file here, or{' '}
                  <span className="text-indigo-600 hover:text-indigo-500">browse</span>
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="csv-upload"
                name="csv-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                onChange={handleFileSelect}
                disabled={uploadProgress.uploading}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              CSV or Excel files up to 10MB
            </p>
          </div>
        </div>

        {/* Selected File Display */}
        {selectedFile && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            {!uploadProgress.uploading && (
              <button
                onClick={clearFile}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress.uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Uploading...</span>
              <span className="text-gray-600">{uploadProgress.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploadProgress.error && (
          <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4" />
            <span>{uploadProgress.error}</span>
          </div>
        )}

        {uploadProgress.completed && (
          <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
            <CheckCircle className="h-4 w-4" />
            <span>File uploaded successfully!</span>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && !uploadProgress.completed && !uploadProgress.uploading && (
          <button
            onClick={handleUpload}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            {uploadProgress.uploading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Students
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}