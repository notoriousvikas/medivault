"""
schemas.py
=============================================================================
Pydantic data schemas for request validation and response formatting.

These schemas define the exact shape of incoming requests and outgoing API
responses. They ensure data integrity and provide clear documentation for
Express backend integration.

IMPORTANT MEDICAL DISCLAIMER:
The schemas here explicitly distinguish between AI pattern recognition scores
and clinical medical diagnoses. AI model outputs are raw statistical scores
intended for research and developer prototyping only.
=============================================================================
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Health Check Schema
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """Schema returned by the GET /health endpoint."""
    status: str = Field(
        default="ok",
        description="Operational health status of the microservice"
    )
    service: str = Field(
        ...,
        description="Service name"
    )
    version: str = Field(
        ...,
        description="Semantic version of the AI microservice"
    )
    model_loaded: bool = Field(
        ...,
        description="Whether the DenseNet-121 model is initialized in memory"
    )
    device: str = Field(
        ...,
        description="Hardware device currently used for inference ('cpu' or 'cuda')"
    )


# ---------------------------------------------------------------------------
# Findings Schema
# ---------------------------------------------------------------------------

class FindingItem(BaseModel):
    """
    Represents an individual pathology detected by TorchXRayVision DenseNet-121.
    
    CRITICAL NOTICE:
    'raw_score' is the direct numerical output of the deep learning model.
    It DOES NOT represent a clinical diagnosis or medical conclusion.
    No arbitrary threshold (e.g. score > 0.5) is applied here.
    """
    label: str = Field(
        ...,
        description="Pathology finding name (e.g., 'Atelectasis', 'Cardiomegaly', 'Effusion')"
    )
    raw_score: float = Field(
        ...,
        description="Raw statistical score produced by the neural network"
    )
    interpretation_note: str = Field(
        default="Raw model output. This is a pattern matching score, NOT a confirmed clinical diagnosis.",
        description="Explicit note stating that this output is not a diagnosis"
    )


# ---------------------------------------------------------------------------
# Analysis Request & Response Schemas
# ---------------------------------------------------------------------------

class ChestXRayAnalysisResponse(BaseModel):
    """
    Full response schema returned by POST /analyze/chest-xray.
    
    Contains execution metadata, raw model outputs, and required medical disclaimers.
    """
    status: str = Field(
        default="success",
        description="Processing status: 'success' or 'error'"
    )
    scan_id: Optional[str] = Field(
        default=None,
        description="Optional identifier for the image scan (passed from caller)"
    )
    filename: str = Field(
        ...,
        description="Name of the uploaded image file"
    )
    modality: str = Field(
        default="Chest X-Ray (CXR)",
        description="Imaging modality"
    )
    model_name: str = Field(
        default="DenseNet-121 (TorchXRayVision)",
        description="Architecture name of the deep learning model"
    )
    model_version: str = Field(
        ...,
        description="Specific model weights checkpoint (e.g., 'densenet121-res224-all')"
    )
    device: str = Field(
        ...,
        description="Device on which inference was executed ('cpu' or 'cuda')"
    )
    execution_time_ms: float = Field(
        ...,
        description="Time taken to preprocess and run inference in milliseconds"
    )
    findings: List[FindingItem] = Field(
        ...,
        description="List of raw pathology findings and corresponding scores"
    )
    clinical_disclaimer: str = Field(
        default=(
            "RESEARCH PROTOTYPE ONLY: This AI output is an experimental computational assessment. "
            "It does NOT constitute a confirmed medical diagnosis, clinical finding, or treatment plan. "
            "All findings must be evaluated and verified by a licensed radiologist or qualified physician."
        ),
        description="Mandatory medical and legal disclaimer"
    )


class ErrorResponse(BaseModel):
    """Standard error response format."""
    status: str = Field(default="error", description="Indicates failure")
    detail: str = Field(..., description="Human-readable description of the error")
