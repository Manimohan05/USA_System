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
  const canBeImported = result.totalRows - result.errors.length;
  const hasErrors = result.errors.length > 0;
  const hasNoSuccessfulImports = result.successfulImports === 0 && hasErrors;

  return (
    <div className="space-y-6">
      {/* Zero Success - Critical Error State */}
      {hasNoSuccessfulImports && (
        <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="ml-4">
              <h3 className="text-lg font-bold text-red-900 dark:text-red-200">Import Failed - All Records Have Errors</h3>
              <p className="text-red-700 dark:text-red-300 mt-2">
                No students were imported because there are validation errors in your file. Please review the errors below, fix them in your CSV/Excel file, and upload again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-blue-900 dark:text-blue-200">{result.totalRows}</p>
              <p className="text-sm text-blue-600 dark:text-blue-300">Total Records</p>
            </div>
          </div>
        </div>

        <div className={`${canBeImported > 0 ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'} border rounded-lg p-4`}>
          <div className="flex items-center">
            <TrendingUp className={`h-8 w-8 ${canBeImported > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${canBeImported > 0 ? 'text-green-900 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}`}>{canBeImported}</p>
              <p className={`text-sm ${canBeImported > 0 ? 'text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>Can be Imported</p>
            </div>
          </div>
        </div>

        <div className={`${result.errors.length > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'} border rounded-lg p-4`}>
          <div className="flex items-center">
            <AlertCircle className={`h-8 w-8 ${result.errors.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
            <div className="ml-4">
              <p className={`text-2xl font-semibold ${result.errors.length > 0 ? 'text-red-900 dark:text-red-200' : 'text-gray-600 dark:text-gray-400'}`}>{result.errors.length}</p>
              <p className={`text-sm ${result.errors.length > 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}`}>Has Errors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Success Rate</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{successRate.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
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
      {canBeImported > 0 && !hasErrors && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-900 dark:text-green-200">
                Successfully imported {result.successfulImports} student{result.successfulImports !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                The students have been added to the system and are now available in the student management section.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Details */}
      {hasErrors && (
        <div className={`${hasNoSuccessfulImports ? 'bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800' : 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800'} rounded-lg p-6`}>
          <div className="flex items-start mb-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${hasNoSuccessfulImports ? 'bg-red-100 dark:bg-red-900/40' : 'bg-orange-100 dark:bg-orange-900/40'} flex items-center justify-center`}>
              <AlertCircle className={`h-6 w-6 ${hasNoSuccessfulImports ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} />
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-lg font-bold ${hasNoSuccessfulImports ? 'text-red-900 dark:text-red-200' : 'text-orange-900 dark:text-orange-200'}`}>
                {result.errors.length} record{result.errors.length !== 1 ? 's' : ''} with validation error{result.errors.length !== 1 ? 's' : ''}
              </h3>
              <p className={`text-sm ${hasNoSuccessfulImports ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300'} mt-1`}>
                {hasNoSuccessfulImports 
                  ? 'Please fix these errors in your CSV/Excel file and try again.'
                  : 'The following records had errors and were not imported:'}
              </p>
            </div>
          </div>
          
          <div className={`${hasNoSuccessfulImports ? 'bg-white dark:bg-slate-800' : 'bg-white/50 dark:bg-slate-800/50'} rounded-lg border ${hasNoSuccessfulImports ? 'border-red-200 dark:border-red-800' : 'border-orange-200 dark:border-orange-800'} max-h-96 overflow-y-auto`}>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {result.errors.map((error, index) => {
                // Parse error message to extract row number and error detail
                const rowMatch = error.match(/Row (\d+):\s*(.+)/);
                const rowNumber = rowMatch ? rowMatch[1] : (index + 1).toString();
                const errorMessage = rowMatch ? rowMatch[2] : error;
                
                return (
                  <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${hasNoSuccessfulImports ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'} flex items-center justify-center font-bold text-sm`}>
                        {rowNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                          {errorMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {hasNoSuccessfulImports && (
            <div className="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Next Steps:</h4>
                  <ol className="mt-2 text-sm text-amber-800 dark:text-amber-300 space-y-1 list-decimal list-inside">
                    <li>Open your CSV/Excel file</li>
                    <li>Fix the errors listed above</li>
                    <li>Save the file</li>
                    <li>Upload again using the "Try Again" button below</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        {hasNoSuccessfulImports ? (
          <>
            <button
              onClick={onRetry || onClose}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-amber-600 dark:bg-amber-700 hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
            {result.successfulImports > 0 && (
              <button
                onClick={() => window.location.href = '/dashboard/students'}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
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