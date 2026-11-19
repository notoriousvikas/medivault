"""
model.py
=============================================================================
Chest X-Ray Deep Learning Model Handler.

This module encapsulates the DenseNet-121 model using TorchXRayVision
pretrained weights ('densenet121-res224-all').

Key Design Principles:
1. Singleton Lifecycle: The neural network is loaded only once at application
   startup to avoid high memory overhead and redundant disk/network I/O.
2. Evaluation Mode: The model is strictly kept in `.eval()` mode with gradient
   computation disabled (`torch.no_grad()`).
3. Raw Outputs Only: Returns raw numerical outputs and corresponding pathology
   labels without arbitrary binary diagnostic thresholds (e.g. no 'score > 0.5').
4. Hardware Agnostic: Automatically detects and utilizes GPU (CUDA) if available
   (e.g., Google Colab / GPU servers) while gracefully falling back to CPU.
5. Medical Non-Diagnosis: Model outputs are statistical pattern scores, not
   confirmed clinical diagnoses.
=============================================================================
"""

import logging
from typing import List, Dict, Any, Optional
import torch

# Configure logger
logger = logging.getLogger(__name__)


class ChestXRayModel:
    """
    Wrapper class for loading and running inference with TorchXRayVision's
    DenseNet-121 architecture.
    """

    def __init__(self, model_name: str = "densenet121-res224-all", device: str = "auto"):
        """
        Initializes the model wrapper.
        Note: The actual weights are loaded via the `load()` method to allow controlled startup.

        Args:
            model_name: Weight identifier for TorchXRayVision (default: 'densenet121-res224-all').
            device: Hardware target: 'auto', 'cuda', or 'cpu'.
        """
        self.model_name = model_name
        self.requested_device = device
        self.device = self._resolve_device(device)
        self.model: Optional[torch.nn.Module] = None
        self.pathologies: List[str] = []
        self._is_loaded: bool = False

    def _resolve_device(self, requested: str) -> str:
        """Determines whether to run on CUDA GPU or CPU."""
        if requested == "cuda":
            if torch.cuda.is_available():
                return "cuda"
            logger.warning("CUDA was requested but is not available. Falling back to CPU.")
            return "cpu"
        elif requested == "cpu":
            return "cpu"
        else:  # "auto"
            selected = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Auto-selected inference device: {selected}")
            return selected

    @property
    def is_loaded(self) -> bool:
        """Returns True if model weights are loaded and ready in memory."""
        return self._is_loaded

    def load(self) -> None:
        """
        Loads the pretrained DenseNet-121 model weights from TorchXRayVision.
        Sets the model to evaluation mode and moves it to the target device.
        """
        if self._is_loaded:
            logger.info("DenseNet-121 model is already loaded.")
            return

        try:
            logger.info(f"Loading TorchXRayVision DenseNet-121 weights ('{self.model_name}')...")
            import torchxrayvision as xrv

            # Load DenseNet-121 pretrained on multiple chest radiograph datasets
            self.model = xrv.models.DenseNet(weights=self.model_name)

            # Move model to target device (CPU or CUDA GPU)
            self.model.to(self.device)

            # Set model to evaluation mode (disables dropout, fixes batchnorm stats)
            self.model.eval()

            # Extract the pathology finding names recognized by this model
            # e.g., 'Atelectasis', 'Consolidation', 'Infiltration', 'Pneumothorax',
            # 'Edema', 'Emphysema', 'Fibrosis', 'Effusion', 'Pneumonia',
            # 'Pleural_Thickening', 'Cardiomegaly', 'Nodule', 'Mass', 'Hernia'
            self.pathologies = list(self.model.pathologies)

            self._is_loaded = True
            logger.info(
                f"Model successfully loaded on {self.device}. "
                f"Detects {len(self.pathologies)} pathology labels."
            )

        except Exception as exc:
            self._is_loaded = False
            logger.error(f"Failed to load DenseNet-121 model weights: {exc}")
            raise RuntimeError(
                f"Failed to load DenseNet-121 model weights '{self.model_name}': {str(exc)}"
            ) from exc

    def predict(self, image_tensor: torch.Tensor) -> List[Dict[str, Any]]:
        """
        Runs model inference on a preprocessed chest radiograph tensor.

        CRITICAL CLINICAL NOTICE:
        This function outputs raw statistical scores from the neural network.
        It does NOT make clinical diagnoses or decisions.

        Args:
            image_tensor: 4D PyTorch tensor with shape [1, 1, 224, 224].

        Returns:
            List of dictionaries containing 'label', 'raw_score', and 'interpretation_note'.
        """
        if not self._is_loaded or self.model is None:
            raise RuntimeError(
                "DenseNet-121 model has not been loaded into memory. "
                "Call model.load() or ensure LOAD_MODEL_ON_STARTUP=True."
            )

        # Ensure no gradients are tracked during inference (saves memory and compute)
        with torch.no_grad():
            # Move input tensor to same device as model (CPU or CUDA)
            tensor = image_tensor.to(self.device)

            # Forward pass through DenseNet-121
            raw_predictions = self.model(tensor)

            # Extract scores for the first (and only) image in the batch
            scores = raw_predictions[0].detach().cpu().numpy()

            findings: List[Dict[str, Any]] = []
            for pathology, score in zip(self.pathologies, scores):
                findings.append({
                    "label": str(pathology),
                    "raw_score": float(round(float(score), 4)),
                    "interpretation_note": (
                        "Raw statistical score. Not a clinical diagnosis."
                    )
                })

            return findings


# ---------------------------------------------------------------------------
# Global Singleton Instance Access
# ---------------------------------------------------------------------------
_model_instance: Optional[ChestXRayModel] = None


def get_model(model_name: Optional[str] = None, device: Optional[str] = None) -> ChestXRayModel:
    """
    Returns the singleton instance of ChestXRayModel.
    Ensures the model object is instantiated only once across the application lifecycle.
    """
    global _model_instance
    if _model_instance is None:
        from app.config import get_settings
        settings = get_settings()
        name = model_name or settings.MODEL_NAME
        dev = device or settings.DEVICE
        _model_instance = ChestXRayModel(model_name=name, device=dev)
    return _model_instance


def reset_model() -> None:
    """
    Resets the singleton model instance.
    Primarily utilized for test isolation to simulate unloaded state.
    """
    global _model_instance
    _model_instance = None
