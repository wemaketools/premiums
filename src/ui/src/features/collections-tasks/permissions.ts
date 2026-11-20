import { canAct } from '../../../../contracts/index';
import { usePersona } from '../../app/hooks';

/** Whether the active persona may change anything: the Executive Viewer has no edit controls. */
export function useCanAct(): boolean {
  return canAct(usePersona());
}
