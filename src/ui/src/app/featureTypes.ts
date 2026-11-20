/**
 * The feature module contract. Each `src/features/<feature>/routes.tsx` exports `features: FeatureModule[]`. Feature
 * code never edits a shared SPA file: the router mounts each module's routes and the sidebar builds itself from
 * `nav`.
 */
import type { ComponentType, ReactNode } from 'react';

import type { IconName } from '../components/ui/Icon';

export interface NavItem {
  /** Unique across all modules, for example `invoices.list`. */
  readonly id: string;
  /** i18n key of the label, for example `invoices.nav`. */
  readonly label: string;
  /** Path of the destination, for example `invoices`. */
  readonly path: string;
  /** Order in the sidebar (ascending). */
  readonly order: number;
  readonly icon: IconName;
  /** Active only on an exact path match (default: the path and everything below it). */
  readonly end?: boolean;
}

/** A page module loaded on demand: its default export is the page component. */
export type PageLoader = () => Promise<{ readonly default: ComponentType }>;

export interface FeatureRoute {
  /** Path in the shell (`invoices/:invoiceId`). */
  readonly path: string;
  /** Code-split page (preferred). */
  readonly load?: PageLoader;
  /** Eager element (small pages). Exactly one of `load` and `element` is required. */
  readonly element?: ReactNode;
}

export interface FeatureModule {
  /** Unique module id, usually the feature directory name. */
  readonly id: string;
  readonly routes: readonly FeatureRoute[];
  readonly nav?: readonly NavItem[];
}

/** The shape of a `routes.tsx` module. */
export interface FeatureRoutesModule {
  readonly features?: readonly FeatureModule[];
}
