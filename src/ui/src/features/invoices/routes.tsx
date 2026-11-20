import type { FeatureModule } from '../../app/featureRegistry';

export const features: FeatureModule[] = [
  {
    id: 'invoices',
    routes: [{ path: 'invoices', load: () => import('./InvoicesPage') }],
    nav: [{ id: 'invoices', label: 'invoices.nav', path: 'invoices', order: 30, icon: 'fileText' }],
  },
];
