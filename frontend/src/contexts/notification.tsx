'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'usa_attendance_notifications';
const RETENTION_HOURS = 20;

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  expiresAt: Date;
  sessionId?: number;
  batchYear?: string;
  subjectName?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'expiresAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  clearOldNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
}

// Helper to load notifications from localStorage
const loadNotificationsFromStorage = (): Notification[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    const now = new Date();
    
    // Filter out expired notifications and parse dates
    return parsed
      .map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp),
        expiresAt: new Date(n.expiresAt),
      }))
      .filter((n: Notification) => n.expiresAt > now);
  } catch (error) {
    console.error('Failed to load notifications from storage:', error);
    return [];
  }
};

// Helper to save notifications to localStorage
const saveNotificationsToStorage = (notifications: Notification[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to save notifications to storage:', error);
  }
};

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedNotifications = loadNotificationsFromStorage();
    setNotifications(storedNotifications);
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever notifications change (after initial load)
  useEffect(() => {
    if (isInitialized) {
      saveNotificationsToStorage(notifications);
    }
  }, [notifications, isInitialized]);

  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read' | 'expiresAt'>) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RETENTION_HOURS * 60 * 60 * 1000);
    
    const newNotification: Notification = {
      ...notificationData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: now,
      read: false,
      expiresAt,
    };

    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearOldNotifications = useCallback(() => {
    const now = new Date();
    setNotifications(prev => prev.filter(n => n.expiresAt > now));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    clearOldNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}