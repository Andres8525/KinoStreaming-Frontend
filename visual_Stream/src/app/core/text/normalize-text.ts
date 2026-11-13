/**
 * Lower-cases a value and removes accents so searches and tag comparisons
 * treat "Animación", "animacion" and "ANIMACIÓN" as the same text.
 */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}
