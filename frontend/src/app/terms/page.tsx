import React from 'react';

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>
      <p className="mb-4 text-gray-700">
        Welcome to our Attendance System. By accessing or using our services, you agree to be bound by these Terms & Conditions. Please read them carefully.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-700">
        <li>Use of this system is subject to compliance with all applicable laws and regulations.</li>
        <li>Unauthorized use or misuse of the system is strictly prohibited.</li>
        <li>We reserve the right to update these terms at any time without prior notice.</li>
        <li>For questions, please contact your institution administrator.</li>
      </ul>
      <p className="mt-8 text-gray-500 text-sm">Last updated: February 23, 2026</p>
    </div>
  );
}
