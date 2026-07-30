import React, { useState, useEffect, useRef } from 'react';
import { Send, Code, Paperclip, Smile, X, Lock, User } from 'lucide-react';

export default function ChatPanel({ socket, roomId, currentUser, participants = [], onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      senderName: 'HYSKOOL System',
      text: 'Welcome to HYSKOOL MEET! Messaging is end-to-end encrypted and self-hosted.',
      timestamp: '12:00 PM',
      isSystem: true
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedTargetUser, setSelectedTargetUser] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat-message', (msgData) => {
      setMessages(prev => [...prev, msgData]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (socket) {
      socket.emit('chat-message', {
        message: inputText.trim(),
        targetUserId: selectedTargetUser || null,
        isCode: isCodeMode
      });
    }

    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sidebar-panel">
      <div className="panel-header">
        <span>In-Meeting Chat</span>
        <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Target Recipient Selector */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--glass-border)', background: '#f8fafc' }}>
        <select 
          className="form-input"
          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          value={selectedTargetUser}
          onChange={(e) => setSelectedTargetUser(e.target.value)}
        >
          <option value="">Everyone (Public Channel)</option>
          {participants.filter(p => p.id !== currentUser?.id).map(p => (
            <option key={p.id} value={p.id}>🔒 Direct Message: {p.name}</option>
          ))}
        </select>
      </div>

      {/* Messages list */}
      <div className="panel-content">
        {messages.map(msg => (
          <div 
            key={msg.id}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: msg.isSystem ? 'rgba(2, 132, 199, 0.08)' : msg.isPrivate ? 'rgba(99, 102, 241, 0.1)' : '#ffffff',
              border: msg.isPrivate ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid var(--glass-border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.75rem' }}>
              <span style={{ fontWeight: 700, color: msg.isSystem ? '#0284c7' : '#4f46e5' }}>
                {msg.senderName} {msg.isPrivate && '(Private)'}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>{msg.timestamp}</span>
            </div>

            {msg.isCode ? (
              <pre className="code-block" style={{ margin: 0, padding: 8 }}>{msg.text}</pre>
            ) : (
              <p style={{ fontSize: '0.875rem', lineHeight: '1.4', color: '#0f172a', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSend} style={{ padding: 12, borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 8, background: '#ffffff' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className={`btn btn-secondary ${isCodeMode ? 'btn-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={() => setIsCodeMode(!isCodeMode)}
            title="Toggle Code Formatting"
          >
            <Code size={14} /> Code Snippet Mode
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea 
            ref={textareaRef}
            rows={isCodeMode ? 3 : 1}
            className="form-input" 
            placeholder={isCodeMode ? "Paste code snippet... (Enter to send)" : "Type message... (Enter to send, Shift+Enter for new line)"}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ resize: 'none', fontFamily: isCodeMode ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', height: 'fit-content' }}>
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
