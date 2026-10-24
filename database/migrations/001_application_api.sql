-- Run once against an existing wms_rentals database before starting the API.
BEGIN;

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS username VARCHAR(80);

WITH usernames AS (
    SELECT id,
           split_part(email, '@', 1) AS base_name,
           ROW_NUMBER() OVER (PARTITION BY LOWER(split_part(email, '@', 1)) ORDER BY created_at, id) AS duplicate_number
    FROM app_users
    WHERE username IS NULL
)
UPDATE app_users AS users
SET username = CASE
    WHEN usernames.duplicate_number = 1 THEN usernames.base_name
    ELSE LEFT(usernames.base_name, 65) || '-' || LEFT(REPLACE(users.id::TEXT, '-', ''), 12)
END
FROM usernames
WHERE users.id = usernames.id;

ALTER TABLE app_users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_username_lower_uq ON app_users (LOWER(username));

CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
    density VARCHAR(20) NOT NULL DEFAULT 'COMFORTABLE' CHECK (density IN ('COMFORTABLE', 'COMPACT')),
    show_notifications BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS inventory_item_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_item_images_item_order_idx ON inventory_item_images (inventory_item_id, display_order);

COMMIT;
