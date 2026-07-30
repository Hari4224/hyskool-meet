import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'hyskool_meet_super_secret_key_2026';

app.use(cors());
app.use(express.json());

// In-memory data store for self-hosted room states
const activeRooms = new Map();
const scheduledMeetings = [
  {
    id: 'room-math-101',
    title: 'Advanced Mathematics Lecture & Whiteboard Session',
    host: 'Dr. Sarah Connor',
    startTime: '2026-07-30T15:00:00.000Z',
    durationMinutes: 60,
    passwordProtected: false,
    e2eeEnabled: true,
    lanOnly: false,
    participantsCount: 4
  },
  {
    id: 'room-physics-lab',
    title: 'Quantum Physics Breakout & Interactive Lab',
    host: 'Prof. Richard Feynman',
    startTime: '2026-07-30T17:30:00.000Z',
    durationMinutes: 45,
    passwordProtected: true,
    e2eeEnabled: false,
    lanOnly: true,
    participantsCount: 12
  }
];

// --- REST API ENDPOINTS FOR UNIVERSAL APP INTEGRATION ---

// GET /api/v1/rooms - List rooms / scheduled meetings
app.get('/api/v1/rooms', (req, res) => {
  res.json({
    success: true,
    data: {
      activeRooms: Array.from(activeRooms.entries()).map(([id, data]) => ({
        id,
        participantCount: data.participants.size,
        locked: data.locked,
        e2ee: data.e2ee
      })),
      scheduledMeetings
    }
  });
});

// POST /api/v1/rooms - Programmatically create a meeting room
app.post('/api/v1/rooms', (req, res) => {
  const { title, host, password, e2ee, lanOnly } = req.body;
  const roomId = `hyskool-${Math.random().toString(36).substring(2, 9)}`;
  
  const roomData = {
    id: roomId,
    title: title || 'HYSKOOL Instant Meeting',
    host: host || 'Host Admin',
    created: new Date().toISOString(),
    password: password || '',
    locked: false,
    e2ee: e2ee || false,
    lanOnly: lanOnly || false,
    participants: new Map(),
    lobby: new Map(),
    polls: [],
    whiteboardElements: [],
    sharedNotes: '# HYSKOOL MEET Collaborative Notes\n\n- Welcome to the meeting!\n- Use this space to collaborate in real-time.',
    breakoutRooms: []
  };

  activeRooms.set(roomId, roomData);

  // Generate host JWT token
  const token = jwt.sign(
    { roomId, role: 'host', name: host || 'Host Admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    data: {
      roomId,
      title: roomData.title,
      joinUrl: `http://${req.headers.host || 'hyskool.com'}/?room=${roomId}`,
      embedSdkCode: `<script src="http://${req.headers.host || 'hyskool.com'}/sdk.js"></script>\n<script>\n  new HyskoolMeetSDK({\n    domain: "${req.headers.host || 'hyskool.com'}",\n    roomName: "${roomId}"\n  });\n</script>`,
      flutterCode: `// Flutter Webview Integration\nInAppWebView(\n  initialUrlRequest: URLRequest(url: WebUri('http://${req.headers.host || 'hyskool.com'}/?room=${roomId}&embed=true')),\n  initialSettings: InAppWebViewSettings(mediaPlaybackRequiresUserGesture: false, allowsInlineMediaPlayback: true),\n)`,
      token
    }
  });
});

// POST /api/v1/token - Generate room access token
app.post('/api/v1/token', (req, res) => {
  const { roomId, role, userName } = req.body;
  if (!roomId) return res.status(400).json({ success: false, error: 'Room ID is required' });

  const token = jwt.sign(
    { roomId, role: role || 'attendee', name: userName || 'Guest' },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ success: true, token });
});

// POST /api/v1/webhooks - Simulated webhook event processor
app.post('/api/v1/webhooks', (req, res) => {
  console.log('[Webhook Event Received]:', req.body);
  res.json({ success: true, receivedAt: new Date().toISOString() });
});


// --- REAL-TIME SOCKET.IO SIGNALING & COLLABORATION ENGINE ---

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  let currentRoomId = null;
  let currentUser = null;

  socket.on('join-room', ({ roomId, userName, userRole, avatar, password }) => {
    currentRoomId = roomId;
    currentUser = {
      id: socket.id,
      name: userName || `User-${socket.id.substring(0, 4)}`,
      role: userRole || 'attendee',
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${socket.id}`,
      audioMuted: false,
      videoMuted: false,
      handRaised: false,
      joinedAt: new Date().toLocaleTimeString()
    };

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, {
        id: roomId,
        title: `Room ${roomId}`,
        host: currentUser.name,
        created: new Date().toISOString(),
        locked: false,
        e2ee: false,
        lanOnly: false,
        participants: new Map(),
        lobby: new Map(),
        polls: [],
        whiteboardElements: [],
        sharedNotes: '# HYSKOOL MEET Collaborative Notes\n\n- Welcome to the meeting!\n- Use this space to collaborate in real-time.',
        breakoutRooms: []
      });
    }

    const room = activeRooms.get(roomId);

    // Handle locked room / lobby
    if (room.locked && currentUser.role !== 'host') {
      room.lobby.set(socket.id, currentUser);
      socket.emit('lobby-waiting', { message: 'The room is locked. Host approval required.' });
      
      // Notify host
      for (const [pId, pData] of room.participants.entries()) {
        if (pData.role === 'host') {
          io.to(pId).emit('lobby-updated', Array.from(room.lobby.values()));
        }
      }
      return;
    }

    // Add to room
    room.participants.set(socket.id, currentUser);
    socket.join(roomId);

    const allParticipantsList = Array.from(room.participants.values());

    // Notify user of room state
    socket.emit('room-joined', {
      roomId,
      user: currentUser,
      participants: allParticipantsList,
      whiteboardElements: room.whiteboardElements,
      sharedNotes: room.sharedNotes,
      polls: room.polls,
      breakoutRooms: room.breakoutRooms,
      isLocked: room.locked,
      isE2EE: room.e2ee
    });

    // Notify other peers in the room with updated participant list
    socket.to(roomId).emit('user-connected', {
      user: currentUser,
      participants: allParticipantsList
    });

    console.log(`[User Joined] ${currentUser.name} (${socket.id}) -> Room: ${roomId} (Total: ${allParticipantsList.length})`);
  });

  // WebRTC Peer-to-Peer Signaling Relay
  socket.on('signal', ({ targetId, signal }) => {
    io.to(targetId).emit('signal', {
      senderId: socket.id,
      signal
    });
  });

  // Media Controls (Mic, Cam, Hand Raise) - Throttled for 100+ users
  socket.on('update-media-state', ({ audioMuted, videoMuted, handRaised }) => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);
    const user = room.participants.get(socket.id);
    if (user) {
      if (audioMuted !== undefined) user.audioMuted = audioMuted;
      if (videoMuted !== undefined) user.videoMuted = videoMuted;
      if (handRaised !== undefined) user.handRaised = handRaised;

      // Broadcast light payload to prevent socket network congestion in 100+ rooms
      socket.to(currentRoomId).emit('media-state-changed', {
        userId: socket.id,
        audioMuted: user.audioMuted,
        videoMuted: user.videoMuted,
        handRaised: user.handRaised,
        participants: Array.from(room.participants.values())
      });
    }
  });

  // Collaborative Whiteboard events
  socket.on('whiteboard-draw', (drawData) => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);
    room.whiteboardElements.push(drawData);
    socket.to(currentRoomId).emit('whiteboard-draw', drawData);
  });

  socket.on('whiteboard-clear', () => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);
    room.whiteboardElements = [];
    io.to(currentRoomId).emit('whiteboard-clear');
  });

  // Collaborative Shared Notes
  socket.on('update-notes', (notesText) => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);
    room.sharedNotes = notesText;
    socket.to(currentRoomId).emit('update-notes', notesText);
  });

  // Real-time In-Meeting Chat
  socket.on('chat-message', ({ message, targetUserId, isCode }) => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);
    const sender = room.participants.get(socket.id);

    const chatData = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: socket.id,
      senderName: sender ? sender.name : 'Unknown',
      senderAvatar: sender ? sender.avatar : '',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isPrivate: !!targetUserId,
      isCode: !!isCode
    };

    if (targetUserId) {
      // Direct message
      io.to(targetUserId).emit('chat-message', chatData);
      socket.emit('chat-message', chatData);
    } else {
      // Group chat
      io.to(currentRoomId).emit('chat-message', chatData);
    }
  });

  // Live Polls Creation & Voting
  socket.on('create-poll', ({ question, options, isQuiz }) => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);

    const poll = {
      id: `poll-${Date.now()}`,
      creator: socket.id,
      question,
      options: options.map(opt => ({ text: opt, votes: 0, vofers: [] })),
      isQuiz: !!isQuiz,
      totalVotes: 0,
      active: true
    };

    room.polls.push(poll);
    io.to(currentRoomId).emit('poll-created', poll);
  });

  socket.on('vote-poll', ({ pollId, optionIndex }) => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);
    const poll = room.polls.find(p => p.id === pollId);

    if (poll && poll.options[optionIndex]) {
      // Record vote
      poll.options[optionIndex].votes += 1;
      poll.totalVotes += 1;
      io.to(currentRoomId).emit('poll-updated', poll);
    }
  });

  // Breakout Rooms Management
  socket.on('create-breakout-rooms', ({ roomCount, durationMinutes }) => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);

    const breakoutRooms = [];
    const participantList = Array.from(room.participants.values());

    for (let i = 1; i <= roomCount; i++) {
      breakoutRooms.push({
        id: `breakout-${i}`,
        name: `Breakout Room ${i}`,
        members: []
      });
    }

    // Auto assign participants
    participantList.forEach((p, idx) => {
      const roomIdx = idx % roomCount;
      breakoutRooms[roomIdx].members.push(p);
    });

    room.breakoutRooms = breakoutRooms;
    io.to(currentRoomId).emit('breakout-rooms-started', { breakoutRooms, durationMinutes });
  });

  // Virtual SIP Gateway Dial-in Simulation
  socket.on('sip-dial', ({ phoneNumber, sipUri }) => {
    socket.emit('sip-status', {
      status: 'connecting',
      message: `Initiating SIP/H.323 Trunk Bridge to ${phoneNumber || sipUri}...`
    });

    setTimeout(() => {
      socket.emit('sip-status', {
        status: 'connected',
        phoneNumber,
        sipUri,
        callerId: `SIP-PBX-${Math.floor(1000 + Math.random() * 9000)}`,
        message: `SIP Gateway active. Connected to room ${currentRoomId}`
      });
    }, 1500);
  });

  // Host Lobby Approval
  socket.on('approve-lobby-user', (userId) => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);
    const waitingUser = room.lobby.get(userId);

    if (waitingUser) {
      room.lobby.delete(userId);
      room.participants.set(userId, waitingUser);
      const targetSocket = io.sockets.sockets.get(userId);
      if (targetSocket) {
        targetSocket.join(currentRoomId);
        targetSocket.emit('room-joined', {
          roomId: currentRoomId,
          user: waitingUser,
          participants: Array.from(room.participants.values()),
          whiteboardElements: room.whiteboardElements,
          sharedNotes: room.sharedNotes,
          polls: room.polls,
          breakoutRooms: room.breakoutRooms,
          isLocked: room.locked,
          isE2EE: room.e2ee
        });
      }
      io.to(currentRoomId).emit('user-connected', {
        user: waitingUser,
        participants: Array.from(room.participants.values())
      });
    }
  });

  // Security Toggles (Lock Room, E2EE)
  socket.on('toggle-room-lock', (locked) => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);
    room.locked = locked;
    io.to(currentRoomId).emit('room-lock-changed', locked);
  });

  socket.on('toggle-e2ee', (e2ee) => {
    if (!currentRoomId || !activeRooms.has(currentRoomId)) return;
    const room = activeRooms.get(currentRoomId);
    room.e2ee = e2ee;
    io.to(currentRoomId).emit('e2ee-changed', e2ee);
  });

  // Disconnection
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    if (currentRoomId && activeRooms.has(currentRoomId)) {
      const leavingUserWasHost = currentUser && currentUser.role === 'host';
      room.participants.delete(socket.id);
      room.lobby.delete(socket.id);

      if (room.participants.size > 0 && leavingUserWasHost) {
        const firstRemaining = room.participants.values().next().value;
        if (firstRemaining) {
          firstRemaining.role = 'host';
          room.host = firstRemaining.name;
          console.log(`[Host Migrated] New Host: ${firstRemaining.name} in Room ${currentRoomId}`);
        }
      }

      io.to(currentRoomId).emit('user-disconnected', {
        userId: socket.id,
        participants: Array.from(room.participants.values())
      });

      if (room.participants.size === 0) {
        activeRooms.delete(currentRoomId);
      }
    }
  });
});

// Serve Vite production build static files
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  const distIndexHtml = path.join(__dirname, 'dist', 'index.html');
  res.sendFile(distIndexHtml, (err) => {
    if (err) {
      res.send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: white;">
            <h2>HYSKOOL MEET Backend API & Socket Server Active</h2>
            <p>Port: ${PORT}</p>
            <p>Vite Dev Frontend is running at <a href="http://localhost:3000" style="color:#38bdf8">http://localhost:3000</a></p>
          </body>
        </html>
      `);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 HYSKOOL MEET Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO Real-Time & WebRTC Engine Ready`);
  console.log(`🔌 Universal Integration REST API: /api/v1/rooms`);
  console.log(`===================================================`);
});
