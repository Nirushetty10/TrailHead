import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { handleMessage } from './src/orchestrator.js';

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
});

// In-memory conversation history per socket connection.
// Phase 2: move this to Redis (or similar) so history survives reconnects
// and works across multiple server instances.
const sessionHistory = new Map();

const MAX_HISTORY_MESSAGES = 10; // keep prompts small and cheap

function appendHistory(sessionId, role, content) {
  const history = sessionHistory.get(sessionId) || [];
  history.push({ role, content });
  sessionHistory.set(sessionId, history.slice(-MAX_HISTORY_MESSAGES));
}

// --- REST fallback (useful for curl testing / non-socket clients) ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'rest-default' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message (string) is required' });
    }

    const history = sessionHistory.get(sessionId) || [];
    const result = await handleMessage({ message, history });

    appendHistory(sessionId, 'user', message);
    appendHistory(sessionId, 'assistant', result.text);

    res.json(result);
  } catch (err) {
    console.error('[api/chat] error:', err);
    res.status(500).json({ error: 'Something went wrong generating a reply.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', aiConnected: Boolean(process.env.GROQ_API_KEY) });
});

// --- Real-time chat via Socket.IO ---
io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on('chat:message', async (payload) => {
    const message = typeof payload === 'string' ? payload : payload?.message;
    if (!message || !message.trim()) return;

    socket.emit('chat:typing', true);

    try {
      const history = sessionHistory.get(socket.id) || [];
      const result = await handleMessage({ message, history });

      appendHistory(socket.id, 'user', message);
      appendHistory(socket.id, 'assistant', result.text);

      socket.emit('chat:typing', false);
      socket.emit('chat:reply', result);
    } catch (err) {
      console.error('[socket chat:message] error:', err);
      socket.emit('chat:typing', false);
      socket.emit('chat:error', { error: 'Something went wrong generating a reply.' });
    }
  });

  socket.on('disconnect', () => {
    sessionHistory.delete(socket.id);
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Trailhead AI backend running on http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn(
      '⚠️  No GROQ_API_KEY set in .env — replies will use a placeholder until you add one.\n' +
      '   Get a free key: https://console.groq.com/keys'
    );
  }
});
