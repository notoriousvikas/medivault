# MedTech AI Microservice (`ai-service`)

A Python-based AI microservice for Chest X-Ray radiograph analysis using **FastAPI** and **TorchXRayVision (DenseNet-121)**.

> **CRITICAL MEDICAL DISCLAIMER**  
> **Research & Development Prototype Only:** This microservice is designed for experimental and research purposes. The model generates raw numerical scores representing statistical pattern associations. It **does NOT** produce confirmed clinical diagnoses, medical conclusions, or treatment plans. All radiology images and outputs must be reviewed and interpreted by a licensed radiologist or qualified medical professional.

---

## 1. Architecture Overview

This microservice is completely decoupled from the Express backend and frontend:

```
[ Frontend (React/Vite) ]
            │
            ▼
[ Backend (Express.js) ]  ──(HTTP POST / Multipart)──► [ AI Microservice (FastAPI:8000) ]
                                                                 │
                                                      ┌──────────┴──────────┐
                                                      ▼                     ▼
                                                 DenseNet-121          TorchXRayVision
                                                 (Pretrained)           (18 Pathologies)
```

- **Independent Service:** Contains zero database code (no MongoDB, Redis, or BullMQ). Express communicates with it via standard HTTP APIs.
- **Single-Load Model:** Pretrained DenseNet-121 weights (`densenet121-res224-all`) are loaded only once during service startup and kept in memory for fast inference.
- **No Arbitrary Thresholds:** The service outputs raw scores for 14-18 radiologic findings without applying uncalibrated binary cutoffs (e.g. `score > 0.5`).
- **Hardware Agnostic:** Automatically detects and utilizes NVIDIA CUDA GPU (e.g., Google Colab, cloud GPU instances) while falling back seamlessly to CPU.

---

## 2. Folder Structure

```
ai-service/
├── app/
│   ├── __init__.py           # Package marker and metadata
│   ├── main.py               # FastAPI app, routing, and lifespan management
│   ├── model.py              # TorchXRayVision DenseNet-121 wrapper (Singleton)
│   ├── preprocessing.py      # Image validation, resizing (224x224), and normalization
│   ├── schemas.py            # Pydantic request/response schemas & disclaimers
│   └── config.py             # Configuration loaded from environment variables
│
├── tests/
│   └── test_health.py        # Health endpoint test (runs without loading model weights)
│
├── requirements.txt          # Python dependencies
├── Dockerfile                # Containerization setup
├── .env.example              # Example environment configuration
├── .gitignore                # Git exclusions (caches, virtual envs, model weights)
└── README.md                 # Complete documentation and setup guide
```

---

## 3. Technology Stack

- **Language:** Python 3.10+ / 3.11
- **API Framework:** FastAPI
- **ASGI Server:** Uvicorn
- **Deep Learning:** PyTorch, TorchXRayVision
- **Image Processing:** NumPy, Pillow
- **Data Validation:** Pydantic & Pydantic-Settings
- **Medical Imaging (Future):** pydicom
- **Testing:** pytest, httpx

---

## 4. Local Installation & Setup

### Prerequisites
- Python 3.10 or higher installed. Check with:
  ```bash
  python --version
  ```

### Step 1: Navigate to the `ai-service` directory
```bash
cd ai-service
```

### Step 2: Create and activate a Python virtual environment
- **On Windows (PowerShell):**
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  ```
- **On macOS/Linux:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### Step 3: Install dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note on PyTorch:**  
> If you are running on a machine without an NVIDIA GPU, installing via `requirements.txt` installs standard PyTorch. If you want CPU-only wheels for smaller download size on Windows/Linux, you can run:  
> `pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu`

### Step 4: Configure environment variables
Copy the example environment file:
```bash
# On Windows PowerShell:
Copy-Item .env.example .env

# On Linux/macOS:
cp .env.example .env
```

Review `.env`:
```env
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
MODEL_NAME=densenet121-res224-all
DEVICE=auto
LOAD_MODEL_ON_STARTUP=true
MAX_FILE_SIZE_MB=10
ALLOWED_EXTENSIONS=.jpg,.jpeg,.png
```

---

## 5. Running the Service

You can start the FastAPI development server using any of the following methods:

### Option A: Quick Launcher (Recommended on Windows)
Simply run either launcher script:
```powershell
# PowerShell
.\start.ps1

# Or Command Prompt / Double-click
start.bat
```

### Option B: Direct with venv executable
```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
# Or using the local wrapper:
.\uvicorn.ps1 app.main:app --reload
```

### Option C: Activate the virtual environment first
```powershell
# Activate venv in your terminal session
.\.venv\Scripts\Activate.ps1

# Now standard uvicorn is recognized in your PATH:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Once running:
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc UI:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

## 6. API Endpoints

### 1. `GET /health`
Verifies operational health and indicates if model weights are resident in memory.

**Example Request:**
```bash
curl -X GET http://localhost:8000/health
```

**Example Response:**
```json
{
  "status": "ok",
  "service": "MedTech Chest X-Ray AI Service",
  "version": "0.1.0",
  "model_loaded": true,
  "device": "cpu"
}
```

---

### 2. `POST /analyze/chest-xray`
Uploads a chest radiograph (`.jpg`, `.jpeg`, `.png`) and executes inference.

**Form Parameters:**
- `file`: The binary image file (required).
- `scan_id`: Optional string ID to correlate with Express database records.

**Example cURL Request:**
```bash
curl -X POST "http://localhost:8000/analyze/chest-xray" \
     -F "file=@/path/to/chest_xray.png" \
     -F "scan_id=SCAN-10492"
```

**Example Response:**
```json
{
  "status": "success",
  "scan_id": "SCAN-10492",
  "filename": "chest_xray.png",
  "modality": "Chest X-Ray (CXR)",
  "model_name": "DenseNet-121 (TorchXRayVision)",
  "model_version": "densenet121-res224-all",
  "device": "cpu",
  "execution_time_ms": 142.50,
  "findings": [
    {
      "label": "Atelectasis",
      "raw_score": 0.4812,
      "interpretation_note": "Raw model output. This is a pattern matching score, NOT a confirmed clinical diagnosis."
    },
    {
      "label": "Cardiomegaly",
      "raw_score": 0.7231,
      "interpretation_note": "Raw model output. This is a pattern matching score, NOT a confirmed clinical diagnosis."
    },
    {
      "label": "Effusion",
      "raw_score": 0.3120,
      "interpretation_note": "Raw model output. This is a pattern matching score, NOT a confirmed clinical diagnosis."
    },
    {
      "label": "Infiltration",
      "raw_score": 0.2541,
      "interpretation_note": "Raw model output. This is a pattern matching score, NOT a confirmed clinical diagnosis."
    },
    {
      "label": "Mass",
      "raw_score": 0.0814,
      "interpretation_note": "Raw model output. This is a pattern matching score, NOT a confirmed clinical diagnosis."
    },
    {
      "label": "Nodule",
      "raw_score": 0.1205,
      "interpretation_note": "Raw model output. This is a pattern matching score, NOT a confirmed clinical diagnosis."
    },
    {
      "label": "Pneumonia",
      "raw_score": 0.1983,
      "interpretation_note": "Raw model output. This is a pattern matching score, NOT a confirmed clinical diagnosis."
    },
    {
      "label": "Pneumothorax",
      "raw_score": 0.0210,
      "interpretation_note": "Raw model output. This is a pattern matching score, NOT a confirmed clinical diagnosis."
    }
  ],
  "clinical_disclaimer": "RESEARCH PROTOTYPE ONLY: This AI output is an experimental computational assessment. It does NOT constitute a confirmed medical diagnosis, clinical finding, or treatment plan. All findings must be evaluated and verified by a licensed radiologist or qualified physician."
}
```

---

## 7. Running Tests

Unit tests use `pytest`. The health test is isolated so it does **not** download model weights:

```bash
pytest tests/test_health.py -v
```

---

## 8. Docker Deployment

Build and run using Docker:

```bash
# Build the Docker image
docker build -t medtech-ai-service .

# Run the container mapping port 8000
docker run -d -p 8000:8000 --name medtech-ai medtech-ai-service

# Verify health
curl http://localhost:8000/health
```

---

## 9. Current Status & Placeholders

| Component | Status | Details |
|---|---|---|
| **FastAPI Microservice** | Implemented | `/health` and `/analyze/chest-xray` endpoints ready. |
| **TorchXRayVision DenseNet-121** | Implemented | Pretrained `densenet121-res224-all` inference pipeline. |
| **JPG / PNG Preprocessing** | Implemented | Grayscale conversion, 224x224 resize, and `[-1024, 1024]` normalization. |
| **DICOM (`.dcm`) Preprocessing** | **Placeholder** | `pydicom` is in requirements, but `preprocess_dicom()` explicitly raises `NotImplementedError`. |
| **Express Integration** | **Future Phase** | Express backend will make HTTP multipart requests to this service. |
| **Database / Message Queue** | **Intentionally Omitted** | Microservice remains stateless. Express manages MongoDB/Redis. |
| **Advanced LLM/Vision Models** | **Future Phase** | RadFM and MAIRA-2 are not implemented in this phase. |
