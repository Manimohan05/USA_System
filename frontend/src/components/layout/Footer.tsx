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
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          
          {/* Logo and Company Info */}
          <div className="flex flex-col items-center lg:items-start space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg">
                <img src="/usa-logo.png" alt="USA Institute Logo" className="h-6 w-6 object-contain" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Universal Science Academy</h2>
                <p className="text-slate-300 text-xs">Excellence in Education</p>
              </div>
            </div>
            
            {/* Social Media */}
            <div className="flex items-center space-x-3">
              <Link
                href="https://universalscienceacademy.lk"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-700/50 rounded-lg hover:text-indigo-400 transition-all duration-200 hover:scale-110 hover:bg-white/10 group"
                aria-label="Visit our website"
              >
                <Globe className="h-4 w-4" />
              </Link>
              <Link
                href="https://www.facebook.com/share/18PtH8Hn9T/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-700/50 rounded-lg hover:text-blue-600 transition-all duration-200 hover:scale-110 hover:bg-white/10 group"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-2 text-center lg:text-right">
            <h3 className="text-base font-semibold text-white mb-3">Contact Info</h3>
            <div className="space-y-1 text-xs text-slate-300">
              <div className="flex items-center justify-center lg:justify-end space-x-2">
                <MapPin className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                <span>K.K.S Road Chunnakam, 40000</span>
              </div>
              <div className="flex items-center justify-center lg:justify-end space-x-2">
                <Phone className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                <span>077 996 6888</span>
              </div>
              <div className="flex items-center justify-center lg:justify-end space-x-2">
                <Mail className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                <span>universalscienceacademyjaffna@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar with Copyright and Legal Links */}
        <div className="border-t border-slate-700/50 pt-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="text-xs text-slate-400">
                {currentYear} &copy; TronicGen, Inc. All rights reserved.
              </div>
              <div className="hidden sm:block w-px h-4 bg-slate-600"></div>
              <div className="flex items-center space-x-1 text-xs text-slate-400">
                <span>Made with</span>
                <Heart className="h-3 w-3 text-red-500 animate-pulse" />
                <span>for education</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-slate-400">
              <Link href="/terms" className="hover:text-indigo-400 transition-colors">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="hover:text-indigo-400 transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};


export default Footer;
