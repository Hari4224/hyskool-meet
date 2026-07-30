import React, { useState, useEffect } from 'react';
import { BarChart2, Plus, CheckCircle, X } from 'lucide-react';

export default function PollsModal({ socket, roomId, polls = [], onClose }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['Option 1', 'Option 2']);
  const [isQuiz, setIsQuiz] = useState(false);
  const [votedPolls, setVotedPolls] = useState(new Set());

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions(prev => [...prev, `Option ${prev.length + 1}`]);
    }
  };

  const handleCreatePoll = (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    if (socket) {
      socket.emit('create-poll', {
        question: question.trim(),
        options: options.filter(opt => opt.trim()),
        isQuiz
      });
    }

    setQuestion('');
    setOptions(['Option 1', 'Option 2']);
  };

  const handleVote = (pollId, optionIndex) => {
    if (votedPolls.has(pollId)) return;
    if (socket) {
      socket.emit('vote-poll', { pollId, optionIndex });
      setVotedPolls(prev => new Set(prev).add(pollId));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart2 size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Live Polls & Quizzes</h3>
          </div>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Poll Creation Form */}
          <form onSubmit={handleCreatePoll} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--glass-border)' }}>
            <div className="form-group">
              <label className="form-label">Poll Question</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. What is the derivative of sin(x)?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>

            {options.map((opt, idx) => (
              <div key={idx} className="form-group">
                <input 
                  type="text" 
                  className="form-input"
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[idx] = e.target.value;
                    setOptions(newOpts);
                  }}
                  required
                />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {options.length < 5 && (
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleAddOption}>
                  <Plus size={14} /> Add Option
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{ marginLeft: 'auto', padding: '6px 16px', fontSize: '0.85rem' }}>
                Publish Live Poll
              </button>
            </div>
          </form>

          {/* Active Polls & Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Active & Completed Polls</h4>

            {polls.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 20 }}>
                No active polls yet. Create one above!
              </div>
            ) : (
              polls.map(poll => (
                <div key={poll.id} className="glass-panel" style={{ padding: 16 }}>
                  <h5 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>{poll.question}</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {poll.options.map((opt, idx) => {
                      const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span>{opt.text}</span>
                            <span>{opt.votes} votes ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)', transition: 'width 0.3s ease' }} />
                          </div>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem', marginTop: 4, width: 'fit-content' }}
                            onClick={() => handleVote(poll.id, idx)}
                          >
                            Vote for Option {idx + 1}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
