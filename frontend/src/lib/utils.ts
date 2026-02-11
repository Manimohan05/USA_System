import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function to merge Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date for display
export function formatDate(date: string | Date | undefined | null, format: 'short' | 'long' | 'time' | 'datetime' = 'short'): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
    case 'time':
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'datetime':
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    default:
      return dateObj.toLocaleDateString();
  }
}

// Format date for API (YYYY-MM-DD) using local timezone
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Validate student ID format
export function isValidStudentId(id: string): boolean {
  return /^[A-Z0-9]{3,10}$/.test(id.toUpperCase());
}

// Format phone number for Sri Lankan display (removes +94 prefix and formats cleanly)
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 94 (international format without +), convert to local format
  if (cleaned.length === 11 && cleaned.startsWith('94')) {
    return '0' + cleaned.substring(2); // Convert 94771234567 to 0771234567
  }
  
  // If it's already in local format (0XXXXXXXXX - 10 digits starting with 0)
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return cleaned; // Return as is: 0771234567
  }
  
  // If it's 9 digits (missing leading 0), add leading 0
  if (cleaned.length === 9) {
    return '0' + cleaned; // Convert 771234567 to 0771234567
  }
  
  // If none of the expected patterns, return original phone number
  return phone;
}
