-- Create storage bucket for delivery photos (this needs to be done by an admin)
-- Note: Bucket creation might need to be done manually in Supabase dashboard
-- or by a service role key due to RLS restrictions

-- Create proof_of_delivery table if it doesn't exist
CREATE TABLE IF NOT EXISTS proof_of_delivery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  delivery_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_name TEXT NOT NULL,
  recipient_signature TEXT,
  delivery_notes TEXT,
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pod_photos table for storing photo metadata
CREATE TABLE IF NOT EXISTS pod_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pod_id UUID NOT NULL REFERENCES proof_of_delivery(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL DEFAULT 'delivery',
  description TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pod_order_id ON proof_of_delivery(order_id);
CREATE INDEX IF NOT EXISTS idx_pod_driver_id ON proof_of_delivery(driver_id);
CREATE INDEX IF NOT EXISTS idx_pod_photos_pod_id ON pod_photos(pod_id);

-- Enable RLS
ALTER TABLE proof_of_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for proof_of_delivery
DROP POLICY IF EXISTS "Users can view their own PODs" ON proof_of_delivery;
CREATE POLICY "Users can view their own PODs" ON proof_of_delivery
FOR SELECT USING (
  driver_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Drivers can create PODs for their orders" ON proof_of_delivery;
CREATE POLICY "Drivers can create PODs for their orders" ON proof_of_delivery
FOR INSERT WITH CHECK (
  driver_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM orders 
    WHERE id = order_id 
    AND driver_id = auth.uid()
  )
);

-- Create RLS policies for pod_photos
DROP POLICY IF EXISTS "Users can view POD photos" ON pod_photos;
CREATE POLICY "Users can view POD photos" ON pod_photos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM proof_of_delivery pod
    WHERE pod.id = pod_id 
    AND (
      pod.driver_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
      )
    )
  )
);

DROP POLICY IF EXISTS "Drivers can create POD photos" ON pod_photos;
CREATE POLICY "Drivers can create POD photos" ON pod_photos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM proof_of_delivery pod
    WHERE pod.id = pod_id 
    AND pod.driver_id = auth.uid()
  )
);

-- Note: Storage bucket and policies need to be created manually or via service role
-- Run these commands in Supabase SQL editor or via service role:

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'delivery-photos',
--   'delivery-photos',
--   true,
--   10485760,
--   ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
-- ) ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "Allow authenticated users to upload delivery photos" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'delivery-photos' 
--   AND auth.role() = 'authenticated'
-- );

-- CREATE POLICY "Allow public read access to delivery photos" ON storage.objects
-- FOR SELECT USING (bucket_id = 'delivery-photos');

-- CREATE POLICY "Allow users to delete their own delivery photos" ON storage.objects
-- FOR DELETE USING (
--   bucket_id = 'delivery-photos' 
--   AND auth.role() = 'authenticated'
-- );
