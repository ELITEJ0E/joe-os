import React, { useState, useEffect } from 'react';
import { Mail, Check, AlertCircle, RefreshCw, Send, Eye, User, Sparkles, Inbox, Edit3, Trash2 } from 'lucide-react';
import { googleSignIn, initAuth, getAccessToken, logout } from '../lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

interface MailIntegrationProps {
  onSuggestReply: (emailContent: string) => void;
  isAiThinking: boolean;
}

export function MailIntegration({ onSuggestReply, isAiThinking }: MailIntegrationProps) {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [emails, setEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState('benjoel.tan1@gmail.com');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [composeSuccess, setComposeSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, t) => {
        setUser(user);
        setToken(t);
        setNeedsAuth(false);
        fetchEmails(t);
      },
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        fetchEmails(result.accessToken);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setEmails([]);
  };

  const fetchEmails = async (accessToken: string) => {
    setLoadingEmails(true);
    setError(null);
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      
      if (data.messages && data.messages.length > 0) {
        const fullMessages = await Promise.all(
          data.messages.map(async (msg: any) => {
            const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            return await msgRes.json();
          })
        );
        setEmails(fullMessages);
      } else {
        setEmails([]);
      }
    } catch (err: any) {
      console.error('Error fetching emails:', err);
      setError(err.message);
    } finally {
      setLoadingEmails(false);
    }
  };

  const parseHeader = (headers: any[], name: string) => {
    const header = headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : 'Unknown';
  };

  const handleSendEmail = async () => {
    if (!token) return;
    setIsSending(true);
    setError(null);
    setComposeSuccess(false);
    
    try {
      const emailLines = [];
      emailLines.push(`To: ${composeTo}`);
      emailLines.push('Content-type: text/plain;charset=utf-8');
      emailLines.push('MIME-Version: 1.0');
      emailLines.push(`Subject: ${composeSubject}`);
      emailLines.push('');
      emailLines.push(composeBody);
      
      const emailContent = emailLines.join('\r\n');
      const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailContent))).replace(/\+/g, '-').replace(/\//g, '_');
      
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: base64EncodedEmail
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to send email');
      }
      
      setComposeSuccess(true);
      setTimeout(() => {
        setIsComposing(false);
        setComposeSuccess(false);
        setComposeSubject('');
        setComposeBody('');
      }, 2000);
    } catch (err: any) {
      console.error('Send error:', err);
      setError(err.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 text-center px-4 max-w-lg mx-auto py-12">
        <div className="bg-[#00ff66]/5 p-6 rounded-full border border-[#00ff66]/20 shadow-[0_0_20px_rgba(0,255,102,0.05)]">
          <Mail size={48} className="text-[#00ff66]" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-mono text-emerald-300 mb-2 uppercase tracking-widest">Workspace Integration</h2>
          <p className="text-emerald-500/70 text-xs max-w-md mx-auto">
            Connect your Gmail account to enable AI-powered email drafting, smart summaries, and autonomous inbox management.
          </p>
        </div>

        <button 
          onClick={handleLogin} 
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-lg disabled:opacity-70 cursor-pointer text-sm font-mono"
        >
          {isLoggingIn ? (
            <RefreshCw className="animate-spin text-gray-500" size={18} />
          ) : (
            <svg viewBox="0 0 48 48" width="18" height="18">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          )}
          <span>{isLoggingIn ? 'CONNECTING TO GMAIL...' : 'SIGN IN WITH GOOGLE'}</span>
        </button>
        {error && <p className="text-red-400 text-xs mt-2 font-mono bg-red-950/20 border border-red-950 p-2.5 rounded-lg w-full text-left">{error}</p>}

        {/* Beautiful GCP OAuth Test Users Guide */}
        <div className="w-full bg-[#050a08] border border-emerald-950 rounded-xl p-4 space-y-3 text-left font-mono text-[11px] leading-relaxed text-emerald-500/80 mt-2">
          <span className="text-emerald-400 font-bold uppercase tracking-wider block border-b border-emerald-950/60 pb-1.5 flex items-center gap-1.5">
            <AlertCircle size={12} className="text-amber-500 shrink-0" />
            OAuth Verification Bypass Guide
          </span>
          <p>
            Google restricts unverified OAuth applications (like test Firebase environments) to pre-registered test accounts. To authorize <strong className="text-emerald-300">benjoel.tan1@gmail.com</strong> or any other email:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-emerald-400/90 pl-1">
            <li>
              Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#00ff66] underline hover:text-[#00ff88]">Google Cloud Console</a>.
            </li>
            <li>
              Select your Cloud / Firebase project (e.g. <span className="text-emerald-300">distributed-unfolding-kd2jw</span>).
            </li>
            <li>
              Navigate to <strong className="text-emerald-300">APIs & Services</strong> &gt; <strong className="text-emerald-300">OAuth consent screen</strong>.
            </li>
            <li>
              Scroll down to the <strong className="text-emerald-300">Test users</strong> section and click <strong className="text-[#00ff66]">+ Add Users</strong>.
            </li>
            <li>
              Enter <code className="bg-emerald-950/60 px-1 py-0.5 rounded text-emerald-200">benjoel.tan1@gmail.com</code> (or other emails) and click <strong className="text-emerald-300">Save</strong>.
            </li>
          </ol>
          <div className="pt-1.5 border-t border-emerald-950/60 text-[10px] text-emerald-500/60">
            Once saved, any Google account added to this list will be allowed to log in instantly.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden border border-emerald-900/30 rounded-xl bg-[#08100c]">
      {/* Sidebar: Inbox List */}
      <div className="w-full lg:w-1/3 border-r border-emerald-900/30 flex flex-col h-full bg-[#050a08]">
        <div className="p-4 border-b border-emerald-900/30 flex justify-between items-center bg-emerald-950/20">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold">
            <Inbox size={18} />
            <span>INBOX</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                setIsComposing(true);
                setSelectedEmail(null);
                setComposeSuccess(false);
              }}
              className="p-1.5 text-emerald-500 hover:text-emerald-300 hover:bg-emerald-900/50 rounded transition-colors"
              title="Compose"
            >
              <Edit3 size={14} />
            </button>
            <button 
              onClick={() => { if(token) fetchEmails(token); }}
              className="p-1.5 text-emerald-500 hover:text-emerald-300 hover:bg-emerald-900/50 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={loadingEmails ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-emerald-500 hover:text-red-400 hover:bg-emerald-900/50 rounded transition-colors"
              title="Disconnect"
            >
              <User size={14} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingEmails ? (
            <div className="flex justify-center items-center h-32 text-emerald-500/50">
              <RefreshCw className="animate-spin" size={24} />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-emerald-500/50 p-4 text-center">
              <Inbox size={24} className="mb-2 opacity-50" />
              <p className="text-xs font-mono">Inbox is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-emerald-900/20">
              {emails.map(email => {
                const subject = parseHeader(email.payload?.headers, 'Subject') || '(No Subject)';
                const from = parseHeader(email.payload?.headers, 'From');
                const isUnread = email.labelIds?.includes('UNREAD');
                const isSelected = selectedEmail?.id === email.id;
                
                return (
                  <div 
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-900/40 border-l-2 border-[#00ff66]' : 'hover:bg-emerald-900/20 border-l-2 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs truncate max-w-[180px] ${isUnread ? 'text-emerald-300 font-bold' : 'text-emerald-500/80 font-medium'}`}>
                        {from.split('<')[0].trim()}
                      </span>
                      {isUnread && <span className="w-2 h-2 rounded-full bg-[#00ff66] shrink-0 mt-1"></span>}
                    </div>
                    <h4 className={`text-sm truncate ${isUnread ? 'text-emerald-100' : 'text-emerald-400/80'}`}>{subject}</h4>
                    <span className="text-[10px] text-emerald-600 font-mono mt-2 block">
                      {new Date(parseInt(email.internalDate)).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Area: Email Reader & Composer */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0f0c] overflow-hidden relative">
        {isComposing ? (
          <div className="flex flex-col h-full p-6">
            <h2 className="text-xl font-bold font-mono text-emerald-300 mb-6 flex items-center gap-2">
              <Edit3 size={20} />
              New Message
            </h2>
            
            {composeSuccess ? (
              <div className="bg-[#10b981]/20 border border-[#10b981]/50 text-emerald-300 p-4 rounded-lg flex items-center gap-3 mb-6">
                <Check size={20} className="text-[#00ff66]" />
                <span>Email sent successfully!</span>
              </div>
            ) : null}
            
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-300 p-4 rounded-lg flex items-center gap-3 mb-6">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-emerald-500/80 uppercase">To</label>
                <input 
                  type="email" 
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="bg-[#050a08] border border-emerald-900/50 rounded p-2.5 text-emerald-300 focus:outline-none focus:border-[#00ff66]/50 transition-colors"
                  placeholder="recipient@example.com"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-emerald-500/80 uppercase">Subject</label>
                <input 
                  type="text" 
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="bg-[#050a08] border border-emerald-900/50 rounded p-2.5 text-emerald-300 focus:outline-none focus:border-[#00ff66]/50 transition-colors"
                  placeholder="Enter subject"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-mono text-emerald-500/80 uppercase">Message</label>
                <textarea 
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="flex-1 bg-[#050a08] border border-emerald-900/50 rounded p-4 text-emerald-300 focus:outline-none focus:border-[#00ff66]/50 transition-colors resize-none font-sans"
                  placeholder="Type your message here..."
                ></textarea>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-emerald-900/30">
                <button 
                  onClick={() => setIsComposing(false)}
                  className="px-6 py-2.5 rounded font-mono text-sm text-emerald-500 hover:text-emerald-300 hover:bg-emerald-900/20 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendEmail}
                  disabled={isSending || !composeTo || !composeSubject || !composeBody}
                  className="bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#00ff66] border border-[#10b981]/40 px-6 py-2.5 rounded flex items-center gap-2 font-mono text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        ) : selectedEmail ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-emerald-900/30">
              <h2 className="text-lg font-bold text-emerald-300 mb-2">{parseHeader(selectedEmail.payload?.headers, 'Subject')}</h2>
              <div className="flex justify-between items-center text-xs text-emerald-500">
                <span>From: <strong className="text-emerald-400">{parseHeader(selectedEmail.payload?.headers, 'From')}</strong></span>
                <span>{new Date(parseInt(selectedEmail.internalDate)).toLocaleString()}</span>
              </div>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 text-sm text-emerald-100/90 whitespace-pre-wrap font-sans leading-relaxed custom-scrollbar bg-[#050a08]">
              {selectedEmail.snippet}
              <div className="mt-8 pt-4 border-t border-emerald-900/30 text-emerald-500/50 italic text-xs">
                (Full message body requires fetching complete raw payload via API, currently showing snippet for speed)
              </div>
            </div>
            
            {/* Action Bar */}
            <div className="p-4 bg-emerald-950/20 border-t border-emerald-900/30 flex gap-3">
              <button 
                onClick={() => {
                  const subject = parseHeader(selectedEmail.payload?.headers, 'Subject');
                  const from = parseHeader(selectedEmail.payload?.headers, 'From');
                  const snippet = selectedEmail.snippet;
                  onSuggestReply(`Draft an email reply to this message:\n\nFrom: ${from}\nSubject: ${subject}\n\nSnippet: ${snippet}`);
                }}
                className="flex-1 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-emerald-300 border border-[#10b981]/40 px-4 py-2.5 rounded flex justify-center items-center gap-2 font-mono text-sm transition-colors"
                disabled={isAiThinking}
              >
                {isAiThinking ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isAiThinking ? 'AI Drafting...' : 'Draft AI Reply'}
              </button>
              <button 
                className="bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-900/60 px-4 py-2.5 rounded flex justify-center items-center gap-2 font-mono text-sm transition-colors"
                onClick={() => {
                  const subject = parseHeader(selectedEmail.payload?.headers, 'Subject');
                  const from = parseHeader(selectedEmail.payload?.headers, 'From');
                  const snippet = selectedEmail.snippet;
                  onSuggestReply(`Create a bullet-point summary of this email thread:\n\nFrom: ${from}\nSubject: ${subject}\n\nContent: ${snippet}`);
                }}
                disabled={isAiThinking}
              >
                {isAiThinking ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                Summarize
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-emerald-500/50">
            <Mail size={48} className="mb-4 opacity-20" />
            <p className="font-mono">Select an email to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
