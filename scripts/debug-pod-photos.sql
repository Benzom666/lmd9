-- Debug script to check POD photo data
-- Run this to see what's actually in the database

-- Check orders table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('photo_url', 'completed_at', 'status')
ORDER BY column_name;

-- Check if proof_of_delivery table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'proof_of_delivery'
);

-- Check if pod_photos table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'pod_photos'
);

-- Show recent orders with their photo data
SELECT 
    id,
    order_number,
    status,
    driver_id,
    customer_name,
    photo_url IS NOT NULL as has_photo_url,
    LENGTH(photo_url) as photo_url_length,
    completed_at,
    created_at,
    updated_at
FROM orders 
WHERE status IN ('delivered', 'failed')
ORDER BY updated_at DESC 
LIMIT 10;

-- Show POD records if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'proof_of_delivery') THEN
        RAISE NOTICE 'POD table exists, showing records:';
        PERFORM * FROM (
            SELECT 
                pod.id,
                pod.order_id,
                pod.recipient_name,
                pod.delivery_timestamp,
                o.order_number,
                o.status
            FROM proof_of_delivery pod
            JOIN orders o ON pod.order_id = o.id
            ORDER BY pod.created_at DESC
            LIMIT 5
        ) AS pod_data;
    ELSE
        RAISE NOTICE 'POD table does not exist';
    END IF;
END $$;

-- Show POD photos if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pod_photos') THEN
        RAISE NOTICE 'POD photos table exists, showing records:';
        PERFORM * FROM (
            SELECT 
                pp.id,
                pp.pod_id,
                pp.photo_type,
                LENGTH(pp.photo_url) as photo_size,
                pp.mime_type,
                pp.created_at
            FROM pod_photos pp
            ORDER BY pp.created_at DESC
            LIMIT 5
        ) AS photo_data;
    ELSE
        RAISE NOTICE 'POD photos table does not exist';
    END IF;
END $$;

-- Check delivery_failures table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'delivery_failures') THEN
        RAISE NOTICE 'Delivery failures table exists, showing records:';
        PERFORM * FROM (
            SELECT 
                df.id,
                df.order_id,
                df.failure_reason,
                LENGTH(df.photos) as photos_length,
                df.created_at,
                o.order_number
            FROM delivery_failures df
            JOIN orders o ON df.order_id = o.id
            ORDER BY df.created_at DESC
            LIMIT 5
        ) AS failure_data;
    ELSE
        RAISE NOTICE 'Delivery failures table does not exist';
    END IF;
END $$;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('orders', 'proof_of_delivery', 'pod_photos', 'delivery_failures')
ORDER BY tablename, policyname;
