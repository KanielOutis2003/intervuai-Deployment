-- Phase 5: Resources & Learning Migration
-- Creates resources table

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    category VARCHAR(100) NOT NULL,
    tags JSONB DEFAULT '[]',
    resource_type VARCHAR(50) NOT NULL DEFAULT 'article' CHECK (resource_type IN ('article', 'video', 'tip', 'guide', 'exercise')),
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_difficulty ON resources(difficulty);
CREATE INDEX IF NOT EXISTS idx_resources_published ON resources(is_published);

DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published resources"
    ON resources FOR SELECT
    USING (is_published = true);

CREATE POLICY "Admins can manage resources"
    ON resources FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

GRANT ALL ON resources TO authenticated;
GRANT SELECT ON resources TO anon;
