"""
main.py
=============================================================================
FastAPI Application Entry Point for the MedTech AI Microservice.

Endpoints:
- GET  /health              : Lightweight health and operational readiness check.
- POST /analyze/chest-xray  : Uploads an X-ray radiograph (JPG/PNG), executes
                              DenseNet-121 inference, and returns raw findings.

Design Principles:
- Separation of Concerns: API routing and request handling are decoupled
  from deep learning inference (model.py) and data transformations (preprocessing.py).
- Non-Clinical Notice: Clearly marks all responses as experimental AI findings,
  not medical diagnoses.
- Independent Microservice: Operates autonomously without any database or message
  queue dependencies; communicates exclusively via standard HTTP.
=============================================================================
"""

import time
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import (
    HealthResponse,
    ChestXRayAnalysisResponse,
    FindingItem,
    ErrorResponse
)
from app.preprocessing import validate_image_upload, preprocess_image
from app.model import get_model

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai_service")


# ---------------------------------------------------------------------------
# Application Lifespan (Startup & Shutdown)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown lifecycle events.
    Loads the DenseNet-121 model weights once on startup if enabled.
    """
    settings = get_settings()
    logger.info(f"Initializing {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENVIRONMENT}]")

    # Load model weights on startup if configured (avoids per-request loading latency)
    if settings.LOAD_MODEL_ON_STARTUP:
        try:
            logger.info("Startup trigger: Pre-loading DenseNet-121 model weights...")
            model = get_model()
            model.load()
            logger.info(f"Model successfully loaded and ready on device '{model.device}'.")
        except Exception as exc:
            # We log an error but do not crash the app so that health checks and diagnostics can still run
            logger.error(
                f"Warning: Could not pre-load model weights on startup ({exc}). "
                "Inference requests will attempt to load the model on-demand or fail gracefully."
            )

    yield

    logger.info("Shutting down AI service. Freeing resources.")


# ---------------------------------------------------------------------------
# FastAPI App Initialization
# ---------------------------------------------------------------------------
settings = get_settings()
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Research prototype microservice for Chest X-Ray radiograph analysis. "
        "Utilizes TorchXRayVision DenseNet-121 to extract raw pathology pattern scores. "
        "Outputs do NOT constitute a clinical diagnosis."
    ),
    lifespan=lifespan,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request / Validation Failure"},
        500: {"model": ErrorResponse, "description": "Internal Server / Inference Error"},
    }
)

# Enable CORS for local development and inter-service HTTP communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Formats all HTTPExceptions to follow the standard ErrorResponse schema."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "detail": exc.detail}
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Microservice Health Check",
    tags=["Monitoring"]
)
async def health_check() -> HealthResponse:
    """
    Lightweight health check endpoint.

    Returns the operational status of the service, current version,
    active compute device (CPU or CUDA GPU), and whether the DenseNet-121
    model is currently resident in memory.
    """
    model = get_model()
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        model_loaded=model.is_loaded,
        device=model.device
    )


@app.post(
    "/analyze/chest-xray",
    response_model=ChestXRayAnalysisResponse,
    summary="Analyze Chest X-Ray Image",
    tags=["Inference"],
    responses={
        200: {"description": "Successful inference with raw pathology findings"},
        400: {"description": "Invalid file, unsupported extension, or corrupted image"},
        503: {"description": "Model is not loaded or unavailable"},
    }
)
async def analyze_chest_xray(
    file: UploadFile = File(..., description="Chest X-Ray image file (.jpg, .jpeg, .png)"),
    scan_id: Optional[str] = Form(None, description="Optional scan or study identifier from calling service")
) -> ChestXRayAnalysisResponse:
    """
    Analyzes an uploaded Chest X-Ray radiograph.

    Workflow:
    1. Reads and validates the uploaded file (size, format, integrity).
    2. Converts and scales the image according to TorchXRayVision specs.
    3. Executes a forward pass through DenseNet-121 (evaluation mode).
    4. Formats raw numerical findings and attaches clinical disclaimers.

    NOTE: Raw model scores represent statistical pattern matching and are NOT clinical diagnoses.
    """
    start_time = time.perf_counter()
    filename = file.filename or "uploaded_xray.png"

    # 1. Read file bytes into memory
    try:
        file_bytes = await file.read()
    except Exception as exc:
        logger.error(f"Failed to read uploaded file stream: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(exc)}"
        )

    # 2. Validate upload (size limit, allowed extensions, image decodability)
    try:
        validate_image_upload(
            file_bytes=file_bytes,
            filename=filename,
            max_file_size_bytes=settings.max_file_size_bytes,
            allowed_extensions=settings.ALLOWED_EXTENSIONS
        )
    except ValueError as val_err:
        logger.warning(f"Validation failed for '{filename}': {val_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )

    # 3. Ensure DenseNet-121 model is ready
    model = get_model()
    if not model.is_loaded:
        try:
            logger.info("Model not loaded yet. Attempting on-demand load...")
            model.load()
        except Exception as load_err:
            logger.error(f"On-demand model loading failed: {load_err}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Inference model is currently unavailable: {str(load_err)}"
            )

    # 4. Preprocess image into TorchXRayVision tensor [1, 1, 224, 224]
    try:
        tensor = preprocess_image(file_bytes)
    except ValueError as prep_err:
        logger.error(f"Preprocessing error for '{filename}': {prep_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(prep_err)
        )

    # 5. Run inference through DenseNet-121
    try:
        raw_findings = model.predict(tensor)
    except Exception as infer_err:
        logger.error(f"Inference error during model prediction: {infer_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference computation failed: {str(infer_err)}"
        )

    # 6. Calculate execution elapsed time in milliseconds
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

    # 7. Convert findings to Pydantic items
    finding_items = [FindingItem(**f) for f in raw_findings]

    # 8. Return structured response
    return ChestXRayAnalysisResponse(
        status="success",
        scan_id=scan_id,
        filename=filename,
        modality="Chest X-Ray (CXR)",
        model_name="DenseNet-121 (TorchXRayVision)",
        model_version=model.model_name,
        device=model.device,
        execution_time_ms=elapsed_ms,
        findings=finding_items
    )
