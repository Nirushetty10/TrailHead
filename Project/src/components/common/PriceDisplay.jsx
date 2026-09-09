import { Stack, Typography } from '@mui/material';
import { tokens } from '../../theme/theme';

/**
 * @param {{ price: number, mrp?: number, size?: 'sm' | 'md' }} props
 */
export default function PriceDisplay({ price, mrp, size = 'md' }) {
  const hasDiscount = mrp && mrp > price;
  const discountPct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const priceVariant = size === 'sm' ? 'subtitle1' : 'h6';

  return (
    <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap">
      <Typography variant={priceVariant} sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600 }}>
        ₹{price.toLocaleString('en-IN')}
      </Typography>
      {hasDiscount && (
        <>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', textDecoration: 'line-through' }}
          >
            ₹{mrp.toLocaleString('en-IN')}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.rustPepper, fontWeight: 600 }}>
            {discountPct}% off
          </Typography>
        </>
      )}
    </Stack>
  );
}
