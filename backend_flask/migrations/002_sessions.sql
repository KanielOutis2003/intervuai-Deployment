-- Phase 2: Session Management Migration
-- Creates interview_sessions, chat_messages, and voice_transcriptions tables

-- Create interview_sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_active_session UNIQUE (interview_id, ended_at)
);

-- Create index on interview_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_interview_sessions_interview_id ON interview_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_started_at ON interview_sessions(started_at DESC);

-- Add trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_interview_sessions_updated_at ON interview_sessions;
CREATE TRIGGER update_interview_sessions_updated_at
    BEFORE UPDATE ON interview_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interview_sessions
CREATE POLICY "Users can view their own sessions"
    ON interview_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = interview_sessions.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own sessions"
    ON interview_sessions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = interview_sessions.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own sessions"
    ON interview_sessions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = interview_sessions.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on interview_id and timestamp for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_interview_id ON chat_messages(interview_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
CREATE POLICY "Users can view their own chat messages"
    ON chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = chat_messages.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own chat messages"
    ON chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = chat_messages.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

-- Create voice_transcriptions table
CREATE TABLE IF NOT EXISTS voice_transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    audio_url TEXT,
    transcription TEXT,
    confidence FLOAT,
    language VARCHAR(10),
    duration FLOAT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on interview_id and question_id
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_interview_id ON voice_transcriptions(interview_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_question_id ON voice_transcriptions(question_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_created_at ON voice_transcriptions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_transcriptions
CREATE POLICY "Users can view their own transcriptions"
    ON voice_transcriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = voice_transcriptions.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own transcriptions"
    ON voice_transcriptions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = voice_transcriptions.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own transcriptions"
    ON voice_transcriptions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = voice_transcriptions.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON interview_sessions TO authenticated;
GRANT SELECT ON interview_sessions TO anon;
GRANT ALL ON chat_messages TO authenticated;
GRANT SELECT ON chat_messages TO anon;
GRANT ALL ON voice_transcriptions TO authenticated;
GRANT SELECT ON voice_transcriptions TO anon;
