import type { FeatureModule } from '../../app/featureRegistry';

export const features: FeatureModule[] = [
  {
    id: 'invoice-detail',
    routes: [{ path: 'invoices/:invoiceId', load: () => import('./InvoiceDetailPage') }],
  },
];
