-- DB Schema for KL CommuteMind

-- 1. Disruption Alerts
CREATE TABLE IF NOT EXISTS disruptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    affected_lines TEXT[], -- e.g., ['Kelana Jaya Line']
    severity VARCHAR(50), -- e.g., 'high', 'medium', 'low'
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Preferences (for personalized alerts/push notifications)
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY, -- Linked to Supabase Auth
    frequent_routes JSONB, -- Array of routes/stops
    push_subscription JSONB, -- Push notification subscription object
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crowd Reports (Crowdsourced)
CREATE TABLE IF NOT EXISTS crowd_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id VARCHAR(100) NOT NULL,
    crowd_level VARCHAR(50), -- 'low', 'medium', 'high'
    reported_by UUID, -- Can be null for anonymous
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
