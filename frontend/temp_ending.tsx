                    {/* Absent Students */}
                    <div className="p-6">
                      <h4 className="text-sm font-medium text-red-700 uppercase tracking-wide mb-4 flex items-center">
                        <XCircle className="h-4 w-4 mr-2" />
                        Absent Students ({attendanceReport.absentStudents.length})
                      </h4>
                      <div className="space-y-3">
                        {attendanceReport.absentStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{student.fullName}</div>
                              <div className="text-sm text-gray-500">{student.studentIdCode}</div>
                            </div>
                            <div className="text-sm text-red-600">Not marked</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <AttendancePageContent />
    </Suspense>
  );
}