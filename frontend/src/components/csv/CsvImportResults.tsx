'use client';

import { CheckCircle, AlertCircle, Users, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import type { CsvImportResult } from '@/types';

interface CsvImportResultsProps {
  result: CsvImportResult;
  onClose: () => void;
  onRetry?: () => void;
}

export default function CsvImportResults({ result, onClose, onRetry }: CsvImportResultsProps) {
  const successRate = result.totalRows > 0 ? (result.successfulImports / result.totalRows) * 100 : 0;
  const hasErrors = result.errors.length > 0;
  const hasNoSuccessfulImports = result.successfulImports === 0 && hasErrors;

  return (
    <div className="space-y-6">
      {/* Zero Success - Critical Error State */}
      {hasNoSuccessfulImports && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="ml-4">
              <h3 className="text-lg font-bold text-red-900">Import Failed - All Records Have Errors</h3>
              <p className="text-red-700 mt-2">
                No students were imported because there are validation errors in your file. Please review the errors below, fix them in your CSV/Excel file, and upload again.
              </p>
            </div>
          </div>
        </div>
      )}

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

        <div className={`${result.successfulImports > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
          <div className="flex items-center">
            <TrendingUp className={`h-8 w-8 ${result.successfulImports > 0 ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${result.successfulImports > 0 ? 'text-green-900' : 'text-gray-600'}`}>{result.successfulImports}</p>
              <p className={`text-sm ${result.successfulImports > 0 ? 'text-green-600' : 'text-gray-500'}`}>Can be Imported</p>
            </div>
          </div>
        </div>

        <div className={`${result.failedImports > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
          <div className="flex items-center">
            <AlertCircle className={`h-8 w-8 ${result.failedImports > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${result.failedImports > 0 ? 'text-red-900' : 'text-gray-600'}`}>{result.failedImports}</p>
              <p className={`text-sm ${result.failedImports > 0 ? 'text-red-600' : 'text-gray-500'}`}>Has Errors</p>
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
              successRate === 100 ? 'bg-green-500' :
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
      {hasErrors && (
        <div className={`${hasNoSuccessfulImports ? 'bg-red-50 border-2 border-red-300' : 'bg-orange-50 border border-orange-200'} rounded-lg p-4`}>
          <div className="flex items-start">
            <AlertCircle className={`h-5 w-5 ${hasNoSuccessfulImports ? 'text-red-600' : 'text-orange-600'} mt-0.5`} />
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${hasNoSuccessfulImports ? 'text-red-900' : 'text-orange-900'}`}>
                {result.failedImports} record{result.failedImports !== 1 ? 's' : ''} with validation error{result.failedImports !== 1 ? 's' : ''}
              </h3>
              <div className="mt-2 max-h-64 overflow-y-auto">
                <ul className={`text-sm ${hasNoSuccessfulImports ? 'text-red-700' : 'text-orange-700'} space-y-1`}>
                  {result.errors.map((error, index) => (
                    <li key={index} className="flex items-start font-mono text-xs">
                      <span className={`inline-block w-1 h-1 ${hasNoSuccessfulImports ? 'bg-red-400' : 'bg-orange-400'} rounded-full mt-1.5 mr-2 flex-shrink-0`}></span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {hasNoSuccessfulImports && (
                <p className="text-sm text-red-700 mt-3 font-medium">
                  Fix these errors in your file and upload again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        {hasNoSuccessfulImports ? (
          <>
            <button
              onClick={onRetry || onClose}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {result.successfulImports > 0 && (
              <button
                onClick={() => window.location.href = '/dashboard/students'}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                View Students
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}