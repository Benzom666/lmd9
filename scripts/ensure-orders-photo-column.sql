-- Ensure orders table has photo_url and completed_at columns
-- Run this to add missing columns if they don't exist

-- Check if photo_url column exists and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE orders ADD COLUMN photo_url TEXT;
        RAISE NOTICE 'Added photo_url column to orders table';
    ELSE
        RAISE NOTICE 'photo_url column already exists in orders table';
    END IF;
END $$;

-- Check if completed_at column exists and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN completed_at TIMESTAMPTZ;
        RAISE NOTICE 'Added completed_at column to orders table';
    ELSE
        RAISE NOTICE 'completed_at column already exists in orders table';
    END IF;
END $$;

-- Ensure proof_of_delivery table exists
CREATE TABLE IF NOT EXISTS proof_of_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL,
    delivery_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recipient_name TEXT NOT NULL,
    recipient_signature TEXT,
    delivery_notes TEXT,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure pod_photos table exists
CREATE TABLE IF NOT EXISTS pod_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id UUID NOT NULL REFERENCES proof_of_delivery(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type TEXT DEFAULT 'delivery',
    description TEXT,
    file_size BIGINT,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_proof_of_delivery_order_id ON proof_of_delivery(order_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_delivery_driver_id ON proof_of_delivery(driver_id);
CREATE INDEX IF NOT EXISTS idx_pod_photos_pod_id ON pod_photos(pod_id);

-- Enable RLS on new tables
ALTER TABLE proof_of_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for proof_of_delivery
DROP POLICY IF EXISTS "Users can view their own POD records" ON proof_of_delivery;
CREATE POLICY "Users can view their own POD records" ON proof_of_delivery
    FOR SELECT USING (
        driver_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = order_id AND o.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Drivers can create POD records" ON proof_of_delivery;
CREATE POLICY "Drivers can create POD records" ON proof_of_delivery
    FOR INSERT WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update their POD records" ON proof_of_delivery;
CREATE POLICY "Drivers can update their POD records" ON proof_of_delivery
    FOR UPDATE USING (driver_id = auth.uid());

-- Create RLS policies for pod_photos
DROP POLICY IF EXISTS "Users can view POD photos" ON pod_photos;
CREATE POLICY "Users can view POD photos" ON pod_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM proof_of_delivery pod 
            WHERE pod.id = pod_id AND (
                pod.driver_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM orders o 
                    WHERE o.id = pod.order_id AND o.created_by = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Drivers can create POD photos" ON pod_photos;
CREATE POLICY "Drivers can create POD photos" ON pod_photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM proof_of_delivery pod 
            WHERE pod.id = pod_id AND pod.driver_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON proof_of_delivery TO authenticated;
GRANT ALL ON pod_photos TO authenticated;

-- Show current table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('orders', 'proof_of_delivery', 'pod_photos')
ORDER BY table_name, ordinal_position;
