import type { FeatureModule } from '../../app/featureRegistry';

export const features: FeatureModule[] = [
  {
    id: 'receipts',
    routes: [{ path: 'receipts', load: () => import('./ReceiptsPage') }],
    nav: [{ id: 'receipts', label: 'receipts.nav', path: 'receipts', order: 50, icon: 'receipt' }],
  },
];
