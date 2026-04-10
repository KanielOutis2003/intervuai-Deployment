"""Response formatting utilities."""
from flask import jsonify
from typing import Any, Dict, Optional


def success_response(data: Any = None, message: str = None, status: int = 200):
    """Format successful response."""
    response = {'success': True}

    if data is not None:
        response['data'] = data

    if message:
        response['message'] = message

    return jsonify(response), status


def error_response(error: str, status: int = 400, details: Optional[Dict] = None):
    """Format error response."""
    response = {
        'success': False,
        'error': error
    }

    if details:
        response['details'] = details

    return jsonify(response), status


class APIError(Exception):
    """Custom API error class."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
