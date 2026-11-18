# MediVault Frontend

Production-ready, highly aesthetic, clinical-grade Web Application for **MediVault** — a secure, decentralized Electronic Health Record (EHR) and AI-driven medical intelligence platform.

Designed with inspiration from modern SaaS standards (Stripe meets Epic Systems) and 3D visual aesthetic templates.

---

## 🎨 Design & Aesthetic System
- **Theme Style:** Clean, trustworthy, and clinical modern SaaS.
- **Color Palette:**
  - Deep Clinical Navy (`#0F172A`, `#0B1120`)
  - Trust Blue (`#2563EB`)
  - Vibrant Mint / Teal (`#10B981`)
  - Crisp White & Slate gray backgrounds (`#F8FAFC`)
- **Typography:** Plus Jakarta Sans & Inter
- **UI Elements:** Subtle glassmorphism (`backdrop-blur-md`), soft shadow elevations, rounded 2xl/3xl card architecture, Lucide React medical icons, and custom 3D isometric cylinder visuals.

---

## 🚀 Features & Pages Implemented (A to Z)

### 1. Landing Page (`/`)
- **Hero Section:** 3D geometric isometric cylinder composition, value propositions, trust badges (HIPAA Compliant, AES-256 Zero-Knowledge, HL7 FHIR ready), dual CTAs (*Access Vault* & *Doctor / Shared Portal*), and social proof strip.
- **Next-Gen Security & Features:** Highlight cards with zero-knowledge encryption protocols and emergency QR speed benchmarks.
- **Workflow Steps (Image 4 Inspo):** Clear 3-step numbered onboarding progression:
  1. *Upload or Connect Records*
  2. *AI Parsing & Biomarker Extraction*
  3. *Instant Emergency QR & Doctor Sharing*

### 2. Authentication Screen (`/auth`)
- **Patient vs. Doctor Tabs:** Role-tailored login and registration flows.
- **Direct Backend Integration:** Connects to `POST /api/users/login` and `POST /api/users/register` with JWT storage and Bearer authentication headers.
- **Quick 1-Click Demo Fill:** Instant test logins for Patient, Doctor, and Admin roles.
- **Decentralized Wallet Integration:** Web3 / MetaMask / Phantom signature simulation.

### 3. Patient Dashboard (`/dashboard`)
- **Overview Stat Cards:** Total Records, Active Prescriptions, Emergency QR Scans, and Vault Security Status.
- **Quick Actions Bar:**
  - 📤 **Upload Medical Record:** Drag-and-drop zone for PDF, DICOM, or image files, category selection, and live SHA-256 / AES encryption progress simulation connected to `POST /api/records` with `FormData`.
  - 🔗 **Share Access:** Generate time-bound encrypted viewing URLs and 6-digit doctor access OTPs with configurable durations (1h, 24h, 7d).
  - 🚨 **Emergency QR:** Instant popup showing life-saving vitals, blood type (`O+`), acute allergies, organ donor status, primary physician, downloadable/printable emergency badge, and access audit logs via `GET /api/emergency/me/qr`.
  - 🤖 **AI Medical Copilot:** Grounded Groq Llama-3.3 70B conversational drawer connected to `POST /api/chat` with RAG retrieval over patient records.
- **Records Explorer:** Search bar, category filter tabs (Lab Reports, Prescriptions, Scans, Discharge Summaries), and encrypted status tags.
- **Medical Timeline View:** Chronological health event journey connected to `/api/timeline-events`.
- **Active Prescriptions Section:** Active medications, dosage instructions, and one-click Groq AI drug interaction screening (`/api/prescriptions/:id/analyze`).

### 4. AI Report Explainer & Split Document Viewer (`/records/:id`)
- **Left Side:** Interactive Document Viewer preview with Zoom (+, -, reset), 90-degree Rotation, Full-resolution Download, and SHA-256 verification hash.
- **Right Side:** Groq AI-Powered Summary card translating complex medical jargon into simple patient terms, highlighting key biomarkers (e.g., Fasting Glucose, HbA1c, Cholesterol) with color-coded risk levels (Normal, Borderline, Elevated), and recommended next steps.

### 5. Doctor & Shared Access Portal (`/shared-portal` & `/emergency/:token`)
- **Secure PIN / Token Entry:** Input screen for authorized physicians or first responders.
- **Clinical Review View:** Emergency banner with blood group, acute allergies, critical conditions, emergency contacts with 1-click dial, and active medications.

### 6. Administration & Doctor Verification Portal (`/admin`)
- Platform metrics: Total users, verified physicians, pending doctor verification queue (`PATCH /api/admin/doctors/:id/verify`), and user directory.

---

## 🛠️ How to Run

### Development Mode
```bash
# In e:\medivault\frontend
npm run dev
```
Runs at `http://localhost:3000` with automatic `/api` proxy to backend at `http://localhost:5000`.

### Production Build
```bash
npm run build
npm run preview
```
