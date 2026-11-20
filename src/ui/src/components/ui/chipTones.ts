export const CHIP_TONES = [
  'info',
  'accent',
  'success',
  'danger',
  'neutral',
  'neutral-outlined',
  'warning',
] as const;
export type ChipTone = (typeof CHIP_TONES)[number];
