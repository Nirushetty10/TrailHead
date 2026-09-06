import LightModeIcon from '@mui/icons-material/LightModeRounded';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';
import Tooltip from '@mui/material/Tooltip';
import './ThemeToggle.css';

export default function ThemeToggle({ themeName, onToggle }) {
  const isLight = themeName === 'light';

  return (
    <Tooltip title={isLight ? 'Switch to Forest (dark)' : 'Switch to Blue Sky (light)'}>
      <button className="theme-toggle" onClick={onToggle} type="button" aria-label="Toggle theme">
        {isLight ? (
          <DarkModeIcon sx={{ fontSize: 16 }} />
        ) : (
          <LightModeIcon sx={{ fontSize: 16 }} />
        )}
      </button>
    </Tooltip>
  );
}
