import DashboardLayout from '@/components/layout/DashboardLayout';

export default function TermsPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold text-indigo-700 mb-2 drop-shadow">Student Management System</h1>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Terms & Conditions</h2>
            <p className="text-indigo-600">Please read these terms carefully before using the system.</p>
          </div>
          <div className="bg-white/80 rounded-2xl shadow-xl border border-indigo-100 p-8">
            <p className="mb-4 text-gray-700">
              Welcome to the Student Management System. By accessing or using our services, you agree to be bound by these Terms & Conditions.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Use of this system is subject to compliance with all applicable laws and regulations.</li>
              <li>Unauthorized use or misuse of the system is strictly prohibited.</li>
              <li>We reserve the right to update these terms at any time without prior notice.</li>
              <li>For questions, please contact your institution administrator.</li>
            </ul>
            <p className="mt-8 text-gray-500 text-sm">Last updated: February 23, 2026</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
