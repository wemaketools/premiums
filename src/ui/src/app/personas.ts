/**
 * The personas of the persona switch. The switch is a view convenience for the demo, never authentication: it
 * changes what the shell shows as the active persona and nothing else, and the API records the persona as the actor
 * of a command (the Executive Viewer may only read).
 */
import { PERSONA_IDS, PersonaId } from '../../../contracts/index';

export { PERSONA_IDS };
export type { PersonaId };

export const DEFAULT_PERSONA: PersonaId = 'cfo';

/** The screen each persona opens on, at sign-in and when the persona is switched. A deep link wins over it. */
export const PERSONA_LANDING: Readonly<Record<PersonaId, string>> = {
  cfo: '/overview',
  'credit-control': '/actions',
  'broker-rm': '/aging',
  executive: '/digest',
  'demo-admin': '/overview',
};

export function isPersonaId(value: unknown): value is PersonaId {
  return PersonaId.safeParse(value).success;
}
