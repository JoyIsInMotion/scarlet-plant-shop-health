import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  pgEnum,
  boolean,
  real,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);

export const metricTypeEnum = pgEnum('metric_type', [
  'water',
  'light',
  'humidity',
  'temperature',
  'fertilizer',
]);

export const productCategoryEnum = pgEnum('product_category', [
  'bouquet',
  'potted_plant',
  'succulent',
  'tropical',
  'seasonal',
  'accessories',
]);

export const careDifficultyEnum = pgEnum('care_difficulty', [
  'easy',
  'moderate',
  'difficult',
]);

export const aiConditionEnum = pgEnum('ai_condition', [
  'excellent',
  'good',
  'fair',
  'poor',
  'critical',
]);

export const aiConfidenceEnum = pgEnum('ai_confidence', ['low', 'medium', 'high']);

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('user').notNull(),
    avatarUrl: text('avatar_url'),
    isActive: boolean('is_active').default(true).notNull(),
    preferredLocale: varchar('preferred_locale', { length: 5 }).default('bg').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('users_email_idx').on(t.email),
    index('users_role_idx').on(t.role),
  ]
);

// ─── refresh_tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('refresh_tokens_user_idx').on(t.userId)]
);

// ─── plant_species (global catalog) ──────────────────────────────────────────

export const plantSpecies = pgTable(
  'plant_species',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    commonNameBg: varchar('common_name_bg', { length: 150 }),
    commonNameEn: varchar('common_name_en', { length: 150 }),
    scientificName: varchar('scientific_name', { length: 200 }).notNull(),
    family: varchar('family', { length: 150 }),
    nativeRegionBg: text('native_region_bg'),
    nativeRegionEn: text('native_region_en'),
    careDifficulty: careDifficultyEnum('care_difficulty'),
    descriptionBg: text('description_bg'),
    descriptionEn: text('description_en'),
    careGuide: jsonb('care_guide').$type<
      Record<string, { bg: string; en: string }>
    >(),
    imageUrl: text('image_url'),
    isVerified: boolean('is_verified').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('plant_species_scientific_idx').on(t.scientificName),
    index('plant_species_common_bg_idx').on(t.commonNameBg),
    index('plant_species_common_en_idx').on(t.commonNameEn),
    index('plant_species_verified_idx').on(t.isVerified),
  ]
);

// ─── plants (user's personal collection) ─────────────────────────────────────

export const plants = pgTable(
  'plants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    speciesId: uuid('species_id').references(() => plantSpecies.id, {
      onDelete: 'set null',
    }),
    customName: varchar('custom_name', { length: 100 }).notNull(),
    healthScore: real('health_score').default(100).notNull(),
    lastWatered: timestamp('last_watered'),
    imageUrl: text('image_url'),
    isArchived: boolean('is_archived').default(false).notNull(),
    speciesConfirmed: boolean('species_confirmed').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('plants_user_idx').on(t.userId),
    index('plants_species_idx').on(t.speciesId),
    index('plants_health_idx').on(t.healthScore),
    index('plants_archived_idx').on(t.isArchived),
  ]
);

// ─── plant_stats ──────────────────────────────────────────────────────────────

export const plantStats = pgTable(
  'plant_stats',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    plantId: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    metricType: metricTypeEnum('metric_type').notNull(),
    value: real('value').notNull(),
    unit: varchar('unit', { length: 20 }),
    notes: text('notes'),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  },
  (t) => [
    index('plant_stats_plant_idx').on(t.plantId),
    index('plant_stats_metric_idx').on(t.metricType),
    index('plant_stats_recorded_at_idx').on(t.recordedAt),
  ]
);

// ─── ai_analyses ──────────────────────────────────────────────────────────────

export const aiAnalyses = pgTable(
  'ai_analyses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    plantId: uuid('plant_id').references(() => plants.id, {
      onDelete: 'set null',
    }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    // Health assessment
    healthScore: real('health_score'),
    overallCondition: aiConditionEnum('overall_condition'),
    issues: jsonb('issues')
      .$type<Array<{ name: string; severity: string; description: string }>>()
      .default([]),
    careRecommendations: jsonb('care_recommendations')
      .$type<string[]>()
      .default([]),
    wateringNeeded: boolean('watering_needed'),
    // Species identification
    identifiedCommonName: varchar('identified_common_name', { length: 150 }),
    identifiedScientificName: varchar('identified_scientific_name', {
      length: 200,
    }),
    identifiedFamily: varchar('identified_family', { length: 150 }),
    identifiedNativeRegion: varchar('identified_native_region', {
      length: 200,
    }),
    identifiedCareDifficulty: careDifficultyEnum('identified_care_difficulty'),
    matchedSpeciesId: uuid('matched_species_id').references(
      () => plantSpecies.id,
      { onDelete: 'set null' }
    ),
    // Metadata
    confidence: aiConfidenceEnum('confidence'),
    modelUsed: varchar('model_used', { length: 60 }).notNull(),
    analyzedAt: timestamp('analyzed_at').defaultNow().notNull(),
  },
  (t) => [
    index('ai_analyses_plant_idx').on(t.plantId),
    index('ai_analyses_user_idx').on(t.userId),
    index('ai_analyses_analyzed_at_idx').on(t.analyzedAt),
  ]
);

// ─── products ─────────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nameBg: varchar('name_bg', { length: 200 }).notNull(),
    nameEn: varchar('name_en', { length: 200 }).notNull(),
    descriptionBg: text('description_bg'),
    descriptionEn: text('description_en'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    category: productCategoryEnum('category').notNull(),
    imageUrl: text('image_url'),
    stock: integer('stock').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    slug: varchar('slug', { length: 250 }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('products_category_idx').on(t.category),
    index('products_slug_idx').on(t.slug),
    index('products_active_idx').on(t.isActive),
  ]
);

// ─── orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    total: decimal('total', { precision: 10, scale: 2 }).notNull(),
    status: orderStatusEnum('status').default('pending').notNull(),
    shippingAddress: text('shipping_address'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('orders_user_idx').on(t.userId),
    index('orders_status_idx').on(t.status),
  ]
);

// ─── order_items ──────────────────────────────────────────────────────────────

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  },
  (t) => [
    index('order_items_order_idx').on(t.orderId),
    index('order_items_product_idx').on(t.productId),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  plants: many(plants),
  orders: many(orders),
  refreshTokens: many(refreshTokens),
  aiAnalyses: many(aiAnalyses),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const plantSpeciesRelations = relations(plantSpecies, ({ many }) => ({
  plants: many(plants),
  aiAnalyses: many(aiAnalyses),
}));

export const plantsRelations = relations(plants, ({ one, many }) => ({
  user: one(users, { fields: [plants.userId], references: [users.id] }),
  species: one(plantSpecies, {
    fields: [plants.speciesId],
    references: [plantSpecies.id],
  }),
  stats: many(plantStats),
  aiAnalyses: many(aiAnalyses),
}));

export const plantStatsRelations = relations(plantStats, ({ one }) => ({
  plant: one(plants, {
    fields: [plantStats.plantId],
    references: [plants.id],
  }),
}));

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  plant: one(plants, {
    fields: [aiAnalyses.plantId],
    references: [plants.id],
  }),
  user: one(users, { fields: [aiAnalyses.userId], references: [users.id] }),
  matchedSpecies: one(plantSpecies, {
    fields: [aiAnalyses.matchedSpeciesId],
    references: [plantSpecies.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
