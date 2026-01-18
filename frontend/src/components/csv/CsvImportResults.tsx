'use client';

import { CheckCircle, AlertCircle, Users, TrendingUp, TrendingDown } from 'lucide-react';
import type { CsvImportResult } from '@/types';

interface CsvImportResultsProps {
  result: CsvImportResult;
  onClose: () => void;
}

export default function CsvImportResults({ result, onClose }: CsvImportResultsProps) {
  const successRate = result.totalRows > 0 ? (result.successfulImports / result.totalRows) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-blue-900">{result.totalRows}</p>
              <p className="text-sm text-blue-600">Total Records</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-green-900">{result.successfulImports}</p>
              <p className="text-sm text-green-600">Successful</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-red-900">{result.failedImports}</p>
              <p className="text-sm text-red-600">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Success Rate</span>
          <span className="text-sm text-gray-600">{successRate.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              successRate >= 90 ? 'bg-green-500' :
              successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${successRate}%` }}
          />
        </div>
      </div>

      {/* Success Message */}
      {result.successfulImports > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-900">
                Successfully imported {result.successfulImports} student{result.successfulImports !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-green-700 mt-1">
                The students have been added to the system and are now available in the student management section.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Details */}
      {result.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-900">
                {result.failedImports} record{result.failedImports !== 1 ? 's' : ''} failed to import
              </h3>
              <div className="mt-2 max-h-40 overflow-y-auto">
                <ul className="text-sm text-red-700 space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block w-1 h-1 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
        <button
          onClick={() => window.location.href = '/dashboard/students'}
          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          View Students
        </button>
      </div>
    </div>
  );
}