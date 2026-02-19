'use client';

import { useNotifications } from '@/contexts/notification';
import { Bell, Clock, CheckCircle2, AlertTriangle, Info, X, Trash2, Filter } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  className?: string;
}

type FilterType = 'all' | 'success' | 'error' | 'warning' | 'info';

export default function NotificationDropdown({ className }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll, clearOldNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-cleanup expired notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      clearOldNotifications();
    }
  }, [isOpen, clearOldNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-green-400';
      case 'warning':
        return 'border-l-yellow-400';
      case 'error':
        return 'border-l-red-400';
      default:
        return 'border-l-blue-400';
    }
  };

  // Filter notifications based on selected filter
  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const getFilterBadgeCount = (type: FilterType) => {
    if (type === 'all') return notifications.length;
    return notifications.filter(n => n.type === type).length;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button 
        className="relative p-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        
        {/* Unread count indicator */}
        {unreadCount > 0 && (
          <>
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs bg-white/20 hover:bg-red-500/50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                    title="Clear all notifications"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear All
                  </button>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-white/80 text-sm mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Filter Tabs */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-1 px-4 py-3 bg-gray-50 border-b border-gray-200 overflow-x-auto">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              {(['all', 'success', 'error', 'warning', 'info'] as FilterType[]).map((type) => {
                const count = getFilterBadgeCount(type);
                if (count === 0 && type !== 'all') return null;
                
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                      filter === type
                        ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    {count > 0 && (
                      <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                        filter === type
                          ? 'bg-indigo-200 text-indigo-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  {filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
                </p>
                <p className="text-sm">
                  {filter === 'all' ? "You're all caught up!" : `No ${filter} messages found`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${getBorderColor(notification.type)} ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </h4>
                            <p className={`text-sm ${!notification.read ? 'text-gray-800' : 'text-gray-600'} mt-1 whitespace-pre-wrap`}>
                              {notification.message}
                            </p>
                            {(notification.batchYear || notification.subjectName) && (
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.batchYear && notification.subjectName && 
                                  `Batch ${notification.batchYear} - ${notification.subjectName}`
                                }
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}