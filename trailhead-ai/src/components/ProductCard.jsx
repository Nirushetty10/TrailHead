import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorIcon from '@mui/icons-material/ErrorRounded';
import CheckroomIcon from '@mui/icons-material/CheckroomOutlined';
import AddIcon from '@mui/icons-material/AddRounded';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const isBestMatch = product.tag === 'Best match';
  const inStock = product.stock === 'in_stock';
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  return (
    <div className={`product-card ${isBestMatch ? 'product-card--highlight' : ''}`}>
      <div className="product-card__image">
        <CheckroomIcon sx={{ fontSize: 40, color: 'var(--muted-dim)' }} />
        <button className="product-card__add-btn" type="button" aria-label={`Add ${product.name} to cart`}>
          <AddIcon sx={{ fontSize: 16 }} />
        </button>
      </div>

      <div className="product-card__body">
        <div className="product-card__name">{product.name}</div>

        <div className="product-card__price-row">
          <span className="product-card__price">${product.price}</span>
          {hasDiscount && (
            <span className="product-card__original-price">${product.originalPrice}</span>
          )}
        </div>

        <div className={`product-card__stock ${inStock ? 'is-in-stock' : 'is-low-stock'}`}>
          {inStock ? (
            <CheckCircleIcon sx={{ fontSize: 12 }} />
          ) : (
            <ErrorIcon sx={{ fontSize: 12 }} />
          )}
          <span>{inStock ? 'In stock' : product.stockLabel || 'Low stock'}</span>
        </div>

        {product.variants && (
          <button className="product-card__variants-btn" type="button">
            More Variants
          </button>
        )}
      </div>
    </div>
  );
}
