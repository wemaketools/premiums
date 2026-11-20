import type { PersonaId } from '../app/personas';

/** The display name of the fixture user each role signs in as (the fixtures' "<Name> Demo" users; none has an e-mail). */
export const PROTOTYPE_USER_NAMES: Readonly<Record<PersonaId, string>> = {
  cfo: 'Executive Demo',
  'credit-control': 'Tiro Demo',
  'broker-rm': 'Tiro Demo',
  executive: 'Executive Demo',
  'demo-admin': 'Builder Demo',
};
