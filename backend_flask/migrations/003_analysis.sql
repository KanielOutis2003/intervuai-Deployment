-- Phase 3: AI Analysis & Feedback Migration
-- Creates nlp_analyses and session_summaries tables

-- Create nlp_analyses table
CREATE TABLE IF NOT EXISTS nlp_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    sentiment VARCHAR(50),
    sentiment_score FLOAT,
    filler_words JSONB DEFAULT '[]',
    filler_word_count INTEGER DEFAULT 0,
    clarity_score FLOAT,
    vocabulary_score FLOAT,
    grammar_score FLOAT,
    pace_score FLOAT,
    analysis_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nlp_analyses_interview_id ON nlp_analyses(interview_id);
CREATE INDEX IF NOT EXISTS idx_nlp_analyses_question_id ON nlp_analyses(question_id);
CREATE INDEX IF NOT EXISTS idx_nlp_analyses_created_at ON nlp_analyses(created_at DESC);

-- Enable Row Level Security
ALTER TABLE nlp_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nlp_analyses
CREATE POLICY "Users can view their own NLP analyses"
    ON nlp_analyses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = nlp_analyses.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own NLP analyses"
    ON nlp_analyses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = nlp_analyses.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

-- Create session_summaries table
CREATE TABLE IF NOT EXISTS session_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    summary_text TEXT,
    strengths JSONB DEFAULT '[]',
    improvements JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    overall_assessment TEXT,
    score_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_interview_summary UNIQUE (interview_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_session_summaries_interview_id ON session_summaries(interview_id);

-- Add trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_session_summaries_updated_at ON session_summaries;
CREATE TRIGGER update_session_summaries_updated_at
    BEFORE UPDATE ON session_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_summaries
CREATE POLICY "Users can view their own summaries"
    ON session_summaries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = session_summaries.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own summaries"
    ON session_summaries
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = session_summaries.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own summaries"
    ON session_summaries
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = session_summaries.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON nlp_analyses TO authenticated;
GRANT SELECT ON nlp_analyses TO anon;
GRANT ALL ON session_summaries TO authenticated;
GRANT SELECT ON session_summaries TO anon;
