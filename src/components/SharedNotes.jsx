import React, { useState, useEffect } from 'react';
import { FileText, Download, X } from 'lucide-react';

export default function SharedNotes({ socket, roomId, initialNotes = '', onClose }) {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    if (!socket) return;

    socket.on('update-notes', (newText) => {
      setNotes(newText);
    });

    return () => {
      socket.off('update-notes');
    };
  }, [socket]);

  const handleChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    if (socket) {
      socket.emit('update-notes', val);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([notes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `hyskool-meeting-notes-${roomId}.md`;
    a.href = url;
    a.click();
  };

  return (
    <div className="sidebar-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color="#38bdf8" />
          <span>Shared Collaborative Notes</span>
        </div>
        <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="panel-content" style={{ padding: 12 }}>
        <textarea 
          className="form-input" 
          style={{ flex: 1, resize: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.5', height: '100%' }}
          value={notes}
          onChange={handleChange}
          placeholder="Start typing shared notes... All participants can see edits live."
        />
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={handleDownload}>
          <Download size={16} /> Export Markdown (.md)
        </button>
      </div>
    </div>
  );
}
