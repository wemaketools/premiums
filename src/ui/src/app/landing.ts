/**
 * Where a persona starts. `landingPathFor` is the one reader of `PERSONA_LANDING`: sign-in opens `/`
 * (`LandingRedirect`) and the persona switch navigates to the path it returns, so neither picks a screen itself.
 */
import { PERSONA_LANDING } from './personas';
import type { PersonaId } from './personas';

/** The path whose element is `LandingRedirect`. */
export const LANDING_ROUTE = '/';

/** The persona's screen, or the first destination when that screen is not registered. */
export function landingPathFor(persona: PersonaId, destinations: readonly string[]): string {
  const landing = PERSONA_LANDING[persona];
  return destinations.includes(landing) ? landing : (destinations[0] ?? LANDING_ROUTE);
}
