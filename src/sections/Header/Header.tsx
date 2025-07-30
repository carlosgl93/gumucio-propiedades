import { useLocation, useNavigate } from 'react-router';

import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Button, IconButton, Stack, Toolbar } from '@mui/material';

import { title } from '@/config';
import { useSidebar } from '@/sections/Sidebar/hooks';
import { useThemeMode } from '@/theme';

function Header() {
  const { themeMode } = useThemeMode();
  const { open: openSidebar } = useSidebar();

  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  if (isHomePage) {
    return null;
  }

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={2}
      data-pw={`theme-${themeMode}`}
      enableColorOnDark
    >
      <Toolbar>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flex={1}>
          <Stack direction="row" gap={1} alignItems="center">
            <IconButton
              size="large"
              edge="start"
              // color="primary"
              sx={{
                color: '#4e4d41',
              }}
              aria-label="menu"
              onClick={openSidebar}
            >
              <MenuIcon />
            </IconButton>
            <Button
              onClick={() => navigate('/')}
              sx={{
                color: '#4e4d41',
                bgcolor: '#fafafa',
              }}
            >
              {title}
            </Button>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
