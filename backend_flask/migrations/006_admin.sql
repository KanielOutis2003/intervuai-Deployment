-- Phase 6: Admin & System Migration
-- Creates question_bank, job_roles, subscription_plans, user_subscriptions, audit_logs

-- Question Bank
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    job_role VARCHAR(255),
    tags JSONB DEFAULT '[]',
    expected_keywords JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_question_bank_category ON question_bank(category);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_bank_job_role ON question_bank(job_role);
CREATE INDEX IF NOT EXISTS idx_question_bank_active ON question_bank(is_active);

DROP TRIGGER IF EXISTS update_question_bank_updated_at ON question_bank;
CREATE TRIGGER update_question_bank_updated_at
    BEFORE UPDATE ON question_bank FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Job Roles
CREATE TABLE IF NOT EXISTS job_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    required_skills JSONB DEFAULT '[]',
    difficulty_levels JSONB DEFAULT '["easy", "medium", "hard"]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_roles_category ON job_roles(category);
CREATE INDEX IF NOT EXISTS idx_job_roles_active ON job_roles(is_active);

DROP TRIGGER IF EXISTS update_job_roles_updated_at ON job_roles;
CREATE TRIGGER update_job_roles_updated_at
    BEFORE UPDATE ON job_roles FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    billing_period VARCHAR(20) DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly', 'lifetime')),
    features JSONB DEFAULT '[]',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Enable RLS on all tables
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active question bank" ON question_bank FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage question bank" ON question_bank FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can view active job roles" ON job_roles FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage job roles" ON job_roles FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can view active plans" ON subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage plans" ON subscription_plans FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users view own subscriptions" ON user_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage own subscriptions" ON user_subscriptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view all subscriptions" ON user_subscriptions FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins view all audit logs" ON audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- Grants
GRANT ALL ON question_bank TO authenticated;
GRANT SELECT ON question_bank TO anon;
GRANT ALL ON job_roles TO authenticated;
GRANT SELECT ON job_roles TO anon;
GRANT ALL ON subscription_plans TO authenticated;
GRANT SELECT ON subscription_plans TO anon;
GRANT ALL ON user_subscriptions TO authenticated;
GRANT ALL ON audit_logs TO authenticated;

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, billing_period, features, limits, is_active) VALUES
('Free', 'Basic access to interview practice', 0, 'monthly', '["5 interviews/month", "Basic feedback", "Limited question bank"]', '{"interviews_per_month": 5, "ai_feedback": false}', true),
('Premium', 'Full access with AI-powered features', 19.99, 'monthly', '["Unlimited interviews", "AI feedback", "Full question bank", "Session summaries", "Progress tracking"]', '{"interviews_per_month": -1, "ai_feedback": true}', true),
('Enterprise', 'Team and organization features', 49.99, 'monthly', '["Everything in Premium", "Team management", "Custom question banks", "Analytics dashboard", "Priority support"]', '{"interviews_per_month": -1, "ai_feedback": true, "team_management": true}', true)
ON CONFLICT DO NOTHING;
