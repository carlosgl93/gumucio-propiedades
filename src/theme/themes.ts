import { ThemeOptions } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';

import { ThemeMode } from './types';

const sharedTheme = {
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiDivider: {
      styleOverrides: {
        vertical: {
          marginRight: 10,
          marginLeft: 10,
        },
      },
    },
  },
};

// to explore all the options, check out https://mui.com/material-ui/customization/default-theme/
const themes: Record<ThemeMode, ThemeOptions> = {
  light: deepmerge(sharedTheme, {
    palette: {
      mode: 'light',
      background: {
        default: '#fafafa',
        paper: '#f7f6f1',
      },
      text: {
        primary: '#4e4d41',
        secondary: '#6c6b5f',
      },
    },
  }),

  dark: deepmerge(sharedTheme, {
    palette: {
      mode: 'light',
      background: {
        default: '#fafafa',
        paper: '#f7f6f1',
      },
      text: {
        primary: '#4e4d41',
        secondary: '#6c6b5f',
      },
    },
  }),
};

export default themes;
