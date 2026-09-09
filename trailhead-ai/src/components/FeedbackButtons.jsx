import { useState } from 'react';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { socket } from '../services/socket.js';
import './FeedbackButtons.css';

export default function FeedbackButtons({ messageId }) {
  const [rating, setRating] = useState(null); // null | 'helpful' | 'not_helpful'

  if (!messageId) return null; // legacy-fallback replies have no persisted message id yet

  function submit(newRating) {
    if (rating) return; // one rating per message, no take-backs via spam-clicking
    setRating(newRating);
    socket.emit('chat:feedback', { messageId, rating: newRating });
  }

  return (
    <div className="feedback-buttons">
      <button
        className={`feedback-btn ${rating === 'helpful' ? 'is-active' : ''}`}
        onClick={() => submit('helpful')}
        type="button"
        aria-label="Mark as helpful"
        disabled={!!rating}
      >
        {rating === 'helpful' ? <ThumbUpIcon sx={{ fontSize: 13 }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 13 }} />}
      </button>
      <button
        className={`feedback-btn ${rating === 'not_helpful' ? 'is-active' : ''}`}
        onClick={() => submit('not_helpful')}
        type="button"
        aria-label="Mark as not helpful"
        disabled={!!rating}
      >
        {rating === 'not_helpful' ? <ThumbDownIcon sx={{ fontSize: 13 }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 13 }} />}
      </button>
      {rating && <span className="feedback-thanks">Thanks!</span>}
    </div>
  );
}
