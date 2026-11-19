"""
test_analyze.py
=============================================================================
Integration tests for POST /analyze/chest-xray endpoint.
=============================================================================
"""

import io
import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.config import get_settings


@pytest.fixture(autouse=True)
def reset_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def create_dummy_png_bytes(width: int = 224, height: int = 224) -> bytes:
    """Creates in-memory PNG bytes of specified dimensions."""
    arr = (np.random.rand(height, width) * 255).astype(np.uint8)
    img = Image.fromarray(arr, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def test_analyze_chest_xray_success():
    """Verify end-to-end analysis on valid image upload."""
    png_bytes = create_dummy_png_bytes()
    with TestClient(app) as client:
        response = client.post(
            "/analyze/chest-xray",
            files={"file": ("test_xray.png", png_bytes, "image/png")},
            data={"scan_id": "SCAN-001"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["scan_id"] == "SCAN-001"
        assert data["filename"] == "test_xray.png"
        assert data["modality"] == "Chest X-Ray (CXR)"
        assert len(data["findings"]) > 0
        assert "clinical_disclaimer" in data


def test_analyze_chest_xray_unsupported_extension():
    """Verify that unsupported extensions are rejected with 400 Bad Request."""
    with TestClient(app) as client:
        response = client.post(
            "/analyze/chest-xray",
            files={"file": ("report.pdf", b"%PDF-1.4...", "application/pdf")}
        )
        assert response.status_code == 400
        data = response.json()
        assert data["status"] == "error"
        assert "not supported" in data["detail"].lower()


def test_analyze_chest_xray_corrupt_file():
    """Verify that corrupt image files are rejected with 400 Bad Request."""
    with TestClient(app) as client:
        response = client.post(
            "/analyze/chest-xray",
            files={"file": ("corrupt.png", b"not-a-valid-image-content", "image/png")}
        )
        assert response.status_code == 400
        data = response.json()
        assert data["status"] == "error"
