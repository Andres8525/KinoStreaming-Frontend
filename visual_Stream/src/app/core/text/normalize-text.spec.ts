import { normalizeText } from './normalize-text';

describe('normalizeText', () => {
  it('removes accents and letter case', () => {
    expect(normalizeText('ANIMACIÓN')).toBe('animacion');
    expect(normalizeText('Música')).toBe(normalizeText('musica'));
  });

  it('keeps the ñ base letter and trims spaces', () => {
    expect(normalizeText('  Año Nuevo ')).toBe('ano nuevo');
  });

  it('returns an empty string for blank input', () => {
    expect(normalizeText('   ')).toBe('');
  });
});
