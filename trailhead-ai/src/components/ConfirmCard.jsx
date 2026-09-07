import { useState } from 'react';
import CheckIcon from '@mui/icons-material/CheckRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { socket } from '../services/socket.js';
import './ConfirmCard.css';

export default function ConfirmCard({ action }) {
  const [resolved, setResolved] = useState(null); // null | 'confirmed' | 'cancelled'

  function respond(confirmed) {
    setResolved(confirmed ? 'confirmed' : 'cancelled');
    socket.emit('chat:confirm_action', { actionId: action.actionId, confirmed });
  }

  if (resolved) {
    return (
      <div className="confirm-card confirm-card--resolved">
        {resolved === 'confirmed' ? 'Confirmed — processing…' : 'Cancelled'}
      </div>
    );
  }

  return (
    <div className="confirm-card">
      <div className="confirm-card__title">{action.title}</div>
      {action.description && <div className="confirm-card__desc">{action.description}</div>}
      <div className="confirm-card__actions">
        <button className="confirm-card__btn confirm-card__btn--confirm" onClick={() => respond(true)} type="button">
          <CheckIcon sx={{ fontSize: 14 }} /> Confirm
        </button>
        <button className="confirm-card__btn confirm-card__btn--cancel" onClick={() => respond(false)} type="button">
          <CloseIcon sx={{ fontSize: 14 }} /> Cancel
        </button>
      </div>
    </div>
  );
}
