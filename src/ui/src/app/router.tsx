/**
 * The route tree, built from the feature registry:
 *
 * - `/` goes to the active persona's screen (`landingPathFor`), or to the first sidebar destination when that screen
 *   is not registered; with no destination at all the router cannot be built. A signed-out visitor is sent to
 *   `/signin` from `/`, so the screen is chosen after sign-in, with the persona the sign-in set.
 * - `/signin`: the role sign-in, outside any shell.
 * - Every feature route: signed in, inside AppShell.
 * - Anything else: Not found.
 * - A route that fails to load or throws renders RouteErrorPage: inside the shell for feature routes (the navigation
 *   stays usable), standalone otherwise.
 */
import { Suspense, lazy } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';

import { SignInPage } from '../auth/SignInPage';
import { AppShell } from '../components/shell/AppShell';
import { SkeletonBlock } from '../components/ui/Skeleton';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { RootLayout } from './RootLayout';
import { RouteGuard } from './RouteGuard';
import { LANDING_ROUTE } from './landing';
import { LandingRedirect } from './LandingRedirect';
import { destinationsOf, features as registeredFeatures } from './featureRegistry';
import type { FeatureModule, FeatureRoute } from './featureRegistry';

const lazyComponents = new WeakMap<FeatureRoute, ComponentType>();

function routeElement(route: FeatureRoute): ReactNode {
  if (route.element !== undefined) {
    return route.element;
  }
  let Component = lazyComponents.get(route);
  if (Component === undefined && route.load !== undefined) {
    Component = lazy(route.load);
    lazyComponents.set(route, Component);
  }
  if (Component === undefined) {
    return null;
  }
  return (
    <Suspense fallback={<SkeletonBlock lines={6} />}>
      <Component />
    </Suspense>
  );
}

function featureRoutes(modules: readonly FeatureModule[]): RouteObject[] {
  return modules.flatMap((module) =>
    module.routes.map((route) => ({ path: route.path, element: routeElement(route) })),
  );
}

/** The route objects for a set of feature modules (exported for tests). */
export function buildRoutes(modules: readonly FeatureModule[]): RouteObject[] {
  const destinations = destinationsOf(modules);
  if (destinations.length === 0) {
    throw new Error(
      'No navigation destination is registered: add a features/<feature>/routes.tsx with a nav item.',
    );
  }
  return [
    {
      element: <RootLayout />,
      errorElement: <RouteErrorPage />,
      children: [
        {
          path: LANDING_ROUTE,
          element: (
            <RouteGuard>
              <LandingRedirect destinations={destinations} />
            </RouteGuard>
          ),
        },
        { path: '/signin', element: <SignInPage /> },
        {
          element: (
            <RouteGuard>
              <AppShell modules={modules} />
            </RouteGuard>
          ),
          errorElement: <RouteErrorPage inShell />,
          children: [...featureRoutes(modules), { path: '*', element: <NotFoundPage inShell /> }],
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ];
}

export function createAppRouter(modules: readonly FeatureModule[] = registeredFeatures) {
  return createBrowserRouter(buildRoutes(modules));
}
