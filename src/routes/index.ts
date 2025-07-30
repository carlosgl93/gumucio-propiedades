import { AdminPanelSettings, SettingsInputComponent } from '@mui/icons-material';
import HomeIcon from '@mui/icons-material/Home';

import asyncComponentLoader from '@/utils/loader';

import { Routes } from './types';

const routes: Routes = [
  {
    component: asyncComponentLoader(() => import('@/pages/Home')),
    path: '/',
    title: 'Gumucio Propiedades',
    icon: HomeIcon,
  },
  // {
  //   component: asyncComponentLoader(() => import('@/pages/Home2')),
  //   path: '/home',
  //   title: 'Gumucio Propiedades',
  //   icon: HomeIcon,
  // },
  {
    component: asyncComponentLoader(() => import('@/pages/AdminLoginPage')),
    path: '/admin/login',
    title: 'Admin Login',
    icon: SettingsInputComponent,
  },
  {
    component: asyncComponentLoader(() => import('@/pages/AdminDashboard')),
    path: '/admin/dashboard',
    title: 'Panel de Administración',
    icon: AdminPanelSettings,
  },
  {
    component: asyncComponentLoader(() => import('@/pages/Propiedades')),
    path: '/propiedades',
    title: 'Ventas y Arriendos',
    // icon: BugReportIcon,
  },
  {
    path: '/property/:id',
    component: asyncComponentLoader(() => import('@/pages/PropertyDetails')),
    title: 'Detalle Propiedad',
    // ...other props
  },
  {
    component: asyncComponentLoader(() => import('@/pages/NotFound')),
    path: '*',
  },
];

export default routes;
