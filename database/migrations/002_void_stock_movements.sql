-- Run once against an existing wms_rentals database before deploying the API.
BEGIN;

ALTER TABLE stock_movements
    ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS voided_by_user_id UUID
        REFERENCES app_users(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION prevent_stock_movement_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.voided_at IS NULL
       AND NEW.voided_at IS NOT NULL
       AND OLD.voided_by_user_id IS NULL
       AND NEW.voided_by_user_id IS NOT NULL
       AND ROW(
           NEW.id, NEW.warehouse_id, NEW.inventory_item_id, NEW.performed_by_user_id,
           NEW.movement_type, NEW.quantity, NEW.previous_quantity, NEW.new_quantity,
           NEW.reference, NEW.notes, NEW.created_at
       ) IS NOT DISTINCT FROM ROW(
           OLD.id, OLD.warehouse_id, OLD.inventory_item_id, OLD.performed_by_user_id,
           OLD.movement_type, OLD.quantity, OLD.previous_quantity, OLD.new_quantity,
           OLD.reference, OLD.notes, OLD.created_at
       )
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Stock movement history is immutable except for voiding.'
        USING ERRCODE = '23514';
END;
$$;

COMMIT;
