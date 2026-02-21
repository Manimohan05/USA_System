'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Eye, EyeOff, LogIn, GraduationCap, Shield, User, Lock, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(username, password);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Invalid username or password');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-gradient-to-r from-yellow-400 to-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-10 left-20 w-72 h-72 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[
          { left: '15%', top: '20%', delay: '0s', duration: '4s' },
          { left: '75%', top: '40%', delay: '1s', duration: '3.5s' },
          { left: '45%', top: '70%', delay: '2s', duration: '4.5s' },
          { left: '80%', top: '15%', delay: '0.5s', duration: '3.8s' },
          { left: '20%', top: '80%', delay: '1.5s', duration: '4.2s' },
          { left: '60%', top: '25%', delay: '2.5s', duration: '3.6s' }
        ].map((particle, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20 animate-float"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 h-full flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          {/* Modern Glass Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 transform hover:scale-105 transition-all duration-300">
            {/* Header with Enhanced Branding */}
            <div className="text-center mb-3">
              <div className="mx-auto mb-2 flex items-center justify-center">
                <img src="/usa-logo.png" alt="USA Institute Logo" className="h-40 w-40 object-contain" />
              </div>
              <div className="space-y-1">
                <h4 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent">
                  Student Management System
                </h4>
                
              </div>
              
            </div>

            {/* Modern Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Enhanced Username Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-semibold text-white/90 flex items-center">
                  <User className="h-4 w-4 mr-2 text-indigo-400" />
                  Username
                </label>
                <div className="relative group">
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/50 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/15"
                    placeholder="Enter your username"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <User className="h-5 w-5 text-white/40" />
                  </div>
                </div>
              </div>

              {/* Enhanced Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-white/90 flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-indigo-400" />
                  Password
                </label>
                <div className="relative group">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-white/10 border-2 border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-white/50 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/15"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center w-12 text-black bg-black/20 border-l border-black/40 rounded-r-xl hover:bg-black/30 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-black" />
                    ) : (
                      <Eye className="h-5 w-5 text-black" />
                    )}
                  </button>
                </div>
              </div>

              {/* Enhanced Error Message */}
              {error && (
                <div className="bg-red-500/20 border-2 border-red-400/50 text-red-200 px-4 py-3 rounded-xl text-sm backdrop-blur-sm animate-shake">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-3 animate-pulse"></div>
                    {error}
                  </div>
                </div>
              )}

              {/* Modern Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-xl shadow-2xl hover:shadow-purple-500/25 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <div className="relative flex items-center justify-center text-lg">
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-3" />
                      <span>Access Dashboard</span>
                      <Sparkles className="h-4 w-4 ml-2 animate-pulse" />
                    </>
                  )}
                </div>
              </button>
            </form>
          </div>

          {/* Footer Branding */}
          <div className="text-center">
            <p className="text-white/40 text-xs">
              © 2026 powered by TronicGenAI
            </p>
            
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
