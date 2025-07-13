-- Enhanced Shopify integration schema with comprehensive features

-- Update shopify_connections table with additional fields
ALTER TABLE shopify_connections ADD COLUMN IF NOT EXISTS shop_name VARCHAR(255);
ALTER TABLE shopify_connections ADD COLUMN IF NOT EXISTS shop_email VARCHAR(255);
ALTER TABLE shopify_connections ADD COLUMN IF NOT EXISTS shop_currency VARCHAR(10);
ALTER TABLE shopify_connections ADD COLUMN IF NOT EXISTS shop_timezone VARCHAR(100);
ALTER TABLE shopify_connections ADD COLUMN IF NOT EXISTS plan_name VARCHAR(100);
ALTER TABLE shopify_connections ADD COLUMN IF NOT EXISTS connection_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE shopify_connections ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE shopify_connections ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Create shopify_sync_logs table for detailed logging
CREATE TABLE IF NOT EXISTS shopify_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- 'orders', 'fulfillments', 'webhooks'
    status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_duration_ms INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create shopify_webhooks table for webhook management
CREATE TABLE IF NOT EXISTS shopify_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE,
    shopify_webhook_id BIGINT,
    topic VARCHAR(100) NOT NULL,
    endpoint_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0
);

-- Create shopify_fulfillments table for tracking fulfillments
CREATE TABLE IF NOT EXISTS shopify_fulfillments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_order_id VARCHAR(50) NOT NULL,
    shopify_fulfillment_id BIGINT NOT NULL,
    connection_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    tracking_number VARCHAR(255),
    tracking_company VARCHAR(255),
    tracking_urls TEXT[],
    location_id BIGINT,
    notify_customer BOOLEAN DEFAULT true,
    line_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shopify_fulfillment_id, connection_id)
);

-- Create shopify_analytics table for caching analytics data
CREATE TABLE IF NOT EXISTS shopify_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE,
    date_range VARCHAR(20) NOT NULL, -- '7d', '30d', '90d', '1y'
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    fulfillment_rate DECIMAL(5,2) DEFAULT 0,
    orders_by_status JSONB DEFAULT '{}'::jsonb,
    revenue_over_time JSONB DEFAULT '[]'::jsonb,
    top_products JSONB DEFAULT '[]'::jsonb,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
    UNIQUE(connection_id, date_range)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_sync_logs_connection_id ON shopify_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_logs_status ON shopify_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_logs_started_at ON shopify_sync_logs(started_at);

CREATE INDEX IF NOT EXISTS idx_shopify_webhooks_connection_id ON shopify_webhooks(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_webhooks_topic ON shopify_webhooks(topic);

CREATE INDEX IF NOT EXISTS idx_shopify_fulfillments_order_id ON shopify_fulfillments(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_fulfillments_connection_id ON shopify_fulfillments(connection_id);

CREATE INDEX IF NOT EXISTS idx_shopify_analytics_connection_id ON shopify_analytics(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_analytics_expires_at ON shopify_analytics(expires_at);

-- Create RLS policies
ALTER TABLE shopify_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for shopify_sync_logs
CREATE POLICY "Users can view their own sync logs" ON shopify_sync_logs
    FOR SELECT USING (
        connection_id IN (
            SELECT id FROM shopify_connections 
            WHERE admin_id = auth.uid()
        )
    );

-- Policies for shopify_webhooks
CREATE POLICY "Users can manage their own webhooks" ON shopify_webhooks
    FOR ALL USING (
        connection_id IN (
            SELECT id FROM shopify_connections 
            WHERE admin_id = auth.uid()
        )
    );

-- Policies for shopify_fulfillments
CREATE POLICY "Users can manage their own fulfillments" ON shopify_fulfillments
    FOR ALL USING (
        connection_id IN (
            SELECT id FROM shopify_connections 
            WHERE admin_id = auth.uid()
        )
    );

-- Policies for shopify_analytics
CREATE POLICY "Users can view their own analytics" ON shopify_analytics
    FOR ALL USING (
        connection_id IN (
            SELECT id FROM shopify_connections 
            WHERE admin_id = auth.uid()
        )
    );

-- Create function to clean up expired analytics
CREATE OR REPLACE FUNCTION cleanup_expired_analytics()
RETURNS void AS $$
BEGIN
    DELETE FROM shopify_analytics WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to log sync operations
CREATE OR REPLACE FUNCTION log_shopify_sync(
    p_connection_id UUID,
    p_sync_type VARCHAR(50),
    p_status VARCHAR(20),
    p_records_processed INTEGER DEFAULT 0,
    p_records_created INTEGER DEFAULT 0,
    p_records_updated INTEGER DEFAULT 0,
    p_records_failed INTEGER DEFAULT 0,
    p_error_message TEXT DEFAULT NULL,
    p_sync_duration_ms INTEGER DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO shopify_sync_logs (
        connection_id,
        sync_type,
        status,
        records_processed,
        records_created,
        records_updated,
        records_failed,
        error_message,
        sync_duration_ms,
        completed_at,
        metadata
    ) VALUES (
        p_connection_id,
        p_sync_type,
        p_status,
        p_records_processed,
        p_records_created,
        p_records_updated,
        p_records_failed,
        p_error_message,
        p_sync_duration_ms,
        CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE NULL END,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get sync statistics
CREATE OR REPLACE FUNCTION get_sync_statistics(p_connection_id UUID DEFAULT NULL)
RETURNS TABLE (
    pending INTEGER,
    processing INTEGER,
    completed INTEGER,
    failed INTEGER,
    total INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending,
        COUNT(*) FILTER (WHERE status = 'processing')::INTEGER as processing,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed,
        COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed,
        COUNT(*)::INTEGER as total
    FROM shopify_sync_logs
    WHERE (p_connection_id IS NULL OR connection_id = p_connection_id)
    AND started_at >= NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
