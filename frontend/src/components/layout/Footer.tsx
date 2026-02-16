'use client';

import { 
  Facebook, 
  Phone, 
  MapPin,
  Mail,
  Heart,
  Globe
} from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 rounded-full translate-y-24 -translate-x-24"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          
          {/* Logo and Company Info */}
          <div className="flex flex-col items-center lg:items-start space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg">
                <img src="/usa-logo.png" alt="USA Institute Logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Universal Science Academy</h2>
                <p className="text-slate-300 text-sm">Excellence in Education</p>
              </div>
            </div>
            
            {/* Social Media */}
            <div className="flex items-center space-x-4">
              <Link
                href="https://universalscienceacademy.lk"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-700/50 rounded-xl hover:text-indigo-400 transition-all duration-200 hover:scale-110 hover:bg-white/10 group"
                aria-label="Visit our website"
              >
                <Globe className="h-5 w-5" />
              </Link>
              <Link
                href="https://www.facebook.com/share/18PtH8Hn9T/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-700/50 rounded-xl hover:text-blue-600 transition-all duration-200 hover:scale-110 hover:bg-white/10 group"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3 text-center lg:text-left">
            <h3 className="text-lg font-semibold text-white mb-4">Contact Info</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-center lg:justify-start space-x-2">
                <MapPin className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <span>K.K.S Road Chunnakam, 40000</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start space-x-2">
                <Phone className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <span>077 996 6888</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start space-x-2">
                <Mail className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <span>universalscienceacademyjaffna@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center lg:text-right space-y-3">
            <div className="text-sm text-slate-300">
              <div>&copy; TronicGenAI, Inc {currentYear}.</div>
              <div>All rights reserved.</div>
            </div>
            <div className="flex items-center justify-center lg:justify-end space-x-1 text-sm text-slate-400">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500 animate-pulse" />
              <span>for education</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;