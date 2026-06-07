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
  uniqueIndex,
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

export const careTypeEnum = pgEnum('care_type', [
  'watered',
  'fertilized',
  'repotted',
  'misted',
  'pruned',
  'rotated',
  'observation',
]);

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 30 }),
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
    category: varchar('category', { length: 30 }),
    descriptionBg: text('description_bg'),
    descriptionEn: text('description_en'),
    careGuide: jsonb('care_guide').$type<
      Record<string, { bg: string; en: string }>
    >(),
    imageUrl: text('image_url'),
    isVerified: boolean('is_verified').default(false).notNull(),
    // Structured care intervals — used to auto-generate plant_care_schedules
    wateringIntervalDays: integer('watering_interval_days'),
    fertilizingIntervalDays: integer('fertilizing_interval_days'),
    repottingIntervalMonths: integer('repotting_interval_months'),
    mistingNeeded: boolean('misting_needed').default(false).notNull(),
    isToxicToPets: boolean('is_toxic_to_pets'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('plant_species_scientific_idx').on(t.scientificName),
    index('plant_species_common_bg_idx').on(t.commonNameBg),
    index('plant_species_common_en_idx').on(t.commonNameEn),
    index('plant_species_verified_idx').on(t.isVerified),
    index('plant_species_category_idx').on(t.category),
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
    isPublic: boolean('is_public').default(false).notNull(),
    likesCount: integer('likes_count').default(0).notNull(),
    speciesConfirmed: boolean('species_confirmed').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('plants_user_idx').on(t.userId),
    index('plants_species_idx').on(t.speciesId),
    index('plants_health_idx').on(t.healthScore),
    index('plants_archived_idx').on(t.isArchived),
    index('plants_public_idx').on(t.isPublic),
    // Composite: covers the common list query (userId + isArchived filter + ORDER BY createdAt)
    index('plants_user_archived_created_idx').on(t.userId, t.isArchived, t.createdAt),
  ]
);

// ─── plant_likes ──────────────────────────────────────────────────────────────

export const plantLikes = pgTable(
  'plant_likes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    plantId: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('plant_likes_user_idx').on(t.userId),
    index('plant_likes_plant_idx').on(t.plantId),
    uniqueIndex('plant_likes_user_plant_idx').on(t.userId, t.plantId),
  ]
);

// ─── plant_care_schedules ─────────────────────────────────────────────────────

export const plantCareSchedules = pgTable(
  'plant_care_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    plantId: uuid('plant_id')
      .notNull()
      .unique()
      .references(() => plants.id, { onDelete: 'cascade' }),
    wateringIntervalDays: integer('watering_interval_days'),
    wateringNextDue: timestamp('watering_next_due'),
    fertilizingIntervalDays: integer('fertilizing_interval_days'),
    fertilizingNextDue: timestamp('fertilizing_next_due'),
    repottingIntervalMonths: integer('repotting_interval_months'),
    repottingNextDue: timestamp('repotting_next_due'),
    mistingNeeded: boolean('misting_needed').default(false).notNull(),
    mistingNextDue: timestamp('misting_next_due'),
    isCustomized: boolean('is_customized').default(false).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

// ─── plant_care_logs ──────────────────────────────────────────────────────────

export const plantCareLogs = pgTable(
  'plant_care_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    plantId: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    careType: careTypeEnum('care_type').notNull(),
    photoUrl: text('photo_url'),
    notes: text('notes'),
    loggedAt: timestamp('logged_at').defaultNow().notNull(),
  },
  (t) => [
    index('care_logs_plant_logged_idx').on(t.plantId, t.loggedAt),
    index('care_logs_plant_type_idx').on(t.plantId, t.careType),
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
    // Composite: covers per-plant analyses list query (plantId filter + ORDER BY analyzedAt)
    index('ai_analyses_plant_analyzed_idx').on(t.plantId, t.analyzedAt),
  ]
);

// ─── plant_photos ─────────────────────────────────────────────────────────────

export const plantPhotos = pgTable(
  'plant_photos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    plantId: uuid('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  },
  (t) => [
    index('plant_photos_plant_idx').on(t.plantId),
    index('plant_photos_user_idx').on(t.userId),
    index('plant_photos_uploaded_idx').on(t.uploadedAt),
    index('plant_photos_plant_uploaded_idx').on(t.plantId, t.uploadedAt),
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
    // Composite: covers filtered shop queries (isActive + category filter + ORDER BY createdAt)
    index('products_active_category_created_idx').on(t.isActive, t.category, t.createdAt),
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
    // Composite: covers user order history (userId filter + ORDER BY createdAt)
    index('orders_user_created_idx').on(t.userId, t.createdAt),
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
  careLogs: many(plantCareLogs),
  plantLikes: many(plantLikes),
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
  careLogs: many(plantCareLogs),
  aiAnalyses: many(aiAnalyses),
  likes: many(plantLikes),
}));

export const plantLikesRelations = relations(plantLikes, ({ one }) => ({
  user: one(users, { fields: [plantLikes.userId], references: [users.id] }),
  plant: one(plants, { fields: [plantLikes.plantId], references: [plants.id] }),
}));

export const plantCareSchedulesRelations = relations(plantCareSchedules, ({ one }) => ({
  plant: one(plants, {
    fields: [plantCareSchedules.plantId],
    references: [plants.id],
  }),
}));

export const plantCareLogsRelations = relations(plantCareLogs, ({ one }) => ({
  plant: one(plants, { fields: [plantCareLogs.plantId], references: [plants.id] }),
  user: one(users, { fields: [plantCareLogs.userId], references: [users.id] }),
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
