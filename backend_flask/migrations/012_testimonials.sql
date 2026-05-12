-- Phase 12: Verified Premium User Testimonials
-- Creates testimonial storage for premium-user submitted public reviews.

CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    display_name TEXT NOT NULL,
    role_title TEXT,
    quote TEXT NOT NULL,
    consent_public_display BOOLEAN NOT NULL DEFAULT false,
    is_premium_at_submission BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
    featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_testimonials_user_id ON testimonials(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON testimonials(created_at DESC);

DROP TRIGGER IF EXISTS update_testimonials_updated_at ON testimonials;
CREATE TRIGGER update_testimonials_updated_at
    BEFORE UPDATE ON testimonials FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved testimonials" ON testimonials;
CREATE POLICY "Anyone can view approved testimonials"
    ON testimonials
    FOR SELECT
    USING (status = 'approved' AND consent_public_display = true);

DROP POLICY IF EXISTS "Premium users submit own testimonials" ON testimonials;
CREATE POLICY "Premium users submit own testimonials"
    ON testimonials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id AND consent_public_display = true);

DROP POLICY IF EXISTS "Users view own testimonials" ON testimonials;
CREATE POLICY "Users view own testimonials"
    ON testimonials
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage testimonials" ON testimonials;
CREATE POLICY "Admins manage testimonials"
    ON testimonials
    FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

GRANT SELECT ON testimonials TO anon;
GRANT SELECT, INSERT ON testimonials TO authenticated;
GRANT ALL ON testimonials TO service_role;
