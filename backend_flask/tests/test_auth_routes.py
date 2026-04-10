"""Unit tests for authentication routes."""
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


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------

class TestRegister:
    def test_register_success(self, client, mocker):
        """Valid registration payload returns 201 with user data."""
        mock_result = {
            'user': {'id': 'user-uuid', 'email': 'test@example.com'},
            'session': {'access_token': 'tok', 'refresh_token': 'ref'}
        }
        mocker.patch(
            'app.routes.auth_routes.AuthService.register_user',
            return_value=mock_result
        )

        resp = client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'password': 'Password1!',
            'fullName': 'Test User'
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['success'] is True

    def test_register_missing_email_returns_400(self, client):
        """Missing required email field returns 400."""
        resp = client.post('/api/auth/register', json={
            'password': 'Password1!'
        })
        assert resp.status_code == 400
        data = resp.get_json()
        assert data['success'] is False

    def test_register_duplicate_email_returns_400(self, client, mocker):
        """Duplicate email registration raises APIError with appropriate status."""
        from app.utils.responses import APIError
        mocker.patch(
            'app.routes.auth_routes.AuthService.register_user',
            side_effect=APIError('Email already registered', 400)
        )

        resp = client.post('/api/auth/register', json={
            'email': 'existing@example.com',
            'password': 'Password1!',
            'fullName': 'Test User'
        })
        assert resp.status_code == 400
        data = resp.get_json()
        assert data['success'] is False
        assert 'already' in data['error'].lower() or 'registered' in data['error'].lower()


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------

class TestLogin:
    def test_login_success(self, client, mocker):
        """Valid credentials return 200 with tokens."""
        mock_result = {
            'user': {'id': 'user-uuid', 'email': 'test@example.com'},
            'session': {'access_token': 'tok', 'refresh_token': 'ref'}
        }
        mocker.patch(
            'app.routes.auth_routes.AuthService.login_user',
            return_value=mock_result
        )

        resp = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'correct-password'
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert 'session' in data['data']

    def test_login_wrong_password_returns_401(self, client, mocker):
        """Wrong password returns 401."""
        from app.utils.responses import APIError
        mocker.patch(
            'app.routes.auth_routes.AuthService.login_user',
            side_effect=APIError('Invalid email or password', 401)
        )

        resp = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'wrong-password'
        })
        assert resp.status_code == 401
        data = resp.get_json()
        assert data['success'] is False

    def test_login_missing_fields_returns_400(self, client):
        """Missing password field returns 400."""
        resp = client.post('/api/auth/login', json={
            'email': 'test@example.com'
        })
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------

class TestLogout:
    def test_logout_unauthenticated_returns_401(self, client):
        """Logout without token returns 401."""
        resp = client.post('/api/auth/logout')
        assert resp.status_code == 401

    def test_logout_with_valid_token(self, client, mocker):
        """Authenticated logout returns 200."""
        mocker.patch(
            'app.middleware.auth._verify_token',
            return_value=(
                MagicMock(id='user-uuid', email='test@example.com'),
                'user',
                'Test User'
            )
        )
        mocker.patch('app.routes.auth_routes.AuthService.logout_user', return_value=None)

        resp = client.post(
            '/api/auth/logout',
            headers={'Authorization': 'Bearer valid-token'}
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/auth/forgot-password
# ---------------------------------------------------------------------------

class TestForgotPassword:
    def test_forgot_password_success(self, client, mocker):
        """Valid email triggers password reset email and returns 200."""
        mocker.patch(
            'app.routes.auth_routes.AuthService.forgot_password',
            return_value={'message': 'Reset email sent'}
        )

        resp = client.post('/api/auth/forgot-password', json={
            'email': 'test@example.com'
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
