/**
 * Feature auto-registration: every `src/features/<feature>/routes.tsx` is collected with
 * `import.meta.glob(..., { eager: true })`. Nothing else in the shell names a feature.
 *
 * Validation is defensive: a malformed module is reported with `console.error` and skipped, and duplicate module
 * ids, nav ids or route paths are dropped (first one wins), so one broken feature cannot take down the shell.
 */
import type { FeatureModule, FeatureRoutesModule, NavItem } from './featureTypes';

export * from './featureTypes';

/** Validates and flattens the modules of the given `routes.tsx` files. */
export function collectFeatures(
  modules: Readonly<Record<string, FeatureRoutesModule>>,
): FeatureModule[] {
  const collected: FeatureModule[] = [];
  const moduleIds = new Set<string>();
  const navIds = new Set<string>();
  const routePaths = new Set<string>();

  for (const [file, module] of Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))) {
    const list = module.features;
    if (!Array.isArray(list)) {
      console.error(`featureRegistry: ${file} must export "features: FeatureModule[]".`);
      continue;
    }
    for (const feature of list as readonly FeatureModule[]) {
      if (moduleIds.has(feature.id)) {
        console.error(`featureRegistry: duplicate feature module id "${feature.id}" in ${file}.`);
        continue;
      }
      moduleIds.add(feature.id);
      const routes = feature.routes.filter((route) => {
        if ((route.load === undefined) === (route.element === undefined)) {
          console.error(
            `featureRegistry: route "${route.path}" of "${feature.id}" needs exactly one of load and element.`,
          );
          return false;
        }
        if (routePaths.has(route.path)) {
          console.error(`featureRegistry: duplicate route "${route.path}" in "${feature.id}".`);
          return false;
        }
        routePaths.add(route.path);
        return true;
      });
      const nav = (feature.nav ?? []).filter((item) => {
        if (navIds.has(item.id)) {
          console.error(`featureRegistry: duplicate nav item id "${item.id}" in "${feature.id}".`);
          return false;
        }
        navIds.add(item.id);
        return true;
      });
      collected.push({ ...feature, routes, nav });
    }
  }
  return collected;
}

const routeModules = import.meta.glob<FeatureRoutesModule>('../features/*/routes.tsx', {
  eager: true,
});

/** Every registered feature module. */
export const features: readonly FeatureModule[] = collectFeatures(routeModules);

export interface ResolvedNavItem extends NavItem {
  /** The absolute path the link goes to. */
  readonly to: string;
}

/** The absolute path of a nav item or route: `appPath('invoices')` → `/invoices`. */
export function appPath(relative: string): string {
  return `/${relative.replace(/^\/+/, '')}`;
}

/** The sidebar: every nav item of every module, in order. */
export function navItemsFor(modules: readonly FeatureModule[]): ResolvedNavItem[] {
  return modules
    .flatMap((module) => module.nav ?? [])
    .map((item) => ({ ...item, to: appPath(item.path) }))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function destinationsOf(modules: readonly FeatureModule[]): string[] {
  return navItemsFor(modules).map((item) => item.to);
}
