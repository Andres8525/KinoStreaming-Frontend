import { normalizeText } from '../text/normalize-text';

export interface VideoCategory {
  name: string;
  aliases: string[];
  description: string;
}

export const ALL_CATEGORIES = 'Todo';

export const VIDEO_CATEGORIES: readonly VideoCategory[] = [
  {
    name: 'Cortometrajes',
    aliases: ['cortometraje', 'cortometrajes'],
    description: 'Aquí podrás encontrar cortometrajes de creadores independientes: historias breves, intensas y con mucha personalidad.'
  },
  {
    name: 'Documentales',
    aliases: ['documental', 'documentales'],
    description: 'Aquí podrás encontrar documentales que retratan personas, lugares y causas reales, contados por quienes los viven.'
  },
  {
    name: 'Animación',
    aliases: ['animación', 'animacion'],
    description: 'Aquí podrás encontrar animación 2D, 3D, stop motion y técnicas experimentales de artistas independientes.'
  },
  {
    name: 'Música',
    aliases: ['música', 'musica'],
    description: 'Aquí podrás encontrar conciertos, sesiones acústicas y presentaciones de músicos emergentes.'
  },
  {
    name: 'Videoclips',
    aliases: ['videoclip', 'videoclips'],
    description: 'Aquí podrás encontrar videoclips de bandas y artistas independientes.'
  },
  {
    name: 'Experimental',
    aliases: ['experimental'],
    description: 'Aquí podrás encontrar videoarte y propuestas que exploran nuevos lenguajes audiovisuales.'
  },
  {
    name: 'Tutoriales',
    aliases: ['tutorial', 'tutoriales'],
    description: 'Aquí podrás encontrar tutoriales de guion, rodaje, edición y sonido para crear tus propias historias.'
  }
];

export function findCategory(name: string): VideoCategory | undefined {
  return VIDEO_CATEGORIES.find(category => category.name === name);
}

export function matchesCategory(tags: readonly string[], categoryName: string): boolean {
  if (categoryName === ALL_CATEGORIES) {
    return true;
  }
  const aliases = (findCategory(categoryName)?.aliases ?? [categoryName]).map(normalizeText);
  return tags.some(tag => aliases.includes(normalizeText(tag)));
}
