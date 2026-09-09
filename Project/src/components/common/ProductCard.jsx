import { useState } from 'react';
import { Box, Card, CardActionArea, Chip, IconButton, Stack, Typography } from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import { tokens } from '../../theme/theme';
import PriceDisplay from './PriceDisplay';
import Rating from './Rating';

const stockLabel = {
  in_stock: null,
  low_stock: 'Only a few left',
  out_of_stock: 'Out of stock',
};

/**
 * @param {{ product: import('../../data/products').products[number], onQuickAdd?: (id: string) => void }} props
 */
export default function ProductCard({ product, onQuickAdd }) {
  const [wishlisted, setWishlisted] = useState(false);
  const outOfStock = product.stock === 'out_of_stock';

  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px rgba(43,29,20,0.10)' },
      }}
    >
      <IconButton
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        onClick={() => setWishlisted((w) => !w)}
        size="small"
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 2,
          bgcolor: 'rgba(251,250,246,0.9)',
          '&:hover': { bgcolor: 'rgba(251,250,246,1)' },
        }}
      >
        {wishlisted ? (
          <FavoriteRoundedIcon fontSize="small" sx={{ color: tokens.rustPepper }} />
        ) : (
          <FavoriteBorderRoundedIcon fontSize="small" />
        )}
      </IconButton>

      <CardActionArea component="a" href={`/products/${product.slug}`} sx={{ display: 'block' }}>
        <Box
          sx={{
            aspectRatio: '4 / 5',
            bgcolor: tokens.mistySage,
            backgroundImage: `linear-gradient(160deg, ${tokens.mistySage} 0%, ${tokens.deepForest} 100%)`,
            display: 'flex',
            alignItems: 'flex-end',
            p: 1.5,
          }}
        >
          {product.tags?.includes('bestseller') && (
            <Chip
              label="Bestseller"
              size="small"
              sx={{ bgcolor: tokens.marigold, color: tokens.espressoBark, fontWeight: 600 }}
            />
          )}
        </Box>

        <Stack spacing={0.75} sx={{ p: 1.75 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {product.subcategory}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, lineHeight: 1.25 }}
          >
            {product.name}
          </Typography>
          <Rating value={product.rating} reviewCount={product.reviewCount} />
          <PriceDisplay price={product.price} mrp={product.mrp} size="sm" />
          {stockLabel[product.stock] && (
            <Typography variant="caption" sx={{ color: tokens.rustPepper, fontWeight: 600 }}>
              {stockLabel[product.stock]}
            </Typography>
          )}
        </Stack>
      </CardActionArea>

      <IconButton
        aria-label="Quick add to cart"
        disabled={outOfStock}
        onClick={() => onQuickAdd?.(product.id)}
        sx={{
          position: 'absolute',
          bottom: 14,
          right: 12,
          bgcolor: tokens.deepForest,
          color: tokens.ivory,
          '&:hover': { bgcolor: tokens.espressoBark },
          '&.Mui-disabled': { bgcolor: 'rgba(43,29,20,0.2)' },
        }}
        size="small"
      >
        <AddShoppingCartRoundedIcon fontSize="small" />
      </IconButton>
    </Card>
  );
}
