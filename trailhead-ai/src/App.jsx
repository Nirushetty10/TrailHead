import { useState, useRef, useEffect, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpwardRounded';
import AnimatedBackground from './components/AnimatedBackground.jsx';
import HomeCards from './components/HomeCards.jsx';
import ChatView from './components/ChatView.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { socket } from './services/socket.js';
import { buildTheme } from './theme.js';
import { themes, tokensToCssVars } from './themes.js';
import './App.css';

let idCounter = 0;
const nextId = () => `msg-${++idCounter}`;

const STORAGE_KEY = 'trailhead-theme';

function metaFor(result) {
  if (result.receipt) return 'confirmed action · from your system';
  if (result.orderCard) return 'from your order system';
  if (result.products) return 'from your catalog';
  return null;
}

export default function App() {
  const [themeName, setThemeName] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const muiTheme = useMemo(() => buildTheme(themeName), [themeName]);
  const cssVars = useMemo(() => tokensToCssVars(themes[themeName]), [themeName]);

  function toggleTheme() {
    const next = themeName === 'dark' ? 'light' : 'dark';
    setThemeName(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore storage failures (private browsing etc) */
    }
  }

  const [view, setView] = useState('home');
  const [messages, setMessages] = useState([]);
  const [activeCardId, setActiveCardId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleReply(result) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: result.limitReached ? 'limit' : 'ai',
          text: result.text,
          meta: metaFor(result),
          products: result.products,
          orderCard: result.orderCard,
          confirmAction: result.confirmAction,
          escalation: result.escalation,
        },
      ]);
    }
    function handleTyping(typing) {
      setIsTyping(typing);
    }
    function handleError() {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'error', text: "Couldn't reach the assistant — check your connection and try again." },
      ]);
    }

    socket.on('chat:reply', handleReply);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:error', handleError);

    return () => {
      socket.off('chat:reply', handleReply);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:error', handleError);
    };
  }, []);

  function sendToBackend(text) {
    socket.emit('chat:message', { message: text });
  }

  function handleSend() {
    const text = inputValue.trim();
    if (!text) return;
    setActiveCardId(null);
    setView('chat');
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }]);
    setInputValue('');
    sendToBackend(text);
  }

  function handleSelectCard(card) {
    setActiveCardId(card.id);
    setView('chat');
    setMessages([{ id: nextId(), role: 'ai', text: card.opening }]);
  }

  function handleGoHome() {
    setView('home');
    setMessages([]);
    setActiveCardId(null);
    setInputValue('');
    setIsTyping(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div className="app-shell" style={cssVars}>
        <AnimatedBackground themeName={themeName} />
        <ThemeToggle themeName={themeName} onToggle={toggleTheme} />

        <div className="app-shell__content">
          <div className="app-shell__scroll-area">
            {view === 'home' ? (
              <HomeCards onSelectCard={handleSelectCard} />
            ) : (
              <ChatView
                messages={messages}
                activeCardId={activeCardId}
                onGoHome={handleGoHome}
                isTyping={isTyping}
              />
            )}
          </div>

          <div className="app-shell__input-bar">
            <input
              ref={inputRef}
              className="app-shell__input"
              type="text"
              placeholder="Ask anything…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Ask anything"
            />
            <IconButton
              onClick={handleSend}
              size="small"
              aria-label="Send message"
              sx={{
                color: 'var(--accent)',
                '&:hover': { background: 'rgba(79,168,224,0.1)' },
              }}
            >
              <ArrowUpwardIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
