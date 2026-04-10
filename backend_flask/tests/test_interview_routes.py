"""Unit tests for interview routes."""
import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def app():
    """Create a test Flask application with mocked Supabase."""
    with patch('app.config.supabase_client.supabase', MagicMock()), \
         patch('app.config.supabase_client.supabase_admin', MagicMock()):
        from app import create_app
        application = create_app('testing')
        yield application


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(mocker):
    """Provide pre-authenticated request headers by mocking _verify_token."""
    mocker.patch(
        'app.middleware.auth._verify_token',
        return_value=(
            MagicMock(id='user-uuid', email='test@example.com'),
            'user',
            'Test User'
        )
    )
    return {'Authorization': 'Bearer valid-token'}


MOCK_INTERVIEW = {
    'id': 'interview-uuid',
    'user_id': 'user-uuid',
    'job_role': 'Software Engineer',
    'status': 'pending',
    'created_at': '2024-01-01T00:00:00'
}


# ---------------------------------------------------------------------------
# POST /api/interviews
# ---------------------------------------------------------------------------

class TestCreateInterview:
    def test_create_interview_unauthenticated_returns_401(self, client):
        """Request without auth token returns 401."""
        resp = client.post('/api/interviews', json={'jobRole': 'Software Engineer'})
        assert resp.status_code == 401

    def test_create_interview_success(self, client, mocker, auth_headers):
        """Authenticated create returns 201 with interview data."""
        mocker.patch(
            'app.routes.interview_routes.InterviewService.create_interview',
            return_value=MOCK_INTERVIEW
        )

        resp = client.post(
            '/api/interviews',
            json={'jobRole': 'Software Engineer'},
            headers=auth_headers
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['success'] is True
        assert data['data']['job_role'] == 'Software Engineer'

    def test_create_interview_missing_role_returns_400(self, client, auth_headers):
        """Missing jobRole field returns 400."""
        resp = client.post(
            '/api/interviews',
            json={},
            headers=auth_headers
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/interviews
# ---------------------------------------------------------------------------

class TestGetInterviews:
    def test_get_interviews_returns_list(self, client, mocker, auth_headers):
        """Authenticated GET returns list of interviews."""
        mocker.patch(
            'app.routes.interview_routes.InterviewService.get_user_interviews',
            return_value=[MOCK_INTERVIEW]
        )

        resp = client.get('/api/interviews', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert data['data']['count'] == 1

    def test_get_interviews_unauthenticated_returns_401(self, client):
        resp = client.get('/api/interviews')
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/interviews/<id>
# ---------------------------------------------------------------------------

class TestGetInterview:
    def test_get_interview_not_found_returns_404(self, client, mocker, auth_headers):
        """Non-existent interview ID returns 404."""
        from app.utils.responses import APIError
        mocker.patch(
            'app.routes.interview_routes.InterviewService.get_interview_by_id',
            side_effect=APIError('Interview not found', 404)
        )

        resp = client.get('/api/interviews/nonexistent-id', headers=auth_headers)
        assert resp.status_code == 404
        data = resp.get_json()
        assert data['success'] is False

    def test_get_interview_success(self, client, mocker, auth_headers):
        """Valid interview ID returns 200 with interview data."""
        mocker.patch(
            'app.routes.interview_routes.InterviewService.get_interview_by_id',
            return_value=MOCK_INTERVIEW
        )

        resp = client.get('/api/interviews/interview-uuid', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True


# ---------------------------------------------------------------------------
# PATCH /api/interviews/<id>/status
# ---------------------------------------------------------------------------

class TestUpdateInterviewStatus:
    def test_update_status_success(self, client, mocker, auth_headers):
        """Valid status update returns 200."""
        updated = {**MOCK_INTERVIEW, 'status': 'completed'}
        mocker.patch(
            'app.routes.interview_routes.InterviewService.update_interview_status',
            return_value=updated
        )

        resp = client.patch(
            '/api/interviews/interview-uuid/status',
            json={'status': 'completed'},
            headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
