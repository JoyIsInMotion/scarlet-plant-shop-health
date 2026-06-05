/**
 * Re-export of the shared plant category definitions.
 * Canonical source lives in src/lib/plants/categories.ts so the catalog UI can
 * import it via the `@/` alias; seed scripts import it from here.
 */
export {
  PLANT_CATEGORIES,
  PLANT_CATEGORY_VALUES,
  GENUS_TO_CATEGORY,
  getCategoryForSpecies,
  type PlantCategory,
} from '../lib/plants/categories';
