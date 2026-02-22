'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Send, MessageSquare, Bell, Users, Calendar, Target, Zap, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import api, { messagingApi } from '@/lib/api';
import type { BatchDto, SubjectDto, BroadcastMessageRequest, MessagingStatsDto, TargetedStudentCountDto } from '@/types';

type MessageType = 'broadcast' | 'fee-reminder';

export default function MessagingPage() {
  const [messageType, setMessageType] = useState<MessageType>('broadcast');
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [stats, setStats] = useState<MessagingStatsDto>({ totalStudents: 0, parentContacts: 0 });
  const [targetedCounts, setTargetedCounts] = useState<TargetedStudentCountDto>({ studentCount: 0, parentContactCount: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Broadcast Message State
  const [message, setMessage] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [sendToAll, setSendToAll] = useState(true);
  
  // Status Messages
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTargetedCounts();
  }, [sendToAll, selectedBatch, selectedSubject]);

  const fetchInitialData = async () => {
    try {
      const [batchesRes, subjectsRes, statsRes] = await Promise.all([
        api.get<BatchDto[]>('/admin/institute/batches'),
        api.get<SubjectDto[]>('/admin/institute/subjects'),
        api.get<MessagingStatsDto>('/admin/messaging/stats'),
      ]);
      setBatches(batchesRes.data);
      setSubjects(subjectsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargetedCounts = async () => {
    try {
      const params = new URLSearchParams();
      if (!sendToAll) {
        if (selectedBatch) params.append('batchId', selectedBatch);
        if (selectedSubject) params.append('subjectId', selectedSubject);
      }
      const response = await api.get<TargetedStudentCountDto>(`/admin/messaging/targeted-count?${params.toString()}`);
      setTargetedCounts(response.data);
    } catch (error) {
      console.error('Failed to fetch targeted counts:', error);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a message' });
      return;
    }

    setSending(true);
    setStatusMessage(null); // Clear previous messages first

    try {
      const request: BroadcastMessageRequest = {
        message: message.trim(),
        batchId: sendToAll ? undefined : (selectedBatch ? parseInt(selectedBatch) : undefined),
        subjectId: sendToAll ? undefined : (selectedSubject ? parseInt(selectedSubject) : undefined),
      };
      
      // Use messagingApi with extended timeout for broadcast operations
      await messagingApi.post('/admin/messaging/broadcast', request);
      setStatusMessage({ type: 'success', text: 'Message sent successfully to parents!' });
      setMessage('');
      
      // Auto-clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error: any) {
      console.error('Failed to send broadcast:', error);
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) {
        errorMessage = 'Message sending is taking longer than expected. It may still complete in the background. Please check with parents to confirm delivery.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setStatusMessage({ type: 'error', text: errorMessage });
    } finally {
      setSending(false);
    }
  };

  const handleSendFeeReminders = async () => {
    setSending(true);
    setStatusMessage(null);

    try {
      const response = await api.post<{ message: string }>('/admin/messaging/fee-reminders');
      setStatusMessage({ type: 'success', text: response.data.message });
      
      // Auto-clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error: any) {
      console.error('Failed to send fee reminders:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send fee reminders. Please try again.';
      setStatusMessage({ type: 'error', text: errorMessage });
    } finally {
      setSending(false);
    }
  };

  const messageTemplates = [
    {
      title: 'Class Reminder',
      content: 'Reminder: Your child has a class today at [Time]. Please ensure they arrive on time.',
    },
    {
      title: 'Fee Due Reminder',
      content: 'Dear Parent, this is a friendly reminder that the tuition fee is due by [Date]. Please make the payment at your earliest convenience.',
    },
    {
      title: 'Meeting Notice',
      content: 'Important: Parent-teacher meeting scheduled for [Date] at [Time]. Your attendance is highly appreciated.',
    },
    {
      title: 'Holiday Notice',
      content: 'Notice: The institute will remain closed on [Date] due to [Reason]. Classes will resume on [Date].',
    },
  ];

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

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
          {/* Modern Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl mb-6 shadow-xl">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative px-6 py-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Parent Messaging</h1>
                  <p className="text-indigo-100 text-lg">Connect with parents instantly and efficiently</p>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-white/90">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">{stats.totalStudents} Total Students</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span className="font-medium">{stats.parentContacts} Parent Contacts</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-1 left-0 right-0 h-8 bg-gradient-to-t from-slate-50"></div>
          </div>

          {/* Modern Tab Navigation */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-2 rounded-2xl shadow-lg border border-gray-200/50">
              <nav className="flex space-x-2">
                <button
                  onClick={() => setMessageType('broadcast')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                    messageType === 'broadcast'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Broadcast Message</span>
                </button>
                <button
                  onClick={() => setMessageType('fee-reminder')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                    messageType === 'fee-reminder'
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  <span>Fee Reminders</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Broadcast Message Tab */}
          {messageType === 'broadcast' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Modern Message Composer */}
              <div className="lg:col-span-2">
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Compose Message</h2>
                  </div>
                
                  <form onSubmit={handleSendBroadcast} className="space-y-4">
                    {/* Modern Recipients Selection */}
                    <div className="space-y-4">
                      <label className="block text-sm font-semibold text-gray-800 mb-4 flex items-center">
                        <Target className="h-4 w-4 mr-2 text-indigo-600" />
                        Target Audience
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${
                          sendToAll
                            ? 'border-indigo-500 bg-indigo-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}>
                          <input
                            type="radio"
                            checked={sendToAll}
                            onChange={() => setSendToAll(true)}
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-3">
                            <Users className={`h-5 w-5 ${
                              sendToAll ? 'text-indigo-600' : 'text-gray-400'
                            }`} />
                            <div>
                              <div className={`font-medium ${
                                sendToAll ? 'text-indigo-900' : 'text-gray-900'
                              }`}>All Parents</div>
                              <div className={`text-sm ${
                                sendToAll ? 'text-indigo-600' : 'text-gray-500'
                              }`}>Everyone</div>
                            </div>
                          </div>
                        </label>
                        <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${
                          !sendToAll
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}>
                          <input
                            type="radio"
                            checked={!sendToAll}
                            onChange={() => setSendToAll(false)}
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-3">
                            <Target className={`h-5 w-5 ${
                              !sendToAll ? 'text-purple-600' : 'text-gray-400'
                            }`} />
                            <div>
                              <div className={`font-medium ${
                                !sendToAll ? 'text-purple-900' : 'text-gray-900'
                              }`}>Targeted</div>
                              <div className={`text-sm ${
                                !sendToAll ? 'text-purple-600' : 'text-gray-500'
                              }`}>Batch/Subject</div>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Enhanced Batch and Subject Selection */}
                    {!sendToAll && (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200/50">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-800 flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                              Batch (Optional)
                            </label>
                            <select
                              value={selectedBatch}
                              onChange={(e) => setSelectedBatch(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md"
                            >
                              <option value="">All Batches</option>
                              {batches.map((batch) => (
                                <option key={batch.id} value={batch.id.toString()}>
                                  {batch.batchYear}{batch.isDayBatch ? ' Day' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-800 flex items-center">
                              <Users className="h-4 w-4 mr-2 text-indigo-600" />
                              Subject (Optional)
                            </label>
                            <select
                              value={selectedSubject}
                              onChange={(e) => setSelectedSubject(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md"
                            >
                              <option value="">All Subjects</option>
                              {subjects.map((subject) => (
                                <option key={subject.id} value={subject.id.toString()}>
                                  {subject.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Enhanced Message Content */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-800 flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                        Message Content
                      </label>
                      <div className="relative">
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={6}
                          placeholder="✨ Craft your message to parents here..."
                          className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gradient-to-br from-white to-green-50/30 backdrop-blur-sm transition-all duration-300 hover:shadow-md resize-none"
                          required
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                          {message.length} chars
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className={`flex items-center space-x-2 ${
                          message.length <= 500 ? 'text-green-600' : 'text-amber-600'
                        }`}>
                          {message.length <= 500 ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                          <span>{message.length}/500 (SMS optimal length)</span>
                        </div>
                      </div>
                    </div>

                    {/* Modern Send Button */}
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full flex items-center justify-center py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-2xl hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {sending ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                          <span className="text-lg">Sending Message...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5 mr-3" />
                          <span className="text-lg">Send Message</span>
                        </>
                      )}
                    </button>
                </form>

                  {/* Enhanced Status Message */}
                  {statusMessage && (
                    <div
                      className={`mt-6 p-4 rounded-xl border-2 backdrop-blur-sm transition-all duration-500 ${
                        statusMessage.type === 'success'
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-800 shadow-green-100'
                          : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300 text-red-800 shadow-red-100'
                      } shadow-lg`}
                    >
                      <div className="flex items-center space-x-3">
                        {statusMessage.type === 'success' ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        )}
                        <span className="font-medium text-lg">{statusMessage.text}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modern Sidebar */}
              <div className="space-y-6">
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-gradient-to-r from-orange-500 to-pink-600 rounded-xl">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Quick Templates</h3>
                  </div>
                  <div className="space-y-3">
                    {messageTemplates.map((template, index) => (
                      <button
                        key={index}
                        onClick={() => setMessage(template.content)}
                        className="w-full text-left p-4 border-2 border-gray-100 rounded-xl hover:border-orange-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-all duration-300 hover:shadow-lg group"
                      >
                        <div className="font-semibold text-sm text-gray-900 group-hover:text-orange-900">{template.title}</div>
                        <div className="text-xs text-gray-500 mt-2 line-clamp-2 group-hover:text-orange-600">{template.content}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enhanced Statistics Card */}
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 rounded-2xl p-6 border-2 border-blue-200/50 dark:border-slate-700 shadow-xl">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {sendToAll ? '🌍 All Students' : '🎯 Targeted Students'}
                    </h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white/60 dark:bg-slate-700/60 rounded-xl p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Total Students</span>
                        <span className="text-2xl font-bold text-blue-600">{targetedCounts.studentCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Will Receive SMS</span>
                        <span className="text-2xl font-bold text-green-600">{targetedCounts.parentContactCount}</span>
                      </div>
                    </div>
                    
                    {targetedCounts.studentCount > targetedCounts.parentContactCount && (
                      <div className="bg-amber-100/80 border border-amber-300 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center space-x-2 text-amber-800">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {targetedCounts.studentCount - targetedCounts.parentContactCount} missing contacts
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {!sendToAll && (selectedBatch || selectedSubject) && (
                      <div className="bg-purple-100/80 border border-purple-300 rounded-xl p-3 backdrop-blur-sm">
                        <div className="text-sm text-purple-800 font-medium">
                          📊 {selectedBatch && selectedSubject ? (
                            `Batch ${batches.find(b => b.id.toString() === selectedBatch)?.batchYear} + ${subjects.find(s => s.id.toString() === selectedSubject)?.name}`
                          ) : selectedBatch ? (
                            `Batch ${batches.find(b => b.id.toString() === selectedBatch)?.batchYear} (All Subjects)`
                          ) : selectedSubject ? (
                            `${subjects.find(s => s.id.toString() === selectedSubject)?.name} (All Batches)`
                          ) : (
                            'All Students'
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fee Reminders Tab */}
          {messageType === 'fee-reminder' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-orange-500 rounded-xl">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Fee Reminders</h2>
                    <p className="text-gray-600">Send overdue payment notifications</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Simple Description */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-orange-800">
                      Sends overdue payment reminders to parents of students who haven't paid for the current month.
                    </p>
                    <p className="text-orange-800 mt-2">
                      Students with Free Card for <span className="font-semibold">all subjects</span> are excluded. Students with Free Card for only some subjects will still receive reminders for their unpaid fees.
                    </p>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSendFeeReminders}
                    disabled={sending}
                    className="w-full flex items-center justify-center py-4 px-6 bg-orange-600 text-white font-semibold text-lg rounded-xl shadow-lg hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {sending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        <span>Sending Reminders...</span>
                      </>
                    ) : (
                      <>
                        <Bell className="h-5 w-5 mr-3" />
                        <span>Send Fee Reminders</span>
                      </>
                    )}
                  </button>

                  {/* Status Message */}
                  {statusMessage && (
                    <div
                      className={`p-4 rounded-xl border ${
                        statusMessage.type === 'success'
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {statusMessage.type === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-medium">{statusMessage.text}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );

}
