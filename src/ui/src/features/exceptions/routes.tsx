import type { FeatureModule } from '../../app/featureRegistry';

export const features: FeatureModule[] = [
  {
    id: 'exceptions',
    routes: [{ path: 'exceptions', load: () => import('./ExceptionsPage') }],
    nav: [
      {
        id: 'exceptions',
        label: 'exceptions.nav',
        path: 'exceptions',
        order: 40,
        icon: 'alertTriangle',
      },
    ],
  },
];
