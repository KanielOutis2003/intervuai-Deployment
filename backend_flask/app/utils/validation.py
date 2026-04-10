"""Input validation utilities."""
from marshmallow import Schema, fields, ValidationError, validate
from flask import request
from functools import wraps
from app.utils.responses import error_response


def validate_request(schema_class):
    """Decorator to validate request data."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            schema = schema_class()

            try:
                # Validate request JSON
                validated_data = schema.load(request.get_json())
                request.validated_data = validated_data
                return f(*args, **kwargs)

            except ValidationError as err:
                return error_response(
                    'Validation failed',
                    status=400,
                    details=err.messages
                )

        return decorated_function
    return decorator


# Interview schemas
class CreateInterviewSchema(Schema):
    """Schema for creating an interview."""
    jobRole = fields.Str(required=True, validate=validate.Length(min=2, max=255))
    interviewType = fields.Str(
        load_default='general',
        validate=validate.OneOf(['general', 'technical', 'behavioral', 'situational', 'mixed'])
    )


class UpdateInterviewStatusSchema(Schema):
    """Schema for updating interview status."""
    status = fields.Str(
        required=True,
        validate=validate.OneOf(['pending', 'in_progress', 'completed', 'cancelled'])
    )


class UpdateInterviewScoresSchema(Schema):
    """Schema for updating interview scores."""
    overallScore = fields.Float(validate=validate.Range(min=0, max=100))
    verbalScore = fields.Float(validate=validate.Range(min=0, max=100))
    nonVerbalScore = fields.Float(validate=validate.Range(min=0, max=100))
    eyeContactScore = fields.Float(validate=validate.Range(min=0, max=100))
    postureScore = fields.Float(validate=validate.Range(min=0, max=100))


# Question schemas
class CreateQuestionSchema(Schema):
    """Schema for creating a question."""
    interviewId = fields.UUID(required=True)
    questionText = fields.Str(required=True)
    questionOrder = fields.Int(required=True, validate=validate.Range(min=1))
    category = fields.Str()
    difficulty = fields.Str(validate=validate.OneOf(['easy', 'medium', 'hard']))
    expectedKeywords = fields.List(fields.Str())


class BulkCreateQuestionsSchema(Schema):
    """Schema for bulk creating questions."""
    interviewId = fields.UUID(required=True)
    questions = fields.List(fields.Nested(CreateQuestionSchema), required=True)


# Feedback schemas
class CreateFeedbackSchema(Schema):
    """Schema for creating feedback."""
    interviewId = fields.UUID(required=True)
    questionId = fields.UUID(required=True)
    userResponse = fields.Str()
    transcription = fields.Str()
    relevanceScore = fields.Float(validate=validate.Range(min=0, max=100))
    grammarScore = fields.Float(validate=validate.Range(min=0, max=100))
    confidenceScore = fields.Float(validate=validate.Range(min=0, max=100))
    keywordsMatched = fields.List(fields.Str())
    aiFeedback = fields.Str()


class RecordNonVerbalMetricSchema(Schema):
    """Schema for recording non-verbal metrics."""
    interviewId = fields.UUID(required=True)
    eyeContact = fields.Bool(required=True)
    postureStatus = fields.Str(required=True)
    postureAngle = fields.Float(required=True)


class RecordAggregatedNonVerbalSchema(Schema):
    """Schema for recording aggregated MediaPipe non-verbal data at interview end."""
    interviewId = fields.UUID(required=True)
    # MediaPipe session averages
    eyeContactRatio = fields.Float(validate=validate.Range(min=0, max=1), load_default=None, allow_none=True)
    postureScore    = fields.Float(validate=validate.Range(min=0, max=100), load_default=None, allow_none=True)
    sampleCount     = fields.Int(load_default=0)
    # Groq verbal averages (for the weighted formula on the server side)
    groqVerbalAvg   = fields.Float(validate=validate.Range(min=0, max=100), load_default=None, allow_none=True)
    # Optional full buffer for detailed storage
    sessionBuffer   = fields.List(fields.Dict(), load_default=None, allow_none=True)


# Auth schemas (Phase 1)
class RegisterSchema(Schema):
    """Schema for user registration."""
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6, max=255))
    fullName = fields.Str(validate=validate.Length(max=255))


class LoginSchema(Schema):
    """Schema for user login."""
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class RefreshTokenSchema(Schema):
    """Schema for refreshing access token."""
    refresh_token = fields.Str(required=True)


class ForgotPasswordSchema(Schema):
    """Schema for forgot password request."""
    email = fields.Email(required=True)


class ResetPasswordSchema(Schema):
    """Schema for resetting password."""
    token = fields.Str(required=True)
    newPassword = fields.Str(required=True, validate=validate.Length(min=6, max=255))


class ChangePasswordSchema(Schema):
    """Schema for changing current user's password."""
    newPassword = fields.Str(required=True, validate=validate.Length(min=6, max=255))


# User profile schemas (Phase 1)
class UpdateProfileSchema(Schema):
    """Schema for updating user profile."""
    fullName        = fields.Str(validate=validate.Length(max=255))
    avatarUrl       = fields.Url(load_default=None, allow_none=True)
    targetIndustry  = fields.Str(validate=validate.Length(max=255), load_default=None, allow_none=True)
    experienceLevel = fields.Str(
        validate=validate.OneOf(['entry', 'mid', 'senior', 'executive']),
        load_default=None, allow_none=True,
    )
    resumeUrl       = fields.Str(validate=validate.Length(max=2048), load_default=None, allow_none=True)


class UpdatePreferencesSchema(Schema):
    """Schema for updating user preferences."""
    preferences = fields.Dict(required=True)


# Session schemas (Phase 2)
class StartSessionSchema(Schema):
    """Schema for starting an interview session."""
    interviewId = fields.UUID(required=True)
    sessionData = fields.Dict()


class EndSessionSchema(Schema):
    """Schema for ending an interview session."""
    sessionId = fields.UUID(required=True)


class SendMessageSchema(Schema):
    """Schema for sending a chat message."""
    interviewId = fields.UUID(required=True)
    role = fields.Str(required=True, validate=validate.OneOf(['user', 'assistant', 'system']))
    content = fields.Str(required=True, validate=validate.Length(min=1))
    metadata = fields.Dict()
    persist_only = fields.Bool(load_default=False)


class TranscribeAudioSchema(Schema):
    """Schema for audio transcription request."""
    interviewId = fields.UUID(required=True)
    questionId = fields.UUID()
    language = fields.Str(validate=validate.Length(max=10))


# Analysis schemas (Phase 3)
class NLPAnalysisSchema(Schema):
    """Schema for NLP analysis request."""
    interviewId = fields.UUID(required=True)
    text = fields.Str(required=True, validate=validate.Length(min=1))
    questionId = fields.UUID(load_default=None, allow_none=True)


class GenerateFeedbackSchema(Schema):
    """Schema for generating AI feedback."""
    interviewId = fields.UUID(required=True)
    questionId = fields.UUID(required=True)
    questionText = fields.Str(required=True)
    userResponse = fields.Str(required=True)
    jobRole = fields.Str(required=True)
    expectedKeywords = fields.List(fields.Str())


# Resource schemas (Phase 5)
class CreateResourceSchema(Schema):
    """Schema for creating a resource."""
    title = fields.Str(required=True, validate=validate.Length(min=2, max=500))
    category = fields.Str(required=True)
    resourceType = fields.Str(required=True, validate=validate.OneOf(['article', 'video', 'tip', 'guide', 'template']))
    description = fields.Str()
    content = fields.Str()
    tags = fields.List(fields.Str())
    difficulty = fields.Str(validate=validate.OneOf(['beginner', 'intermediate', 'advanced']))


class UpdateResourceSchema(Schema):
    """Schema for updating a resource."""
    title = fields.Str(validate=validate.Length(min=2, max=500))
    category = fields.Str()
    resourceType = fields.Str(validate=validate.OneOf(['article', 'video', 'tip', 'guide', 'template']))
    description = fields.Str()
    content = fields.Str()
    tags = fields.List(fields.Str())
    difficulty = fields.Str(validate=validate.OneOf(['beginner', 'intermediate', 'advanced']))
    isPublished = fields.Bool()


# Admin schemas (Phase 6)
class AddBankQuestionSchema(Schema):
    """Schema for adding a question to the question bank."""
    questionText = fields.Str(required=True, validate=validate.Length(min=5))
    category = fields.Str(required=True)
    difficulty = fields.Str(required=True, validate=validate.OneOf(['easy', 'medium', 'hard']))
    jobRole = fields.Str()
    tags = fields.List(fields.Str())
    expectedKeywords = fields.List(fields.Str())


class CreateJobRoleSchema(Schema):
    """Schema for creating a job role."""
    title = fields.Str(required=True, validate=validate.Length(min=2, max=255))
    description = fields.Str()
    category = fields.Str()
    requiredSkills = fields.List(fields.Str())


class CreatePlanSchema(Schema):
    """Schema for creating a subscription plan."""
    name = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    price = fields.Float(required=True, validate=validate.Range(min=0))
    description = fields.Str()
    features = fields.List(fields.Str())
    limits = fields.Dict()


class SubscribeSchema(Schema):
    """Schema for subscribing to a plan."""
    planId = fields.UUID(required=True)
