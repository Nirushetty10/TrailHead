import { Box } from '@mui/material';
import { tokens } from '../../theme/theme';

/**
 * A single flowing line echoing the contour of the Baba Budangiri hills —
 * used in place of a plain hairline between sections. Deliberately
 * asymmetric and non-repeating so it never reads as a stock pattern.
 * @param {{ tone?: 'light' | 'dark', flip?: boolean }} props
 */
export default function ContourDivider({ tone = 'light', flip = false }) {
  const stroke = tone === 'dark' ? tokens.parchment : tokens.mistySage;
  return (
    <Box
      component="svg"
      viewBox="0 0 1200 60"
      preserveAspectRatio="none"
      sx={{
        display: 'block',
        width: '100%',
        height: { xs: 28, md: 44 },
        transform: flip ? 'scaleX(-1)' : 'none',
      }}
      aria-hidden="true"
    >
      <path
        d="M0 38 C 140 8, 260 52, 400 30 S 660 4, 820 34 S 1060 54, 1200 20"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeOpacity="0.55"
      />
    </Box>
  );
}
