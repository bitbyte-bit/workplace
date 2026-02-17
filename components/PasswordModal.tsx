import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  message: string;
  confirmText?: string;
  mode?: 'verify' | 'set' | 'forgot';
  securityQuestion?: string;
  onSetSecurityQuestion?: (question: string, answer: string) => void;
  onVerifySecurityAnswer?: (answer: string) => boolean;
}

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What is the name of your first pet?",
  "What city were you born in?",
  "What is the name of your first school?",
  "What is your favorite color?",
  "What is your best friend's name?",
  "What was your first car?",
  "What is your favorite food?"
];

export default function PasswordModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm',
  mode = 'verify',
  securityQuestion,
  onSetSecurityQuestion,
  onVerifySecurityAnswer
}: PasswordModalProps) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Security question states
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [confirmAnswer, setConfirmAnswer] = useState('');
  
  // Forgot password states
  const [forgotPasswordMode, setForgotPasswordMode] = useState(mode === 'forgot');
  const [securityAnswerInput, setSecurityAnswerInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (forgotPasswordMode) {
      // Verify security answer
      if (onVerifySecurityAnswer) {
        const isValid = onVerifySecurityAnswer(securityAnswerInput);
        if (!isValid) {
          setError(true);
          setErrorMessage('Incorrect security answer. Please try again.');
          return;
        }
      }
      
      // Set new password
      if (newPassword !== confirmNewPassword) {
        setError(true);
        setErrorMessage('Passwords do not match.');
        return;
      }
      
      if (newPassword.length < 4) {
        setError(true);
        setErrorMessage('Password must be at least 4 characters.');
        return;
      }
      
      onConfirm(newPassword);
      resetForm();
      return;
    }
    
    if (mode === 'set' && showSecuritySetup) {
      // Setting new password with security question
      if (securityAnswer !== confirmAnswer) {
        setError(true);
        setErrorMessage('Security answers do not match.');
        return;
      }
      
      if (securityAnswer.length < 2) {
        setError(true);
        setErrorMessage('Security answer must be at least 2 characters.');
        return;
      }
      
      if (password !== confirmPassword) {
        setError(true);
        setErrorMessage('Passwords do not match.');
        return;
      }
      
      if (password.length < 4) {
        setError(true);
        setErrorMessage('Password must be at least 4 characters.');
        return;
      }
      
      // Save security question first
      if (onSetSecurityQuestion) {
        onSetSecurityQuestion(selectedQuestion, securityAnswer);
      }
      
      onConfirm(password);
      resetForm();
      return;
    }
    
    onConfirm(password);
  };

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
    setError(false);
    setErrorMessage('');
    setShowSecuritySetup(false);
    setSelectedQuestion(SECURITY_QUESTIONS[0]);
    setSecurityAnswer('');
    setConfirmAnswer('');
    setForgotPasswordMode(false);
    setSecurityAnswerInput('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleForgotPassword = () => {
    if (!securityQuestion) {
      setError(true);
      setErrorMessage('No security question set. Please contact administrator.');
      return;
    }
    setForgotPasswordMode(true);
    setError(false);
    setErrorMessage('');
  };

  const handleBackToVerify = () => {
    setForgotPasswordMode(false);
    setError(false);
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div 
        className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        style={{ backgroundColor: colors.surface }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: colors.surfaceBorder }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={colors.primary}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black" style={{ color: colors.text }}>
                {forgotPasswordMode ? 'Reset Password' : title}
              </h2>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                {forgotPasswordMode ? 'Answer security question to reset your PIN' : message}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:opacity-70 transition-opacity rounded-lg"
            style={{ color: colors.textMuted }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {forgotPasswordMode ? (
              // Forgot Password Mode
              <>
                {/* Security Question Display */}
                <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: colors.backgroundAlt }}>
                  <p className="text-xs font-semibold" style={{ color: colors.textMuted }}>Security Question:</p>
                  <p className="text-sm font-medium" style={{ color: colors.text }}>{securityQuestion}</p>
                </div>
                
                {/* Security Answer Input */}
                <input
                  type="text"
                  value={securityAnswerInput}
                  onChange={(e) => {
                    setSecurityAnswerInput(e.target.value);
                    setError(false);
                    setErrorMessage('');
                  }}
                  placeholder="Enter your security answer"
                  className="w-full p-4 rounded-xl text-center text-lg font-medium mb-3"
                  style={{ 
                    backgroundColor: colors.backgroundAlt,
                    border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                    color: colors.text,
                  }}
                  autoFocus
                />
                
                {/* New Password */}
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError(false);
                    setErrorMessage('');
                  }}
                  placeholder="Enter new PIN"
                  className="w-full p-4 rounded-xl text-center text-lg font-black tracking-widest mb-3"
                  style={{ 
                    backgroundColor: colors.backgroundAlt,
                    border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                    color: colors.text,
                  }}
                />
                
                {/* Confirm New Password */}
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    setError(false);
                    setErrorMessage('');
                  }}
                  placeholder="Confirm new PIN"
                  className="w-full p-4 rounded-xl text-center text-lg font-black tracking-widest mb-3"
                  style={{ 
                    backgroundColor: colors.backgroundAlt,
                    border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                    color: colors.text,
                  }}
                />
                
                {error && errorMessage && (
                  <p className="text-center text-red-500 text-sm mb-3">{errorMessage}</p>
                )}
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleBackToVerify}
                    className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                    style={{ 
                      backgroundColor: colors.backgroundAlt,
                      color: colors.text,
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                    style={{ 
                      backgroundColor: colors.primary,
                      color: colors.textInverse,
                    }}
                  >
                    Reset PIN
                  </button>
                </div>
              </>
            ) : mode === 'set' && showSecuritySetup ? (
              // Set Password with Security Question
              <>
                {/* Security Question Selection */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-2" style={{ color: colors.textMuted }}>
                    Select a Security Question:
                  </label>
                  <select
                    value={selectedQuestion}
                    onChange={(e) => setSelectedQuestion(e.target.value)}
                    className="w-full p-3 rounded-xl text-sm"
                    style={{ 
                      backgroundColor: colors.backgroundAlt,
                      border: `2px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                    }}
                  >
                    {SECURITY_QUESTIONS.map((q, index) => (
                      <option key={index} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                
                {/* Security Answer Input */}
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => {
                    setSecurityAnswer(e.target.value);
                    setError(false);
                    setErrorMessage('');
                  }}
                  placeholder="Your security answer"
                  className="w-full p-4 rounded-xl text-center text-lg font-medium mb-3"
                  style={{ 
                    backgroundColor: colors.backgroundAlt,
                    border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                    color: colors.text,
                  }}
                  autoFocus
                />
                
                {/* Confirm Security Answer */}
                <input
                  type="text"
                  value={confirmAnswer}
                  onChange={(e) => {
                    setConfirmAnswer(e.target.value);
                    setError(false);
                    setErrorMessage('');
                  }}
                  placeholder="Confirm security answer"
                  className="w-full p-4 rounded-xl text-center text-lg font-medium mb-3"
                  style={{ 
                    backgroundColor: colors.backgroundAlt,
                    border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                    color: colors.text,
                  }}
                />
                
                {/* Password Input */}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                    setErrorMessage('');
                  }}
                  placeholder="Enter new PIN"
                  className="w-full p-4 rounded-xl text-center text-lg font-black tracking-widest mb-3"
                  style={{ 
                    backgroundColor: colors.backgroundAlt,
                    border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                    color: colors.text,
                  }}
                />
                
                {/* Confirm Password */}
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(false);
                    setErrorMessage('');
                  }}
                  placeholder="Confirm new PIN"
                  className="w-full p-4 rounded-xl text-center text-lg font-black tracking-widest mb-3"
                  style={{ 
                    backgroundColor: colors.backgroundAlt,
                    border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                    color: colors.text,
                  }}
                />
                
                {error && errorMessage && (
                  <p className="text-center text-red-500 text-sm mb-3">{errorMessage}</p>
                )}
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSecuritySetup(false)}
                    className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                    style={{ 
                      backgroundColor: colors.backgroundAlt,
                      color: colors.text,
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                    style={{ 
                      backgroundColor: colors.primary,
                      color: colors.textInverse,
                    }}
                  >
                    Set PIN
                  </button>
                </div>
              </>
            ) : mode === 'set' ? (
              // Initial Set Password Screen
              <>
                <p className="text-center mb-4" style={{ color: colors.textMuted }}>
                  You'll need to set a security question to help recover your PIN if forgotten.
                </p>
                
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                    setErrorMessage('');
                  }}
                  placeholder="Enter manager PIN"
                  className="w-full p-4 rounded-xl text-center text-lg font-black tracking-widest mb-3"
                  style={{ 
                    backgroundColor: colors.backgroundAlt,
                    border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                    color: colors.text,
                  }}
                  autoFocus
                />
                
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(false);
                    setErrorMessage('');
                  }}
                  placeholder="Confirm manager PIN"
                  className="w-full p-4 rounded-xl text-center text-lg font-black tracking-widest mb-3"
                  style={{ 
                    backgroundColor: colors.backgroundAlt,
                    border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                    color: colors.text,
                  }}
                />
                
                {error && errorMessage && (
                  <p className="text-center text-red-500 text-sm mb-3">{errorMessage}</p>
                )}
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                    style={{ 
                      backgroundColor: colors.backgroundAlt,
                      color: colors.text,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (password.length < 4) {
                        setError(true);
                        setErrorMessage('Password must be at least 4 characters.');
                        return;
                      }
                      if (password !== confirmPassword) {
                        setError(true);
                        setErrorMessage('Passwords do not match.');
                        return;
                      }
                      setShowSecuritySetup(true);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                    style={{ 
                      backgroundColor: colors.primary,
                      color: colors.textInverse,
                    }}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              // Verify Mode (default)
              <>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                    setErrorMessage('');
                  }}
                  placeholder="Enter manager PIN"
                  className="w-full p-4 rounded-xl text-center text-lg font-black tracking-widest"
                  style={{ 
                    backgroundColor: colors.backgroundAlt,
                    border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                    color: colors.text,
                  }}
                  autoFocus
                />
                {error && (
                  <p className="text-center text-red-500 text-sm mt-2">Incorrect PIN. Please try again.</p>
                )}
                
                {mode === 'verify' && securityQuestion && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="w-full mt-3 text-center text-sm font-medium"
                    style={{ color: colors.primary }}
                  >
                    Forgot PIN?
                  </button>
                )}
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                    style={{ 
                      backgroundColor: colors.backgroundAlt,
                      color: colors.text,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                    style={{ 
                      backgroundColor: colors.primary,
                      color: colors.textInverse,
                    }}
                  >
                    {confirmText}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
