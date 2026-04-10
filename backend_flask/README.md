# IntervuAI Flask Backend

Python Flask backend for IntervuAI - AI-powered interview coaching platform.

## Features

- ✅ Flask REST API with Blueprints
- ✅ Supabase authentication and database
- ✅ OpenAI GPT-4 integration
- ✅ Flowise AI workflow orchestration
- ✅ Input validation with Marshmallow
- ✅ CORS enabled
- ✅ Environment-based configuration

## Tech Stack

- **Framework**: Flask 3.0
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4, Flowise
- **Validation**: Marshmallow
- **HTTP Client**: HTTPX

## Quick Start

### 1. Install Dependencies

```bash
cd backend_flask
pip install -r requirements.txt
```

### 2. Configure Environment

The `.env` file is already configured with your Supabase credentials.

### 3. Run the Server

```bash
python run.py
```

The server will start at `http://localhost:5000`

### 4. Test Health Endpoint

```bash
curl http://localhost:5000/health
```

## API Endpoints

### Interviews
- `POST /api/interviews` - Create interview
- `GET /api/interviews` - Get all interviews
- `GET /api/interviews/<id>` - Get interview by ID
- `PATCH /api/interviews/<id>/status` - Update status
- `PATCH /api/interviews/<id>/scores` - Update scores
- `POST /api/interviews/<id>/calculate-scores` - Calculate scores
- `DELETE /api/interviews/<id>` - Delete interview
- `GET /api/interviews/stats/summary` - Get statistics

### Authentication

All endpoints require Bearer token:

```bash
Authorization: Bearer <your_token>
```

## Project Structure

```
backend_flask/
├── app/
│   ├── __init__.py           # Flask app factory
│   ├── config/               # Configuration
│   │   ├── config.py
│   │   └── supabase_client.py
│   ├── middleware/           # Auth middleware
│   │   └── auth.py
│   ├── routes/               # API routes
│   │   └── interview_routes.py
│   ├── services/             # Business logic
│   │   ├── interview_service.py
│   │   ├── question_service.py
│   │   ├── feedback_service.py
│   │   ├── openai_service.py
│   │   └── flowise_service.py
│   └── utils/                # Utilities
│       ├── responses.py
│       └── validation.py
├── .env                      # Environment variables
├── requirements.txt          # Dependencies
├── run.py                    # Entry point
└── README.md
```

## Development

### Run in Development Mode

```bash
export FLASK_ENV=development
python run.py
```

### Run in Production

```bash
export FLASK_ENV=production
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

## Testing

Use the same test user from the Node.js backend:
- Email: `testuser@intervuai.com`
- Password: `TestPassword123!`

## Deployment

Recommended platforms:
- **Heroku**: Easy Python deployment
- **Railway**: Modern deployment platform
- **Render**: Free tier available
- **AWS/GCP**: Production-grade hosting

## License

MIT
