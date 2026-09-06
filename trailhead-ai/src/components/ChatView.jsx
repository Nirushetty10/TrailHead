import { useEffect, useRef } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import ProductCard from './ProductCard.jsx';
import OrderCard from './OrderCard.jsx';
import { cards } from '../data/cards.js';
import './ChatView.css';

export default function ChatView({ messages, activeCardId, onGoHome, isTyping }) {
  const scrollRef = useRef(null);
  const activeCard = cards.find((c) => c.id === activeCardId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="chat-view">
      <div className="chat-view__header">
        <button className="chat-view__home-btn" onClick={onGoHome} type="button">
          <ArrowBackIcon sx={{ fontSize: 15 }} />
          <span>Home</span>
        </button>

        {activeCard && (
          <span
            className="chat-view__pill"
            style={{
              color: activeCard.accent === 'signal' ? 'var(--signal)' : 'var(--accent)',
              borderColor:
                activeCard.accent === 'signal' ? 'rgba(215,163,78,0.35)' : 'rgba(79,168,224,0.35)',
              background:
                activeCard.accent === 'signal' ? 'rgba(215,163,78,0.08)' : 'rgba(79,168,224,0.08)',
            }}
          >
            <activeCard.icon sx={{ fontSize: 13 }} />
            {activeCard.title}
          </span>
        )}
      </div>

      <div className="chat-view__thread" ref={scrollRef}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
      </div>
    </div>
  );
}

function ChatMessage({ message }) {
  if (message.role === 'user') {
    return <div className="chat-bubble chat-bubble--user">{message.text}</div>;
  }

  if (message.role === 'error') {
    return <div className="chat-bubble chat-bubble--error">{message.text}</div>;
  }

  return (
    <div className="chat-message--ai">
      {message.text && <div className="chat-bubble chat-bubble--ai">{message.text}</div>}

      {message.meta && <div className="chat-meta">{message.meta}</div>}

      {message.orderCard && <OrderCard order={message.orderCard} />}

      {message.products && (
        <div className="chat-products">
          {message.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-bubble chat-bubble--ai chat-bubble--typing" aria-label="Assistant is typing">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}
