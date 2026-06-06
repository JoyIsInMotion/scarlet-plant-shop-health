-- Store multiple photos per plant
CREATE TABLE IF NOT EXISTS plant_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT now(),
  INDEX plant_photos_plant_idx ON plant_id,
  INDEX plant_photos_user_idx ON user_id,
  INDEX plant_photos_uploaded_idx ON uploaded_at
);

-- Add photo management functions to the plants table (optional but useful)
CREATE INDEX IF NOT EXISTS plant_photos_plant_uploaded_idx ON plant_photos(plant_id, uploaded_at DESC);
