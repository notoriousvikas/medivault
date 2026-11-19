"""
config.py
=============================================================================
Application configuration module.

This module loads configuration settings from environment variables (or a .env
file) using Pydantic Settings. Keeping configuration separate from code
prevents hardcoded values and keeps secrets/environment specifics safe.
=============================================================================
"""

import os
from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings model.
    Values can be overridden by environment variables or values in a .env file.
    """

    # Service Information
    APP_NAME: str = "MedTech Chest X-Ray AI Service"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Networking
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Model Settings
    # TorchXRayVision pretrained weight name (e.g., 'densenet121-res224-all')
    MODEL_NAME: str = "densenet121-res224-all"

    # Execution device: 'auto' (detect GPU or fallback to CPU), 'cuda', or 'cpu'
    DEVICE: str = "auto"

    # Flag to load model weights on startup.
    # Set to False during unit tests to avoid downloading weights.
    LOAD_MODEL_ON_STARTUP: bool = True

    # Upload & Preprocessing Constraints
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: Union[List[str], str] = [".jpg", ".jpeg", ".png"]

    @field_validator("ALLOWED_EXTENSIONS", mode="before")
    @classmethod
    def parse_allowed_extensions(cls, v: Union[str, List[str]]) -> List[str]:
        """Convert comma-separated string to a list of lowercased extensions."""
        if isinstance(v, str):
            return [ext.strip().lower() for ext in v.split(",") if ext.strip()]
        return [ext.strip().lower() for ext in v]

    @property
    def max_file_size_bytes(self) -> int:
        """Helper property to calculate maximum file size in bytes."""
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    # Configuration loading options
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached instance of the application Settings.
    lru_cache ensures the settings are only read and parsed once.
    """
    return Settings()
