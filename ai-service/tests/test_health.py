"""
test_health.py
=============================================================================
Basic unit test for the GET /health endpoint.

CRITICAL REQUIREMENT:
This test must NOT download or load heavy deep learning model weights.
To accomplish this, we explicitly configure LOAD_MODEL_ON_STARTUP=false
before initializing the FastAPI test client.
=============================================================================
"""

import os
import pytest

# Ensure model weights are NOT downloaded or loaded during unit tests
os.environ["LOAD_MODEL_ON_STARTUP"] = "false"

from fastapi.testclient import TestClient
from app.main import app
from app.config import get_settings
from app.model import reset_model


@pytest.fixture(autouse=True)
def clear_settings_cache():
    """Ensure cached settings pick up test environment variables and model state is isolated."""
    get_settings.cache_clear()
    reset_model()
    yield
    get_settings.cache_clear()
    reset_model()


def test_health_endpoint_returns_ok():
    """
    Tests that GET /health responds with HTTP 200 OK and expected structure
    without triggering model downloads.
    """
    with TestClient(app) as client:
        response = client.get("/health")

        # Verify HTTP status
        assert response.status_code == 200

        data = response.json()

        # Verify payload fields
        assert data["status"] == "ok"
        assert "service" in data
        assert "version" in data
        assert "model_loaded" in data
        assert "device" in data

        # Under test settings with LOAD_MODEL_ON_STARTUP=false, model should not be loaded
        assert data["model_loaded"] is False
        assert data["device"] in ["cpu", "cuda"]


def test_health_endpoint_response_schema():
    """
    Verifies that the health endpoint response strictly adheres to the schema.
    """
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        payload = response.json()

        assert isinstance(payload["status"], str)
        assert isinstance(payload["service"], str)
        assert isinstance(payload["version"], str)
        assert isinstance(payload["model_loaded"], bool)
        assert isinstance(payload["device"], str)
