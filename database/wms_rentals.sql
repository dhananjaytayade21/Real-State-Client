-- Run this script while connected to the wms_rentals database.
-- PostgreSQL 13+ is recommended.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(80) NOT NULL,
    email VARCHAR(254) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'
        CHECK (role IN ('ADMIN', 'MANAGER', 'CUSTOMER')),
    phone VARCHAR(40),
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT app_users_email_format CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

CREATE UNIQUE INDEX app_users_email_lower_uq ON app_users (LOWER(email));
CREATE UNIQUE INDEX app_users_username_lower_uq ON app_users (LOWER(username));
CREATE INDEX app_users_role_idx ON app_users (role);

CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
    density VARCHAR(20) NOT NULL DEFAULT 'COMFORTABLE' CHECK (density IN ('COMFORTABLE', 'COMPACT')),
    show_notifications BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    name VARCHAR(160) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    capacity_area_sqft NUMERIC(14, 2) NOT NULL CHECK (capacity_area_sqft > 0),
    monthly_rent NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (monthly_rent >= 0),
    security_deposit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT warehouses_owner_name_uq UNIQUE (owner_user_id, name)
);

CREATE INDEX warehouses_owner_active_idx ON warehouses (owner_user_id, is_active);
CREATE INDEX warehouses_city_idx ON warehouses (city);

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    sku VARCHAR(80) NOT NULL,
    name VARCHAR(180) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'Uncategorized',
    current_quantity INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    space_per_unit_sqft NUMERIC(10, 4) NOT NULL DEFAULT 1 CHECK (space_per_unit_sqft > 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_items_warehouse_sku_uq UNIQUE (warehouse_id, sku),
    CONSTRAINT inventory_items_warehouse_id_id_uq UNIQUE (warehouse_id, id)
);

CREATE INDEX inventory_items_warehouse_active_idx ON inventory_items (warehouse_id, is_active);
CREATE INDEX inventory_items_low_stock_idx
    ON inventory_items (warehouse_id, current_quantity)
    WHERE is_active = TRUE;
CREATE INDEX inventory_items_name_search_idx ON inventory_items (LOWER(name));

CREATE TABLE inventory_item_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX inventory_item_images_item_order_idx ON inventory_item_images (inventory_item_id, display_order);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL,
    performed_by_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    previous_quantity INTEGER NOT NULL CHECK (previous_quantity >= 0),
    new_quantity INTEGER NOT NULL CHECK (new_quantity >= 0),
    reference VARCHAR(160),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT stock_movements_item_warehouse_fk
        FOREIGN KEY (warehouse_id, inventory_item_id)
        REFERENCES inventory_items (warehouse_id, id) ON DELETE RESTRICT,
    CONSTRAINT stock_movements_quantity_delta_check CHECK (
        (movement_type = 'IN' AND new_quantity = previous_quantity + quantity)
        OR (movement_type = 'OUT' AND new_quantity = previous_quantity - quantity)
    )
);

CREATE INDEX stock_movements_warehouse_created_idx ON stock_movements (warehouse_id, created_at DESC);
CREATE INDEX stock_movements_item_created_idx ON stock_movements (inventory_item_id, created_at DESC);
CREATE INDEX stock_movements_actor_created_idx ON stock_movements (performed_by_user_id, created_at DESC);

CREATE TABLE customer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    order_number VARCHAR(40) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID'
        CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED')),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    shipping_address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX customer_orders_customer_created_idx ON customer_orders (customer_user_id, created_at DESC);
CREATE INDEX customer_orders_status_created_idx ON customer_orders (status, created_at DESC);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
    sku_snapshot VARCHAR(80) NOT NULL,
    item_name_snapshot VARCHAR(180) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(14, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX order_items_order_idx ON order_items (order_id);
CREATE INDEX order_items_inventory_idx ON order_items (inventory_item_id);

CREATE TABLE rental_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    property_name VARCHAR(180) NOT NULL,
    property_type VARCHAR(30) NOT NULL
        CHECK (property_type IN ('WAREHOUSE', 'COMMERCIAL', 'RESIDENTIAL', 'INDUSTRIAL', 'OFFICE', 'OTHER')),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    area_sqft NUMERIC(12, 2) NOT NULL CHECK (area_sqft > 0),
    monthly_rent NUMERIC(12, 2) NOT NULL CHECK (monthly_rent >= 0),
    security_deposit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX rental_properties_owner_active_idx ON rental_properties (owner_user_id, is_active);
CREATE INDEX rental_properties_location_idx ON rental_properties (city, state, property_type);
CREATE INDEX rental_properties_rent_idx ON rental_properties (monthly_rent);
CREATE INDEX rental_properties_name_search_idx ON rental_properties (LOWER(property_name));

CREATE TABLE property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES rental_properties(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(200),
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX property_images_property_order_idx ON property_images (property_id, display_order);

CREATE TABLE rental_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES rental_properties(id) ON DELETE RESTRICT,
    customer_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID'
        CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED')),
    monthly_rent_snapshot NUMERIC(12, 2) NOT NULL CHECK (monthly_rent_snapshot >= 0),
    security_deposit_snapshot NUMERIC(12, 2) NOT NULL CHECK (security_deposit_snapshot >= 0),
    rental_charge NUMERIC(14, 2) GENERATED ALWAYS AS (
        CEIL((end_date - start_date)::NUMERIC / 30) * monthly_rent_snapshot
    ) STORED,
    total_amount NUMERIC(14, 2) GENERATED ALWAYS AS (
        CEIL((end_date - start_date)::NUMERIC / 30) * monthly_rent_snapshot + security_deposit_snapshot
    ) STORED,
    amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT rental_bookings_date_range_check CHECK (end_date > start_date),
    CONSTRAINT rental_bookings_paid_amount_check CHECK (
        amount_paid <= CEIL((end_date - start_date)::NUMERIC / 30) * monthly_rent_snapshot + security_deposit_snapshot
    ),
    CONSTRAINT rental_bookings_no_overlapping_active_ranges
        EXCLUDE USING GIST (
            property_id WITH =,
            DATERANGE(start_date, end_date, '[)') WITH &&
        )
        WHERE (status IN ('PENDING', 'APPROVED', 'ACTIVE'))
);

CREATE INDEX rental_bookings_customer_created_idx ON rental_bookings (customer_user_id, created_at DESC);
CREATE INDEX rental_bookings_property_dates_idx ON rental_bookings (property_id, start_date, end_date);
CREATE INDEX rental_bookings_status_dates_idx ON rental_bookings (status, start_date, end_date);

CREATE TABLE favorite_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES rental_properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT favorite_properties_user_property_uq UNIQUE (user_id, property_id)
);

CREATE INDEX favorite_properties_property_idx ON favorite_properties (property_id);

CREATE TABLE user_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    recipient_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    subject VARCHAR(200),
    message_body TEXT NOT NULL CHECK (LENGTH(BTRIM(message_body)) > 0),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    CONSTRAINT user_messages_sender_recipient_check CHECK (sender_user_id <> recipient_user_id)
);

CREATE INDEX user_messages_recipient_unread_idx ON user_messages (recipient_user_id, sent_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX user_messages_sender_sent_idx ON user_messages (sender_user_id, sent_at DESC);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    notification_type VARCHAR(40) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message_body TEXT NOT NULL,
    related_entity_type VARCHAR(40),
    related_entity_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_unread_created_idx ON notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT password_reset_tokens_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX password_reset_tokens_user_created_idx ON password_reset_tokens (user_id, created_at DESC);

CREATE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER app_users_set_updated_at
    BEFORE UPDATE ON app_users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER warehouses_set_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER inventory_items_set_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customer_orders_set_updated_at
    BEFORE UPDATE ON customer_orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER rental_properties_set_updated_at
    BEFORE UPDATE ON rental_properties
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER rental_bookings_set_updated_at
    BEFORE UPDATE ON rental_bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE FUNCTION check_warehouse_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    occupied_area NUMERIC(16, 4);
BEGIN
    SELECT COALESCE(SUM(current_quantity * space_per_unit_sqft), 0)
    INTO occupied_area
    FROM inventory_items
    WHERE warehouse_id = NEW.id;

    IF occupied_area > NEW.capacity_area_sqft THEN
        RAISE EXCEPTION 'Warehouse capacity cannot be lower than current occupied space.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER warehouses_capacity_check
    BEFORE UPDATE OF capacity_area_sqft ON warehouses
    FOR EACH ROW EXECUTE FUNCTION check_warehouse_capacity();

CREATE FUNCTION guard_inventory_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    warehouse_capacity NUMERIC(14, 2);
    occupied_area NUMERIC(16, 4);
    stock_write_allowed TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.current_quantity <> 0 THEN
            RAISE EXCEPTION 'Create inventory items with zero stock; use a stock movement to receive inventory.'
                USING ERRCODE = '23514';
        END IF;
    ELSIF NEW.current_quantity IS DISTINCT FROM OLD.current_quantity THEN
        stock_write_allowed := current_setting('app.stock_movement_write', TRUE);
        IF stock_write_allowed IS DISTINCT FROM 'on' THEN
            RAISE EXCEPTION 'Change inventory quantity by inserting a stock movement.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id
        AND (OLD.current_quantity <> 0 OR NEW.current_quantity <> 0) THEN
        RAISE EXCEPTION 'Stock must be zero before moving an inventory item to another warehouse.'
            USING ERRCODE = '23514';
    END IF;

    SELECT capacity_area_sqft
    INTO warehouse_capacity
    FROM warehouses
    WHERE id = NEW.warehouse_id
    FOR UPDATE;

    IF warehouse_capacity IS NULL THEN
        RAISE EXCEPTION 'Warehouse does not exist.'
            USING ERRCODE = '23503';
    END IF;

    SELECT COALESCE(SUM(current_quantity * space_per_unit_sqft), 0)
    INTO occupied_area
    FROM inventory_items
    WHERE warehouse_id = NEW.warehouse_id
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    occupied_area := occupied_area + (NEW.current_quantity * NEW.space_per_unit_sqft);
    IF occupied_area > warehouse_capacity THEN
        RAISE EXCEPTION 'Stock movement exceeds available warehouse capacity.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_items_capacity_guard
    BEFORE INSERT OR UPDATE OF warehouse_id, current_quantity, space_per_unit_sqft
    ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION guard_inventory_capacity();

CREATE FUNCTION apply_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    item_record RECORD;
    warehouse_is_active BOOLEAN;
    write_flag_before TEXT;
BEGIN
    SELECT is_active
    INTO warehouse_is_active
    FROM warehouses
    WHERE id = NEW.warehouse_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Warehouse does not exist.'
            USING ERRCODE = '23503';
    END IF;

    IF NEW.movement_type = 'IN' AND NOT warehouse_is_active THEN
        RAISE EXCEPTION 'Cannot receive stock into an inactive warehouse.'
            USING ERRCODE = '23514';
    END IF;

    SELECT id, warehouse_id, current_quantity
    INTO item_record
    FROM inventory_items
    WHERE id = NEW.inventory_item_id
    FOR UPDATE;

    IF NOT FOUND OR item_record.warehouse_id <> NEW.warehouse_id THEN
        RAISE EXCEPTION 'Inventory item does not belong to this warehouse.'
            USING ERRCODE = '23503';
    END IF;

    IF NEW.movement_type = 'OUT' AND item_record.current_quantity < NEW.quantity THEN
        RAISE EXCEPTION 'Stock movement would make inventory quantity negative.'
            USING ERRCODE = '23514';
    END IF;

    NEW.previous_quantity := item_record.current_quantity;
    IF NEW.movement_type = 'IN' THEN
        NEW.new_quantity := item_record.current_quantity + NEW.quantity;
    ELSE
        NEW.new_quantity := item_record.current_quantity - NEW.quantity;
    END IF;

    write_flag_before := current_setting('app.stock_movement_write', TRUE);
    PERFORM set_config('app.stock_movement_write', 'on', TRUE);

    UPDATE inventory_items
    SET current_quantity = NEW.new_quantity
    WHERE id = NEW.inventory_item_id;

    PERFORM set_config('app.stock_movement_write', COALESCE(write_flag_before, 'off'), TRUE);
    RETURN NEW;
END;
$$;

CREATE TRIGGER stock_movements_apply_quantity
    BEFORE INSERT ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();

CREATE FUNCTION prevent_stock_movement_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Stock movement history is immutable.'
        USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER stock_movements_immutable
    BEFORE UPDATE OR DELETE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION prevent_stock_movement_mutation();

CREATE FUNCTION snapshot_booking_terms()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    property_record RECORD;
BEGIN
    SELECT owner_user_id, monthly_rent, security_deposit, is_active
    INTO property_record
    FROM rental_properties
    WHERE id = NEW.property_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rental property does not exist.'
            USING ERRCODE = '23503';
    END IF;

    IF NOT property_record.is_active THEN
        RAISE EXCEPTION 'Cannot book an inactive rental property.'
            USING ERRCODE = '23514';
    END IF;

    IF property_record.owner_user_id = NEW.customer_user_id THEN
        RAISE EXCEPTION 'A property owner cannot book their own property.'
            USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'INSERT' OR NEW.property_id IS DISTINCT FROM OLD.property_id THEN
        NEW.monthly_rent_snapshot := property_record.monthly_rent;
        NEW.security_deposit_snapshot := property_record.security_deposit;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER rental_bookings_snapshot_terms
    BEFORE INSERT OR UPDATE OF property_id ON rental_bookings
    FOR EACH ROW EXECUTE FUNCTION snapshot_booking_terms();

CREATE VIEW warehouse_capacity_summary AS
SELECT
    warehouse.id AS warehouse_id,
    warehouse.owner_user_id,
    warehouse.name,
    warehouse.capacity_area_sqft,
    COALESCE(SUM(item.current_quantity * item.space_per_unit_sqft), 0)::NUMERIC(16, 4) AS occupied_area_sqft,
    (warehouse.capacity_area_sqft
        - COALESCE(SUM(item.current_quantity * item.space_per_unit_sqft), 0))::NUMERIC(16, 4) AS available_area_sqft,
    warehouse.is_active
FROM warehouses AS warehouse
LEFT JOIN inventory_items AS item ON item.warehouse_id = warehouse.id
GROUP BY warehouse.id;

CREATE VIEW inventory_low_stock AS
SELECT
    item.id AS inventory_item_id,
    item.warehouse_id,
    warehouse.owner_user_id,
    item.sku,
    item.name,
    item.current_quantity,
    item.low_stock_threshold
FROM inventory_items AS item
JOIN warehouses AS warehouse ON warehouse.id = item.warehouse_id
WHERE item.is_active = TRUE
  AND item.current_quantity <= item.low_stock_threshold;

CREATE VIEW rental_property_availability AS
SELECT
    property.*,
    CASE
        WHEN property.is_active = FALSE THEN 'INACTIVE'
        WHEN EXISTS (
            SELECT 1
            FROM rental_bookings AS booking
            WHERE booking.property_id = property.id
              AND booking.status = 'ACTIVE'
              AND booking.start_date <= CURRENT_DATE
              AND booking.end_date > CURRENT_DATE
        ) THEN 'OCCUPIED'
        WHEN EXISTS (
            SELECT 1
            FROM rental_bookings AS booking
            WHERE booking.property_id = property.id
              AND booking.status IN ('PENDING', 'APPROVED')
              AND booking.start_date <= CURRENT_DATE
              AND booking.end_date > CURRENT_DATE
        ) THEN 'RESERVED'
        ELSE 'AVAILABLE'
    END AS availability_status
FROM rental_properties AS property;

CREATE VIEW customer_order_totals AS
SELECT
    orders.id AS order_id,
    orders.customer_user_id,
    orders.order_number,
    orders.status,
    orders.payment_status,
    orders.currency,
    COALESCE(SUM(items.line_total), 0)::NUMERIC(14, 2) AS total_amount,
    orders.created_at,
    orders.updated_at
FROM customer_orders AS orders
LEFT JOIN order_items AS items ON items.order_id = orders.id
GROUP BY orders.id;

-- Development-only users all use the password: Demo123!
INSERT INTO app_users (id, username, email, full_name, password_hash, role, email_verified_at)
VALUES
    ('10000000-0000-4000-8000-000000000001', 'admin', 'admin@example.test', 'Demo Admin', crypt('Demo123!', gen_salt('bf')), 'ADMIN', NOW()),
    ('10000000-0000-4000-8000-000000000002', 'manager', 'manager@example.test', 'Demo Manager', crypt('Demo123!', gen_salt('bf')), 'MANAGER', NOW()),
    ('10000000-0000-4000-8000-000000000003', 'customer', 'customer@example.test', 'Demo Customer', crypt('Demo123!', gen_salt('bf')), 'CUSTOMER', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouses (
    id, owner_user_id, name, address, city, state, postal_code,
    capacity_area_sqft, monthly_rent, security_deposit, description
)
VALUES
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
     'Northside Distribution', '101 Industrial Way', 'Austin', 'Texas', '78701',
     12000, 4500, 9000, 'Development warehouse with temperature-controlled storage.'),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
     'South Storage Center', '22 Logistics Drive', 'Austin', 'Texas', '78744',
     8000, 3000, 6000, 'Development warehouse with loading dock access.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_items (
    id, warehouse_id, sku, name, description, category,
    current_quantity, space_per_unit_sqft, low_stock_threshold
)
VALUES
    ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
     'BOX-MED-001', 'Medium Shipping Box', 'Double-wall corrugated shipping box.', 'Packaging', 0, 0.25, 40),
    ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
     'TAPE-CLR-002', 'Clear Packing Tape', '48 mm clear packing tape roll.', 'Packaging', 0, 0.05, 25)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_movements (
    id, warehouse_id, inventory_item_id, performed_by_user_id, movement_type,
    quantity, previous_quantity, new_quantity, reference, notes
)
SELECT
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'IN', 250, 0, 250, 'SEED-RECEIPT-001', 'Initial development stock.'
WHERE NOT EXISTS (SELECT 1 FROM stock_movements WHERE id = '40000000-0000-4000-8000-000000000001');

INSERT INTO stock_movements (
    id, warehouse_id, inventory_item_id, performed_by_user_id, movement_type,
    quantity, previous_quantity, new_quantity, reference, notes
)
SELECT
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'IN', 120, 0, 120, 'SEED-RECEIPT-002', 'Initial development stock.'
WHERE NOT EXISTS (SELECT 1 FROM stock_movements WHERE id = '40000000-0000-4000-8000-000000000002');

INSERT INTO rental_properties (
    id, owner_user_id, property_name, property_type, address, city, state, postal_code,
    area_sqft, monthly_rent, security_deposit, description
)
VALUES
    ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
     'Riverside Logistics Hub', 'WAREHOUSE', '900 River Road', 'Austin', 'Texas', '78702',
     18000, 7200, 14400, 'Large warehouse with multiple loading bays.'),
    ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
     'Downtown Commerce Suite', 'COMMERCIAL', '45 Market Street', 'Austin', 'Texas', '78701',
     2400, 3200, 6400, 'Flexible commercial space near downtown.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO property_images (id, property_id, image_url, alt_text, display_order)
VALUES
    ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
     'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d', 'Warehouse interior', 0),
    ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002',
     'https://images.unsplash.com/photo-1497366754035-f200968a6e72', 'Commercial office interior', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rental_bookings (
    id, property_id, customer_user_id, start_date, end_date, status,
    payment_status, monthly_rent_snapshot, security_deposit_snapshot, amount_paid, notes
)
SELECT
    seed.id, seed.property_id, seed.customer_user_id, seed.start_date, seed.end_date, seed.status,
    seed.payment_status, seed.monthly_rent_snapshot, seed.security_deposit_snapshot, seed.amount_paid, seed.notes
FROM (VALUES
    ('60000000-0000-4000-8000-000000000001'::UUID, '50000000-0000-4000-8000-000000000001'::UUID,
     '10000000-0000-4000-8000-000000000003'::UUID, CURRENT_DATE - 10, CURRENT_DATE + 20,
     'ACTIVE', 'PARTIALLY_PAID', 7200::NUMERIC, 14400::NUMERIC, 5000::NUMERIC, 'Development example: active booking.'),
    ('60000000-0000-4000-8000-000000000002'::UUID, '50000000-0000-4000-8000-000000000002'::UUID,
     '10000000-0000-4000-8000-000000000003'::UUID, CURRENT_DATE + 45, CURRENT_DATE + 105,
     'PENDING', 'UNPAID', 3200::NUMERIC, 6400::NUMERIC, 0::NUMERIC, 'Development example: pending request.')
) AS seed(id, property_id, customer_user_id, start_date, end_date, status,
          payment_status, monthly_rent_snapshot, security_deposit_snapshot, amount_paid, notes)
WHERE NOT EXISTS (
    SELECT 1 FROM rental_bookings AS existing WHERE existing.id = seed.id
);

INSERT INTO favorite_properties (id, user_id, property_id)
VALUES (
    '62000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000002'
)
ON CONFLICT (user_id, property_id) DO NOTHING;

INSERT INTO customer_orders (
    id, customer_user_id, order_number, status, payment_status, currency, shipping_address
)
VALUES (
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    'DEMO-ORDER-001', 'CONFIRMED', 'UNPAID', 'USD', '45 Market Street, Austin, Texas'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (
    id, order_id, inventory_item_id, sku_snapshot, item_name_snapshot, quantity, unit_price
)
VALUES
    ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001',
     '30000000-0000-4000-8000-000000000001', 'BOX-MED-001', 'Medium Shipping Box', 20, 2.50),
    ('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001',
     '30000000-0000-4000-8000-000000000002', 'TAPE-CLR-002', 'Clear Packing Tape', 6, 3.25)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_messages (
    id, sender_user_id, recipient_user_id, subject, message_body
)
VALUES (
    '80000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Property viewing',
    'Hello, I would like to arrange a viewing for the Riverside Logistics Hub.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (
    id, user_id, notification_type, title, message_body, related_entity_type, related_entity_id
)
VALUES
    ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
     'BOOKING_REQUEST', 'New booking request', 'A customer requested the Downtown Commerce Suite.',
     'RENTAL_BOOKING', '60000000-0000-4000-8000-000000000002'),
    ('90000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003',
     'ORDER_UPDATE', 'Order confirmed', 'Your order DEMO-ORDER-001 has been confirmed.',
     'CUSTOMER_ORDER', '70000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

COMMIT;
