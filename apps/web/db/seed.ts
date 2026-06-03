import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/db/schema';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

type SpeciesRow = {
  scientificName: string;
  commonNameEn: string | null;
  imageUrl: string | null;
  careDifficulty: 'easy' | 'moderate' | 'difficult';
  wateringIntervalDays: number;
  fertilizingIntervalDays: number;
  repottingIntervalMonths: number;
  mistingNeeded: boolean;
};

// Declare BUILTIN_SPECIES first so the catch block can reference it
const BUILTIN_SPECIES: SpeciesRow[] = [
  { scientificName: 'Sansevieria trifasciata', commonNameEn: 'Snake Plant',        imageUrl: null, careDifficulty: 'easy',      wateringIntervalDays: 14, fertilizingIntervalDays: 30, repottingIntervalMonths: 24, mistingNeeded: false },
  { scientificName: 'Epipremnum aureum',       commonNameEn: 'Golden Pothos',      imageUrl: null, careDifficulty: 'easy',      wateringIntervalDays: 14, fertilizingIntervalDays: 30, repottingIntervalMonths: 24, mistingNeeded: false },
  { scientificName: 'Monstera deliciosa',      commonNameEn: 'Swiss Cheese Plant', imageUrl: null, careDifficulty: 'moderate',  wateringIntervalDays: 7,  fertilizingIntervalDays: 14, repottingIntervalMonths: 18, mistingNeeded: false },
  { scientificName: 'Ficus lyrata',            commonNameEn: 'Fiddle-Leaf Fig',    imageUrl: null, careDifficulty: 'moderate',  wateringIntervalDays: 7,  fertilizingIntervalDays: 14, repottingIntervalMonths: 18, mistingNeeded: false },
  { scientificName: 'Phalaenopsis amabilis',   commonNameEn: 'Moth Orchid',        imageUrl: null, careDifficulty: 'difficult', wateringIntervalDays: 4,  fertilizingIntervalDays: 7,  repottingIntervalMonths: 12, mistingNeeded: true  },
];

// Try to import real species data, fall back to built-in
let SPECIES_DATA: SpeciesRow[];

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SPECIES_DATA = require('./species-data').SPECIES_DATA;
  console.log(`📦 Loaded ${SPECIES_DATA.length} species from species-data.ts`);
} catch {
  SPECIES_DATA = BUILTIN_SPECIES;
  console.log('📦 species-data.ts not found — using built-in species');
}

faker.seed(42);

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ── helpers ──────────────────────────────────────────────────────────────────

async function chunkInsert<T extends Record<string, unknown>>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  size = 500,
) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size) as T[]);
  }
}

function careGuide(d: 'easy' | 'moderate' | 'difficult') {
  const g = {
    easy: {
      watering:    { en: 'Water every 1–2 weeks; let soil dry completely between waterings.', bg: 'Поливайте на 1–2 седмици; оставете почвата да изсъхне напълно между поливанията.' },
      light:       { en: 'Tolerates low to bright indirect light.', bg: 'Понася слаба до ярка непряка светлина.' },
      humidity:    { en: 'Adapts to normal household humidity (30–50%).', bg: 'Адаптира се към нормалната домашна влажност (30–50%).' },
      temperature: { en: 'Ideal 15–30 °C; avoid frost.', bg: 'Идеална 15–30 °C; избягвайте замръзване.' },
      fertilizer:  { en: 'Fertilize monthly during spring and summer.', bg: 'Торете месечно през пролетта и лятото.' },
    },
    moderate: {
      watering:    { en: 'Water when the top inch of soil is dry; avoid overwatering.', bg: 'Поливайте когато горният сантиметър почва изсъхне; избягвайте прекомерно поливане.' },
      light:       { en: 'Prefers bright indirect light; avoid direct midday sun.', bg: 'Предпочита ярка непряка светлина; избягвайте пряко пладнешко слънце.' },
      humidity:    { en: 'Benefits from moderate to high humidity (40–60%).', bg: 'Полза от умерена до висока влажност (40–60%).' },
      temperature: { en: 'Ideal 18–27 °C; protect from cold drafts.', bg: 'Идеална 18–27 °C; пазете от студени течения.' },
      fertilizer:  { en: 'Fertilize every 2–4 weeks during growing season.', bg: 'Торете на 2–4 седмици по време на вегетационния сезон.' },
    },
    difficult: {
      watering:    { en: 'Careful watering required; allow top third of soil to dry between waterings.', bg: 'Необходимо е внимателно поливане; оставете горната трета на почвата да изсъхне между поливанията.' },
      light:       { en: 'Requires specific light; usually bright indirect or filtered light.', bg: 'Изисква специфична светлина; обикновено ярка непряка или филтрирана.' },
      humidity:    { en: 'Requires high humidity 60–80%; use a humidifier or pebble tray.', bg: 'Изисква висока влажност 60–80%; използвайте овлажнител или тавичка с камъчета.' },
      temperature: { en: 'Sensitive to fluctuations; maintain 20–28 °C consistently.', bg: 'Чувствителна към колебания; поддържайте постоянно 20–28 °C.' },
      fertilizer:  { en: 'Use half-strength fertilizer weekly during active growth.', bg: 'Използвайте половин доза тор седмично по време на активен растеж.' },
    },
  };
  return g[d];
}

const CARE_INTERVALS = {
  easy:      { wateringIntervalDays: 14, fertilizingIntervalDays: 30, repottingIntervalMonths: 24, mistingNeeded: false },
  moderate:  { wateringIntervalDays: 7,  fertilizingIntervalDays: 14, repottingIntervalMonths: 18, mistingNeeded: false },
  difficult: { wateringIntervalDays: 4,  fertilizingIntervalDays: 7,  repottingIntervalMonths: 12, mistingNeeded: true  },
};

// ── product generation ───────────────────────────────────────────────────────

const FLOWER_TYPES = ['Rose', 'Tulip', 'Lily', 'Sunflower', 'Gerbera', 'Carnation', 'Orchid', 'Peony', 'Iris', 'Lavender', 'Dahlia', 'Chrysanthemum'];
const FLOWER_BG    = ['Роза', 'Лале', 'Лилия', 'Слънчоглед', 'Гербера', 'Карамфил', 'Орхидея', 'Божур', 'Перуника', 'Лавандула', 'Далия', 'Хризантема'];
const COLORS_EN    = ['Red', 'Pink', 'White', 'Yellow', 'Purple', 'Orange', 'Mixed'];
const COLORS_BG    = ['Червен', 'Розов', 'Бял', 'Жълт', 'Лилав', 'Оранжев', 'Смесен'];
const STEMS        = [7, 11, 15, 21, 31, 51];
const BOUQUET_VARIANTS_EN = ['Classic', 'Premium', 'Luxury', 'Wrapped', 'With Greenery'];
const BOUQUET_VARIANTS_BG = ['Класик', 'Премиум', 'Луксозен', 'Увит', 'С Зеленина'];

const POTTED_SPECIES_EN = [
  'Monstera', 'Peace Lily', 'ZZ Plant', 'Pothos', 'Snake Plant', 'Rubber Plant',
  'Fiddle-Leaf Fig', 'Chinese Evergreen', 'Dragon Tree', 'Parlor Palm',
  'Spider Plant', 'Philodendron', 'Anthurium', 'Calathea', 'Bird of Paradise',
  'Areca Palm', 'Corn Plant', 'Cast Iron Plant', 'Money Tree', 'Ponytail Palm',
];
const POTTED_SPECIES_BG = [
  'Монстера', 'Спатифилум', 'Замиокулкас', 'Потос', 'Сансевиерия', 'Гумено растение',
  'Фикус Лирата', 'Аглаонема', 'Дракон Дърво', 'Салонна Палма',
  'Паякова Трева', 'Филодендрон', 'Антуриум', 'Калатея', 'Птица на Рая',
  'Арека Палма', 'Царевично Растение', 'Аспидистра', 'Парично Дърво', 'Конска Опашка',
];
const POT_SIZES_EN = ['Mini', 'Small', 'Medium', 'Large'];
const POT_SIZES_BG = ['Мини', 'Малък', 'Среден', 'Голям'];
const POT_TYPES_EN = ['Ceramic', 'Terracotta', 'Wicker'];
const POT_TYPES_BG = ['Керамичен', 'Теракота', 'Плетен'];

const SUCCULENT_SPECIES_EN = [
  'Echeveria', 'Jade Plant', 'Aloe Vera', 'Haworthia', "Burro's Tail", 'Crassula',
  'Sedum', 'Gasteria', 'Agave', 'Sempervivum', 'Kalanchoe', 'Lithops',
  'Aeonium', 'Dudleya', 'Graptoveria',
];
const SUCCULENT_SPECIES_BG = [
  'Ехеверия', 'Нефритено дърво', 'Алое вера', 'Хауортия', 'Магарешка опашка', 'Красула',
  'Седум', 'Гастерия', 'Агаве', 'Семпервивум', 'Каланхое', 'Литопс',
  'Аеониум', 'Дудлея', 'Грапотоверия',
];
const CONTAINER_STYLES_EN = ['Terracotta Pot', 'Glass Bowl', 'Wooden Box'];
const CONTAINER_STYLES_BG = ['Теракотена Саксия', 'Стъклена Купа', 'Дървена Кутия'];
const SUCCULENT_SIZES_EN = ['Mini', 'Small', 'Medium', 'Large', 'XL'];
const SUCCULENT_SIZES_BG = ['Мини', 'Малък', 'Среден', 'Голям', 'XL'];

const TROPICAL_SPECIES_EN = ['Monstera Adansonii', 'Bird of Paradise', 'Areca Palm', 'Aglaonema', 'Alocasia', 'Heliconia', 'Croton', 'Bromeliaceae', 'Cordyline', 'Schefflera'];
const TROPICAL_SPECIES_BG = ['Монстера Адансони', 'Птица на рая', 'Арека Палма', 'Аглаонема', 'Алоказия', 'Хеликония', 'Кротон', 'Бромелия', 'Кордилина', 'Шефлера'];
const TROPICAL_VARIANTS_EN = ['Standard', 'Premium', 'XL', 'Statement Piece'];
const TROPICAL_VARIANTS_BG = ['Стандарт', 'Премиум', 'XL', 'Акцент'];

const HOLIDAYS_EN = ['Christmas', 'Easter', 'Spring', "Valentine's Day", "Mother's Day"];
const HOLIDAYS_BG = ['Коледа', 'Великден', 'Пролет', 'Свети Валентин', 'Ден на майката'];
const SEASONAL_ITEMS_EN = ['Poinsettia', 'Hyacinth', 'Tulip', 'Wreath', 'Arrangement', 'Centerpiece', 'Gift Basket', 'Candle Set', 'Pot', 'Bouquet'];
const SEASONAL_ITEMS_BG  = ['Коледна звезда', 'Зюмбюл', 'Лале', 'Венец', 'Аранжировка', 'Централен детайл', 'Подаръчна кошница', 'Свещи', 'Саксия', 'Букет'];

const ACCESSORY_TYPES_EN = ['Plant Pot', 'Soil Mix', 'Liquid Fertilizer', 'Watering Can', 'Plant Label', 'Pebble Tray', 'Spray Bottle', 'Pruning Shears', 'Hanging Planter', 'Pot Saucer'];
const ACCESSORY_TYPES_BG = ['Саксия', 'Почвена смес', 'Течен тор', 'Лейка', 'Табелка за растение', 'Тавичка с камъчета', 'Спрей бутилка', 'Ножица за подрязване', 'Окачваща кашпа', 'Чиния за саксия'];
const ACCESSORY_SIZES_EN = ['Small', 'Medium', 'Large', 'Set of 3', 'Professional'];
const ACCESSORY_SIZES_BG = ['Малък', 'Среден', 'Голям', 'Комплект от 3', 'Професионален'];

function pad(n: number, len = 4) {
  return String(n).padStart(len, '0');
}

function generateProducts(): Array<{
  nameBg: string; nameEn: string;
  descriptionBg: string; descriptionEn: string;
  slug: string; price: string; category: typeof schema.productCategoryEnum.enumValues[number]; stock: number;
}> {
  const products = [];
  let idx = 0;

  // Bouquets — 2,000
  for (let i = 0; i < 2000; i++) {
    const fi = i % FLOWER_TYPES.length;
    const ci = Math.floor(i / FLOWER_TYPES.length) % COLORS_EN.length;
    const si = Math.floor(i / (FLOWER_TYPES.length * COLORS_EN.length)) % STEMS.length;
    const vi = Math.floor(i / (FLOWER_TYPES.length * COLORS_EN.length * STEMS.length)) % BOUQUET_VARIANTS_EN.length;
    const stems = STEMS[si];
    const nameEn = `${COLORS_EN[ci]} ${FLOWER_TYPES[fi]} Bouquet – ${stems} Stems (${BOUQUET_VARIANTS_EN[vi]})`;
    const nameBg = `${COLORS_BG[ci]} букет ${FLOWER_BG[fi]} – ${stems} стъбла (${BOUQUET_VARIANTS_BG[vi]})`;
    products.push({
      nameBg, nameEn,
      descriptionEn: `Beautiful ${COLORS_EN[ci].toLowerCase()} ${FLOWER_TYPES[fi].toLowerCase()} bouquet with ${stems} stems, ${BOUQUET_VARIANTS_EN[vi].toLowerCase()} finish.`,
      descriptionBg: `Красив ${COLORS_BG[ci].toLowerCase()} букет от ${FLOWER_BG[fi].toLowerCase()} с ${stems} стъбла, ${BOUQUET_VARIANTS_BG[vi].toLowerCase()} изпълнение.`,
      slug: `bouquet-${pad(++idx)}`,
      price: faker.number.float({ min: 12.99, max: 89.99, fractionDigits: 2 }).toFixed(2),
      category: 'bouquet' as const,
      stock: faker.number.int({ min: 0, max: 80 }),
    });
  }

  // Potted plants — 1,500
  for (let i = 0; i < 1500; i++) {
    const si = i % POTTED_SPECIES_EN.length;
    const szi = Math.floor(i / POTTED_SPECIES_EN.length) % POT_SIZES_EN.length;
    const ti = Math.floor(i / (POTTED_SPECIES_EN.length * POT_SIZES_EN.length)) % POT_TYPES_EN.length;
    const nameEn = `${POTTED_SPECIES_EN[si]} – ${POT_SIZES_EN[szi]} ${POT_TYPES_EN[ti]} Pot`;
    const nameBg = `${POTTED_SPECIES_BG[si]} – ${POT_SIZES_BG[szi]} ${POT_TYPES_BG[ti]} Саксия`;
    products.push({
      nameBg, nameEn,
      descriptionEn: `${POTTED_SPECIES_EN[si]} in a ${POT_SIZES_EN[szi].toLowerCase()} ${POT_TYPES_EN[ti].toLowerCase()} pot. Perfect for home or office.`,
      descriptionBg: `${POTTED_SPECIES_BG[si]} в ${POT_SIZES_BG[szi].toLowerCase()} ${POT_TYPES_BG[ti].toLowerCase()} саксия. Идеален за дома или офиса.`,
      slug: `potted-${pad(++idx)}`,
      price: faker.number.float({ min: 9.99, max: 99.99, fractionDigits: 2 }).toFixed(2),
      category: 'potted_plant' as const,
      stock: faker.number.int({ min: 0, max: 50 }),
    });
  }

  // Succulents — 800
  for (let i = 0; i < 800; i++) {
    const si = i % SUCCULENT_SPECIES_EN.length;
    const szi = Math.floor(i / SUCCULENT_SPECIES_EN.length) % SUCCULENT_SIZES_EN.length;
    const ci = Math.floor(i / (SUCCULENT_SPECIES_EN.length * SUCCULENT_SIZES_EN.length)) % CONTAINER_STYLES_EN.length;
    const nameEn = `${SUCCULENT_SPECIES_EN[si]} Succulent – ${SUCCULENT_SIZES_EN[szi]} ${CONTAINER_STYLES_EN[ci]}`;
    const nameBg = `${SUCCULENT_SPECIES_BG[si]} Сукулент – ${SUCCULENT_SIZES_BG[szi]} ${CONTAINER_STYLES_BG[ci]}`;
    products.push({
      nameBg, nameEn,
      descriptionEn: `${SUCCULENT_SPECIES_EN[si]} in a ${SUCCULENT_SIZES_EN[szi].toLowerCase()} ${CONTAINER_STYLES_EN[ci].toLowerCase()}. Low maintenance and beautiful.`,
      descriptionBg: `${SUCCULENT_SPECIES_BG[si]} в ${SUCCULENT_SIZES_BG[szi].toLowerCase()} ${CONTAINER_STYLES_BG[ci].toLowerCase()}. Лесно за поддържане и красиво.`,
      slug: `succulent-${pad(++idx)}`,
      price: faker.number.float({ min: 8.99, max: 49.99, fractionDigits: 2 }).toFixed(2),
      category: 'succulent' as const,
      stock: faker.number.int({ min: 0, max: 80 }),
    });
  }

  // Tropicals — 600
  for (let i = 0; i < 600; i++) {
    const si = i % TROPICAL_SPECIES_EN.length;
    const vi = Math.floor(i / TROPICAL_SPECIES_EN.length) % TROPICAL_VARIANTS_EN.length;
    const nameEn = `${TROPICAL_SPECIES_EN[si]} – ${TROPICAL_VARIANTS_EN[vi]}`;
    const nameBg = `${TROPICAL_SPECIES_BG[si]} – ${TROPICAL_VARIANTS_BG[vi]}`;
    products.push({
      nameBg, nameEn,
      descriptionEn: `Exotic ${TROPICAL_SPECIES_EN[si].toLowerCase()}, ${TROPICAL_VARIANTS_EN[vi].toLowerCase()} size. Brings a tropical feel to any space.`,
      descriptionBg: `Екзотичен ${TROPICAL_SPECIES_BG[si].toLowerCase()}, ${TROPICAL_VARIANTS_BG[vi].toLowerCase()} размер. Внася тропическа атмосфера.`,
      slug: `tropical-${pad(++idx)}`,
      price: faker.number.float({ min: 19.99, max: 149.99, fractionDigits: 2 }).toFixed(2),
      category: 'tropical' as const,
      stock: faker.number.int({ min: 0, max: 30 }),
    });
  }

  // Seasonal — 400
  for (let i = 0; i < 400; i++) {
    const hi = i % HOLIDAYS_EN.length;
    const ii = Math.floor(i / HOLIDAYS_EN.length) % SEASONAL_ITEMS_EN.length;
    const nameEn = `${HOLIDAYS_EN[hi]} ${SEASONAL_ITEMS_EN[ii]}`;
    const nameBg = `${HOLIDAYS_BG[hi]} ${SEASONAL_ITEMS_BG[ii]}`;
    products.push({
      nameBg, nameEn,
      descriptionEn: `Festive ${HOLIDAYS_EN[hi]} ${SEASONAL_ITEMS_EN[ii].toLowerCase()} arrangement. A perfect seasonal gift.`,
      descriptionBg: `Празнична ${HOLIDAYS_BG[hi]} ${SEASONAL_ITEMS_BG[ii].toLowerCase()} аранжировка. Перфектен сезонен подарък.`,
      slug: `seasonal-${pad(++idx)}`,
      price: faker.number.float({ min: 9.99, max: 59.99, fractionDigits: 2 }).toFixed(2),
      category: 'seasonal' as const,
      stock: faker.number.int({ min: 0, max: 100 }),
    });
  }

  // Accessories — 200
  for (let i = 0; i < 200; i++) {
    const ti = i % ACCESSORY_TYPES_EN.length;
    const si = Math.floor(i / ACCESSORY_TYPES_EN.length) % ACCESSORY_SIZES_EN.length;
    const nameEn = `${ACCESSORY_TYPES_EN[ti]} – ${ACCESSORY_SIZES_EN[si]}`;
    const nameBg = `${ACCESSORY_TYPES_BG[ti]} – ${ACCESSORY_SIZES_BG[si]}`;
    products.push({
      nameBg, nameEn,
      descriptionEn: `${ACCESSORY_SIZES_EN[si]} ${ACCESSORY_TYPES_EN[ti].toLowerCase()} for your plants. Practical and stylish.`,
      descriptionBg: `${ACCESSORY_SIZES_BG[si]} ${ACCESSORY_TYPES_BG[ti].toLowerCase()} за вашите растения. Практично и стилно.`,
      slug: `accessory-${pad(++idx)}`,
      price: faker.number.float({ min: 4.99, max: 39.99, fractionDigits: 2 }).toFixed(2),
      category: 'accessories' as const,
      stock: faker.number.int({ min: 5, max: 200 }),
    });
  }

  return products;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Clearing existing data...');
  await db.delete(schema.aiAnalyses);
  await db.delete(schema.plantCareLogs);
  await db.delete(schema.plantCareSchedules);
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.plants);
  await db.delete(schema.refreshTokens);
  await db.delete(schema.plantSpecies);
  await db.delete(schema.products);
  await db.delete(schema.users);

  // ── Users (100) ───────────────────────────────────────────────────────────
  console.log('👤 Seeding 100 users...');
  const SALT = 10;
  const bulkHash = await bcrypt.hash('user1234', SALT);

  const namedUsers = await db.insert(schema.users).values([
    { name: 'Admin',    email: 'admin@scarlet.com', passwordHash: await bcrypt.hash('admin123', SALT), role: 'admin', preferredLocale: 'bg' },
    { name: 'Demo',     email: 'demo@scarlet.com',  passwordHash: await bcrypt.hash('demo123',  SALT), role: 'user',  preferredLocale: 'bg' },
    { name: 'Мария',    email: 'maria@scarlet.com', passwordHash: await bcrypt.hash('pass123',  SALT), role: 'user',  preferredLocale: 'bg' },
    { name: 'Иван',     email: 'ivan@scarlet.com',  passwordHash: await bcrypt.hash('pass123',  SALT), role: 'user',  preferredLocale: 'bg' },
  ]).returning();

  const bulkUserRows = Array.from({ length: 96 }, (_, i) => ({
    name: faker.person.fullName(),
    email: faker.internet.email({ provider: `scarlet${i + 5}.com` }),
    passwordHash: bulkHash,
    role: 'user' as const,
    preferredLocale: 'bg' as const,
  }));
  const bulkUsers = await db.insert(schema.users).values(bulkUserRows).returning();
  const allUsers = [...namedUsers, ...bulkUsers];
  console.log(`   → ${allUsers.length} users`);

  // ── Plant species (up to 200) ──────────────────────────────────────────────
  console.log('🌿 Seeding plant species...');
  const speciesRows = SPECIES_DATA.slice(0, 200).map(s => ({
    scientificName: s.scientificName,
    commonNameEn: s.commonNameEn,
    commonNameBg: null,
    family: null,
    nativeRegionEn: null,
    nativeRegionBg: null,
    careDifficulty: s.careDifficulty,
    descriptionEn: `A ${s.careDifficulty} care plant. ${s.commonNameEn ?? s.scientificName} is a popular choice for indoor gardens.`,
    descriptionBg: null,
    careGuide: careGuide(s.careDifficulty),
    imageUrl: s.imageUrl,
    isVerified: true,
    wateringIntervalDays: s.wateringIntervalDays,
    fertilizingIntervalDays: s.fertilizingIntervalDays,
    repottingIntervalMonths: s.repottingIntervalMonths,
    mistingNeeded: s.mistingNeeded,
  }));
  const insertedSpecies = await db.insert(schema.plantSpecies).values(speciesRows).returning();
  console.log(`   → ${insertedSpecies.length} species`);

  // ── Plants (500 across first 10 users) ────────────────────────────────────
  console.log('🪴 Seeding 500 plants across first 10 users...');
  const plantOwners = allUsers.slice(0, 10);
  const plantRows = Array.from({ length: 500 }, (_, i) => {
    const user    = plantOwners[i % plantOwners.length];
    const species = insertedSpecies[i % insertedSpecies.length];
    return {
      userId:           user.id,
      speciesId:        species.id,
      customName:       `${species.commonNameEn ?? species.scientificName} #${i + 1}`,
      healthScore:      parseFloat(faker.number.float({ min: 40, max: 100, fractionDigits: 1 }).toFixed(1)),
      lastWatered:      faker.date.recent({ days: 20 }),
      isArchived:       i > 480,
      speciesConfirmed: i < 400,
    };
  });
  const insertedPlants = await db.insert(schema.plants).values(plantRows).returning();
  console.log(`   → ${insertedPlants.length} plants`);

  // ── Plant care schedules (500 — one per plant) ────────────────────────────
  console.log('📅 Seeding care schedules...');
  const scheduleRows = insertedPlants.map((plant, i) => {
    const species = insertedSpecies[i % insertedSpecies.length];
    const lastWatered = plantRows[i].lastWatered as Date;
    const wDays  = species.wateringIntervalDays ?? 7;
    const fDays  = species.fertilizingIntervalDays ?? 14;
    const rMonth = species.repottingIntervalMonths ?? 18;
    const mist   = species.mistingNeeded ?? false;
    return {
      plantId:                 plant.id,
      wateringIntervalDays:    wDays,
      wateringNextDue:         new Date(lastWatered.getTime() + wDays * 24 * 60 * 60 * 1000),
      fertilizingIntervalDays: fDays,
      fertilizingNextDue:      faker.date.soon({ days: fDays }),
      repottingIntervalMonths: rMonth,
      repottingNextDue:        faker.date.future({ years: rMonth / 12 }),
      mistingNeeded:           mist,
      mistingNextDue:          mist ? faker.date.soon({ days: 2 }) : null,
      isCustomized:            false,
    };
  });
  await chunkInsert(schema.plantCareSchedules, scheduleRows, 500);
  console.log(`   → ${scheduleRows.length} schedules`);

  // ── Plant care logs (1,000 — 2 per plant) ────────────────────────────────
  console.log('📋 Seeding 1,000 care logs...');
  const careTypes = schema.careTypeEnum.enumValues;
  const careWeights = ['watered', 'watered', 'watered', 'fertilized', 'fertilized', 'observation', 'observation', 'misted', 'pruned', 'rotated'] as const;
  const careLogRows = insertedPlants.flatMap((plant, i) => {
    const user = plantOwners[i % plantOwners.length];
    return Array.from({ length: 2 }, (_, j) => ({
      plantId:  plant.id,
      userId:   user.id,
      careType: careWeights[faker.number.int({ min: 0, max: careWeights.length - 1 })],
      photoUrl: null,
      notes:    j === 0 ? faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) ?? null : null,
      loggedAt: faker.date.recent({ days: 180 }),
    }));
  });
  await chunkInsert(schema.plantCareLogs, careLogRows, 500);
  console.log(`   → ${careLogRows.length} care logs`);

  // ── Products (5,500) ─────────────────────────────────────────────────────
  console.log('🌸 Seeding 5,500 products...');
  const productData = generateProducts();
  await chunkInsert(schema.products, productData.map(p => ({ ...p, isActive: true })), 500);
  const insertedProducts = await db.select({ id: schema.products.id, price: schema.products.price }).from(schema.products);
  console.log(`   → ${insertedProducts.length} products`);

  // ── Orders (1,000) + order_items ─────────────────────────────────────────
  console.log('🛒 Seeding 1,000 orders + ~1,200 order items...');
  const statuses = schema.orderStatusEnum.enumValues;
  const ORDERS_COUNT = 1000;

  for (let batch = 0; batch < ORDERS_COUNT; batch += 200) {
    const batchSize = Math.min(200, ORDERS_COUNT - batch);
    const batchOrders = Array.from({ length: batchSize }, () => {
      const user  = faker.helpers.arrayElement(plantOwners);
      const items = faker.number.int({ min: 1, max: 2 });
      let total = 0;
      const lineItems = Array.from({ length: items }, () => {
        const product = faker.helpers.arrayElement(insertedProducts);
        const qty     = faker.number.int({ min: 1, max: 3 });
        const price   = parseFloat(product.price as string);
        total        += price * qty;
        return { product, qty, price };
      });
      return { user, total: parseFloat(total.toFixed(2)), lineItems };
    });

    const insertedOrders = await db.insert(schema.orders).values(
      batchOrders.map(o => ({
        userId:          o.user.id,
        total:           o.total.toFixed(2),
        status:          faker.helpers.arrayElement(statuses),
        shippingAddress: faker.location.streetAddress({ useFullAddress: true }),
      }))
    ).returning();

    const itemRows = insertedOrders.flatMap((order, i) =>
      batchOrders[i].lineItems.map(li => ({
        orderId:   order.id,
        productId: li.product.id,
        quantity:  li.qty,
        unitPrice: li.price.toFixed(2),
      }))
    );
    await chunkInsert(schema.orderItems, itemRows, 500);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total =
    allUsers.length + insertedSpecies.length + insertedPlants.length +
    scheduleRows.length + careLogRows.length + productData.length +
    ORDERS_COUNT + Math.round(ORDERS_COUNT * 1.2); // approx order_items

  console.log('\n✅ Seed complete!');
  console.log(`   users              : ${allUsers.length}`);
  console.log(`   plant_species      : ${insertedSpecies.length}`);
  console.log(`   plants             : ${insertedPlants.length}`);
  console.log(`   plant_care_schedules: ${scheduleRows.length}`);
  console.log(`   plant_care_logs    : ${careLogRows.length}`);
  console.log(`   products           : ${productData.length}`);
  console.log(`   orders             : ${ORDERS_COUNT}`);
  console.log(`   TOTAL (approx)     : ${total}`);
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
