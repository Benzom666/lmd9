-- Add photo_url and completed_at columns to orders table if they don't exist
DO $$ 
BEGIN
    -- Add photo_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE orders ADD COLUMN photo_url TEXT;
        COMMENT ON COLUMN orders.photo_url IS 'JSON array of photo URLs or single photo URL for delivery evidence';
    END IF;

    -- Add completed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN orders.completed_at IS 'Timestamp when the order was completed (delivered or failed)';
    END IF;

    -- Create index on completed_at for performance
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'orders' AND indexname = 'idx_orders_completed_at'
    ) THEN
        CREATE INDEX idx_orders_completed_at ON orders(completed_at);
    END IF;

    -- Create index on photo_url for performance (using GIN for JSON operations)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'orders' AND indexname = 'idx_orders_photo_url'
    ) THEN
        CREATE INDEX idx_orders_photo_url ON orders USING GIN (photo_url);
    END IF;

END $$;

-- Update existing delivered/failed orders to set completed_at if null
UPDATE orders 
SET completed_at = updated_at 
WHERE (status = 'delivered' OR status = 'failed') 
AND completed_at IS NULL;

-- Add trigger to automatically set completed_at when status changes to delivered or failed
CREATE OR REPLACE FUNCTION set_order_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set completed_at when status changes to delivered or failed
    IF NEW.status IN ('delivered', 'failed') AND OLD.status NOT IN ('delivered', 'failed') THEN
        NEW.completed_at = NOW();
    END IF;
    
    -- Clear completed_at if status changes away from delivered/failed
    IF NEW.status NOT IN ('delivered', 'failed') AND OLD.status IN ('delivered', 'failed') THEN
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS trigger_set_order_completed_at ON orders;
CREATE TRIGGER trigger_set_order_completed_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_completed_at();

-- Grant necessary permissions
GRANT SELECT, UPDATE ON orders TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add RLS policies if they don't exist
DO $$
BEGIN
    -- Enable RLS on orders table
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    
    -- Policy for drivers to see their own orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'drivers_can_view_own_orders'
    ) THEN
        CREATE POLICY drivers_can_view_own_orders ON orders
            FOR SELECT USING (
                auth.uid() IN (
                    SELECT user_id FROM profiles 
                    WHERE user_id = auth.uid() 
                    AND role IN ('driver', 'admin', 'super_admin')
                )
            );
    END IF;
    
    -- Policy for drivers to update their own orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'drivers_can_update_own_orders'
    ) THEN
        CREATE POLICY drivers_can_update_own_orders ON orders
            FOR UPDATE USING (
                driver_id = auth.uid() OR
                auth.uid() IN (
                    SELECT user_id FROM profiles 
                    WHERE user_id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the migration
        RAISE NOTICE 'Error setting up RLS policies: %', SQLERRM;
END $$;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('photo_url', 'completed_at')
ORDER BY column_name;

-- Show sample data structure
SELECT 
    id,
    order_number,
    status,
    photo_url,
    completed_at,
    created_at,
    updated_at
FROM orders 
WHERE photo_url IS NOT NULL 
OR completed_at IS NOT NULL
LIMIT 5;
