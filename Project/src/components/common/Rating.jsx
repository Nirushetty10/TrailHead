import { Stack, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { tokens } from '../../theme/theme';

/**
 * @param {{ value: number, reviewCount?: number, size?: number }} props
 */
export default function Rating({ value, reviewCount, size = 16 }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <StarRoundedIcon sx={{ fontSize: size, color: tokens.marigold }} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value.toFixed(1)}
      </Typography>
      {typeof reviewCount === 'number' && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          ({reviewCount})
        </Typography>
      )}
    </Stack>
  );
}
