import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/db/schema';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

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

const DESC = {
  easy:     { en: 'A hardy, low-maintenance plant perfect for beginners. Tolerates neglect and adapts well to indoor conditions.', bg: 'Издръжливо, лесно за поддържане растение, идеално за начинаещи. Понася небрежност и се адаптира добре към вътрешни условия.' },
  moderate: { en: 'A beautiful plant that rewards consistent care. Ideal for enthusiasts ready to invest some attention.', bg: 'Красиво растение, което се отблагодарява на редовна грижа. Идеално за любители, готови да отделят малко внимание.' },
  difficult:{ en: 'A striking specimen for experienced plant keepers. Requires specific conditions but offers spectacular results.', bg: 'Впечатляващ екземпляр за опитни любители на растения. Изисква специфични условия, но предлага зашеметяващи резултати.' },
};

// ── species data ─────────────────────────────────────────────────────────────

type S = [string, string, string, string, 'easy'|'moderate'|'difficult', string, string];

const SPECIES: S[] = [
  // EASY (35)
  ['Sansevieria trifasciata',   'Snake Plant',              'Сансевиерия',                    'Asparagaceae',   'easy',     'West Africa',                        'Западна Африка'],
  ['Epipremnum aureum',         'Golden Pothos',            'Потос',                          'Araceae',        'easy',     'Southeastern Asia',                  'Югоизточна Азия'],
  ['Chlorophytum comosum',      'Spider Plant',             'Паякова трева',                  'Asparagaceae',   'easy',     'South Africa',                       'Южна Африка'],
  ['Zamioculcas zamiifolia',    'ZZ Plant',                 'Замиокулкас',                    'Araceae',        'easy',     'East Africa',                        'Източна Африка'],
  ['Aloe vera',                 'Aloe Vera',                'Алое вера',                      'Asphodelaceae',  'easy',     'Arabian Peninsula',                  'Арабски полуостров'],
  ['Dracaena marginata',        'Dragon Tree',              'Дракон дърво',                   'Asparagaceae',   'easy',     'Madagascar',                         'Мадагаскар'],
  ['Crassula ovata',            'Jade Plant',               'Нефритено дърво',                'Crassulaceae',   'easy',     'South Africa',                       'Южна Африка'],
  ['Sedum morganianum',         "Burro's Tail",             'Магарешка опашка',               'Crassulaceae',   'easy',     'Mexico',                             'Мексико'],
  ['Echeveria elegans',         'Mexican Snowball',         'Мексиканска снежна топка',       'Crassulaceae',   'easy',     'Mexico',                             'Мексико'],
  ['Haworthia fasciata',        'Zebra Haworthia',          'Зебра хауортия',                 'Asphodelaceae',  'easy',     'South Africa',                       'Южна Африка'],
  ['Schlumbergera truncata',    'Christmas Cactus',         'Коледен кактус',                 'Cactaceae',      'easy',     'Brazil',                             'Бразилия'],
  ['Tradescantia zebrina',      'Wandering Dude',           'Традесканция',                   'Commelinaceae',  'easy',     'Mexico',                             'Мексико'],
  ['Ficus benjamina',           'Weeping Fig',              'Фикус',                          'Moraceae',       'easy',     'South and Southeast Asia',           'Южна и Югоизточна Азия'],
  ['Dracaena fragrans',         'Corn Plant',               'Царевично растение',             'Asparagaceae',   'easy',     'Tropical Africa',                    'Тропическа Африка'],
  ['Aglaonema commutatum',      'Chinese Evergreen',        'Аглаонема',                      'Araceae',        'easy',     'Philippines',                        'Филипини'],
  ['Spathiphyllum wallisii',    'Peace Lily',               'Спатифилум',                     'Araceae',        'easy',     'Tropical Americas',                  'Тропическа Америка'],
  ['Aspidistra elatior',        'Cast Iron Plant',          'Аспидистра',                     'Asparagaceae',   'easy',     'China and Japan',                    'Китай и Япония'],
  ['Sansevieria cylindrica',    'Cylindrical Snake Plant',  'Цилиндрична сансевиерия',        'Asparagaceae',   'easy',     'Angola',                             'Ангола'],
  ['Rhapis excelsa',            'Lady Palm',                'Дамска палма',                   'Arecaceae',      'easy',     'South China',                        'Южен Китай'],
  ['Chamaedorea elegans',       'Parlor Palm',              'Салонна палма',                  'Arecaceae',      'easy',     'Mexico and Guatemala',               'Мексико и Гватемала'],
  ['Pachira aquatica',          'Money Tree',               'Парично дърво',                  'Malvaceae',      'easy',     'Central and South America',          'Централна и Южна Америка'],
  ['Beaucarnea recurvata',      'Ponytail Palm',            'Конска опашка',                  'Asparagaceae',   'easy',     'Mexico',                             'Мексико'],
  ['Kalanchoe blossfeldiana',   'Flaming Katy',             'Каланхое',                       'Crassulaceae',   'easy',     'Madagascar',                         'Мадагаскар'],
  ['Portulacaria afra',         'Elephant Bush',            'Слонски храст',                  'Didiereaceae',   'easy',     'South Africa',                       'Южна Африка'],
  ['Opuntia microdasys',        'Bunny Ears Cactus',        'Зайчи уши кактус',               'Cactaceae',      'easy',     'Mexico',                             'Мексико'],
  ['Mammillaria elongata',      'Ladyfinger Cactus',        'Кактус дамски пръст',            'Cactaceae',      'easy',     'Mexico',                             'Мексико'],
  ['Cereus peruvianus',         'Peruvian Apple Cactus',    'Перуански кактус',               'Cactaceae',      'easy',     'South America',                      'Южна Америка'],
  ['Peperomia obtusifolia',     'Baby Rubber Plant',        'Бебешко гумено растение',        'Piperaceae',     'easy',     'Florida, Mexico, Caribbean',         'Флорида, Мексико, Карибите'],
  ['Peperomia argyreia',        'Watermelon Peperomia',     'Диня пеперомия',                 'Piperaceae',     'easy',     'South America',                      'Южна Америка'],
  ['Fatsia japonica',           'Japanese Aralia',          'Японска аралия',                 'Araliaceae',     'easy',     'Japan and South Korea',              'Япония и Южна Корея'],
  ['Pelargonium x hortorum',    'Garden Geranium',          'Здравец',                        'Geraniaceae',    'easy',     'South Africa',                       'Южна Африка'],
  ['Tagetes erecta',            'African Marigold',         'Невен',                          'Asteraceae',     'easy',     'Mexico',                             'Мексико'],
  ['Zinnia elegans',            'Zinnia',                   'Цинния',                         'Asteraceae',     'easy',     'Mexico',                             'Мексико'],
  ['Calendula officinalis',     'Pot Marigold',             'Лечебен невен',                  'Asteraceae',     'easy',     'Mediterranean',                      'Средиземноморие'],
  ['Impatiens walleriana',      'Busy Lizzie',              'Сенчесто цвете',                 'Balsaminaceae',  'easy',     'East Africa',                        'Източна Африка'],

  // MODERATE (44)
  ['Monstera deliciosa',        'Swiss Cheese Plant',       'Монстера',                       'Araceae',        'moderate', 'Southern Mexico and Panama',         'Южно Мексико и Панама'],
  ['Monstera adansonii',        "Adanson's Monstera",       'Малка монстера',                 'Araceae',        'moderate', 'Central and South America',          'Централна и Южна Америка'],
  ['Ficus lyrata',              'Fiddle-Leaf Fig',          'Цигулколистна смокиня',          'Moraceae',       'moderate', 'Western Africa',                     'Западна Африка'],
  ['Philodendron hederaceum',   'Heartleaf Philodendron',   'Сърцелистен филодендрон',        'Araceae',        'moderate', 'Caribbean',                          'Карибите'],
  ['Calathea orbifolia',        'Orbifolia Calathea',       'Кръглолистна калатея',           'Marantaceae',    'moderate', 'Bolivia',                            'Боливия'],
  ['Calathea zebrina',          'Zebra Calathea',           'Зебра калатея',                  'Marantaceae',    'moderate', 'Brazil',                             'Бразилия'],
  ['Maranta leuconeura',        'Prayer Plant',             'Молитвено растение',             'Marantaceae',    'moderate', 'Brazil',                             'Бразилия'],
  ['Strelitzia reginae',        'Bird of Paradise',         'Птица на рая',                   'Strelitziaceae', 'moderate', 'South Africa',                       'Южна Африка'],
  ['Alocasia amazonica',        'African Mask Plant',       'Африканска маска',               'Araceae',        'moderate', 'Southeast Asia (cultivar)',           'Югоизточна Азия (хибрид)'],
  ['Anthurium andraeanum',      'Flamingo Flower',          'Антуриум',                       'Araceae',        'moderate', 'Colombia and Ecuador',               'Колумбия и Еквадор'],
  ['Hoya carnosa',              'Wax Plant',                'Восъчно растение',               'Apocynaceae',    'moderate', 'East Asia',                          'Източна Азия'],
  ['Pilea peperomioides',       'Chinese Money Plant',      'Китайско парично растение',      'Urticaceae',     'moderate', 'Southern China',                     'Южен Китай'],
  ['Oxalis triangularis',       'Purple Shamrock',          'Лилева детелина',                'Oxalidaceae',    'moderate', 'South America',                      'Южна Америка'],
  ['Begonia rex',               'Rex Begonia',              'Рекс бегония',                   'Begoniaceae',    'moderate', 'Northeastern India',                 'Североизточна Индия'],
  ['Begonia maculata',          'Polka Dot Begonia',        'Пъстра бегония',                 'Begoniaceae',    'moderate', 'Brazil',                             'Бразилия'],
  ['Scindapsus pictus',         'Satin Pothos',             'Сатенен потос',                  'Araceae',        'moderate', 'Southeast Asia',                     'Югоизточна Азия'],
  ['Syngonium podophyllum',     'Arrowhead Vine',           'Стрелоглав',                     'Araceae',        'moderate', 'Mexico to Brazil',                   'Мексико до Бразилия'],
  ['Fittonia albivenis',        'Nerve Plant',              'Нервно растение',                'Acanthaceae',    'moderate', 'Peru',                               'Перу'],
  ['Peperomia caperata',        'Ripple Peperomia',         'Набраздена пеперомия',           'Piperaceae',     'moderate', 'Brazil',                             'Бразилия'],
  ['Dypsis lutescens',          'Areca Palm',               'Арека палма',                    'Arecaceae',      'moderate', 'Madagascar',                         'Мадагаскар'],
  ['Howea forsteriana',         'Kentia Palm',              'Кентия палма',                   'Arecaceae',      'moderate', 'Lord Howe Island, Australia',        'Остров Лорд Хау, Австралия'],
  ['Ficus elastica',            'Rubber Plant',             'Гумено растение',                'Moraceae',       'moderate', 'South and Southeast Asia',           'Южна и Югоизточна Азия'],
  ['Calathea roseopicta',       'Rose Painted Calathea',    'Розова калатея',                 'Marantaceae',    'moderate', 'Brazil',                             'Бразилия'],
  ['Guzmania lingulata',        'Scarlet Star Bromeliad',   'Гузмания',                       'Bromeliaceae',   'moderate', 'Central and South America',          'Централна и Южна Америка'],
  ['Tillandsia ionantha',       'Sky Plant',                'Небесна тиландзия',              'Bromeliaceae',   'moderate', 'Mexico and Central America',         'Мексико и Централна Америка'],
  ['Tillandsia xerographica',   'King of Air Plants',       'Цар на въздушните растения',     'Bromeliaceae',   'moderate', 'Mexico, Guatemala, El Salvador',     'Мексико, Гватемала, Ел Салвадор'],
  ['Aechmea fasciata',          'Urn Plant',                'Урна растение',                  'Bromeliaceae',   'moderate', 'Brazil',                             'Бразилия'],
  ['Cyclamen persicum',         'Persian Cyclamen',         'Циклама',                        'Primulaceae',    'moderate', 'Eastern Mediterranean',              'Източно Средиземноморие'],
  ['Primula vulgaris',          'Primrose',                 'Иглика',                         'Primulaceae',    'moderate', 'Western and Southern Europe',        'Западна и Южна Европа'],
  ['Rosa chinensis',            'China Rose',               'Китайска роза',                  'Rosaceae',       'moderate', 'China',                              'Китай'],
  ['Dahlia pinnata',            'Dahlia',                   'Далия',                          'Asteraceae',     'moderate', 'Mexico',                             'Мексико'],
  ['Chrysanthemum morifolium',  "Florist's Chrysanthemum",  'Хризантема',                     'Asteraceae',     'moderate', 'China',                              'Китай'],
  ['Gerbera jamesonii',         'Barberton Daisy',          'Гербера',                        'Asteraceae',     'moderate', 'South Africa',                       'Южна Африка'],
  ['Tulipa gesneriana',         'Garden Tulip',             'Лале',                           'Liliaceae',      'moderate', 'Turkey and Central Asia',            'Турция и Централна Азия'],
  ['Lilium longiflorum',        'Easter Lily',              'Великденска лилия',              'Liliaceae',      'moderate', 'Japan',                              'Япония'],
  ['Narcissus pseudonarcissus', 'Daffodil',                 'Нарцис',                         'Amaryllidaceae', 'moderate', 'Western Europe',                     'Западна Европа'],
  ['Hyacinthus orientalis',     'Common Hyacinth',          'Зюмбюл',                         'Asparagaceae',   'moderate', 'Eastern Mediterranean',              'Източно Средиземноморие'],
  ['Iris germanica',            'Bearded Iris',             'Перуника',                       'Iridaceae',      'moderate', 'Southern Europe',                    'Южна Европа'],
  ['Helianthus annuus',         'Sunflower',                'Слънчоглед',                     'Asteraceae',     'moderate', 'North America',                      'Северна Америка'],
  ['Lavandula angustifolia',    'Lavender',                 'Лавандула',                      'Lamiaceae',      'moderate', 'Mediterranean',                      'Средиземноморие'],
  ['Rosa damascena',            'Damask Rose',              'Дамаска роза',                   'Rosaceae',       'moderate', 'Middle East',                        'Близкия изток'],
  ['Aloe arborescens',          'Tree Aloe',                'Дървовидно алое',                'Asphodelaceae',  'moderate', 'South Africa',                       'Южна Африка'],
  ['Vriesea splendens',         'Flaming Sword',            'Пламтящ меч',                    'Bromeliaceae',   'moderate', 'Venezuela, Trinidad',                'Венецуела, Тринидад'],
  ['Tradescantia fluminensis',  'Spiderwort',               'Бяла традесканция',              'Commelinaceae',  'moderate', 'Brazil and Argentina',               'Бразилия и Аржентина'],

  // DIFFICULT (21)
  ['Phalaenopsis amabilis',     'Moth Orchid',              'Пеперудова орхидея',             'Orchidaceae',    'difficult','Southeast Asia and Australia',       'Югоизточна Азия и Австралия'],
  ['Dendrobium nobile',         'Noble Dendrobium',         'Дендробиум',                     'Orchidaceae',    'difficult','Himalayas to Southeast Asia',        'Хималаи до Югоизточна Азия'],
  ['Cattleya labiata',          'Corsage Orchid',           'Катлея',                         'Orchidaceae',    'difficult','Brazil',                             'Бразилия'],
  ['Cymbidium aloifolium',      'Boat Orchid',              'Цимбидиум',                      'Orchidaceae',    'difficult','India and Southeast Asia',           'Индия и Югоизточна Азия'],
  ['Calathea warscewiczii',     'Jungle Velvet Calathea',   'Кадифена калатея',               'Marantaceae',    'difficult','Costa Rica and Nicaragua',           'Коста Рика и Никарагуа'],
  ['Calathea ornata',           'Pinstripe Calathea',       'Пинстрайп калатея',              'Marantaceae',    'difficult','Colombia and Venezuela',             'Колумбия и Венецуела'],
  ['Alocasia zebrina',          'Zebra Elephant Ear',       'Зебра алоказия',                 'Araceae',        'difficult','Philippines',                        'Филипини'],
  ['Anthurium clarinervium',    'Velvet Cardboard Anthurium','Кадифен антуриум',              'Araceae',        'difficult','Mexico',                             'Мексико'],
  ['Caladium bicolor',          'Angel Wings',              'Ангелски крила',                 'Araceae',        'difficult','South America',                      'Южна Америка'],
  ['Monstera obliqua',          'Monstera Obliqua',         'Монстера обликва',               'Araceae',        'difficult','Central and South America',          'Централна и Южна Америка'],
  ['Philodendron gloriosum',    'Gloriosum Philodendron',   'Великолепен филодендрон',        'Araceae',        'difficult','Colombia',                           'Колумбия'],
  ['Stromanthe sanguinea',      'Tricolor Stromanthe',      'Триколор строманте',             'Marantaceae',    'difficult','Brazil',                             'Бразилия'],
  ['Dionaea muscipula',         'Venus Flytrap',            'Венерина мухоловка',             'Droseraceae',    'difficult','North and South Carolina, USA',      'Северна и Южна Каролина, САЩ'],
  ['Nepenthes ventricosa',      'Pitcher Plant',            'Канчица',                        'Nepenthaceae',   'difficult','Philippines',                        'Филипини'],
  ['Vanda coerulea',            'Blue Vanda Orchid',        'Синя ванда',                     'Orchidaceae',    'difficult','India, Myanmar, Thailand',           'Индия, Мианмар, Тайланд'],
  ['Paphiopedilum insigne',     "Lady's Slipper Orchid",    'Обувка орхидея',                 'Orchidaceae',    'difficult','Nepal and India',                    'Непал и Индия'],
  ['Miltoniopsis vexillaria',   'Pansy Orchid',             'Теменужена орхидея',             'Orchidaceae',    'difficult','Colombia and Ecuador',               'Колумбия и Еквадор'],
  ['Medinilla magnifica',       'Rose Grape',               'Розово грозде',                  'Melastomataceae','difficult','Philippines',                        'Филипини'],
  ['Heliconia psittacorum',     'Parrot Flower',            'Папагалско цвете',               'Heliconiaceae',  'difficult','South America and Caribbean',        'Южна Америка и Карибите'],
  ['Vanilla planifolia',        'Vanilla Orchid',           'Ванилия',                        'Orchidaceae',    'difficult','Mexico',                             'Мексико'],
  ['Adenium obesum',            'Desert Rose',              'Пустинна роза',                  'Apocynaceae',    'difficult','Africa and Arabian Peninsula',       'Африка и Арабски полуостров'],
];

// ── products data ─────────────────────────────────────────────────────────────

type P = [string, string, string, string, string, number, typeof schema.productCategoryEnum.enumValues[number], number];
//        nameBg  nameEn  descBg  descEn  slug    price  category                                                 stock

const PRODUCTS: P[] = [
  ['Червена роза — букет',          'Red Rose Bouquet',            'Класически букет от 11 ярко червени рози, символ на любовта.',         'Classic bouquet of 11 bright red roses, a symbol of love.',             'red-rose-bouquet',           29.99, 'bouquet',      50],
  ['Бяла роза — букет',             'White Rose Bouquet',          'Елегантен букет от 11 бели рози, идеален за всяко тържество.',          'Elegant bouquet of 11 white roses, perfect for any celebration.',       'white-rose-bouquet',         27.99, 'bouquet',      40],
  ['Смесен пролетен букет',         'Mixed Spring Bouquet',        'Цветен букет от сезонни пролетни цветя.',                               'Colourful bouquet of seasonal spring flowers.',                         'mixed-spring-bouquet',       34.99, 'bouquet',      30],
  ['Лилав лале букет',              'Purple Tulip Bouquet',        'Букет от 15 лилави лалета, свежо и елегантно.',                         'Bouquet of 15 purple tulips, fresh and elegant.',                       'purple-tulip-bouquet',       24.99, 'bouquet',      35],
  ['Слънчогледов букет',            'Sunflower Bouquet',           'Ярък букет от 7 слънчогледа, носещ радост.',                            'Bright bouquet of 7 sunflowers bringing joy.',                          'sunflower-bouquet',          22.99, 'bouquet',      45],
  ['Хризантема букет',              'Chrysanthemum Bouquet',       'Пищен букет от смесени хризантеми.',                                   'Lush bouquet of mixed chrysanthemums.',                                 'chrysanthemum-bouquet',      19.99, 'bouquet',      55],
  ['Рози и герберов букет',         'Rose and Gerbera Bouquet',    'Красиво съчетание от рози и герберки.',                                 'Beautiful combination of roses and gerberas.',                          'rose-gerbera-bouquet',       32.99, 'bouquet',      25],
  ['Романтичен букет',              'Romantic Bouquet',            'Луксозен букет от алена роза, лилиум и гербера.',                       'Luxurious bouquet of scarlet rose, lily and gerbera.',                  'romantic-bouquet',           44.99, 'bouquet',      20],
  ['Нарцис букет',                  'Daffodil Bouquet',            'Свеж пролетен букет от 20 нарциса.',                                    'Fresh spring bouquet of 20 daffodils.',                                 'daffodil-bouquet',           18.99, 'bouquet',      60],
  ['Зюмбюл букет',                  'Hyacinth Bouquet',            'Ароматен букет от цветни зюмбюли.',                                     'Fragrant bouquet of colourful hyacinths.',                              'hyacinth-bouquet',           21.99, 'bouquet',      40],
  ['Монстера в саксия',             'Monstera in Pot',             'Монстера делициоза в декоративна саксия — топхит за дома.',             'Monstera deliciosa in a decorative pot — a home bestseller.',           'monstera-pot',               49.99, 'potted_plant', 20],
  ['Фикус лирата в саксия',         'Fiddle-Leaf Fig in Pot',      'Впечатляващ фикус лирата за модерен интериор.',                         'Impressive fiddle-leaf fig for modern interiors.',                      'fiddle-leaf-fig-pot',        59.99, 'potted_plant', 15],
  ['Спатифилум в саксия',           'Peace Lily in Pot',           'Спатифилум — елегантно растение за пречистване на въздуха.',            'Peace lily — elegant air-purifying plant.',                             'peace-lily-pot',             24.99, 'potted_plant', 30],
  ['Замиокулкас в саксия',          'ZZ Plant in Pot',             'Нискомаслено и красиво растение за всяка стая.',                        'Low-maintenance and beautiful plant for any room.',                     'zz-plant-pot',               29.99, 'potted_plant', 25],
  ['Антуриум в саксия',             'Anthurium in Pot',            'Антуриум с ярки лакирани цветове — перфектен подарък.',                 'Anthurium with bright lacquered blooms — a perfect gift.',              'anthurium-pot',              34.99, 'potted_plant', 20],
  ['Потос в кашпа',                 'Pothos in Hanging Pot',       'Ефектен потос в окачена кашпа за свеж зелен акцент.',                   'Eye-catching pothos in a hanging pot for a fresh green accent.',        'pothos-hanging-pot',         19.99, 'potted_plant', 35],
  ['Здравец в саксия',              'Geranium in Pot',             'Цъфтящ здравец, идеален за балкон или перваз.',                         'Blooming geranium, ideal for balcony or windowsill.',                   'geranium-pot',               14.99, 'potted_plant', 50],
  ['Циклама в саксия',              'Cyclamen in Pot',             'Нежна циклама в пастелни нюанси.',                                      'Delicate cyclamen in pastel shades.',                                   'cyclamen-pot',               17.99, 'potted_plant', 40],
  ['Ехеверия сукулент',             'Echeveria Succulent',         'Миниатюрна розетка ехеверия в теракотена саксия.',                      'Miniature echeveria rosette in a terracotta pot.',                      'echeveria-succulent',        12.99, 'succulent',    60],
  ['Смесен сукулент сет',           'Mixed Succulent Set',         'Комплект от 3 различни сукулента в мини саксии.',                       'Set of 3 different succulents in mini pots.',                           'mixed-succulent-set',        21.99, 'succulent',    40],
  ['Кактус Опунция',                'Bunny Ears Cactus',           'Сладурска опунция с форма на зайчи уши.',                               'Cute opuntia shaped like bunny ears.',                                  'bunny-ears-cactus',           9.99, 'succulent',    55],
  ['Нефритено дърво',               'Jade Plant',                  'Класическо нефритено дърво — символ на богатство.',                     'Classic jade plant — a symbol of prosperity.',                          'jade-plant',                 16.99, 'succulent',    45],
  ['Алое вера',                     'Aloe Vera Plant',             'Алое вера в саксия — лечебно и декоративно.',                           'Aloe vera in a pot — medicinal and decorative.',                        'aloe-vera-plant',            14.99, 'succulent',    50],
  ['Монстера адансони тропик',      'Monstera Adansonii Tropical', 'Деликатна монстера адансони с ажурни листа.',                           'Delicate monstera adansonii with lacy leaves.',                         'monstera-adansonii-tropical', 39.99, 'tropical',    18],
  ['Стрелиция Птица на рая',        'Bird of Paradise',            'Екзотична стрелиция — атрактивно тропическо растение.',                 'Exotic strelitzia — an eye-catching tropical plant.',                   'bird-of-paradise',           69.99, 'tropical',    10],
  ['Арека палма',                   'Areca Palm',                  'Изящна арека палма за средиземноморска атмосфера.',                     'Graceful areca palm for a Mediterranean atmosphere.',                   'areca-palm',                 54.99, 'tropical',    12],
  ['Аглаонема тропик',              'Aglaonema Tropical',          'Пъстра аглаонема с декоративни листа.',                                 'Variegated aglaonema with decorative leaves.',                          'aglaonema-tropical',         27.99, 'tropical',    22],
  ['Пролетна украса — лале',        'Spring Tulip Decoration',     'Лале в саксия за пролетна украса.',                                     'Tulip in a pot for spring decoration.',                                 'spring-tulip-deco',          13.99, 'seasonal',    70],
  ['Коледна звезда',                'Christmas Poinsettia',        'Традиционна коледна звезда (пуансетия) в червено.',                     'Traditional red Christmas poinsettia.',                                 'christmas-poinsettia',       15.99, 'seasonal',    80],
  ['Великденски зюмбюл',            'Easter Hyacinth',             'Ароматен зюмбюл в пастелна саксия за Великден.',                        'Fragrant hyacinth in a pastel pot for Easter.',                         'easter-hyacinth',            16.99, 'seasonal',    60],
];

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Clearing existing data...');
  await db.delete(schema.aiAnalyses);
  await db.delete(schema.plantStats);
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.plants);
  await db.delete(schema.refreshTokens);
  await db.delete(schema.plantSpecies);
  await db.delete(schema.products);
  await db.delete(schema.users);

  // ── Users ────────────────────────────────────────────────────────────────
  console.log('👤 Seeding users...');
  const SALT = 10;
  const insertedUsers = await db.insert(schema.users).values([
    { name: 'Admin',    email: 'admin@scarlet.com',  passwordHash: await bcrypt.hash('admin123', SALT), role: 'admin', preferredLocale: 'bg' },
    { name: 'Demo',     email: 'demo@scarlet.com',   passwordHash: await bcrypt.hash('demo123',  SALT), role: 'user',  preferredLocale: 'bg' },
    { name: 'Мария',    email: 'maria@scarlet.com',  passwordHash: await bcrypt.hash('pass123',  SALT), role: 'user',  preferredLocale: 'bg' },
    { name: 'Иван',     email: 'ivan@scarlet.com',   passwordHash: await bcrypt.hash('pass123',  SALT), role: 'user',  preferredLocale: 'bg' },
  ]).returning();
  const [admin, demo, maria, ivan] = insertedUsers;

  // ── Plant species ─────────────────────────────────────────────────────────
  console.log('🌿 Seeding plant species (100)...');
  const insertedSpecies = await db.insert(schema.plantSpecies).values(
    SPECIES.map(([scientificName, commonNameEn, commonNameBg, family, difficulty, nativeEn, nativeBg]) => ({
      scientificName, commonNameEn, commonNameBg, family,
      careDifficulty: difficulty,
      descriptionEn: DESC[difficulty].en,
      descriptionBg: DESC[difficulty].bg,
      nativeRegionEn: nativeEn,
      nativeRegionBg: nativeBg,
      careGuide: careGuide(difficulty),
      isVerified: true,
    }))
  ).returning();

  // ── Plants ────────────────────────────────────────────────────────────────
  console.log('🪴 Seeding 200 plants...');
  const userPool = [demo, demo, demo, maria, maria, ivan, admin]; // demo weighted higher
  const plantRows = Array.from({ length: 200 }, (_, i) => {
    const user   = userPool[i % userPool.length];
    const species = insertedSpecies[i % insertedSpecies.length];
    const score  = parseFloat((faker.number.float({ min: 40, max: 100, fractionDigits: 1 })).toFixed(1));
    return {
      userId:           user.id,
      speciesId:        species.id,
      customName:       `${species.commonNameEn} #${i + 1}`,
      healthScore:      score,
      lastWatered:      faker.date.recent({ days: 14 }),
      isArchived:       i > 180,
      speciesConfirmed: i < 150,
    };
  });
  const insertedPlants = await db.insert(schema.plants).values(plantRows).returning();

  // ── Plant stats (bulk — 20 000+ rows) ────────────────────────────────────
  console.log('📊 Seeding plant stats (~20 000 rows)...');
  const metricTypes = schema.metricTypeEnum.enumValues;
  const metricConfig: Record<string, { min: number; max: number; unit: string }> = {
    water:       { min: 10,  max: 500,  unit: 'ml' },
    light:       { min: 100, max: 5000, unit: 'lux' },
    humidity:    { min: 30,  max: 90,   unit: '%' },
    temperature: { min: 12,  max: 35,   unit: '°C' },
    fertilizer:  { min: 0,   max: 5,    unit: 'g' },
  };
  const statsRows = insertedPlants.flatMap(plant =>
    Array.from({ length: 100 }, () => {
      const metric = faker.helpers.arrayElement(metricTypes);
      const cfg    = metricConfig[metric];
      return {
        plantId:    plant.id,
        metricType: metric,
        value:      parseFloat(faker.number.float({ min: cfg.min, max: cfg.max, fractionDigits: 1 }).toFixed(1)),
        unit:       cfg.unit,
        recordedAt: faker.date.between({ from: new Date('2024-01-01'), to: new Date() }),
      };
    })
  );
  await chunkInsert(schema.plantStats, statsRows, 500);
  console.log(`   → ${statsRows.length} plant_stats rows inserted`);

  // ── Products ──────────────────────────────────────────────────────────────
  console.log('🌸 Seeding products...');
  const insertedProducts = await db.insert(schema.products).values(
    PRODUCTS.map(([nameBg, nameEn, descriptionBg, descriptionEn, slug, price, category, stock]) => ({
      nameBg, nameEn, descriptionBg, descriptionEn, slug,
      price:    price.toFixed(2),
      category,
      stock,
      isActive: true,
    }))
  ).returning();

  // ── Orders + order items (bulk — ~10 000 rows combined) ───────────────────
  console.log('🛒 Seeding 2 000 orders + ~5 000 order items...');
  const statuses = schema.orderStatusEnum.enumValues;
  const orderUserPool = [demo, demo, maria, ivan, admin];
  const ORDERS_COUNT = 2000;

  for (let batch = 0; batch < ORDERS_COUNT; batch += 200) {
    const batchSize = Math.min(200, ORDERS_COUNT - batch);
    const batchOrders = Array.from({ length: batchSize }, () => {
      const user  = faker.helpers.arrayElement(orderUserPool);
      const items = faker.number.int({ min: 1, max: 5 });
      let total   = 0;
      const lineItems = Array.from({ length: items }, () => {
        const product  = faker.helpers.arrayElement(insertedProducts);
        const qty      = faker.number.int({ min: 1, max: 4 });
        const price    = parseFloat(product.price as string);
        total         += price * qty;
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

  // ── AI analyses ───────────────────────────────────────────────────────────
  console.log('🤖 Seeding 500 AI analyses...');
  const conditions  = schema.aiConditionEnum.enumValues;
  const confidences = schema.aiConfidenceEnum.enumValues;
  const demoPlants  = insertedPlants.filter(p => p.userId === demo.id);
  const analysisRows = Array.from({ length: 500 }, () => {
    const plant   = faker.helpers.arrayElement(demoPlants.length ? demoPlants : insertedPlants);
    const species = insertedSpecies[Math.floor(Math.random() * insertedSpecies.length)];
    const score   = parseFloat(faker.number.float({ min: 30, max: 100, fractionDigits: 1 }).toFixed(1));
    return {
      plantId:                   plant.id,
      userId:                    plant.userId,
      imageUrl:                  `https://example.com/analyses/${faker.string.uuid()}.jpg`,
      healthScore:               score,
      overallCondition:          faker.helpers.arrayElement(conditions),
      issues:                    score < 60
        ? [{ name: 'Yellowing leaves', severity: 'moderate', description: 'Lower leaves showing signs of yellowing.' }]
        : [],
      careRecommendations:       ['Water regularly', 'Ensure adequate light'],
      wateringNeeded:            faker.datatype.boolean(),
      identifiedCommonName:      species.commonNameEn,
      identifiedScientificName:  species.scientificName,
      identifiedFamily:          species.family,
      identifiedCareDifficulty:  species.careDifficulty,
      matchedSpeciesId:          species.id,
      confidence:                faker.helpers.arrayElement(confidences),
      modelUsed:                 'gemini-1.5-flash',
      analyzedAt:                faker.date.recent({ days: 90 }),
    };
  });
  await chunkInsert(schema.aiAnalyses, analysisRows, 250);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!');
  console.log(`   users          : ${insertedUsers.length}`);
  console.log(`   plant_species  : ${insertedSpecies.length}`);
  console.log(`   plants         : ${insertedPlants.length}`);
  console.log(`   plant_stats    : ${statsRows.length}`);
  console.log(`   products       : ${insertedProducts.length}`);
  console.log(`   orders         : 2000`);
  console.log(`   ai_analyses    : ${analysisRows.length}`);
  console.log(`   TOTAL ≈ ${statsRows.length + 2000 + analysisRows.length + insertedPlants.length + insertedProducts.length + insertedSpecies.length + insertedUsers.length} rows`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
