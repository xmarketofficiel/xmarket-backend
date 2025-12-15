export interface ServiceCategoryConfig {
  name: string;
  icon: string;
  backgroundImage: string;
  type: 'time-based' | 'ongoing' | 'both';
  displayOrder: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export const SERVICE_CATEGORIES: ServiceCategoryConfig[] = [
  {
    name: 'Covoiturage',
    icon: '🚗',
    backgroundImage: `${BACKEND_URL}/images/categories/covoiturage.jpg`,
    type: 'time-based',
    displayOrder: 1,
  },
  {
    name: 'Laundry',
    icon: '👔',
    backgroundImage: `${BACKEND_URL}/images/categories/laundry.jpg`,
    type: 'ongoing',
    displayOrder: 2,
  },
  {
    name: 'Taxi',
    icon: '🚕',
    backgroundImage: `${BACKEND_URL}/images/categories/taxi.jpg`,
    type: 'time-based',
    displayOrder: 3,
  },
];

export function getCategorySlug(name: string): string {
  return slugify(name);
}

export function getCategoryBySlug(slug: string): ServiceCategoryConfig | undefined {
  return SERVICE_CATEGORIES.find(cat => getCategorySlug(cat.name) === slug);
}

export function getCategoryByName(name: string): ServiceCategoryConfig | undefined {
  return SERVICE_CATEGORIES.find(cat => cat.name.toLowerCase() === name.toLowerCase());
}
