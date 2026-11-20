/** A persona is a view, never authentication; the API records it as the actor of a command. */
import { z } from 'zod';

export const PERSONA_IDS = ['cfo', 'credit-control', 'broker-rm', 'executive', 'demo-admin'] as const;
export const PersonaId = z.enum(PERSONA_IDS);
export type PersonaId = z.infer<typeof PersonaId>;

/** The Executive Viewer reads the dashboards and drilldowns and has no edit controls; every other persona acts. */
export const READ_ONLY_PERSONAS: readonly PersonaId[] = ['executive'];

export const canAct = (persona: PersonaId | null): boolean => persona !== null && !READ_ONLY_PERSONAS.includes(persona);

/** The fixture user each persona stands for: "assigned to me" and the default owner of a new action use it. */
export const PERSONA_USERS: Readonly<Record<PersonaId, string>> = {
  cfo: 'USR-CFO',
  'credit-control': 'USR-FIN',
  'broker-rm': 'USR-FIN',
  executive: 'USR-CFO',
  'demo-admin': 'USR-DEMO',
};
