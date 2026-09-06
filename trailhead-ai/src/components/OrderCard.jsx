import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import './OrderCard.css';

const STATUS_LABELS = {
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  processing: 'Processing',
  shipped: 'Shipped',
};

export default function OrderCard({ order }) {
  const { id, status, estimatedDelivery, deliveredAt, breakdown } = order;
  const isDelivered = status === 'delivered';

  return (
    <div className="order-card">
      <div className="order-card__top">
        <div className="order-card__id">Order {id}</div>
        <div className={`order-card__status ${isDelivered ? 'is-delivered' : 'is-transit'}`}>
          {isDelivered ? (
            <CheckCircleIcon sx={{ fontSize: 13 }} />
          ) : (
            <LocalShippingIcon sx={{ fontSize: 13 }} />
          )}
          <span>{STATUS_LABELS[status] || status}</span>
        </div>
      </div>

      {!isDelivered && estimatedDelivery && (
        <div className="order-card__eta">
          Arriving {new Date(estimatedDelivery).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      )}
      {isDelivered && deliveredAt && (
        <div className="order-card__eta">Delivered {deliveredAt}</div>
      )}

      {breakdown && (
        <div className="order-card__breakdown">
          <Row label="Subtotal" value={breakdown.subtotal} />
          <Row label="Tax" value={breakdown.tax} />
          <Row label="Shipping" value={breakdown.shipping === 0 ? 'Free' : breakdown.shipping} />
          {breakdown.discount > 0 && <Row label="Discount" value={-breakdown.discount} />}
          <Row label="Total" value={breakdown.total} bold />
        </div>
      )}

      <div className="order-card__meta">from your order system</div>
    </div>
  );
}

function Row({ label, value, bold }) {
  const display = typeof value === 'number' ? `$${value.toFixed(2)}` : value;
  return (
    <div className={`order-card__row ${bold ? 'is-bold' : ''}`}>
      <span>{label}</span>
      <span>{display}</span>
    </div>
  );
}
