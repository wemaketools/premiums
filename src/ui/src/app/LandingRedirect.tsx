/**
 * The element of `/`: the active persona's screen, or the first sidebar destination when that screen is not registered.
 */
import { Navigate } from 'react-router';

import { usePersona } from './hooks';
import { landingPathFor } from './landing';

export function LandingRedirect({ destinations }: { readonly destinations: readonly string[] }) {
  return <Navigate to={landingPathFor(usePersona(), destinations)} replace />;
}
