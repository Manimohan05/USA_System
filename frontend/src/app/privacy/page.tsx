import DashboardLayout from '@/components/layout/DashboardLayout';

export default function PrivacyPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold text-indigo-700 mb-2 drop-shadow">Student Management System</h1>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Policy</h2>
            <p className="text-indigo-600">Your privacy is important to us.</p>
          </div>
          <div className="bg-white/80 rounded-2xl shadow-xl border border-indigo-100 p-8">
            <p className="mb-4 text-gray-700">
              We value your privacy. This policy explains how we collect, use, and protect your information when you use the Student Management System.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Personal data is collected only for attendance and communication purposes.</li>
              <li>We do not share your information with third parties except as required by law.</li>
              <li>All data is stored securely and access is restricted to authorized personnel.</li>
              <li>You may contact your institution administrator for any privacy concerns.</li>
            </ul>
            <p className="mt-8 text-gray-500 text-sm">Last updated: February 23, 2026</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
