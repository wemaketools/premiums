import type { FeatureModule } from '../../app/featureRegistry';

export const features: FeatureModule[] = [
  {
    id: 'receipt-detail',
    routes: [{ path: 'receipts/:receiptId', load: () => import('./ReceiptDetailPage') }],
  },
];
