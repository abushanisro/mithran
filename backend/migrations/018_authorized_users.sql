-- Authorized Users Table
-- Only users in this table are allowed to access the application

CREATE TABLE IF NOT EXISTS authorized_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users(email);
CREATE INDEX IF NOT EXISTS idx_authorized_users_active ON authorized_users(is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_authorized_users_updated_at BEFORE UPDATE ON authorized_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view the authorized users table
CREATE POLICY "Authenticated users can view authorized users"
    ON authorized_users FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify (you'll need to add admin role logic)
CREATE POLICY "Service role can manage authorized users"
    ON authorized_users FOR ALL
    TO service_role
    USING (true);

-- Insert existing user if needed (replace with your email)
-- INSERT INTO authorized_users (email, full_name, role)
-- VALUES ('emuski@mithran.com', 'Emuski', 'admin')
-- ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE authorized_users IS 'Whitelist of users authorized to access the application. Users must be in this table to sign in.';
