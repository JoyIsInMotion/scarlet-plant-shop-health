/**
 * Shared plant category definitions used by seed scripts and the catalog UI.
 * Category is derived from the scientific name genus — no AI or extra API needed.
 */

export const PLANT_CATEGORIES = [
  { value: 'houseplant',    icon: '🪴', en: 'House Plants',       bg: 'Стайни растения' },
  { value: 'succulent',     icon: '🌵', en: 'Succulents & Cacti', bg: 'Сукуленти и кактуси' },
  { value: 'orchid',        icon: '🌸', en: 'Orchids',            bg: 'Орхидеи' },
  { value: 'palm',          icon: '🌴', en: 'Palms',              bg: 'Палми' },
  { value: 'fern',          icon: '🌿', en: 'Ferns',              bg: 'Папрати' },
  { value: 'herb',          icon: '🌱', en: 'Herbs',              bg: 'Билки' },
  { value: 'vegetable',     icon: '🍅', en: 'Vegetables & Fruit', bg: 'Зеленчуци и плодове' },
  { value: 'garden_flower', icon: '🌼', en: 'Garden Flowers',     bg: 'Градински цветя' },
  { value: 'bulb',          icon: '🌷', en: 'Bulbs',              bg: 'Луковични' },
  { value: 'rose',          icon: '🌹', en: 'Roses',              bg: 'Рози' },
  { value: 'shrub',         icon: '🌳', en: 'Shrubs',             bg: 'Храсти' },
  { value: 'tree',          icon: '🌲', en: 'Trees',              bg: 'Дървета' },
  { value: 'climber',       icon: '🍃', en: 'Climbers',           bg: 'Катерливи' },
] as const;

export type PlantCategory = typeof PLANT_CATEGORIES[number]['value'];

/** Set of valid category values — handy for validating query params. */
export const PLANT_CATEGORY_VALUES: ReadonlySet<string> = new Set(
  PLANT_CATEGORIES.map((c) => c.value)
);

/** Maps genus name → category value */
export const GENUS_TO_CATEGORY: Record<string, PlantCategory> = {
  // ── Houseplants ──────────────────────────────────────────────────────────────
  Zamioculcas:'houseplant', Sansevieria:'houseplant', Aspidistra:'houseplant',
  Chlorophytum:'houseplant', Dracaena:'houseplant', Yucca:'houseplant',
  Beaucarnea:'houseplant', Scindapsus:'houseplant', Epipremnum:'houseplant',
  Clivia:'houseplant', Fatsia:'houseplant', Rhapis:'houseplant',
  Schefflera:'houseplant', Tradescantia:'houseplant', Hedera:'houseplant',
  Soleirolia:'houseplant', Nematanthus:'houseplant', Monstera:'houseplant',
  Ficus:'houseplant', Philodendron:'houseplant', Syngonium:'houseplant',
  Alocasia:'houseplant', Dieffenbachia:'houseplant', Caladium:'houseplant',
  Colocasia:'houseplant', Strelitzia:'houseplant', Spathiphyllum:'houseplant',
  Anthurium:'houseplant', Aglaonema:'houseplant', Codiaeum:'houseplant',
  Pachira:'houseplant', Zantedeschia:'houseplant', Hippeastrum:'houseplant',
  Ceropegia:'houseplant', Hoya:'houseplant', Senecio:'houseplant',
  Rhaphidophora:'houseplant', Pilea:'houseplant', Peperomia:'houseplant',
  Cycas:'houseplant', Columnea:'houseplant', Aeschynanthus:'houseplant',
  Streptocarpus:'houseplant', Medinilla:'houseplant', Hibiscus:'houseplant',
  Gardenia:'houseplant', Plumeria:'houseplant', Calathea:'houseplant',
  Maranta:'houseplant', Ctenanthe:'houseplant', Stromanthe:'houseplant',
  Fittonia:'houseplant', Saintpaulia:'houseplant', Begonia:'houseplant',
  Cyclamen:'houseplant', Oxalis:'houseplant', Impatiens:'houseplant',
  Guzmania:'houseplant', Vriesea:'houseplant', Aechmea:'houseplant',
  Neoregelia:'houseplant', Cryptanthus:'houseplant', Tillandsia:'houseplant',
  Ananas:'houseplant', Billbergia:'houseplant',
  // ── Orchids ──────────────────────────────────────────────────────────────────
  Phalaenopsis:'orchid', Dendrobium:'orchid', Cattleya:'orchid', Cymbidium:'orchid',
  Oncidium:'orchid', Paphiopedilum:'orchid', Ludisia:'orchid', Zygopetalum:'orchid',
  Coelogyne:'orchid', Vanilla:'orchid', Brassia:'orchid', Miltoniopsis:'orchid',
  Epidendrum:'orchid', Lycaste:'orchid', Maxillaria:'orchid',
  // ── Palms ─────────────────────────────────────────────────────────────────────
  Chamaedorea:'palm', Dypsis:'palm', Phoenix:'palm', Livistona:'palm',
  Trachycarpus:'palm', Washingtonia:'palm',
  // ── Ferns ─────────────────────────────────────────────────────────────────────
  Nephrolepis:'fern', Asplenium:'fern', Platycerium:'fern', Adiantum:'fern',
  Asparagus:'fern', Pteris:'fern', Dryopteris:'fern', Athyrium:'fern',
  Davallia:'fern', Matteuccia:'fern', Selaginella:'fern', Polypodium:'fern',
  Microsorum:'fern',
  // ── Succulents & Cacti ────────────────────────────────────────────────────────
  Aloe:'succulent', Haworthia:'succulent', Gasteria:'succulent', Echeveria:'succulent',
  Sedum:'succulent', Sempervivum:'succulent', Graptopetalum:'succulent', Aeonium:'succulent',
  Portulacaria:'succulent', Crassula:'succulent', Kalanchoe:'succulent', Lithops:'succulent',
  Conophytum:'succulent', Stapelia:'succulent', Euphorbia:'succulent', Agave:'succulent',
  Dudleya:'succulent', Adenium:'succulent',
  Opuntia:'succulent', Cereus:'succulent', Echinopsis:'succulent', Gymnocalycium:'succulent',
  Mammillaria:'succulent', Echinocactus:'succulent', Ferocactus:'succulent', Rhipsalis:'succulent',
  Schlumbergera:'succulent', Epiphyllum:'succulent', Selenicereus:'succulent', Astrophytum:'succulent',
  Cephalocereus:'succulent', Cleistocactus:'succulent', Parodia:'succulent', Rebutia:'succulent',
  Trichocereus:'succulent', Pilosocereus:'succulent', Notocactus:'succulent',
  // ── Herbs ─────────────────────────────────────────────────────────────────────
  Ocimum:'herb', Mentha:'herb', Thymus:'herb', Salvia:'herb', Origanum:'herb',
  Coriandrum:'herb', Allium:'herb', Petroselinum:'herb', Anethum:'herb',
  Foeniculum:'herb', Artemisia:'herb', Melissa:'herb', Lavandula:'herb',
  Laurus:'herb', Pelargonium:'herb', Aloysia:'herb', Hyssopus:'herb',
  Borago:'herb', Satureja:'herb', Cymbopogon:'herb', Zingiber:'herb', Stevia:'herb',
  // ── Vegetables & Fruit ───────────────────────────────────────────────────────
  Solanum:'vegetable', Capsicum:'vegetable', Cucumis:'vegetable', Cucurbita:'vegetable',
  Phaseolus:'vegetable', Lactuca:'vegetable', Spinacia:'vegetable', Fragaria:'vegetable',
  Beta:'vegetable', Raphanus:'vegetable', Vitis:'vegetable', Ribes:'vegetable',
  Rubus:'vegetable', Malus:'vegetable',
  // ── Garden Flowers ────────────────────────────────────────────────────────────
  Tagetes:'garden_flower', Petunia:'garden_flower', Viola:'garden_flower',
  Zinnia:'garden_flower', Lobelia:'garden_flower', Lobularia:'garden_flower',
  Cosmos:'garden_flower', Calendula:'garden_flower', Helianthus:'garden_flower',
  Antirrhinum:'garden_flower', Matthiola:'garden_flower', Nicotiana:'garden_flower',
  Portulaca:'garden_flower', Catharanthus:'garden_flower', Dianthus:'garden_flower',
  Celosia:'garden_flower', Cleome:'garden_flower', Nigella:'garden_flower',
  Papaver:'garden_flower', Scabiosa:'garden_flower', Tropaeolum:'garden_flower',
  Eschscholzia:'garden_flower', Centaurea:'garden_flower', Lathyrus:'garden_flower',
  Phlox:'garden_flower', Gazania:'garden_flower',
  Hosta:'garden_flower', Hemerocallis:'garden_flower', Echinacea:'garden_flower',
  Rudbeckia:'garden_flower', Achillea:'garden_flower', Nepeta:'garden_flower',
  Astilbe:'garden_flower', Aquilegia:'garden_flower', Delphinium:'garden_flower',
  Leucanthemum:'garden_flower', Gypsophila:'garden_flower', Geranium:'garden_flower',
  Coreopsis:'garden_flower', Gaillardia:'garden_flower', Liatris:'garden_flower',
  Monarda:'garden_flower', Campanula:'garden_flower', Primula:'garden_flower',
  Bergenia:'garden_flower', Helleborus:'garden_flower', Alcea:'garden_flower',
  Aster:'garden_flower', Verbena:'garden_flower', Paeonia:'garden_flower',
  Chrysanthemum:'garden_flower', Echinops:'garden_flower', Digitalis:'garden_flower',
  Lupinus:'garden_flower', Kniphofia:'garden_flower', Geum:'garden_flower',
  Perovskia:'garden_flower', Veronicastrum:'garden_flower', Filipendula:'garden_flower',
  Ligularia:'garden_flower', Agastache:'garden_flower', Centranthus:'garden_flower',
  Hesperis:'garden_flower', Polemonium:'garden_flower', Armeria:'garden_flower',
  Erysimum:'garden_flower', Gaura:'garden_flower', Lythrum:'garden_flower',
  Penstemon:'garden_flower', Sidalcea:'garden_flower',
  // ── Bulbs ─────────────────────────────────────────────────────────────────────
  Tulipa:'bulb', Narcissus:'bulb', Hyacinthus:'bulb', Crocus:'bulb', Muscari:'bulb',
  Lilium:'bulb', Iris:'bulb', Gladiolus:'bulb', Dahlia:'bulb', Ranunculus:'bulb',
  Freesia:'bulb', Anemone:'bulb', Chionodoxa:'bulb', Scilla:'bulb', Galanthus:'bulb',
  Leucojum:'bulb', Eranthis:'bulb', Crocosmia:'bulb', Ornithogalum:'bulb',
  Camassia:'bulb', Sprekelia:'bulb',
  // ── Roses ────────────────────────────────────────────────────────────────────
  Rosa:'rose',
  // ── Shrubs ────────────────────────────────────────────────────────────────────
  Hydrangea:'shrub', Syringa:'shrub', Forsythia:'shrub', Spiraea:'shrub',
  Weigela:'shrub', Deutzia:'shrub', Buxus:'shrub', Thuja:'shrub',
  Euonymus:'shrub', Berberis:'shrub', Cotoneaster:'shrub', Viburnum:'shrub',
  Buddleja:'shrub', Potentilla:'shrub', Kolkwitzia:'shrub', Philadelphus:'shrub',
  Physocarpus:'shrub', Kerria:'shrub', Chaenomeles:'shrub', Pyracantha:'shrub',
  Ligustrum:'shrub', Lonicera:'shrub', Cotinus:'shrub', Amelanchier:'shrub',
  Caryopteris:'shrub',
  // ── Trees ─────────────────────────────────────────────────────────────────────
  Magnolia:'tree', Prunus:'tree', Acer:'tree', Cercis:'tree', Betula:'tree',
  Sorbus:'tree', Cornus:'tree', Catalpa:'tree', Salix:'tree', Pyrus:'tree',
  Liriodendron:'tree', Robinia:'tree', Paulownia:'tree',
  // ── Climbers ──────────────────────────────────────────────────────────────────
  Wisteria:'climber', Clematis:'climber', Jasminum:'climber', Passiflora:'climber',
  Campsis:'climber', Parthenocissus:'climber', Humulus:'climber', Actinidia:'climber',
  Aristolochia:'climber',
};

export function getCategoryForSpecies(scientificName: string): PlantCategory {
  const genus = scientificName.split(' ')[0];
  return GENUS_TO_CATEGORY[genus] ?? 'houseplant';
}
