import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PROGRESS_FILE = join(__dirname, '.fetch-progress.json');
const RATE_MS = 300; // Wikipedia/iNaturalist/Wikidata — no AI, just free APIs

// ── Types ─────────────────────────────────────────────────────────────────────

export type CareGuide = {
  light:       { en: string; bg: string };
  watering:    { en: string; bg: string };
  humidity:    { en: string; bg: string };
  temperature: { en: string; bg: string };
  fertilizer:  { en: string; bg: string };
  toxicity:    { en: string; bg: string };
};

export interface SpeciesData {
  scientificName: string;
  commonNameEn: string | null;
  commonNameBg: string | null;
  family: string | null;
  nativeRegionEn: string | null;
  nativeRegionBg: string | null;
  imageUrl: string | null;
  descriptionEn: string | null;
  descriptionBg: string | null;
  careDifficulty: 'easy' | 'moderate' | 'difficult';
  wateringIntervalDays: number;
  fertilizingIntervalDays: number;
  repottingIntervalMonths: number;
  mistingNeeded: boolean;
  isToxicToPets: boolean | null;
  careGuide: CareGuide | null;
}

interface Progress {
  completed: SpeciesData[];
}

// ── Curated plant list (~500) — Bulgarian homes and gardens ───────────────────

const CURATED_PLANTS: Array<{ scientificName: string; commonNameEn: string }> = [
  // ── COMMON INDOOR HOUSEPLANTS ────────────────────────────────────────────────
  { scientificName: 'Monstera deliciosa',         commonNameEn: 'Monstera' },
  { scientificName: 'Monstera adansonii',          commonNameEn: 'Swiss Cheese Vine' },
  { scientificName: 'Epipremnum aureum',           commonNameEn: 'Golden Pothos' },
  { scientificName: 'Scindapsus pictus',           commonNameEn: 'Satin Pothos' },
  { scientificName: 'Rhaphidophora tetrasperma',   commonNameEn: 'Mini Monstera' },
  { scientificName: 'Spathiphyllum wallisii',      commonNameEn: 'Peace Lily' },
  { scientificName: 'Chlorophytum comosum',        commonNameEn: 'Spider Plant' },
  { scientificName: 'Chlorophytum orchidastrum',   commonNameEn: 'Fire Flash Spider Plant' },
  { scientificName: 'Ficus elastica',              commonNameEn: 'Rubber Plant' },
  { scientificName: 'Ficus lyrata',                commonNameEn: 'Fiddle-Leaf Fig' },
  { scientificName: 'Ficus benjamina',             commonNameEn: 'Weeping Fig' },
  { scientificName: 'Ficus pumila',                commonNameEn: 'Creeping Fig' },
  { scientificName: 'Sansevieria trifasciata',     commonNameEn: 'Snake Plant' },
  { scientificName: 'Sansevieria cylindrica',      commonNameEn: 'Cylindrical Snake Plant' },
  { scientificName: 'Dracaena marginata',          commonNameEn: 'Dragon Tree' },
  { scientificName: 'Dracaena fragrans',           commonNameEn: 'Corn Plant' },
  { scientificName: 'Dracaena sanderiana',         commonNameEn: 'Lucky Bamboo' },
  { scientificName: 'Zamioculcas zamiifolia',      commonNameEn: 'ZZ Plant' },
  { scientificName: 'Philodendron hederaceum',     commonNameEn: 'Heartleaf Philodendron' },
  { scientificName: 'Philodendron bipinnatifidum', commonNameEn: 'Tree Philodendron' },
  { scientificName: 'Philodendron erubescens',     commonNameEn: 'Pink Princess Philodendron' },
  { scientificName: 'Philodendron gloriosum',      commonNameEn: 'Velvet Philodendron' },
  { scientificName: 'Calathea orbifolia',          commonNameEn: 'Orbifolia Calathea' },
  { scientificName: 'Calathea makoyana',           commonNameEn: 'Peacock Plant' },
  { scientificName: 'Calathea lancifolia',         commonNameEn: 'Rattlesnake Plant' },
  { scientificName: 'Calathea zebrina',            commonNameEn: 'Zebra Calathea' },
  { scientificName: 'Calathea roseopicta',         commonNameEn: 'Rose-Painted Calathea' },
  { scientificName: 'Maranta leuconeura',          commonNameEn: 'Prayer Plant' },
  { scientificName: 'Ctenanthe setosa',            commonNameEn: 'Gray Star Ctenanthe' },
  { scientificName: 'Stromanthe sanguinea',        commonNameEn: 'Tricolor Stromanthe' },
  { scientificName: 'Anthurium andraeanum',        commonNameEn: 'Flamingo Flower' },
  { scientificName: 'Anthurium clarinervium',      commonNameEn: 'Velvet Cardboard Anthurium' },
  { scientificName: 'Anthurium crystallinum',      commonNameEn: 'Crystal Anthurium' },
  { scientificName: 'Saintpaulia ionantha',        commonNameEn: 'African Violet' },
  { scientificName: 'Begonia rex',                 commonNameEn: 'Rex Begonia' },
  { scientificName: 'Begonia maculata',            commonNameEn: 'Polka Dot Begonia' },
  { scientificName: 'Begonia semperflorens',       commonNameEn: 'Wax Begonia' },
  { scientificName: 'Begonia boliviensis',         commonNameEn: 'Bolivian Begonia' },
  { scientificName: 'Cyclamen persicum',           commonNameEn: 'Florist Cyclamen' },
  { scientificName: 'Tradescantia zebrina',        commonNameEn: 'Wandering Jew' },
  { scientificName: 'Tradescantia spathacea',      commonNameEn: 'Moses in the Cradle' },
  { scientificName: 'Tradescantia pallida',        commonNameEn: 'Purple Heart Plant' },
  { scientificName: 'Alocasia amazonica',          commonNameEn: 'Elephant Ear Alocasia' },
  { scientificName: 'Alocasia macrorrhizos',       commonNameEn: 'Giant Taro' },
  { scientificName: 'Alocasia zebrina',            commonNameEn: 'Zebra Alocasia' },
  { scientificName: 'Syngonium podophyllum',       commonNameEn: 'Arrowhead Plant' },
  { scientificName: 'Colocasia esculenta',         commonNameEn: 'Taro' },
  { scientificName: 'Caladium bicolor',            commonNameEn: 'Caladium' },
  { scientificName: 'Dieffenbachia seguine',       commonNameEn: 'Dumb Cane' },
  { scientificName: 'Peperomia obtusifolia',       commonNameEn: 'Baby Rubber Plant' },
  { scientificName: 'Peperomia caperata',          commonNameEn: 'Ripple Peperomia' },
  { scientificName: 'Peperomia argyreia',          commonNameEn: 'Watermelon Peperomia' },
  { scientificName: 'Peperomia rotundifolia',      commonNameEn: 'Trailing Jade Peperomia' },
  { scientificName: 'Peperomia scandens',          commonNameEn: 'Cupid Peperomia' },
  { scientificName: 'Pilea peperomioides',         commonNameEn: 'Chinese Money Plant' },
  { scientificName: 'Pilea cadierei',              commonNameEn: 'Aluminum Plant' },
  { scientificName: 'Schefflera arboricola',       commonNameEn: 'Dwarf Umbrella Tree' },
  { scientificName: 'Schefflera actinophylla',     commonNameEn: 'Umbrella Tree' },
  { scientificName: 'Pachira aquatica',            commonNameEn: 'Money Tree' },
  { scientificName: 'Codiaeum variegatum',         commonNameEn: 'Croton' },
  { scientificName: 'Fittonia albivenis',          commonNameEn: 'Nerve Plant' },
  { scientificName: 'Oxalis triangularis',         commonNameEn: 'Purple Shamrock' },
  { scientificName: 'Oxalis acetosella',           commonNameEn: 'Wood Sorrel' },
  { scientificName: 'Hoya carnosa',                commonNameEn: 'Wax Plant' },
  { scientificName: 'Hoya pubicalyx',              commonNameEn: 'Silver Pink Vine' },
  { scientificName: 'Hoya kerrii',                 commonNameEn: 'Sweetheart Hoya' },
  { scientificName: 'Hoya bella',                  commonNameEn: 'Miniature Wax Plant' },
  { scientificName: 'Ceropegia woodii',            commonNameEn: 'String of Hearts' },
  { scientificName: 'Senecio rowleyanus',          commonNameEn: 'String of Pearls' },
  { scientificName: 'Senecio radicans',            commonNameEn: 'String of Bananas' },
  { scientificName: 'Fatsia japonica',             commonNameEn: 'Japanese Aralia' },
  { scientificName: 'Hedera helix',                commonNameEn: 'English Ivy' },
  { scientificName: 'Hedera canariensis',          commonNameEn: 'Canary Island Ivy' },
  { scientificName: 'Hibiscus rosa-sinensis',      commonNameEn: 'Chinese Hibiscus' },
  { scientificName: 'Gardenia jasminoides',        commonNameEn: 'Gardenia' },
  { scientificName: 'Plumeria rubra',              commonNameEn: 'Frangipani' },
  { scientificName: 'Aspidistra elatior',          commonNameEn: 'Cast Iron Plant' },
  { scientificName: 'Clivia miniata',              commonNameEn: 'Natal Lily' },
  { scientificName: 'Zantedeschia aethiopica',     commonNameEn: 'Calla Lily' },
  { scientificName: 'Hippeastrum hybridum',        commonNameEn: 'Amaryllis' },
  { scientificName: 'Strelitzia reginae',          commonNameEn: 'Bird of Paradise' },
  { scientificName: 'Strelitzia nicolai',          commonNameEn: 'White Bird of Paradise' },
  { scientificName: 'Yucca elephantipes',          commonNameEn: 'Spineless Yucca' },
  { scientificName: 'Agave americana',             commonNameEn: 'Century Plant' },
  { scientificName: 'Agave attenuata',             commonNameEn: 'Soft Agave' },
  { scientificName: 'Medinilla magnifica',         commonNameEn: 'Rose Grape' },
  { scientificName: 'Columnea gloriosa',           commonNameEn: 'Goldfish Plant' },
  { scientificName: 'Aeschynanthus radicans',      commonNameEn: 'Lipstick Plant' },
  { scientificName: 'Streptocarpus saxorum',       commonNameEn: 'Cape Primrose' },
  { scientificName: 'Soleirolia soleirolii',       commonNameEn: 'Mind-Your-Own-Business' },
  { scientificName: 'Nematanthus gregarius',       commonNameEn: 'Clog Plant' },

  // ── PALMS AND PALM-LIKE ──────────────────────────────────────────────────────
  { scientificName: 'Chamaedorea elegans',         commonNameEn: 'Parlor Palm' },
  { scientificName: 'Chamaedorea seifrizii',       commonNameEn: 'Bamboo Palm' },
  { scientificName: 'Dypsis lutescens',            commonNameEn: 'Areca Palm' },
  { scientificName: 'Phoenix roebelenii',          commonNameEn: 'Pygmy Date Palm' },
  { scientificName: 'Livistona chinensis',         commonNameEn: 'Chinese Fan Palm' },
  { scientificName: 'Rhapis excelsa',              commonNameEn: 'Lady Palm' },
  { scientificName: 'Beaucarnea recurvata',        commonNameEn: 'Ponytail Palm' },
  { scientificName: 'Cycas revoluta',              commonNameEn: 'Sago Palm' },
  { scientificName: 'Trachycarpus fortunei',       commonNameEn: 'Windmill Palm' },
  { scientificName: 'Washingtonia filifera',       commonNameEn: 'Desert Fan Palm' },

  // ── FERNS AND FERN ALLIES ───────────────────────────────────────────────────
  { scientificName: 'Nephrolepis exaltata',        commonNameEn: 'Boston Fern' },
  { scientificName: 'Nephrolepis cordifolia',      commonNameEn: 'Ladder Fern' },
  { scientificName: 'Asplenium nidus',             commonNameEn: "Bird's Nest Fern" },
  { scientificName: 'Platycerium bifurcatum',      commonNameEn: 'Staghorn Fern' },
  { scientificName: 'Adiantum raddianum',          commonNameEn: 'Maidenhair Fern' },
  { scientificName: 'Asparagus setaceus',          commonNameEn: 'Asparagus Fern' },
  { scientificName: 'Asparagus densiflorus',       commonNameEn: 'Foxtail Fern' },
  { scientificName: 'Pteris cretica',              commonNameEn: 'Cretan Brake Fern' },
  { scientificName: 'Dryopteris filix-mas',        commonNameEn: 'Male Fern' },
  { scientificName: 'Athyrium filix-femina',       commonNameEn: 'Lady Fern' },
  { scientificName: 'Davallia canariensis',        commonNameEn: 'Rabbit Foot Fern' },
  { scientificName: 'Matteuccia struthiopteris',   commonNameEn: 'Ostrich Fern' },
  { scientificName: 'Selaginella uncinata',        commonNameEn: 'Rainbow Moss' },
  { scientificName: 'Polypodium vulgare',          commonNameEn: 'Common Polypody' },
  { scientificName: 'Microsorum punctatum',        commonNameEn: 'Fishtail Fern' },

  // ── BROMELIADS AND AIR PLANTS ───────────────────────────────────────────────
  { scientificName: 'Guzmania lingulata',          commonNameEn: 'Scarlet Star Bromeliad' },
  { scientificName: 'Vriesea splendens',           commonNameEn: 'Flaming Sword Bromeliad' },
  { scientificName: 'Aechmea fasciata',            commonNameEn: 'Silver Vase Bromeliad' },
  { scientificName: 'Neoregelia carolinae',        commonNameEn: 'Blushing Bromeliad' },
  { scientificName: 'Cryptanthus bivittatus',      commonNameEn: 'Earth Star Bromeliad' },
  { scientificName: 'Tillandsia usneoides',        commonNameEn: 'Spanish Moss' },
  { scientificName: 'Tillandsia ionantha',         commonNameEn: 'Air Plant Ionantha' },
  { scientificName: 'Tillandsia xerographica',     commonNameEn: 'King of Air Plants' },
  { scientificName: 'Ananas comosus',              commonNameEn: 'Ornamental Pineapple' },
  { scientificName: 'Billbergia nutans',           commonNameEn: "Queen's Tears Bromeliad" },

  // ── ORCHIDS ─────────────────────────────────────────────────────────────────
  { scientificName: 'Phalaenopsis amabilis',       commonNameEn: 'Moth Orchid' },
  { scientificName: 'Dendrobium nobile',           commonNameEn: 'Noble Dendrobium Orchid' },
  { scientificName: 'Cattleya labiata',            commonNameEn: 'Corsage Orchid' },
  { scientificName: 'Cymbidium tracyanum',         commonNameEn: 'Cymbidium Orchid' },
  { scientificName: 'Oncidium sphacelatum',        commonNameEn: 'Dancing Lady Orchid' },
  { scientificName: 'Paphiopedilum insigne',       commonNameEn: "Lady's Slipper Orchid" },
  { scientificName: 'Ludisia discolor',            commonNameEn: 'Jewel Orchid' },
  { scientificName: 'Zygopetalum mackaii',         commonNameEn: 'Zygopetalum Orchid' },
  { scientificName: 'Coelogyne cristata',          commonNameEn: 'White Coelogyne Orchid' },
  { scientificName: 'Vanilla planifolia',          commonNameEn: 'Vanilla Orchid' },
  { scientificName: 'Brassia caudata',             commonNameEn: 'Spider Orchid' },
  { scientificName: 'Miltoniopsis vexillaria',     commonNameEn: 'Pansy Orchid' },
  { scientificName: 'Epidendrum secundum',         commonNameEn: 'Reed Orchid' },
  { scientificName: 'Lycaste aromatica',           commonNameEn: 'Cinnamon Orchid' },
  { scientificName: 'Maxillaria tenuifolia',       commonNameEn: 'Coconut Orchid' },

  // ── HAWORTHIA / GASTERIA ────────────────────────────────────────────────────
  { scientificName: 'Haworthia fasciata',          commonNameEn: 'Zebra Haworthia' },
  { scientificName: 'Haworthia attenuata',         commonNameEn: 'Attenuata Haworthia' },
  { scientificName: 'Haworthia cooperi',           commonNameEn: "Cooper's Haworthia" },
  { scientificName: 'Haworthia limifolia',         commonNameEn: 'Fairy Washboard' },
  { scientificName: 'Gasteria bicolor',            commonNameEn: 'Ox Tongue Plant' },
  { scientificName: 'Gasteria carinata',           commonNameEn: 'Gasteria' },

  // ── SUCCULENTS (NON-CACTUS) ─────────────────────────────────────────────────
  { scientificName: 'Aloe vera',                   commonNameEn: 'Aloe Vera' },
  { scientificName: 'Aloe arborescens',            commonNameEn: 'Torch Aloe' },
  { scientificName: 'Aloe ferox',                  commonNameEn: 'Cape Aloe' },
  { scientificName: 'Aloe striata',                commonNameEn: 'Coral Aloe' },
  { scientificName: 'Echeveria elegans',           commonNameEn: 'Mexican Snowball Echeveria' },
  { scientificName: 'Echeveria agavoides',         commonNameEn: 'Molded Wax Echeveria' },
  { scientificName: 'Echeveria pulvinata',         commonNameEn: 'Chenille Echeveria' },
  { scientificName: 'Echeveria subsessilis',       commonNameEn: 'Morning Beauty Echeveria' },
  { scientificName: 'Echeveria imbricata',         commonNameEn: 'Blue Rose Echeveria' },
  { scientificName: 'Sedum morganianum',           commonNameEn: "Burro's Tail Sedum" },
  { scientificName: 'Sedum rubrotinctum',          commonNameEn: 'Jelly Bean Plant' },
  { scientificName: 'Sedum acre',                  commonNameEn: 'Golden Moss Stonecrop' },
  { scientificName: 'Sedum spectabile',            commonNameEn: 'Showy Stonecrop' },
  { scientificName: 'Sempervivum tectorum',        commonNameEn: 'Hen and Chicks' },
  { scientificName: 'Sempervivum calcareum',       commonNameEn: 'Limestone Houseleek' },
  { scientificName: 'Sempervivum arachnoideum',    commonNameEn: 'Cobweb Houseleek' },
  { scientificName: 'Graptopetalum paraguayense',  commonNameEn: 'Ghost Plant' },
  { scientificName: 'Aeonium arboreum',            commonNameEn: 'Tree Aeonium' },
  { scientificName: 'Aeonium haworthii',           commonNameEn: 'Pinwheel Aeonium' },
  { scientificName: 'Portulacaria afra',           commonNameEn: 'Elephant Bush' },
  { scientificName: 'Crassula ovata',              commonNameEn: 'Jade Plant' },
  { scientificName: 'Crassula perforata',          commonNameEn: 'String of Buttons' },
  { scientificName: 'Crassula muscosa',            commonNameEn: 'Watch Chain Crassula' },
  { scientificName: 'Crassula tetragona',          commonNameEn: 'Miniature Pine Tree Crassula' },
  { scientificName: 'Kalanchoe blossfeldiana',     commonNameEn: 'Flaming Katy' },
  { scientificName: 'Kalanchoe tomentosa',         commonNameEn: 'Panda Plant' },
  { scientificName: 'Kalanchoe daigremontiana',    commonNameEn: 'Mother of Thousands' },
  { scientificName: 'Kalanchoe thyrsiflora',       commonNameEn: 'Flapjack Kalanchoe' },
  { scientificName: 'Lithops fulviceps',           commonNameEn: 'Living Stones' },
  { scientificName: 'Conophytum bilobum',          commonNameEn: 'Cone Plant' },
  { scientificName: 'Stapelia gigantea',           commonNameEn: 'Zulu Giant' },
  { scientificName: 'Adenium obesum',              commonNameEn: 'Desert Rose' },
  { scientificName: 'Euphorbia milii',             commonNameEn: 'Crown of Thorns' },
  { scientificName: 'Euphorbia trigona',           commonNameEn: 'African Milk Tree' },
  { scientificName: 'Euphorbia tirucalli',         commonNameEn: 'Pencil Cactus' },
  { scientificName: 'Dudleya brittonii',           commonNameEn: 'Giant Chalk Dudleya' },

  // ── CACTI ────────────────────────────────────────────────────────────────────
  { scientificName: 'Opuntia microdasys',          commonNameEn: 'Bunny Ear Cactus' },
  { scientificName: 'Opuntia ficus-indica',        commonNameEn: 'Prickly Pear Cactus' },
  { scientificName: 'Cereus hexagonus',            commonNameEn: 'Column Cactus' },
  { scientificName: 'Cereus peruvianus',           commonNameEn: 'Peruvian Apple Cactus' },
  { scientificName: 'Echinopsis tubiflora',        commonNameEn: 'Torch Cactus' },
  { scientificName: 'Echinopsis subdenudata',      commonNameEn: 'Domino Cactus' },
  { scientificName: 'Gymnocalycium mihanovichii',  commonNameEn: 'Moon Cactus' },
  { scientificName: 'Mammillaria gracilis',        commonNameEn: 'Thimble Cactus' },
  { scientificName: 'Mammillaria hahniana',        commonNameEn: 'Old Lady Cactus' },
  { scientificName: 'Mammillaria bocasana',        commonNameEn: 'Powder Puff Cactus' },
  { scientificName: 'Echinocactus grusonii',       commonNameEn: 'Golden Barrel Cactus' },
  { scientificName: 'Ferocactus wislizeni',        commonNameEn: 'Fishhook Barrel Cactus' },
  { scientificName: 'Rhipsalis baccifera',         commonNameEn: 'Mistletoe Cactus' },
  { scientificName: 'Schlumbergera truncata',      commonNameEn: 'Christmas Cactus' },
  { scientificName: 'Epiphyllum oxypetalum',       commonNameEn: 'Queen of the Night Cactus' },
  { scientificName: 'Selenicereus undatus',        commonNameEn: 'Dragon Fruit Cactus' },
  { scientificName: 'Astrophytum asterias',        commonNameEn: 'Sand Dollar Cactus' },
  { scientificName: 'Astrophytum ornatum',         commonNameEn: 'Monk\'s Hood Cactus' },
  { scientificName: 'Cephalocereus senilis',       commonNameEn: 'Old Man Cactus' },
  { scientificName: 'Cleistocactus straussii',     commonNameEn: 'Silver Torch Cactus' },
  { scientificName: 'Parodia magnifica',           commonNameEn: 'Balloon Cactus' },
  { scientificName: 'Rebutia minuscula',           commonNameEn: 'Red Crown Cactus' },
  { scientificName: 'Trichocereus pachanoi',       commonNameEn: 'San Pedro Cactus' },
  { scientificName: 'Pilosocereus pachycladus',    commonNameEn: 'Blue Torch Cactus' },
  { scientificName: 'Notocactus ottonis',          commonNameEn: 'Indian Head Cactus' },

  // ── HERBS AND AROMATICS ──────────────────────────────────────────────────────
  { scientificName: 'Ocimum basilicum',            commonNameEn: 'Sweet Basil' },
  { scientificName: 'Ocimum tenuiflorum',          commonNameEn: 'Holy Basil' },
  { scientificName: 'Mentha spicata',              commonNameEn: 'Spearmint' },
  { scientificName: 'Mentha piperita',             commonNameEn: 'Peppermint' },
  { scientificName: 'Mentha aquatica',             commonNameEn: 'Water Mint' },
  { scientificName: 'Thymus vulgaris',             commonNameEn: 'Common Thyme' },
  { scientificName: 'Thymus serpyllum',            commonNameEn: 'Wild Thyme' },
  { scientificName: 'Salvia rosmarinus',           commonNameEn: 'Rosemary' },
  { scientificName: 'Origanum vulgare',            commonNameEn: 'Oregano' },
  { scientificName: 'Salvia officinalis',          commonNameEn: 'Common Sage' },
  { scientificName: 'Coriandrum sativum',          commonNameEn: 'Cilantro' },
  { scientificName: 'Allium schoenoprasum',        commonNameEn: 'Chives' },
  { scientificName: 'Petroselinum crispum',        commonNameEn: 'Parsley' },
  { scientificName: 'Anethum graveolens',          commonNameEn: 'Dill' },
  { scientificName: 'Foeniculum vulgare',          commonNameEn: 'Fennel' },
  { scientificName: 'Artemisia dracunculus',       commonNameEn: 'Tarragon' },
  { scientificName: 'Melissa officinalis',         commonNameEn: 'Lemon Balm' },
  { scientificName: 'Lavandula angustifolia',      commonNameEn: 'English Lavender' },
  { scientificName: 'Lavandula stoechas',          commonNameEn: 'French Lavender' },
  { scientificName: 'Laurus nobilis',              commonNameEn: 'Bay Laurel' },
  { scientificName: 'Pelargonium graveolens',      commonNameEn: 'Rose-scented Geranium' },
  { scientificName: 'Aloysia citrodora',           commonNameEn: 'Lemon Verbena' },
  { scientificName: 'Hyssopus officinalis',        commonNameEn: 'Hyssop' },
  { scientificName: 'Borago officinalis',          commonNameEn: 'Borage' },
  { scientificName: 'Satureja hortensis',          commonNameEn: 'Summer Savory' },
  { scientificName: 'Cymbopogon citratus',         commonNameEn: 'Lemongrass' },
  { scientificName: 'Zingiber officinale',         commonNameEn: 'Ginger' },
  { scientificName: 'Stevia rebaudiana',           commonNameEn: 'Stevia' },

  // ── EDIBLE / VEGETABLES IN CONTAINERS ───────────────────────────────────────
  { scientificName: 'Solanum lycopersicum',        commonNameEn: 'Tomato' },
  { scientificName: 'Capsicum annuum',             commonNameEn: 'Sweet Pepper' },
  { scientificName: 'Capsicum frutescens',         commonNameEn: 'Hot Pepper' },
  { scientificName: 'Cucumis sativus',             commonNameEn: 'Cucumber' },
  { scientificName: 'Cucurbita pepo',              commonNameEn: 'Zucchini' },
  { scientificName: 'Phaseolus vulgaris',          commonNameEn: 'Green Bean' },
  { scientificName: 'Lactuca sativa',              commonNameEn: 'Lettuce' },
  { scientificName: 'Spinacia oleracea',           commonNameEn: 'Spinach' },
  { scientificName: 'Fragaria ananassa',           commonNameEn: 'Garden Strawberry' },
  { scientificName: 'Solanum melongena',           commonNameEn: 'Eggplant' },
  { scientificName: 'Beta vulgaris',               commonNameEn: 'Beet' },
  { scientificName: 'Raphanus sativus',            commonNameEn: 'Radish' },
  { scientificName: 'Allium cepa',                 commonNameEn: 'Onion' },
  { scientificName: 'Allium sativum',              commonNameEn: 'Garlic' },
  { scientificName: 'Vitis vinifera',              commonNameEn: 'Grapevine' },
  { scientificName: 'Ribes nigrum',                commonNameEn: 'Black Currant' },
  { scientificName: 'Ribes rubrum',                commonNameEn: 'Red Currant' },
  { scientificName: 'Rubus idaeus',                commonNameEn: 'Raspberry' },
  { scientificName: 'Malus domestica',             commonNameEn: 'Apple Tree' },
  { scientificName: 'Ficus carica',                commonNameEn: 'Fig Tree' },

  // ── GARDEN ANNUALS ──────────────────────────────────────────────────────────
  { scientificName: 'Tagetes patula',              commonNameEn: 'French Marigold' },
  { scientificName: 'Tagetes erecta',              commonNameEn: 'African Marigold' },
  { scientificName: 'Petunia hybrida',             commonNameEn: 'Garden Petunia' },
  { scientificName: 'Impatiens walleriana',        commonNameEn: 'Busy Lizzie' },
  { scientificName: 'Viola tricolor',              commonNameEn: 'Pansy' },
  { scientificName: 'Viola cornuta',               commonNameEn: 'Horned Violet' },
  { scientificName: 'Zinnia elegans',              commonNameEn: 'Common Zinnia' },
  { scientificName: 'Lobelia erinus',              commonNameEn: 'Trailing Lobelia' },
  { scientificName: 'Lobularia maritima',          commonNameEn: 'Sweet Alyssum' },
  { scientificName: 'Cosmos bipinnatus',           commonNameEn: 'Cosmos' },
  { scientificName: 'Calendula officinalis',       commonNameEn: 'Pot Marigold' },
  { scientificName: 'Helianthus annuus',           commonNameEn: 'Sunflower' },
  { scientificName: 'Antirrhinum majus',           commonNameEn: 'Snapdragon' },
  { scientificName: 'Matthiola incana',            commonNameEn: 'Stock' },
  { scientificName: 'Nicotiana alata',             commonNameEn: 'Flowering Tobacco' },
  { scientificName: 'Portulaca grandiflora',       commonNameEn: 'Moss Rose' },
  { scientificName: 'Catharanthus roseus',         commonNameEn: 'Vinca' },
  { scientificName: 'Dianthus barbatus',           commonNameEn: 'Sweet William' },
  { scientificName: 'Celosia cristata',            commonNameEn: 'Cockscomb' },
  { scientificName: 'Cleome hassleriana',          commonNameEn: 'Spider Flower' },
  { scientificName: 'Nigella damascena',           commonNameEn: 'Love-in-a-Mist' },
  { scientificName: 'Papaver rhoeas',              commonNameEn: 'Corn Poppy' },
  { scientificName: 'Scabiosa atropurpurea',       commonNameEn: 'Pincushion Flower' },
  { scientificName: 'Tropaeolum majus',            commonNameEn: 'Nasturtium' },
  { scientificName: 'Eschscholzia californica',    commonNameEn: 'California Poppy' },
  { scientificName: 'Centaurea cyanus',            commonNameEn: 'Cornflower' },
  { scientificName: 'Lathyrus odoratus',           commonNameEn: 'Sweet Pea' },
  { scientificName: 'Phlox drummondii',            commonNameEn: 'Annual Phlox' },
  { scientificName: 'Gazania rigens',              commonNameEn: 'Treasure Flower' },
  { scientificName: 'Salvia splendens',            commonNameEn: 'Scarlet Sage' },

  // ── PELARGONIUMS / GERANIUMS ─────────────────────────────────────────────────
  { scientificName: 'Pelargonium hortorum',        commonNameEn: 'Zonal Geranium' },
  { scientificName: 'Pelargonium peltatum',        commonNameEn: 'Ivy Geranium' },

  // ── GARDEN PERENNIALS ────────────────────────────────────────────────────────
  { scientificName: 'Hosta plantaginea',           commonNameEn: 'Fragrant Hosta' },
  { scientificName: 'Hosta sieboldiana',           commonNameEn: "Siebold's Hosta" },
  { scientificName: 'Hemerocallis fulva',          commonNameEn: 'Orange Daylily' },
  { scientificName: 'Echinacea purpurea',          commonNameEn: 'Purple Coneflower' },
  { scientificName: 'Rudbeckia hirta',             commonNameEn: 'Black-Eyed Susan' },
  { scientificName: 'Rudbeckia fulgida',           commonNameEn: 'Orange Coneflower' },
  { scientificName: 'Achillea millefolium',        commonNameEn: 'Common Yarrow' },
  { scientificName: 'Salvia nemorosa',             commonNameEn: 'Woodland Sage' },
  { scientificName: 'Nepeta racemosa',             commonNameEn: 'Catmint' },
  { scientificName: 'Phlox paniculata',            commonNameEn: 'Summer Phlox' },
  { scientificName: 'Astilbe arendsii',            commonNameEn: 'Astilbe' },
  { scientificName: 'Aquilegia vulgaris',          commonNameEn: 'Columbine' },
  { scientificName: 'Delphinium elatum',           commonNameEn: 'Candle Larkspur' },
  { scientificName: 'Leucanthemum vulgare',        commonNameEn: 'Ox-Eye Daisy' },
  { scientificName: 'Gypsophila paniculata',       commonNameEn: "Baby's Breath" },
  { scientificName: 'Geranium sanguineum',         commonNameEn: 'Bloody Cranesbill' },
  { scientificName: 'Coreopsis grandiflora',       commonNameEn: 'Large-Flowered Tickseed' },
  { scientificName: 'Gaillardia aristata',         commonNameEn: 'Blanket Flower' },
  { scientificName: 'Liatris spicata',             commonNameEn: 'Blazing Star' },
  { scientificName: 'Monarda didyma',              commonNameEn: 'Bee Balm' },
  { scientificName: 'Campanula persicifolia',      commonNameEn: 'Peach-Leaved Bellflower' },
  { scientificName: 'Dianthus plumarius',          commonNameEn: 'Garden Pink' },
  { scientificName: 'Primula vulgaris',            commonNameEn: 'Common Primrose' },
  { scientificName: 'Bergenia cordifolia',         commonNameEn: 'Heartleaf Bergenia' },
  { scientificName: 'Helleborus niger',            commonNameEn: 'Christmas Rose' },
  { scientificName: 'Alcea rosea',                 commonNameEn: 'Common Hollyhock' },
  { scientificName: 'Aster novi-belgii',           commonNameEn: 'Michaelmas Daisy' },
  { scientificName: 'Verbena bonariensis',         commonNameEn: 'Tall Verbena' },
  { scientificName: 'Paeonia lactiflora',          commonNameEn: 'Chinese Peony' },
  { scientificName: 'Paeonia officinalis',         commonNameEn: 'Common Peony' },
  { scientificName: 'Chrysanthemum morifolium',    commonNameEn: 'Florist Chrysanthemum' },
  { scientificName: 'Echinops ritro',              commonNameEn: 'Small Globe Thistle' },
  { scientificName: 'Digitalis purpurea',          commonNameEn: 'Foxglove' },
  { scientificName: 'Lupinus polyphyllus',         commonNameEn: 'Garden Lupin' },
  { scientificName: 'Kniphofia uvaria',            commonNameEn: 'Red Hot Poker' },
  { scientificName: 'Coreopsis verticillata',      commonNameEn: 'Threadleaf Coreopsis' },
  { scientificName: 'Geum chiloense',              commonNameEn: 'Chilean Avens' },
  { scientificName: 'Scabiosa caucasica',          commonNameEn: 'Caucasian Pincushion Flower' },
  { scientificName: 'Perovskia atriplicifolia',    commonNameEn: 'Russian Sage' },
  { scientificName: 'Veronicastrum virginicum',    commonNameEn: 'Culver\'s Root' },
  { scientificName: 'Filipendula ulmaria',         commonNameEn: 'Meadowsweet' },
  { scientificName: 'Ligularia dentata',           commonNameEn: 'Leopard Plant' },
  { scientificName: 'Agastache foeniculum',        commonNameEn: 'Anise Hyssop' },
  { scientificName: 'Centranthus ruber',           commonNameEn: 'Red Valerian' },
  { scientificName: 'Hesperis matronalis',         commonNameEn: 'Dame\'s Rocket' },
  { scientificName: 'Polemonium caeruleum',        commonNameEn: 'Jacob\'s Ladder' },
  { scientificName: 'Armeria maritima',            commonNameEn: 'Sea Thrift' },
  { scientificName: 'Erysimum cheiri',             commonNameEn: 'Wallflower' },
  { scientificName: 'Gaura lindheimeri',           commonNameEn: 'Gaura' },
  { scientificName: 'Lythrum salicaria',           commonNameEn: 'Purple Loosestrife' },
  { scientificName: 'Penstemon digitalis',         commonNameEn: 'Foxglove Beardtongue' },
  { scientificName: 'Sidalcea malviflora',         commonNameEn: 'Prairie Mallow' },

  // ── BULBS ────────────────────────────────────────────────────────────────────
  { scientificName: 'Tulipa gesneriana',           commonNameEn: 'Garden Tulip' },
  { scientificName: 'Tulipa kaufmanniana',         commonNameEn: 'Waterlily Tulip' },
  { scientificName: 'Narcissus pseudonarcissus',   commonNameEn: 'Daffodil' },
  { scientificName: 'Narcissus poeticus',          commonNameEn: "Poet's Daffodil" },
  { scientificName: 'Hyacinthus orientalis',       commonNameEn: 'Common Hyacinth' },
  { scientificName: 'Crocus sativus',              commonNameEn: 'Saffron Crocus' },
  { scientificName: 'Crocus vernus',               commonNameEn: 'Spring Crocus' },
  { scientificName: 'Muscari armeniacum',          commonNameEn: 'Grape Hyacinth' },
  { scientificName: 'Allium giganteum',            commonNameEn: 'Giant Allium' },
  { scientificName: 'Allium hollandicum',          commonNameEn: 'Dutch Garlic' },
  { scientificName: 'Lilium candidum',             commonNameEn: 'Madonna Lily' },
  { scientificName: 'Lilium tigrinum',             commonNameEn: 'Tiger Lily' },
  { scientificName: 'Lilium speciosum',            commonNameEn: 'Showy Japanese Lily' },
  { scientificName: 'Iris germanica',              commonNameEn: 'Bearded Iris' },
  { scientificName: 'Iris sibirica',               commonNameEn: 'Siberian Iris' },
  { scientificName: 'Iris reticulata',             commonNameEn: 'Netted Iris' },
  { scientificName: 'Gladiolus communis',          commonNameEn: 'Common Gladiolus' },
  { scientificName: 'Dahlia pinnata',              commonNameEn: 'Garden Dahlia' },
  { scientificName: 'Ranunculus asiaticus',        commonNameEn: 'Persian Buttercup' },
  { scientificName: 'Freesia refracta',            commonNameEn: 'Freesia' },
  { scientificName: 'Anemone coronaria',           commonNameEn: 'Poppy Anemone' },
  { scientificName: 'Chionodoxa luciliae',         commonNameEn: 'Glory of the Snow' },
  { scientificName: 'Scilla siberica',             commonNameEn: 'Siberian Squill' },
  { scientificName: 'Galanthus nivalis',           commonNameEn: 'Common Snowdrop' },
  { scientificName: 'Leucojum vernum',             commonNameEn: 'Spring Snowflake' },
  { scientificName: 'Eranthis hyemalis',           commonNameEn: 'Winter Aconite' },
  { scientificName: 'Crocosmia masoniorum',        commonNameEn: 'Montbretia' },
  { scientificName: 'Ornithogalum umbellatum',     commonNameEn: 'Star of Bethlehem' },
  { scientificName: 'Camassia quamash',            commonNameEn: 'Common Camas' },
  { scientificName: 'Sprekelia formosissima',      commonNameEn: 'Aztec Lily' },

  // ── ROSES ────────────────────────────────────────────────────────────────────
  { scientificName: 'Rosa canina',                 commonNameEn: 'Dog Rose' },
  { scientificName: 'Rosa gallica',                commonNameEn: 'French Rose' },
  { scientificName: 'Rosa damascena',              commonNameEn: 'Damask Rose' },
  { scientificName: 'Rosa centifolia',             commonNameEn: 'Cabbage Rose' },
  { scientificName: 'Rosa rugosa',                 commonNameEn: 'Rugosa Rose' },
  { scientificName: 'Rosa moschata',               commonNameEn: 'Musk Rose' },
  { scientificName: 'Rosa banksiae',               commonNameEn: 'Banksia Rose' },
  { scientificName: 'Rosa multiflora',             commonNameEn: 'Multiflora Rose' },
  { scientificName: 'Rosa wichuraiana',            commonNameEn: 'Memorial Rose' },
  { scientificName: 'Rosa eglanteria',             commonNameEn: 'Sweet Briar' },

  // ── GARDEN SHRUBS ────────────────────────────────────────────────────────────
  { scientificName: 'Hydrangea macrophylla',       commonNameEn: 'Bigleaf Hydrangea' },
  { scientificName: 'Hydrangea paniculata',        commonNameEn: 'Panicle Hydrangea' },
  { scientificName: 'Hydrangea arborescens',       commonNameEn: 'Smooth Hydrangea' },
  { scientificName: 'Hydrangea quercifolia',       commonNameEn: 'Oakleaf Hydrangea' },
  { scientificName: 'Syringa vulgaris',            commonNameEn: 'Common Lilac' },
  { scientificName: 'Forsythia suspensa',          commonNameEn: 'Weeping Forsythia' },
  { scientificName: 'Forsythia viridissima',       commonNameEn: 'Greenstem Forsythia' },
  { scientificName: 'Spiraea japonica',            commonNameEn: 'Japanese Spirea' },
  { scientificName: 'Spiraea vanhouttei',          commonNameEn: 'Vanhoutte Spirea' },
  { scientificName: 'Weigela florida',             commonNameEn: 'Old-Fashioned Weigela' },
  { scientificName: 'Deutzia gracilis',            commonNameEn: 'Slender Deutzia' },
  { scientificName: 'Deutzia scabra',              commonNameEn: 'Fuzzy Deutzia' },
  { scientificName: 'Buxus sempervirens',          commonNameEn: 'Common Boxwood' },
  { scientificName: 'Thuja occidentalis',          commonNameEn: 'Eastern Arborvitae' },
  { scientificName: 'Thuja plicata',               commonNameEn: 'Western Red Cedar' },
  { scientificName: 'Euonymus fortunei',           commonNameEn: 'Wintercreeper Euonymus' },
  { scientificName: 'Euonymus alatus',             commonNameEn: 'Burning Bush' },
  { scientificName: 'Berberis thunbergii',         commonNameEn: 'Japanese Barberry' },
  { scientificName: 'Cotoneaster horizontalis',    commonNameEn: 'Rockspray Cotoneaster' },
  { scientificName: 'Viburnum opulus',             commonNameEn: 'European Cranberrybush' },
  { scientificName: 'Viburnum tinus',              commonNameEn: 'Laurustinus' },
  { scientificName: 'Buddleja davidii',            commonNameEn: 'Butterfly Bush' },
  { scientificName: 'Potentilla fruticosa',        commonNameEn: 'Shrubby Cinquefoil' },
  { scientificName: 'Kolkwitzia amabilis',         commonNameEn: 'Beauty Bush' },
  { scientificName: 'Philadelphus coronarius',     commonNameEn: 'Mock Orange' },
  { scientificName: 'Physocarpus opulifolius',     commonNameEn: 'Ninebark' },
  { scientificName: 'Kerria japonica',             commonNameEn: 'Japanese Kerria' },
  { scientificName: 'Chaenomeles speciosa',        commonNameEn: 'Flowering Quince' },
  { scientificName: 'Pyracantha coccinea',         commonNameEn: 'Scarlet Firethorn' },
  { scientificName: 'Ligustrum ovalifolium',       commonNameEn: 'Garden Privet' },
  { scientificName: 'Lonicera nitida',             commonNameEn: 'Box-Leaved Honeysuckle' },
  { scientificName: 'Hibiscus syriacus',           commonNameEn: 'Rose of Sharon' },
  { scientificName: 'Cotinus coggygria',           commonNameEn: 'Smoke Bush' },
  { scientificName: 'Amelanchier lamarckii',       commonNameEn: 'Juneberry' },
  { scientificName: 'Caryopteris incana',          commonNameEn: 'Bluebeard' },

  // ── ORNAMENTAL TREES ─────────────────────────────────────────────────────────
  { scientificName: 'Magnolia grandiflora',        commonNameEn: 'Southern Magnolia' },
  { scientificName: 'Magnolia stellata',           commonNameEn: 'Star Magnolia' },
  { scientificName: 'Prunus cerasifera',           commonNameEn: 'Cherry Plum' },
  { scientificName: 'Prunus serrulata',            commonNameEn: 'Japanese Cherry' },
  { scientificName: 'Acer palmatum',               commonNameEn: 'Japanese Maple' },
  { scientificName: 'Cercis siliquastrum',         commonNameEn: 'Judas Tree' },
  { scientificName: 'Betula pendula',              commonNameEn: 'Silver Birch' },
  { scientificName: 'Sorbus aucuparia',            commonNameEn: 'Mountain Ash' },
  { scientificName: 'Cornus mas',                  commonNameEn: 'Cornelian Cherry' },
  { scientificName: 'Catalpa bignonioides',        commonNameEn: 'Indian Bean Tree' },
  { scientificName: 'Salix babylonica',            commonNameEn: 'Weeping Willow' },
  { scientificName: 'Pyrus communis',              commonNameEn: 'Common Pear' },
  { scientificName: 'Liriodendron tulipifera',     commonNameEn: 'Tulip Tree' },
  { scientificName: 'Robinia pseudoacacia',        commonNameEn: 'Black Locust' },
  { scientificName: 'Paulownia tomentosa',         commonNameEn: 'Empress Tree' },

  // ── CLIMBING PLANTS ──────────────────────────────────────────────────────────
  { scientificName: 'Wisteria sinensis',           commonNameEn: 'Chinese Wisteria' },
  { scientificName: 'Clematis vitalba',            commonNameEn: "Old Man's Beard Clematis" },
  { scientificName: 'Clematis montana',            commonNameEn: 'Mountain Clematis' },
  { scientificName: 'Clematis jackmanii',          commonNameEn: 'Jackman Clematis' },
  { scientificName: 'Jasminum officinale',         commonNameEn: 'Common Jasmine' },
  { scientificName: 'Jasminum nudiflorum',         commonNameEn: 'Winter Jasmine' },
  { scientificName: 'Lonicera japonica',           commonNameEn: 'Japanese Honeysuckle' },
  { scientificName: 'Lonicera periclymenum',       commonNameEn: 'European Honeysuckle' },
  { scientificName: 'Passiflora caerulea',         commonNameEn: 'Blue Passionflower' },
  { scientificName: 'Campsis radicans',            commonNameEn: 'Trumpet Vine' },
  { scientificName: 'Parthenocissus tricuspidata', commonNameEn: 'Boston Ivy' },
  { scientificName: 'Humulus lupulus',             commonNameEn: 'Common Hop' },
  { scientificName: 'Lathyrus latifolius',         commonNameEn: 'Everlasting Sweet Pea' },
  { scientificName: 'Actinidia deliciosa',         commonNameEn: 'Kiwi Vine' },
  { scientificName: 'Aristolochia macrophylla',    commonNameEn: 'Dutchman\'s Pipe' },

  // ── WATER AND BOG PLANTS ─────────────────────────────────────────────────────
  { scientificName: 'Nymphaea alba',               commonNameEn: 'White Water Lily' },
  { scientificName: 'Nuphar lutea',                commonNameEn: 'Yellow Pond Lily' },
  { scientificName: 'Iris pseudacorus',            commonNameEn: 'Yellow Flag Iris' },
  { scientificName: 'Typha latifolia',             commonNameEn: 'Common Cattail' },
  { scientificName: 'Pontederia cordata',          commonNameEn: 'Pickerelweed' },
  { scientificName: 'Sagittaria sagittifolia',     commonNameEn: 'Arrowhead Plant' },
  { scientificName: 'Caltha palustris',            commonNameEn: 'Marsh Marigold' },
  { scientificName: 'Nelumbo nucifera',            commonNameEn: 'Sacred Lotus' },
  { scientificName: 'Eichhornia crassipes',        commonNameEn: 'Water Hyacinth' },
  { scientificName: 'Pistia stratiotes',           commonNameEn: 'Water Lettuce' },

  // ── ORNAMENTAL GRASSES AND BAMBOOS ──────────────────────────────────────────
  { scientificName: 'Pennisetum alopecuroides',    commonNameEn: 'Fountain Grass' },
  { scientificName: 'Miscanthus sinensis',         commonNameEn: 'Chinese Silver Grass' },
  { scientificName: 'Festuca glauca',              commonNameEn: 'Blue Fescue' },
  { scientificName: 'Carex morrowii',              commonNameEn: "Morrow's Sedge" },
  { scientificName: 'Stipa tenuissima',            commonNameEn: 'Mexican Feather Grass' },
  { scientificName: 'Molinia caerulea',            commonNameEn: 'Purple Moor Grass' },
  { scientificName: 'Cortaderia selloana',         commonNameEn: 'Pampas Grass' },
  { scientificName: 'Phyllostachys aurea',         commonNameEn: 'Golden Bamboo' },
  { scientificName: 'Helictotrichon sempervirens', commonNameEn: 'Blue Oat Grass' },
  { scientificName: 'Hakonechloa macra',           commonNameEn: 'Japanese Forest Grass' },

  // ── GROUND COVERS ────────────────────────────────────────────────────────────
  { scientificName: 'Vinca minor',                 commonNameEn: 'Lesser Periwinkle' },
  { scientificName: 'Vinca major',                 commonNameEn: 'Greater Periwinkle' },
  { scientificName: 'Pachysandra terminalis',      commonNameEn: 'Japanese Spurge' },
  { scientificName: 'Ajuga reptans',               commonNameEn: 'Bugle Weed' },
  { scientificName: 'Lamium maculatum',            commonNameEn: 'Spotted Dead Nettle' },
  { scientificName: 'Arabis caucasica',            commonNameEn: 'Rock Cress' },
  { scientificName: 'Aubrieta deltoidea',          commonNameEn: 'Aubrieta' },
  { scientificName: 'Aurinia saxatilis',           commonNameEn: 'Basket of Gold' },
  { scientificName: 'Thymus pseudolanuginosus',    commonNameEn: 'Woolly Thyme' },
  { scientificName: 'Sedum acre',                  commonNameEn: 'Golden Stonecrop' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function loadProgress(): Progress {
  if (existsSync(PROGRESS_FILE)) {
    const raw = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
    // Old Perenual-era progress file has a different shape — start fresh
    if (!Array.isArray(raw.completed)) {
      console.log('⚠  Old progress file detected — starting fresh\n');
      return { completed: [] };
    }
    return raw as Progress;
  }
  return { completed: [] };
}

function saveProgress(p: Progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2), 'utf8');
}

function sanitizeBg(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .replace(/і/g, 'и')
    .replace(/ї/g, 'и')
    .replace(/є/g, 'е')
    .replace(/қ/g, 'к')
    .replace(/ң/g, 'н')
    .replace(/ё/g, 'е')
    .replace(/э/g, 'е');
}

// ── Image fetch — iNaturalist first, Wikipedia fallback ──────────────────────

async function fetchPlantImage(scientificName: string): Promise<string | null> {
  // 1. Try iNaturalist — real photos, stable S3 URLs, excellent coverage
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&per_page=3&rank=species,genus`;
    const res = await fetch(url, { headers: { 'User-Agent': 'scarlet-plant-shop/1.0 (educational project)' } });
    if (res.ok) {
      const json = await res.json() as {
        results?: Array<{ name: string; default_photo?: { medium_url?: string } }>
      };
      for (const taxon of json.results ?? []) {
        if (!taxon.name.toLowerCase().startsWith(scientificName.split(' ')[0].toLowerCase())) continue;
        const photo = taxon.default_photo?.medium_url;
        if (photo) return photo.replace('/square.', '/medium.').replace('/thumb.', '/medium.');
      }
    }
  } catch { /* fall through */ }

  // 2. Fallback: Wikipedia article image
  try {
    const title = encodeURIComponent(scientificName);
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=pageimages&format=json&pithumbsize=800&redirects=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'scarlet-plant-shop/1.0 (educational project)' } });
    if (res.ok) {
      const json = await res.json() as {
        query?: { pages?: Record<string, { thumbnail?: { source: string } }> }
      };
      const page = Object.values(json.query?.pages ?? {})[0];
      if (page?.thumbnail?.source) return page.thumbnail.source;
    }
  } catch { /* ignore */ }

  return null;
}

// ── iNaturalist — Bulgarian common name ──────────────────────────────────────

async function fetchInatBgName(scientificName: string): Promise<string | null> {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&locale=bg&per_page=1&rank=species`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'scarlet-plant-shop/1.0 (educational project)' },
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      results?: Array<{ name: string; preferred_common_name?: string }>
    };
    const taxon = json.results?.[0];
    // Only accept if it actually matched our species
    if (!taxon || taxon.name.toLowerCase() !== scientificName.toLowerCase()) return null;
    const name = taxon.preferred_common_name ?? null;
    if (!name) return null;
    // Only use if it contains Cyrillic — otherwise it's just English
    return /[А-Яа-яЁё]/.test(name) ? name : null;
  } catch {
    return null;
  }
}

// ── Bulgarian Wikipedia — description + page title as name source ────────────

async function fetchBgWiki(scientificName: string): Promise<{ name: string | null; description: string | null }> {
  const title = encodeURIComponent(scientificName);
  const url = `https://bg.wikipedia.org/w/api.php?action=query&titles=${title}&prop=extracts|info&inprop=displaytitle&exintro=1&exsentences=3&explaintext=1&format=json&redirects=1`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'scarlet-plant-shop/1.0 (educational project)' },
    });
    if (!res.ok) return { name: null, description: null };
    const json = await res.json() as {
      query?: {
        redirects?: Array<{ from: string; to: string }>;
        pages?: Record<string, { extract?: string; missing?: string; title?: string }>;
      }
    };
    const pages = json.query?.pages ?? {};
    const page = Object.values(pages)[0];
    if (!page || 'missing' in page) return { name: null, description: null };

    // The redirected-to title is the real Bulgarian page name
    const pageTitle = page.title ?? null;
    const bgName = pageTitle && /[А-Яа-яЁё]/.test(pageTitle) ? pageTitle : null;

    const text = page.extract?.trim();
    const description = text && text.length >= 30
      ? text.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim()
      : null;

    return { name: bgName, description };
  } catch {
    return { name: null, description: null };
  }
}

// ── Genus transliteration fallback ───────────────────────────────────────────
// Used when no real Bulgarian source has a name — always derived from the
// scientific name genus, NEVER from the English common name.

function transliterateGenus(scientificName: string): string {
  const genus = scientificName.split(' ')[0];
  return genus
    // Multi-char sequences first
    .replace(/Ae|ae/g, (m) => m[0] === 'A' ? 'Е' : 'е')
    .replace(/Oe|oe/g, (m) => m[0] === 'O' ? 'Е' : 'е')
    .replace(/[Qq]u/g, 'кв')
    .replace(/[Cc]h/g, (m) => m[0] === 'C' ? 'Х' : 'х')
    .replace(/[Pp]h/g, (m) => m[0] === 'P' ? 'Ф' : 'ф')
    .replace(/[Tt]h/g, (m) => m[0] === 'T' ? 'Т' : 'т')
    .replace(/[Cc]k/g, (m) => m[0] === 'C' ? 'К' : 'к')
    // Single chars
    .replace(/A/g,'А').replace(/a/g,'а')
    .replace(/B/g,'Б').replace(/b/g,'б')
    .replace(/C/g,'К').replace(/c/g,'к')
    .replace(/D/g,'Д').replace(/d/g,'д')
    .replace(/E/g,'Е').replace(/e/g,'е')
    .replace(/F/g,'Ф').replace(/f/g,'ф')
    .replace(/G/g,'Г').replace(/g/g,'г')
    .replace(/H/g,'Х').replace(/h/g,'х')
    .replace(/I/g,'И').replace(/i/g,'и')
    .replace(/J/g,'Й').replace(/j/g,'й')
    .replace(/K/g,'К').replace(/k/g,'к')
    .replace(/L/g,'Л').replace(/l/g,'л')
    .replace(/M/g,'М').replace(/m/g,'м')
    .replace(/N/g,'Н').replace(/n/g,'н')
    .replace(/O/g,'О').replace(/o/g,'о')
    .replace(/P/g,'П').replace(/p/g,'п')
    .replace(/R/g,'Р').replace(/r/g,'р')
    .replace(/S/g,'С').replace(/s/g,'с')
    .replace(/T/g,'Т').replace(/t/g,'т')
    .replace(/U/g,'У').replace(/u/g,'у')
    .replace(/V/g,'В').replace(/v/g,'в')
    .replace(/W/g,'В').replace(/w/g,'в')
    .replace(/X/g,'Кс').replace(/x/g,'кс')
    .replace(/Y/g,'И').replace(/y/g,'и')
    .replace(/Z/g,'З').replace(/z/g,'з');
}

// ── Wikidata SPARQL — Bulgarian label by scientific name ──────────────────────

async function fetchWikidataBgName(scientificName: string): Promise<string | null> {
  const query = `SELECT ?itemLabel WHERE {
    ?item wdt:P225 "${scientificName.replace(/"/g, '\\"')}" .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "bg" . }
  } LIMIT 1`;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'scarlet-plant-shop/1.0 (educational project)',
        'Accept': 'application/sparql-results+json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      results?: { bindings?: Array<{ itemLabel?: { value: string } }> }
    };
    const value = json.results?.bindings?.[0]?.itemLabel?.value ?? null;
    if (!value) return null;
    // Only accept Cyrillic results — discard if Wikidata just returned the scientific name
    return /[А-Яа-яЁё]/.test(value) ? value : null;
  } catch {
    return null;
  }
}

// ── English Wikipedia — description ──────────────────────────────────────────

async function fetchEnWikiDescription(scientificName: string): Promise<string | null> {
  const title = encodeURIComponent(scientificName);
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=extracts&exintro=1&exsentences=3&explaintext=1&format=json&redirects=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'scarlet-plant-shop/1.0 (educational project)' } });
    if (!res.ok) return null;
    const json = await res.json() as { query?: { pages?: Record<string, { extract?: string; missing?: string }> } };
    const page = Object.values(json.query?.pages ?? {})[0];
    if (!page || 'missing' in page) return null;
    const text = page.extract?.trim();
    return text && text.length > 30 ? text.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim() : null;
  } catch { return null; }
}

// ── Care profiles — no AI needed ──────────────────────────────────────────────

type ProfileKey =
  | 'INDOOR_EASY' | 'INDOOR_MODERATE' | 'INDOOR_HUMID'
  | 'ORCHID' | 'PALM' | 'FERN' | 'BROMELIAD'
  | 'SUCCULENT' | 'CACTUS' | 'DESERT_ROSE'
  | 'HERB' | 'VEGETABLE'
  | 'GARDEN_ANNUAL' | 'GARDEN_PERENNIAL' | 'BULB'
  | 'ROSE' | 'GARDEN_SHRUB' | 'CLIMBER' | 'TREE'
  | 'WATER_PLANT' | 'GRASS' | 'GROUNDCOVER';

interface CareProfile {
  careDifficulty: 'easy' | 'moderate' | 'difficult';
  wateringIntervalDays: number;
  fertilizingIntervalDays: number;
  repottingIntervalMonths: number;
  mistingNeeded: boolean;
  family: string | null;
  nativeRegionEn: string | null;
  nativeRegionBg: string | null;
  careGuide: CareGuide;
}

const PROFILES: Record<ProfileKey, CareProfile> = {
  INDOOR_EASY: {
    careDifficulty: 'easy', wateringIntervalDays: 14, fertilizingIntervalDays: 30,
    repottingIntervalMonths: 24, mistingNeeded: false, family: null,
    nativeRegionEn: 'Tropical regions', nativeRegionBg: 'Тропически региони',
    careGuide: {
      light:       { en: 'Tolerates low to bright indirect light.',                   bg: 'Понася слаба до ярка непряка светлина.' },
      watering:    { en: 'Water every 10–14 days; let soil dry out between waterings.', bg: 'Поливайте на 10–14 дни; оставете почвата да изсъхне между поливанията.' },
      humidity:    { en: 'Adapts to normal household humidity (30–50%).',              bg: 'Адаптира се към нормалната домашна влажност (30–50%).' },
      temperature: { en: 'Keep at 15–30 °C; tolerates fluctuations, avoid frost.',    bg: 'Дръжте при 15–30 °C; понася колебания, избягвайте замръзване.' },
      fertilizer:  { en: 'Fertilize once a month during spring and summer.',           bg: 'Торете веднъж месечно през пролетта и лятото.' },
      toxicity:    { en: 'Check species — toxicity varies.', bg: 'Проверете вида — токсичността варира.' },
    },
  },
  INDOOR_MODERATE: {
    careDifficulty: 'moderate', wateringIntervalDays: 7, fertilizingIntervalDays: 21,
    repottingIntervalMonths: 18, mistingNeeded: true, family: null,
    nativeRegionEn: 'Tropical America', nativeRegionBg: 'Тропическа Америка',
    careGuide: {
      light:       { en: 'Bright indirect light; avoid direct midday sun.',            bg: 'Ярка непряка светлина; избягвайте пряко пладнешко слънце.' },
      watering:    { en: 'Water when top 2–3 cm of soil dry out, every 7–10 days.',    bg: 'Поливайте когато горните 2–3 см почва изсъхнат, на 7–10 дни.' },
      humidity:    { en: 'Prefers 50–70% humidity; mist leaves or use a humidifier.',  bg: 'Обича 50–70% влажност; пръскайте листата или ползвайте овлажнител.' },
      temperature: { en: 'Keep at 18–27 °C; protect from cold drafts.',               bg: 'Дръжте при 18–27 °C; пазете от студени течения.' },
      fertilizer:  { en: 'Fertilize with liquid fertilizer every 3 weeks during growth.', bg: 'Торете с течен тор на 3 седмици по време на растеж.' },
      toxicity:    { en: 'Check species — many aroids are toxic to pets.',             bg: 'Проверете вида — много ароиди са токсични за домашни любимци.' },
    },
  },
  INDOOR_HUMID: {
    careDifficulty: 'difficult', wateringIntervalDays: 7, fertilizingIntervalDays: 14,
    repottingIntervalMonths: 12, mistingNeeded: true, family: null,
    nativeRegionEn: 'Tropical rainforests', nativeRegionBg: 'Тропически дъждовни гори',
    careGuide: {
      light:       { en: 'Bright indirect or filtered light; no direct sun.',          bg: 'Ярка непряка или филтрирана светлина; без пряко слънце.' },
      watering:    { en: 'Keep soil evenly moist; water every 5–7 days.',              bg: 'Поддържайте почвата равномерно влажна; поливайте на 5–7 дни.' },
      humidity:    { en: 'Needs high humidity 60–80%; use humidifier or pebble tray.', bg: 'Изисква висока влажност 60–80%; ползвайте овлажнител или тавичка с камъчета.' },
      temperature: { en: 'Maintain 18–26 °C consistently; very sensitive to cold.',   bg: 'Поддържайте постоянно 18–26 °C; много чувствително към студ.' },
      fertilizer:  { en: 'Fertilize every 2 weeks during spring and summer.',          bg: 'Торете на 2 седмици през пролетта и лятото.' },
      toxicity:    { en: 'Non-toxic to pets.',                                         bg: 'Безвредно за домашни любимци.' },
    },
  },
  ORCHID: {
    careDifficulty: 'moderate', wateringIntervalDays: 10, fertilizingIntervalDays: 14,
    repottingIntervalMonths: 24, mistingNeeded: true, family: 'Orchidaceae',
    nativeRegionEn: 'Tropical and subtropical regions worldwide', nativeRegionBg: 'Тропически и субтропични региони по целия свят',
    careGuide: {
      light:       { en: 'Bright indirect light; east- or west-facing window is ideal.', bg: 'Ярка непряка светлина; прозорец на изток или запад е идеален.' },
      watering:    { en: 'Water thoroughly every 7–10 days; let bark dry between waterings.', bg: 'Поливайте обилно на 7–10 дни; оставете кората да изсъхне между поливанията.' },
      humidity:    { en: 'Prefers 50–70% humidity; mist aerial roots lightly.',        bg: 'Предпочита 50–70% влажност; леко пръскайте въздушните корени.' },
      temperature: { en: 'Day 18–25 °C; night 13–18 °C to encourage blooming.',       bg: 'Ден 18–25 °C; нощ 13–18 °C за насърчаване на цъфтежа.' },
      fertilizer:  { en: 'Use orchid fertilizer at half strength every 2 weeks.',      bg: 'Торете с половин доза орхидеен тор на 2 седмици по време на растеж.' },
      toxicity:    { en: 'Non-toxic to cats and dogs.',                                bg: 'Безвреден за котки и кучета.' },
    },
  },
  PALM: {
    careDifficulty: 'easy', wateringIntervalDays: 10, fertilizingIntervalDays: 30,
    repottingIntervalMonths: 24, mistingNeeded: false, family: 'Arecaceae',
    nativeRegionEn: 'Tropical and subtropical regions', nativeRegionBg: 'Тропически и субтропични региони',
    careGuide: {
      light:       { en: 'Bright indirect to full sun depending on species.',          bg: 'Ярка непряка до пълно слънце в зависимост от вида.' },
      watering:    { en: 'Water every 10–14 days; allow top 3 cm to dry out.',        bg: 'Поливайте на 10–14 дни; оставете горните 3 см да изсъхнат.' },
      humidity:    { en: 'Tolerates average humidity; benefits from occasional misting.', bg: 'Понася средна влажност; пръскането от време на време е от полза.' },
      temperature: { en: 'Keep above 13 °C; most prefer 18–27 °C.',                   bg: 'Дръжте над 13 °C; повечето предпочитат 18–27 °C.' },
      fertilizer:  { en: 'Fertilize monthly during spring and summer with palm fertilizer.', bg: 'Торете месечно през пролетта и лятото с тор за палми.' },
      toxicity:    { en: 'Most palms are non-toxic to pets.',                          bg: 'Повечето палми са безвредни за домашни любимци.' },
    },
  },
  FERN: {
    careDifficulty: 'moderate', wateringIntervalDays: 5, fertilizingIntervalDays: 30,
    repottingIntervalMonths: 18, mistingNeeded: true, family: null,
    nativeRegionEn: 'Worldwide in moist, shaded habitats', nativeRegionBg: 'По целия свят в влажни, засенчени местообитания',
    careGuide: {
      light:       { en: 'Low to medium indirect light; avoid direct sun.',            bg: 'Слаба до средна непряка светлина; избягвайте пряко слънце.' },
      watering:    { en: 'Keep soil consistently moist; water every 4–6 days.',       bg: 'Поддържайте почвата постоянно влажна; поливайте на 4–6 дни.' },
      humidity:    { en: 'Needs high humidity 60–80%; mist daily or use humidifier.', bg: 'Нужна е висока влажност 60–80%; пръскайте ежедневно или ползвайте овлажнител.' },
      temperature: { en: 'Keep at 16–24 °C; avoid cold drafts.',                      bg: 'Дръжте при 16–24 °C; избягвайте студени течения.' },
      fertilizer:  { en: 'Fertilize monthly at half strength during growing season.', bg: 'Торете месечно с половин доза по време на растеж.' },
      toxicity:    { en: 'Most ferns are non-toxic to pets.',                          bg: 'Повечето папрати са безвредни за домашни любимци.' },
    },
  },
  BROMELIAD: {
    careDifficulty: 'easy', wateringIntervalDays: 10, fertilizingIntervalDays: 30,
    repottingIntervalMonths: 24, mistingNeeded: false, family: 'Bromeliaceae',
    nativeRegionEn: 'Tropical and subtropical Americas', nativeRegionBg: 'Тропическа и субтропична Америка',
    careGuide: {
      light:       { en: 'Bright indirect light; tolerates lower light levels.',       bg: 'Ярка непряка светлина; понася по-слабо осветление.' },
      watering:    { en: 'Keep the central cup filled with water; water soil every 10–14 days.', bg: 'Поддържайте централната чаша пълна с вода; поливайте почвата на 10–14 дни.' },
      humidity:    { en: 'Tolerates average humidity; prefers 40–60%.',                bg: 'Понася средна влажност; предпочита 40–60%.' },
      temperature: { en: 'Keep at 16–27 °C; avoid temperatures below 10 °C.',         bg: 'Дръжте при 16–27 °C; избягвайте температури под 10 °C.' },
      fertilizer:  { en: 'Fertilize monthly at quarter strength into the cup.',        bg: 'Торете месечно с четвърт доза директно в чашата.' },
      toxicity:    { en: 'Non-toxic to cats and dogs.',                                bg: 'Безвредно за котки и кучета.' },
    },
  },
  SUCCULENT: {
    careDifficulty: 'easy', wateringIntervalDays: 14, fertilizingIntervalDays: 30,
    repottingIntervalMonths: 24, mistingNeeded: false, family: null,
    nativeRegionEn: 'Arid and semi-arid regions worldwide', nativeRegionBg: 'Сухи и полусухи региони по целия свят',
    careGuide: {
      light:       { en: 'Full sun to bright indirect light; at least 4–6 hours daily.', bg: 'Пълно слънце до ярка непряка светлина; поне 4–6 часа дневно.' },
      watering:    { en: 'Water every 10–14 days; let soil dry completely between waterings.', bg: 'Поливайте на 10–14 дни; оставете почвата да изсъхне напълно между поливанията.' },
      humidity:    { en: 'Prefers low humidity (20–40%); good air circulation essential.', bg: 'Предпочита ниска влажност (20–40%); добра циркулация на въздуха е важна.' },
      temperature: { en: 'Ideal 15–30 °C; most tolerate brief dips to 5 °C.',          bg: 'Идеална 15–30 °C; повечето понасят кратко захлаждане до 5 °C.' },
      fertilizer:  { en: 'Fertilize once a month in spring and summer with diluted cactus fertilizer.', bg: 'Торете веднъж месечно през пролетта и лятото с разреден кактусов тор.' },
      toxicity:    { en: 'Most succulents are non-toxic; check individual species.',    bg: 'Повечето сукуленти са безвредни; проверете конкретния вид.' },
    },
  },
  CACTUS: {
    careDifficulty: 'easy', wateringIntervalDays: 21, fertilizingIntervalDays: 30,
    repottingIntervalMonths: 36, mistingNeeded: false, family: 'Cactaceae',
    nativeRegionEn: 'Americas, primarily arid and semi-arid regions', nativeRegionBg: 'Америка, предимно сухи и полусухи региони',
    careGuide: {
      light:       { en: 'Full sun; place in the sunniest spot available.',            bg: 'Пълно слънце; поставете на най-слънчевото място.' },
      watering:    { en: 'Water every 2–3 weeks in summer; almost no water in winter.', bg: 'Поливайте на 2–3 седмици през лятото; почти без вода през зимата.' },
      humidity:    { en: 'Prefers very low humidity; excellent drainage essential.',   bg: 'Предпочита много ниска влажност; отличен дренаж е задължителен.' },
      temperature: { en: 'Ideal 18–35 °C in summer; cool 5–15 °C in winter encourages flowering.', bg: 'Идеална 18–35 °C през лятото; хладно 5–15 °C през зимата насърчава цъфтежа.' },
      fertilizer:  { en: 'Fertilize monthly in spring and summer with cactus fertilizer.', bg: 'Торете месечно през пролетта и лятото с кактусов тор.' },
      toxicity:    { en: 'Generally non-toxic; spines pose a physical hazard.',        bg: 'Обикновено нетоксичен; бодлите са физическа опасност.' },
    },
  },
  DESERT_ROSE: {
    careDifficulty: 'moderate', wateringIntervalDays: 14, fertilizingIntervalDays: 14,
    repottingIntervalMonths: 24, mistingNeeded: false, family: 'Apocynaceae',
    nativeRegionEn: 'Africa and Arabian Peninsula', nativeRegionBg: 'Африка и Арабският полуостров',
    careGuide: {
      light:       { en: 'Full sun; minimum 6 hours of direct sunlight daily.',        bg: 'Пълно слънце; минимум 6 часа пряка слънчева светлина дневно.' },
      watering:    { en: 'Water every 10–14 days; let soil dry out completely.',       bg: 'Поливайте на 10–14 дни; оставете почвата да изсъхне напълно.' },
      humidity:    { en: 'Prefers dry conditions; avoid wetting the foliage.',         bg: 'Предпочита сухи условия; избягвайте намокряне на листата.' },
      temperature: { en: 'Keep above 10 °C; ideal 20–35 °C.',                         bg: 'Дръжте над 10 °C; идеална 20–35 °C.' },
      fertilizer:  { en: 'Fertilize every 2 weeks during spring and summer.',          bg: 'Торете на 2 седмици през пролетта и лятото.' },
      toxicity:    { en: 'Toxic to cats, dogs and humans — all parts are poisonous.', bg: 'Токсично за котки, кучета и хора — всички части са отровни.' },
    },
  },
  HERB: {
    careDifficulty: 'easy', wateringIntervalDays: 5, fertilizingIntervalDays: 21,
    repottingIntervalMonths: 12, mistingNeeded: false, family: null,
    nativeRegionEn: 'Mediterranean and temperate regions', nativeRegionBg: 'Средиземноморие и умерени региони',
    careGuide: {
      light:       { en: 'Full sun; at least 6 hours of direct sunlight daily.',       bg: 'Пълно слънце; поне 6 часа пряка слънчева светлина дневно.' },
      watering:    { en: 'Water every 4–6 days; let top soil dry slightly between waterings.', bg: 'Поливайте на 4–6 дни; оставете горния слой почва леко да изсъхне.' },
      humidity:    { en: 'Average humidity; ensure good air circulation.',             bg: 'Средна влажност; осигурете добра циркулация на въздуха.' },
      temperature: { en: 'Most herbs prefer 15–25 °C; protect from frost.',           bg: 'Повечето билки предпочитат 15–25 °C; пазете от замръзване.' },
      fertilizer:  { en: 'Fertilize every 3 weeks with balanced fertilizer during growth.', bg: 'Торете на 3 седмици с балансиран тор по време на растеж.' },
      toxicity:    { en: 'Culinary herbs are safe for humans; some may affect pets.',  bg: 'Кулинарните билки са безвредни за хора; някои може да засегнат домашни животни.' },
    },
  },
  VEGETABLE: {
    careDifficulty: 'moderate', wateringIntervalDays: 4, fertilizingIntervalDays: 14,
    repottingIntervalMonths: 6, mistingNeeded: false, family: null,
    nativeRegionEn: 'Tropical and temperate regions', nativeRegionBg: 'Тропически и умерени региони',
    careGuide: {
      light:       { en: 'Full sun; minimum 6–8 hours of direct sunlight daily.',      bg: 'Пълно слънце; минимум 6–8 часа пряка слънчева светлина дневно.' },
      watering:    { en: 'Keep soil consistently moist; water every 3–5 days.',       bg: 'Поддържайте почвата постоянно влажна; поливайте на 3–5 дни.' },
      humidity:    { en: 'Average humidity; ensure good ventilation to prevent disease.', bg: 'Средна влажност; осигурете добра вентилация за предотвратяване на болести.' },
      temperature: { en: 'Most vegetables prefer 18–27 °C during growing season.',    bg: 'Повечето зеленчуци предпочитат 18–27 °C по време на растежа.' },
      fertilizer:  { en: 'Fertilize every 2 weeks with tomato or vegetable fertilizer.', bg: 'Торете на 2 седмици с тор за домати или зеленчуци.' },
      toxicity:    { en: 'Edible and safe for humans; fruit and leaves safe for most pets.', bg: 'Годни за консумация и безопасни за хора; плодове и листа са безвредни за повечето домашни любимци.' },
    },
  },
  GARDEN_ANNUAL: {
    careDifficulty: 'easy', wateringIntervalDays: 3, fertilizingIntervalDays: 14,
    repottingIntervalMonths: 6, mistingNeeded: false, family: null,
    nativeRegionEn: 'Various worldwide regions', nativeRegionBg: 'Различни региони по целия свят',
    careGuide: {
      light:       { en: 'Full sun to partial shade; most prefer 6+ hours of sun.',   bg: 'Пълно слънце до частична сянка; повечето предпочитат 6+ часа слънце.' },
      watering:    { en: 'Water regularly every 2–4 days; do not let soil dry completely.', bg: 'Поливайте редовно на 2–4 дни; не оставяйте почвата да изсъхне напълно.' },
      humidity:    { en: 'Adapts to normal outdoor humidity.',                         bg: 'Адаптира се към нормалната влажност на открито.' },
      temperature: { en: 'Plant after frost; most grow well at 15–28 °C.',            bg: 'Засаждайте след замръзването; повечето растат добре при 15–28 °C.' },
      fertilizer:  { en: 'Fertilize every 2 weeks with flowering plant fertilizer.',  bg: 'Торете на 2 седмици с тор за цъфтящи растения.' },
      toxicity:    { en: 'Toxicity varies; keep pets from eating flowering plants.',   bg: 'Токсичността варира; пазете домашни любимци от яденето на цъфтящи растения.' },
    },
  },
  GARDEN_PERENNIAL: {
    careDifficulty: 'easy', wateringIntervalDays: 7, fertilizingIntervalDays: 30,
    repottingIntervalMonths: 36, mistingNeeded: false, family: null,
    nativeRegionEn: 'Temperate regions of the northern hemisphere', nativeRegionBg: 'Умерени зони на северното полукълбо',
    careGuide: {
      light:       { en: 'Full sun to partial shade depending on species.',            bg: 'Пълно слънце до частична сянка в зависимост от вида.' },
      watering:    { en: 'Water every 5–10 days; tolerates brief dry spells when established.', bg: 'Поливайте на 5–10 дни; понася кратко засушаване след установяване.' },
      humidity:    { en: 'Adapts to outdoor humidity; drought-tolerant when established.', bg: 'Адаптира се към влажността на открито; устойчиво на суша след установяване.' },
      temperature: { en: 'Hardy; most survive winter cold down to -10 °C or lower.',  bg: 'Издръжливо; повечето оцеляват при зимен студ до -10 °C или по-ниско.' },
      fertilizer:  { en: 'Fertilize once in spring when new growth appears.',         bg: 'Торете веднъж напролет при поява на нов растеж.' },
      toxicity:    { en: 'Toxicity varies by species; check before planting near pets.', bg: 'Токсичността варира по вид; проверете преди засаждане близо до домашни любимци.' },
    },
  },
  BULB: {
    careDifficulty: 'easy', wateringIntervalDays: 7, fertilizingIntervalDays: 21,
    repottingIntervalMonths: 12, mistingNeeded: false, family: null,
    nativeRegionEn: 'Temperate regions of Europe and Asia', nativeRegionBg: 'Умерени зони на Европа и Азия',
    careGuide: {
      light:       { en: 'Full sun; plant in an open, sunny position.',                bg: 'Пълно слънце; засаждайте на открито, слънчево място.' },
      watering:    { en: 'Water regularly during growth; reduce after foliage dies back.', bg: 'Поливайте редовно по време на растеж; намалете след отмирането на листата.' },
      humidity:    { en: 'Average humidity; good drainage prevents bulb rot.',        bg: 'Средна влажност; добър дренаж предотвратява гниенето на луковиците.' },
      temperature: { en: 'Hardy; bulbs require a cold period to bloom the following year.', bg: 'Издръжливо; луковиците се нуждаят от студен период за цъфтеж следващата година.' },
      fertilizer:  { en: 'Fertilize with bulb fertilizer in autumn and when in growth.', bg: 'Торете с тор за луковици есента и по време на растеж.' },
      toxicity:    { en: 'Many bulbs are toxic to pets — especially daffodils and tulips.', bg: 'Много луковици са токсични за домашни любимци — особено нарциси и лалета.' },
    },
  },
  ROSE: {
    careDifficulty: 'moderate', wateringIntervalDays: 5, fertilizingIntervalDays: 14,
    repottingIntervalMonths: 36, mistingNeeded: false, family: 'Rosaceae',
    nativeRegionEn: 'Asia, Europe and North America', nativeRegionBg: 'Азия, Европа и Северна Америка',
    careGuide: {
      light:       { en: 'Full sun; minimum 6 hours of direct sunlight daily.',        bg: 'Пълно слънце; минимум 6 часа пряка слънчева светлина дневно.' },
      watering:    { en: 'Water at base every 3–7 days; avoid wetting foliage.',       bg: 'Поливайте в основата на 3–7 дни; избягвайте намокряне на листата.' },
      humidity:    { en: 'Prefers moderate humidity with good air circulation.',       bg: 'Предпочита умерена влажност с добра циркулация на въздуха.' },
      temperature: { en: 'Hardy; most roses survive down to -10 °C with mulching.',  bg: 'Издръжлива; повечето рози оцеляват до -10 °C при мулчиране.' },
      fertilizer:  { en: 'Fertilize every 2 weeks during growing season with rose fertilizer.', bg: 'Торете на 2 седмици по време на растеж с тор за рози.' },
      toxicity:    { en: 'Non-toxic to pets; thorns pose a physical hazard.',         bg: 'Безвреден за домашни любимци; тръните са физическа опасност.' },
    },
  },
  GARDEN_SHRUB: {
    careDifficulty: 'easy', wateringIntervalDays: 7, fertilizingIntervalDays: 30,
    repottingIntervalMonths: 36, mistingNeeded: false, family: null,
    nativeRegionEn: 'Temperate regions worldwide', nativeRegionBg: 'Умерени зони по целия свят',
    careGuide: {
      light:       { en: 'Full sun to partial shade; most flowering shrubs prefer full sun.', bg: 'Пълно слънце до частична сянка; повечето цъфтящи храсти предпочитат пълно слънце.' },
      watering:    { en: 'Water regularly when establishing; drought-tolerant once established.', bg: 'Поливайте редовно при установяване; устойчив на суша след установяване.' },
      humidity:    { en: 'Adapts to typical outdoor humidity conditions.',             bg: 'Адаптира се към типичните условия на влажност на открито.' },
      temperature: { en: 'Hardy; most survive Bulgarian winters without protection.',  bg: 'Издръжлив; повечето оцеляват bulgarian зимите без защита.' },
      fertilizer:  { en: 'Fertilize once in spring with slow-release fertilizer.',    bg: 'Торете веднъж напролет с бавноосвобождаващ тор.' },
      toxicity:    { en: 'Toxicity varies; some shrubs are toxic to pets.',            bg: 'Токсичността варира; някои храсти са токсични за домашни любимци.' },
    },
  },
  CLIMBER: {
    careDifficulty: 'easy', wateringIntervalDays: 7, fertilizingIntervalDays: 21,
    repottingIntervalMonths: 36, mistingNeeded: false, family: null,
    nativeRegionEn: 'Temperate and subtropical regions', nativeRegionBg: 'Умерени и субтропични региони',
    careGuide: {
      light:       { en: 'Full sun to partial shade; most climbers prefer a sunny position.', bg: 'Пълно слънце до частична сянка; повечето катерливи предпочитат слънчево място.' },
      watering:    { en: 'Water weekly during dry periods; established plants are fairly drought-tolerant.', bg: 'Поливайте седмично в сухи периоди; установените растения са сравнително устойчиви на суша.' },
      humidity:    { en: 'Tolerates average outdoor humidity.',                        bg: 'Понася средна влажност на открито.' },
      temperature: { en: 'Most are hardy; protect young plants from hard frosts.',    bg: 'Повечето са издръжливи; пазете младите растения от силни замръзвания.' },
      fertilizer:  { en: 'Fertilize in spring and midsummer.',                        bg: 'Торете напролет и в средата на лятото.' },
      toxicity:    { en: 'Toxicity varies by species.',                               bg: 'Токсичността варира по вид.' },
    },
  },
  TREE: {
    careDifficulty: 'easy', wateringIntervalDays: 10, fertilizingIntervalDays: 60,
    repottingIntervalMonths: 60, mistingNeeded: false, family: null,
    nativeRegionEn: 'Temperate regions worldwide', nativeRegionBg: 'Умерени зони по целия свят',
    careGuide: {
      light:       { en: 'Full sun; plant in an open position with at least 6 hours sun.', bg: 'Пълно слънце; засаждайте на открито с поне 6 часа слънце.' },
      watering:    { en: 'Water young trees weekly; established trees are mostly self-sufficient.', bg: 'Поливайте младите дървета седмично; установените дървета са предимно самодостатъчни.' },
      humidity:    { en: 'Adapts to outdoor humidity; tolerates Bulgarian climate.',  bg: 'Адаптира се към влажността на открито; понася bulgarski климат.' },
      temperature: { en: 'Hardy; most ornamental trees tolerate Bulgarian winters.',  bg: 'Издръжливи; повечето декоративни дървета понасят bulgarski зими.' },
      fertilizer:  { en: 'Fertilize once in early spring.',                           bg: 'Торете веднъж в началото на пролетта.' },
      toxicity:    { en: 'Toxicity varies; some trees produce toxic berries or seeds.', bg: 'Токсичността варира; някои дървета произвеждат токсични плодове или семена.' },
    },
  },
  WATER_PLANT: {
    careDifficulty: 'easy', wateringIntervalDays: 1, fertilizingIntervalDays: 30,
    repottingIntervalMonths: 24, mistingNeeded: false, family: null,
    nativeRegionEn: 'Freshwater habitats worldwide', nativeRegionBg: 'Сладководни местообитания по целия свят',
    careGuide: {
      light:       { en: 'Full sun to partial shade depending on species.',            bg: 'Пълно слънце до частична сянка в зависимост от вида.' },
      watering:    { en: 'Grow in water or permanently moist soil.',                  bg: 'Отглеждайте във вода или постоянно влажна почва.' },
      humidity:    { en: 'High humidity naturally present in aquatic environment.',   bg: 'Висока влажност е естествено присъща на водната среда.' },
      temperature: { en: 'Most water plants prefer 15–28 °C water temperature.',     bg: 'Повечето водни растения предпочитат 15–28 °C температура на водата.' },
      fertilizer:  { en: 'Use aquatic plant fertilizer tablets monthly.',             bg: 'Използвайте таблетки тор за водни растения месечно.' },
      toxicity:    { en: 'Toxicity varies; check before adding to ponds with fish or pets.', bg: 'Токсичността варира; проверете преди добавяне в езерца с риби или домашни любимци.' },
    },
  },
  GRASS: {
    careDifficulty: 'easy', wateringIntervalDays: 10, fertilizingIntervalDays: 60,
    repottingIntervalMonths: 36, mistingNeeded: false, family: 'Poaceae',
    nativeRegionEn: 'Grasslands and open habitats worldwide', nativeRegionBg: 'Ливади и открити местообитания по целия свят',
    careGuide: {
      light:       { en: 'Full sun to partial shade; most ornamental grasses prefer sun.', bg: 'Пълно слънце до частична сянка; повечето декоративни треви предпочитат слънце.' },
      watering:    { en: 'Water weekly when establishing; drought-tolerant once established.', bg: 'Поливайте седмично при установяване; устойчиво на суша след установяване.' },
      humidity:    { en: 'Adapts to outdoor humidity conditions.',                    bg: 'Адаптира се към условията на влажност на открито.' },
      temperature: { en: 'Most ornamental grasses are hardy in Bulgarian conditions.', bg: 'Повечето декоративни треви са издръжливи в bulgarski условия.' },
      fertilizer:  { en: 'Fertilize lightly once in spring.',                         bg: 'Торете леко веднъж напролет.' },
      toxicity:    { en: 'Generally non-toxic to pets.',                              bg: 'Обикновено нетоксично за домашни любимци.' },
    },
  },
  GROUNDCOVER: {
    careDifficulty: 'easy', wateringIntervalDays: 10, fertilizingIntervalDays: 60,
    repottingIntervalMonths: 36, mistingNeeded: false, family: null,
    nativeRegionEn: 'Temperate regions of Europe and Asia', nativeRegionBg: 'Умерени зони на Европа и Азия',
    careGuide: {
      light:       { en: 'Partial shade to full shade; ideal for under trees and shrubs.', bg: 'Частична до пълна сянка; идеален за под дървета и храсти.' },
      watering:    { en: 'Water during dry periods; established plants need little care.', bg: 'Поливайте в сухи периоди; установените растения се нуждаят от малко грижи.' },
      humidity:    { en: 'Tolerates average outdoor humidity.',                        bg: 'Понася средна влажност на открито.' },
      temperature: { en: 'Hardy; most ground covers survive Bulgarian winters.',       bg: 'Издръжливи; повечето почвопокривни растения оцеляват bulgarski зими.' },
      fertilizer:  { en: 'Light fertilization once a year in spring is sufficient.',  bg: 'Леко торене веднъж годишно напролет е достатъчно.' },
      toxicity:    { en: 'Toxicity varies; some common ground covers are toxic to pets.', bg: 'Токсичността варира; някои почвопокривни растения са токсични за домашни любимци.' },
    },
  },
};

// Maps genus (first word of scientific name) → profile key
const GENUS_PROFILE: Record<string, ProfileKey> = {
  // Indoor easy
  Zamioculcas:'INDOOR_EASY', Sansevieria:'INDOOR_EASY', Aspidistra:'INDOOR_EASY',
  Chlorophytum:'INDOOR_EASY', Dracaena:'INDOOR_EASY', Yucca:'INDOOR_EASY',
  Beaucarnea:'INDOOR_EASY', Scindapsus:'INDOOR_EASY', Epipremnum:'INDOOR_EASY',
  Clivia:'INDOOR_EASY', Fatsia:'INDOOR_EASY', Rhapis:'INDOOR_EASY',
  Schefflera:'INDOOR_EASY', Tradescantia:'INDOOR_EASY', Hedera:'INDOOR_EASY',
  Soleirolia:'INDOOR_EASY', Nematanthus:'INDOOR_EASY', Oxalis:'INDOOR_EASY',
  // Indoor moderate
  Monstera:'INDOOR_MODERATE', Ficus:'INDOOR_MODERATE', Philodendron:'INDOOR_MODERATE',
  Syngonium:'INDOOR_MODERATE', Alocasia:'INDOOR_MODERATE', Dieffenbachia:'INDOOR_MODERATE',
  Caladium:'INDOOR_MODERATE', Colocasia:'INDOOR_MODERATE', Strelitzia:'INDOOR_MODERATE',
  Spathiphyllum:'INDOOR_MODERATE', Anthurium:'INDOOR_MODERATE', Aglaonema:'INDOOR_MODERATE',
  Codiaeum:'INDOOR_MODERATE', Pachira:'INDOOR_MODERATE', Zantedeschia:'INDOOR_MODERATE',
  Hippeastrum:'INDOOR_MODERATE', Ceropegia:'INDOOR_MODERATE', Hoya:'INDOOR_MODERATE',
  Senecio:'INDOOR_MODERATE', Rhaphidophora:'INDOOR_MODERATE', Pilea:'INDOOR_MODERATE',
  Peperomia:'INDOOR_MODERATE', Cycas:'INDOOR_MODERATE', Columnea:'INDOOR_MODERATE',
  Aeschynanthus:'INDOOR_MODERATE', Streptocarpus:'INDOOR_MODERATE',
  Medinilla:'INDOOR_MODERATE', Hibiscus:'INDOOR_MODERATE', Gardenia:'INDOOR_MODERATE',
  Plumeria:'INDOOR_MODERATE', Impatiens:'INDOOR_MODERATE', Oxalis:'INDOOR_EASY',
  // Indoor humid
  Calathea:'INDOOR_HUMID', Maranta:'INDOOR_HUMID', Ctenanthe:'INDOOR_HUMID',
  Stromanthe:'INDOOR_HUMID', Fittonia:'INDOOR_HUMID', Saintpaulia:'INDOOR_HUMID',
  Begonia:'INDOOR_HUMID', Cyclamen:'INDOOR_HUMID',
  // Orchids
  Phalaenopsis:'ORCHID', Dendrobium:'ORCHID', Cattleya:'ORCHID', Cymbidium:'ORCHID',
  Oncidium:'ORCHID', Paphiopedilum:'ORCHID', Ludisia:'ORCHID', Zygopetalum:'ORCHID',
  Coelogyne:'ORCHID', Vanilla:'ORCHID', Brassia:'ORCHID', Miltoniopsis:'ORCHID',
  Epidendrum:'ORCHID', Lycaste:'ORCHID', Maxillaria:'ORCHID',
  // Palms
  Chamaedorea:'PALM', Dypsis:'PALM', Phoenix:'PALM', Livistona:'PALM',
  Beaucarnea:'PALM', Trachycarpus:'PALM', Washingtonia:'PALM',
  // Ferns
  Nephrolepis:'FERN', Asplenium:'FERN', Platycerium:'FERN', Adiantum:'FERN',
  Asparagus:'FERN', Pteris:'FERN', Dryopteris:'FERN', Athyrium:'FERN',
  Davallia:'FERN', Matteuccia:'FERN', Selaginella:'FERN', Polypodium:'FERN',
  Microsorum:'FERN',
  // Bromeliads
  Guzmania:'BROMELIAD', Vriesea:'BROMELIAD', Aechmea:'BROMELIAD', Neoregelia:'BROMELIAD',
  Cryptanthus:'BROMELIAD', Tillandsia:'BROMELIAD', Ananas:'BROMELIAD', Billbergia:'BROMELIAD',
  // Succulents
  Aloe:'SUCCULENT', Haworthia:'SUCCULENT', Gasteria:'SUCCULENT', Echeveria:'SUCCULENT',
  Sedum:'SUCCULENT', Sempervivum:'SUCCULENT', Graptopetalum:'SUCCULENT', Aeonium:'SUCCULENT',
  Portulacaria:'SUCCULENT', Crassula:'SUCCULENT', Kalanchoe:'SUCCULENT', Lithops:'SUCCULENT',
  Conophytum:'SUCCULENT', Stapelia:'SUCCULENT', Euphorbia:'SUCCULENT', Agave:'SUCCULENT',
  Dudleya:'SUCCULENT',
  // Special: Desert Rose
  Adenium:'DESERT_ROSE',
  // Cacti
  Opuntia:'CACTUS', Cereus:'CACTUS', Echinopsis:'CACTUS', Gymnocalycium:'CACTUS',
  Mammillaria:'CACTUS', Echinocactus:'CACTUS', Ferocactus:'CACTUS', Rhipsalis:'CACTUS',
  Schlumbergera:'CACTUS', Epiphyllum:'CACTUS', Selenicereus:'CACTUS', Astrophytum:'CACTUS',
  Cephalocereus:'CACTUS', Cleistocactus:'CACTUS', Parodia:'CACTUS', Rebutia:'CACTUS',
  Trichocereus:'CACTUS', Pilosocereus:'CACTUS', Notocactus:'CACTUS',
  // Herbs
  Ocimum:'HERB', Mentha:'HERB', Thymus:'HERB', Salvia:'HERB', Origanum:'HERB',
  Coriandrum:'HERB', Allium:'HERB', Petroselinum:'HERB', Anethum:'HERB',
  Foeniculum:'HERB', Artemisia:'HERB', Melissa:'HERB', Lavandula:'HERB',
  Laurus:'HERB', Pelargonium:'HERB', Aloysia:'HERB', Hyssopus:'HERB',
  Borago:'HERB', Satureja:'HERB', Cymbopogon:'HERB', Zingiber:'HERB', Stevia:'HERB',
  // Vegetables
  Solanum:'VEGETABLE', Capsicum:'VEGETABLE', Cucumis:'VEGETABLE', Cucurbita:'VEGETABLE',
  Phaseolus:'VEGETABLE', Lactuca:'VEGETABLE', Spinacia:'VEGETABLE', Fragaria:'VEGETABLE',
  Beta:'VEGETABLE', Raphanus:'VEGETABLE', Vitis:'VEGETABLE', Ribes:'VEGETABLE',
  Rubus:'VEGETABLE', Malus:'VEGETABLE', Ficus_carica:'VEGETABLE',
  // Annuals
  Tagetes:'GARDEN_ANNUAL', Petunia:'GARDEN_ANNUAL', Viola:'GARDEN_ANNUAL',
  Zinnia:'GARDEN_ANNUAL', Lobelia:'GARDEN_ANNUAL', Lobularia:'GARDEN_ANNUAL',
  Cosmos:'GARDEN_ANNUAL', Calendula:'GARDEN_ANNUAL', Helianthus:'GARDEN_ANNUAL',
  Antirrhinum:'GARDEN_ANNUAL', Matthiola:'GARDEN_ANNUAL', Nicotiana:'GARDEN_ANNUAL',
  Portulaca:'GARDEN_ANNUAL', Catharanthus:'GARDEN_ANNUAL', Dianthus:'GARDEN_ANNUAL',
  Celosia:'GARDEN_ANNUAL', Cleome:'GARDEN_ANNUAL', Nigella:'GARDEN_ANNUAL',
  Papaver:'GARDEN_ANNUAL', Scabiosa:'GARDEN_ANNUAL', Tropaeolum:'GARDEN_ANNUAL',
  Eschscholzia:'GARDEN_ANNUAL', Centaurea:'GARDEN_ANNUAL', Lathyrus:'GARDEN_ANNUAL',
  Phlox:'GARDEN_ANNUAL', Gazania:'GARDEN_ANNUAL', Impatiens:'GARDEN_ANNUAL',
  // Perennials
  Hosta:'GARDEN_PERENNIAL', Hemerocallis:'GARDEN_PERENNIAL', Echinacea:'GARDEN_PERENNIAL',
  Rudbeckia:'GARDEN_PERENNIAL', Achillea:'GARDEN_PERENNIAL', Nepeta:'GARDEN_PERENNIAL',
  Astilbe:'GARDEN_PERENNIAL', Aquilegia:'GARDEN_PERENNIAL', Delphinium:'GARDEN_PERENNIAL',
  Leucanthemum:'GARDEN_PERENNIAL', Gypsophila:'GARDEN_PERENNIAL', Geranium:'GARDEN_PERENNIAL',
  Coreopsis:'GARDEN_PERENNIAL', Gaillardia:'GARDEN_PERENNIAL', Liatris:'GARDEN_PERENNIAL',
  Monarda:'GARDEN_PERENNIAL', Campanula:'GARDEN_PERENNIAL', Primula:'GARDEN_PERENNIAL',
  Bergenia:'GARDEN_PERENNIAL', Helleborus:'GARDEN_PERENNIAL', Alcea:'GARDEN_PERENNIAL',
  Aster:'GARDEN_PERENNIAL', Verbena:'GARDEN_PERENNIAL', Paeonia:'GARDEN_PERENNIAL',
  Chrysanthemum:'GARDEN_PERENNIAL', Echinops:'GARDEN_PERENNIAL', Digitalis:'GARDEN_PERENNIAL',
  Lupinus:'GARDEN_PERENNIAL', Kniphofia:'GARDEN_PERENNIAL', Geum:'GARDEN_PERENNIAL',
  Perovskia:'GARDEN_PERENNIAL', Veronicastrum:'GARDEN_PERENNIAL', Filipendula:'GARDEN_PERENNIAL',
  Ligularia:'GARDEN_PERENNIAL', Agastache:'GARDEN_PERENNIAL', Centranthus:'GARDEN_PERENNIAL',
  Hesperis:'GARDEN_PERENNIAL', Polemonium:'GARDEN_PERENNIAL', Armeria:'GARDEN_PERENNIAL',
  Erysimum:'GARDEN_PERENNIAL', Gaura:'GARDEN_PERENNIAL', Lythrum:'GARDEN_PERENNIAL',
  Penstemon:'GARDEN_PERENNIAL', Sidalcea:'GARDEN_PERENNIAL',
  // Bulbs
  Tulipa:'BULB', Narcissus:'BULB', Hyacinthus:'BULB', Crocus:'BULB', Muscari:'BULB',
  Lilium:'BULB', Iris:'BULB', Gladiolus:'BULB', Dahlia:'BULB', Ranunculus:'BULB',
  Freesia:'BULB', Anemone:'BULB', Chionodoxa:'BULB', Scilla:'BULB', Galanthus:'BULB',
  Leucojum:'BULB', Eranthis:'BULB', Crocosmia:'BULB', Ornithogalum:'BULB',
  Camassia:'BULB', Sprekelia:'BULB',
  // Roses
  Rosa:'ROSE',
  // Shrubs
  Hydrangea:'GARDEN_SHRUB', Syringa:'GARDEN_SHRUB', Forsythia:'GARDEN_SHRUB',
  Spiraea:'GARDEN_SHRUB', Weigela:'GARDEN_SHRUB', Deutzia:'GARDEN_SHRUB',
  Buxus:'GARDEN_SHRUB', Thuja:'GARDEN_SHRUB', Euonymus:'GARDEN_SHRUB',
  Berberis:'GARDEN_SHRUB', Cotoneaster:'GARDEN_SHRUB', Viburnum:'GARDEN_SHRUB',
  Buddleja:'GARDEN_SHRUB', Potentilla:'GARDEN_SHRUB', Kolkwitzia:'GARDEN_SHRUB',
  Philadelphus:'GARDEN_SHRUB', Physocarpus:'GARDEN_SHRUB', Kerria:'GARDEN_SHRUB',
  Chaenomeles:'GARDEN_SHRUB', Pyracantha:'GARDEN_SHRUB', Ligustrum:'GARDEN_SHRUB',
  Lonicera:'GARDEN_SHRUB', Cotinus:'GARDEN_SHRUB', Amelanchier:'GARDEN_SHRUB',
  Caryopteris:'GARDEN_SHRUB',
  // Trees
  Magnolia:'TREE', Prunus:'TREE', Acer:'TREE', Cercis:'TREE', Betula:'TREE',
  Sorbus:'TREE', Cornus:'TREE', Catalpa:'TREE', Salix:'TREE', Pyrus:'TREE',
  Liriodendron:'TREE', Robinia:'TREE', Paulownia:'TREE',
  // Climbers
  Wisteria:'CLIMBER', Clematis:'CLIMBER', Jasminum:'CLIMBER', Passiflora:'CLIMBER',
  Campsis:'CLIMBER', Parthenocissus:'CLIMBER', Humulus:'CLIMBER', Actinidia:'CLIMBER',
  Aristolochia:'CLIMBER',
  // Water plants
  Nymphaea:'WATER_PLANT', Nuphar:'WATER_PLANT', Typha:'WATER_PLANT',
  Pontederia:'WATER_PLANT', Sagittaria:'WATER_PLANT', Caltha:'WATER_PLANT',
  Nelumbo:'WATER_PLANT', Eichhornia:'WATER_PLANT', Pistia:'WATER_PLANT',
  // Grasses
  Pennisetum:'GRASS', Miscanthus:'GRASS', Festuca:'GRASS', Carex:'GRASS',
  Stipa:'GRASS', Molinia:'GRASS', Cortaderia:'GRASS', Phyllostachys:'GRASS',
  Helictotrichon:'GRASS', Hakonechloa:'GRASS',
  // Ground covers
  Vinca:'GROUNDCOVER', Pachysandra:'GROUNDCOVER', Ajuga:'GROUNDCOVER',
  Lamium:'GROUNDCOVER', Arabis:'GROUNDCOVER', Aubrieta:'GROUNDCOVER',
  Aurinia:'GROUNDCOVER',
};

// Overrides for known toxicity (true=toxic, false=safe, null=unknown)
const TOXICITY_OVERRIDE: Record<string, boolean | null> = {
  // Toxic
  Monstera:true, Philodendron:true, Spathiphyllum:true, Dieffenbachia:true,
  Caladium:true, Alocasia:true, Colocasia:true, Zantedeschia:true,
  Syngonium:true, Anthurium:true, Epipremnum:true, Scindapsus:true,
  Rhaphidophora:true, Aglaonema:true, Hedera:true, Cyclamen:true,
  Lilium:true, Tulipa:true, Narcissus:true, Iris:true, Hyacinthus:true,
  Muscari:true, Ranunculus:true, Anemone:true, Colchicum:true,
  Euphorbia:true, Adenium:true, Nerium:true, Digitalis:true, Lupinus:true,
  Delphinium:true, Helleborus:true, Prunus:true, Wisteria:true,
  Dracaena:true, Codiaeum:true, Yucca:true, Aloe:true,
  Saintpaulia:false, // African violet is safe
  // Safe
  Chlorophytum:false, Zamioculcas:false, Aspidistra:false, Beaucarnea:false,
  Haworthia:false, Echeveria:false, Sempervivum:false, Sedum:false,
  Graptopetalum:false, Peperomia:false, Pilea:false, Tradescantia:false,
  Maranta:false, Calathea:false, Ctenanthe:false, Stromanthe:false,
  Hoya:false, Ceropegia:false, Rosa:false, Phalaenopsis:false,
  Chamaedorea:false, Dypsis:false, Tillandsia:false, Guzmania:false,
  Vriesea:false, Aechmea:false, Billbergia:false, Neoregelia:false,
  Cryptanthus:false, Schlumbergera:false, Soleirolia:false,
  Fragaria:false, Ocimum:false, Mentha:false, Lavandula:false,
  Tagetes:false, Paeonia:false, Echinacea:false, Rudbeckia:false,
};

function getGenus(scientificName: string): string {
  return scientificName.split(' ')[0];
}

function getCareData(scientificName: string): CareProfile {
  const genus = getGenus(scientificName);
  const profileKey: ProfileKey = GENUS_PROFILE[genus] ?? 'INDOOR_MODERATE';
  const profile = { ...PROFILES[profileKey] };

  // Apply toxicity override if known
  const toxic = TOXICITY_OVERRIDE[genus];
  if (toxic !== undefined) {
    const isT = toxic;
    const toxEn = isT === true  ? 'Toxic to cats and dogs — keep out of reach.'
                : isT === false ? 'Non-toxic to pets; safe around cats and dogs.'
                :                 'Toxicity uncertain; keep out of reach as a precaution.';
    const toxBg = isT === true  ? 'Токсично за котки и кучета — пазете от домашни любимци.'
                : isT === false ? 'Нетоксично за домашни любимци; безопасно около котки и кучета.'
                :                 'Токсичността е неизвестна; пазете от домашни любимци.';
    profile.careGuide = { ...profile.careGuide, toxicity: { en: toxEn, bg: toxBg } };
  }
  return profile;
}

function generatePlantData(scientificName: string): Omit<SpeciesData, 'scientificName' | 'imageUrl' | 'commonNameBg' | 'descriptionBg' | 'descriptionEn'> {
  const care = getCareData(scientificName);
  return {
    commonNameEn: null,
    family: care.family,
    nativeRegionEn: care.nativeRegionEn,
    nativeRegionBg: care.nativeRegionBg,
    careDifficulty: care.careDifficulty,
    wateringIntervalDays: care.wateringIntervalDays,
    fertilizingIntervalDays: care.fertilizingIntervalDays,
    repottingIntervalMonths: care.repottingIntervalMonths,
    mistingNeeded: care.mistingNeeded,
    isToxicToPets: TOXICITY_OVERRIDE[getGenus(scientificName)] ?? null,
    careGuide: care.careGuide,
  };
}


// ── Output ────────────────────────────────────────────────────────────────────

function writeOutput(species: SpeciesData[]) {
  const outPath = join(__dirname, 'species-data.ts');
  const content = `// Auto-generated by fetch-species.ts — do not edit manually
// Run: pnpm db:fetch-species to refresh

import type { SpeciesData } from './fetch-species';

export const SPECIES_DATA: SpeciesData[] = ${JSON.stringify(species, null, 2)};
`;
  writeFileSync(outPath, content, 'utf8');
  console.log(`\n📄 Written ${species.length} species to ${outPath}`);
  console.log('👉 Next: pnpm db:seed');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // --preview N: process only first N plants, print to console, don't write file
  const previewIdx = process.argv.indexOf('--preview');
  const previewCount = previewIdx !== -1 ? parseInt(process.argv[previewIdx + 1] ?? '2', 10) : 0;
  if (previewCount > 0) {
    // Pick plants spread evenly across the list for category diversity
    const total = CURATED_PLANTS.length;
    const step = Math.floor(total / previewCount);
    const sample = Array.from({ length: previewCount }, (_, i) => CURATED_PLANTS[i * step]);
    console.log(`\n👁  Preview mode — processing ${previewCount} plant(s) from diverse categories...\n`);
    for (const plant of sample) {
      process.stdout.write(`⏳ ${plant.commonNameEn} (${plant.scientificName})... `);
      const [imageUrl, inatName, wikidataName, bgWiki, enDesc] = await Promise.all([
        fetchPlantImage(plant.scientificName),
        fetchInatBgName(plant.scientificName),
        fetchWikidataBgName(plant.scientificName),
        fetchBgWiki(plant.scientificName),
        fetchEnWikiDescription(plant.scientificName),
      ]);
      const care = generatePlantData(plant.scientificName);
      const realName = inatName ?? wikidataName ?? bgWiki.name ?? transliterateGenus(plant.scientificName);
      const result: SpeciesData = {
        scientificName: plant.scientificName,
        imageUrl,
        commonNameBg: sanitizeBg(realName),
        descriptionEn: enDesc,
        descriptionBg: bgWiki.description,
        ...care,
        commonNameEn: plant.commonNameEn, // after spread so ...care doesn't override it
      };
      const src = [
        inatName       ? '✓iNat'    : '·iNat',
        wikidataName   ? '✓Wikidata': '·Wikidata',
        bgWiki.name    ? '✓bgWiki'  : '·bgWiki',
        imageUrl       ? '✓img'     : '·img',
      ].join(' ');
      console.log(`✓  [${src}]`);
      console.log(JSON.stringify(result, null, 2));
      console.log();
      await sleep(RATE_MS);
    }
    console.log('\n👉 Preview done. Run without --preview to process all plants.');
    return;
  }

  const p = loadProgress();

  // Deduplicate the curated list
  const seen = new Set<string>();
  const uniquePlants = CURATED_PLANTS.filter(plant => {
    if (seen.has(plant.scientificName)) return false;
    seen.add(plant.scientificName);
    return true;
  });

  const completedNames = new Set(p.completed.map(s => s.scientificName));
  const pending = uniquePlants.filter(plant => !completedNames.has(plant.scientificName));

  console.log(`\n🌿 Plant data generation — ${p.completed.length}/${uniquePlants.length} done, ${pending.length} remaining\n`);

  if (pending.length === 0) {
    console.log('✅ All plants already processed.');
    writeOutput(p.completed);
    return;
  }

  for (const plant of pending) {
    process.stdout.write(`⏳ ${plant.commonNameEn} (${plant.scientificName})... `);

    const [imageUrl, inatName, wikidataName, bgWiki, enDesc] = await Promise.all([
      fetchPlantImage(plant.scientificName),
      fetchInatBgName(plant.scientificName),
      fetchWikidataBgName(plant.scientificName),
      fetchBgWiki(plant.scientificName),
      fetchEnWikiDescription(plant.scientificName),
    ]);

    const care = generatePlantData(plant.scientificName);
    const realName = inatName ?? wikidataName ?? bgWiki.name ?? transliterateGenus(plant.scientificName);

    const species: SpeciesData = {
      scientificName: plant.scientificName,
      imageUrl,
      commonNameBg: sanitizeBg(realName),
      descriptionEn: enDesc,
      descriptionBg: bgWiki.description,
      ...care,
      commonNameEn: plant.commonNameEn, // after spread so ...care doesn't override it
    };
    p.completed.push(species);
    saveProgress(p);

    const toxIcon =
      species.isToxicToPets === true  ? '⚠️ toxic' :
      species.isToxicToPets === false ? '✅ safe'  : '❓';
    const src = `${inatName ? 'iNat' : wikidataName ? 'WD' : bgWiki.name ? 'bgWiki' : 'genus'}`;
    console.log(`✓ ${species.commonNameBg} [${src}] | img: ${imageUrl ? '✓' : '✗'} | pets: ${toxIcon}`);

    await sleep(RATE_MS);
  }

  const done = p.completed.length >= uniquePlants.length;
  if (done) {
    writeOutput(p.completed);
    console.log('\n🎉 All done! Run pnpm db:seed to push to the database.');
  } else {
    console.log(`\n⏸  Partial run: ${p.completed.length}/${uniquePlants.length} processed. Run again to continue.`);
  }
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
