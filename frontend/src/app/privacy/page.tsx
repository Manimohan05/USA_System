import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4 text-gray-700">
        We value your privacy. This policy explains how we collect, use, and protect your information when you use our Attendance System.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-700">
        <li>Personal data is collected only for attendance and communication purposes.</li>
        <li>We do not share your information with third parties except as required by law.</li>
        <li>All data is stored securely and access is restricted to authorized personnel.</li>
        <li>You may contact your institution administrator for any privacy concerns.</li>
      </ul>
      <p className="mt-8 text-gray-500 text-sm">Last updated: February 23, 2026</p>
    </div>
  );
}
