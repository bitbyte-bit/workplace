import React, { useState } from 'react';
import * as db from '../services/db';
import { User } from '../services/db';
import { NotificationType } from './Notification';

interface AuthProps {
  onLogin: (user: User) => void;
  showNotification: (message: string, type?: NotificationType) => void;
}

type AuthMode = 'login' | 'register';

export default function Auth({ onLogin, showNotification }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { user } = await db.loginUser(loginEmail, loginPassword);
      localStorage.setItem('zion_user', JSON.stringify(user));
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (regPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const { user } = await db.registerUser(regEmail, regPassword, regFullName, regBusinessName, regPhone);
      localStorage.setItem('zion_user', JSON.stringify(user));
      onLogin(user);
      showNotification('Account created successfully!', 'success');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <h1 className="text-5xl font-black text-white tracking-tighter flex items-center gap-3">
          ZION <span className="text-sm bg-white text-blue-600 px-2 py-1 rounded-full uppercase">Pro</span>
        </h1>
      </div>

      <div className="w-full max-w-md">
        <div className="flex bg-white/10 backdrop-blur-lg rounded-2xl p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={'flex-1 py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ' + (mode === 'login' ? 'bg-white text-blue-600 shadow-lg' : 'text-white/70 hover:text-white')}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={'flex-1 py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ' + (mode === 'register' ? 'bg-white text-blue-600 shadow-lg' : 'text-white/70 hover:text-white')}
          >
            Create Account
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 space-y-6">
          {mode === 'login' && (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800">Welcome Back</h2>
                <p className="text-slate-500 text-sm mt-1">Sign in to access your business</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Access Dashboard'}
                </button>
              </form>
            </>
          )}

          {mode === 'register' && (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800">Create Account</h2>
                <p className="text-slate-500 text-sm mt-1">Set up your business profile</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                  <input
                    type="text"
                    value={regBusinessName}
                    onChange={(e) => setRegBusinessName(e.target.value)}
                    placeholder="Your business name"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="Your phone number"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create password (min 4 characters)"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6 text-white/60 text-xs font-bold uppercase tracking-widest">
          Secure Business Management System
        </div>
      </div>
    </div>
  );
}
