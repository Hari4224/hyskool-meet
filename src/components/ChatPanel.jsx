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
  const [selectedTargetUser, setSelectedTargetUser] = useState(''); // empty for group, userId for direct msg
  const [isCodeMode, setIsCodeMode] = useState(false);
  const messagesEndRef = useRef(null);

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
    e.preventDefault();
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

  return (
    <div className="sidebar-panel">
      <div className="panel-header">
        <span>In-Meeting Chat</span>
        <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Target Recipient Selector */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
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
              background: msg.isSystem ? 'rgba(6, 182, 212, 0.1)' : msg.isPrivate ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: msg.isPrivate ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid var(--glass-border)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.75rem' }}>
              <span style={{ fontWeight: 700, color: msg.isSystem ? '#38bdf8' : '#c084fc' }}>
                {msg.senderName} {msg.isPrivate && '(Private)'}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>{msg.timestamp}</span>
            </div>

            {msg.isCode ? (
              <pre className="code-block" style={{ margin: 0, padding: 8 }}>{msg.text}</pre>
            ) : (
              <p style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>{msg.text}</p>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSend} style={{ padding: 12, borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className={`btn btn-secondary ${isCodeMode ? 'btn-primary' : ''}`}
            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
            onClick={() => setIsCodeMode(!isCodeMode)}
            title="Toggle Code Formatting"
          >
            <Code size={14} /> Code
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder={isCodeMode ? "Paste code snippet..." : "Type message..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }}>
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
