import React, { useState } from 'react';
import { PhoneCall, Phone, Delete, Globe, ShieldCheck, X } from 'lucide-react';

const DTMF_FREQS = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

export default function SIPDialerModal({ socket, roomId, onClose }) {
  const [dialedNumber, setDialedNumber] = useState('');
  const [sipUri, setSipUri] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  const playDTMF = (key) => {
    if (!DTMF_FREQS[key]) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = DTMF_FREQS[key][0];
      osc2.frequency.value = DTMF_FREQS[key][1];

      gain.gain.value = 0.15;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      setTimeout(() => {
        osc1.stop();
        osc2.stop();
        ctx.close();
      }, 150);
    } catch (e) {
      console.warn('AudioContext disabled:', e);
    }
  };

  const handleKeyPress = (num) => {
    playDTMF(num);
    if (dialedNumber.length < 15) {
      setDialedNumber(prev => prev + num);
    }
  };

  const handleDial = () => {
    if (!dialedNumber && !sipUri) return;
    playDTMF('1');
    if (socket) {
      socket.emit('sip-dial', { phoneNumber: dialedNumber, sipUri });
    }
    setStatusMessage(`Initiating SIP/H.323 Trunk call to ${dialedNumber || sipUri}...`);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PhoneCall size={20} color="#10b981" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>SIP / H.323 Phone Gateway</h3>
          </div>
          <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="badge badge-emerald" style={{ width: 'fit-content', margin: '0 auto' }}>
              <ShieldCheck size={12} /> SIP Gateway Active (TrueConf Protocol Compatible)
            </span>

            <input 
              type="text" 
              className="form-input" 
              style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '2px', fontWeight: 700 }}
              placeholder="+1 (800) 555-0199"
              value={dialedNumber}
              onChange={(e) => setDialedNumber(e.target.value)}
            />
          </div>

          {/* Keypad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: '280px', marginTop: 12 }}>
            {keys.map(key => (
              <button 
                key={key} 
                className="btn btn-secondary"
                style={{ height: '54px', fontSize: '1.3rem', borderRadius: '50%', fontWeight: 700 }}
                onClick={() => handleKeyPress(key)}
              >
                {key}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <button className="btn btn-secondary" style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0 }} onClick={() => setDialedNumber(prev => prev.slice(0, -1))}>
              <Delete size={18} />
            </button>

            <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)', padding: '0 32px', height: '48px', background: '#10b981' }} onClick={handleDial}>
              <Phone size={20} /> Dial Out
            </button>
          </div>

          {statusMessage && (
            <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.85rem', color: '#34d399', textAlign: 'center', width: '100%', marginTop: 12 }}>
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
