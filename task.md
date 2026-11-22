# Feature: Area-Based Health Risk Detection and Critical Area Alerts – MediVault

Act as a senior backend engineer with experience in geospatial systems, healthcare applications, data analytics, and scalable architectures.

I want to add a new feature to our existing MediVault application called **Area Health Risk Detection System**.

## 1. Objective

The system should automatically identify geographical areas where an unusually high number of people are reporting similar health problems within a particular period.

For example:

If 25 different users from the same locality report fever, headache, fatigue, or other similar symptoms within 7 days, the system should identify this as a potential health cluster and flag the locality for attention.

The dashboard should display a warning such as:

"Potential Health Cluster Detected – This area has an unusually high number of similar health reports."

This feature should work automatically without requiring manual analysis of every report.

## 2. First Inspect the Existing Project

Before implementation:

- Understand the existing MediVault architecture.
- Inspect the current user, patient, medical record, and symptom/report models.
- Identify where health reports are created and stored.
- Inspect existing authentication, authorization, and location-related fields.
- Identify the existing dashboard and AI assistant architecture.

Reuse existing models and services wherever possible.

Do not create duplicate report systems or modify unrelated functionality.

If the application does not currently have a structured symptom-reporting mechanism, identify the missing components and propose the smallest necessary extension.

## 3. Report Data and Normalization

Each report should contain or reference:

- User/patient identifier.
- Reported symptoms or health issue categories.
- Report creation timestamp.
- Approximate geographical location.
- Locality or PIN code where available.
- Report status.

Normalize similar symptoms into common categories.

For example:
- High temperature and fever → Fever.
- Body ache and muscle pain → Body pain.
- Tiredness and fatigue → Fatigue.

Do not rely exclusively on raw text matching. Use a controlled symptom taxonomy and, where appropriate, semantic similarity.

Avoid sending identifiable patient information to external AI providers for this purpose.

## 4. Geographical Clustering

Build a service that groups reports by geographical area.

Support:
- Locality-based grouping.
- PIN-code-based grouping.
- Geospatial grouping where coordinates are available.

Use approximate area-level locations for analytics.

Do not expose precise patient addresses or individual patient locations on the dashboard.

## 5. Time-Based Analysis

Analyze reports across configurable time windows:

- Last 24 hours.
- Last 7 days.
- Last 30 days.

Identify:
- Number of unique users reporting similar issues.
- Most frequently reported symptoms.
- Rate of increase in reports.
- Whether the current report count is unusual compared with the area's historical baseline.

Prevent duplicate submissions and repeated reports from the same user from artificially inflating the unique-user count.

## 6. Risk Scoring Engine

Implement a configurable risk-scoring system.

Consider:

- Number of unique affected users.
- Similarity between reported symptoms.
- Geographical concentration.
- Recent increase in reports.
- Historical baseline for the same area.
- Time period of reports.

Create configurable classifications such as:

- Normal: No unusual activity.
- Watch: Reports are increasing.
- Elevated: Unusually high concentration of similar reports.
- Critical: Strong cluster signal requiring urgent human verification.

Do not hardcode arbitrary thresholds without making them configurable.

Avoid declaring a disease outbreak based only on user-submitted reports. These classifications are internal screening signals, not medical diagnoses or confirmed public health alerts.

## 7. Automatic Alert Generation

When an area crosses a configured threshold:

- Automatically create an area-level alert.
- Store its severity, area, symptom categories, report count, time window, and creation timestamp.
- Prevent duplicate alerts for the same active cluster.
- Update existing alerts when new reports arrive.
- Track whether an alert is active, under review, resolved, or dismissed.
- Record authorized reviewer actions.

Alerts should not reveal patient identities.

## 8. Dashboard Integration

Integrate this feature into the existing MediVault dashboard.

Add an Area Health Monitoring section showing:

- Areas with elevated activity.
- Critical or potentially critical areas.
- Total unique reports per area.
- Commonly reported symptoms.
- Recent report trends.
- Alert severity and status.
- Time of last update.

Add filters for geographical area, severity, and time range.

If appropriate, add a geographical map with area-level indicators.

Do not show individual patient locations or identifying information.

The interface should match the existing MediVault design system.

## 9. Backend Architecture

Implement this as a modular service.

Suggested responsibilities:

- `health-cluster.service.js` – report aggregation and cluster detection.
- `risk-scoring.service.js` – configurable risk calculation.
- `area-alert.service.js` – alert creation and lifecycle management.
- Appropriate models for area-level alerts and aggregation results.

Adapt filenames to the existing project conventions.

Use MongoDB aggregation and geospatial indexes where appropriate.

Avoid scanning the entire reports collection on every dashboard request.

Consider incremental aggregation, scheduled analysis, or event-driven processing depending on the existing infrastructure and actual workload.

Do not introduce unnecessary Redis or queue infrastructure.

## 10. Security and Privacy

- Enforce authentication and role-based authorization.
- Restrict area-level analytics to authorized dashboard users.
- Do not expose individual patient identities.
- Use approximate geographical data for clustering and visualization.
- Do not expose private medical records to other patients.
- Do not use raw patient information in logs.
- Apply appropriate data retention and consent policies.
- Keep administrative review actions auditable.

## 11. Testing

Test:

1. Multiple users reporting similar symptoms in the same area.
2. Similar symptoms reported in different areas.
3. Different symptoms reported in the same area.
4. Repeated reports from the same user.
5. Reports outside the selected time window.
6. Increasing reports over time.
7. Duplicate alert prevention.
8. Alert updates and resolution.
9. Missing or inaccurate location information.
10. Unauthorized access to area-level analytics.

## 12. Final Requirements

First provide a short implementation plan based on the existing codebase.

Then implement the feature in small, logical stages.

Do not rewrite existing functionality or invent existing database fields.

After implementation, explain:

- Files created and modified.
- How cluster detection works.
- How risk scores are calculated.
- How thresholds can be configured.
- API endpoints.
- How the dashboard displays alerts.
- Any remaining limitations.

**Final goal:** MediVault should be capable of detecting unusual concentrations of similar health reports in a geographical area and automatically flagging those areas for human review, helping healthcare professionals identify potential emerging health concerns earlier.

---

# Implementation Plan

### Stage 1: Data Models & Controlled Symptom Taxonomy
1. **Symptom Taxonomy & Normalizer** (`server/modules/health-risk/symptom-taxonomy.js`):
   - Controlled clinical categories: `Fever`, `Respiratory / Cough`, `Headache`, `Body Pain / Fatigue`, `Gastrointestinal`, `Skin Rash`, `Chills / Sweats`.
   - Normalization function mapping patient synonyms (e.g., "high temp", "feverish" → `Fever`; "muscle ache", "body ache" → `Body Pain / Fatigue`).
2. **Health Symptom Report Model** (`server/modules/health-risk/health-report.model.js`):
   - References `userId` (indexed).
   - `rawSymptoms`: array of user-input strings.
   - `normalizedCategories`: array of canonical categories from taxonomy.
   - `severity`: `'mild' | 'moderate' | 'severe'`.
   - `reportedAt`: timestamp (indexed).
   - `area`: locality/subdistrict, `city`, `state`, `postalCode` (indexed).
   - `coordinates`: 2dsphere GeoJSON Point `[longitude, latitude]` (sparse, indexed).
   - `status`: `'active' | 'resolved' | 'dismissed'`.
3. **Area Alert Model** (`server/modules/health-risk/area-alert.model.js`):
   - `areaKey`: unique normalized locality / city / postal code identifier.
   - `areaName`, `city`, `state`, `postalCode`.
   - `centroid`: GeoJSON Point (approximate).
   - `severity`: `'watch' | 'elevated' | 'critical'`.
   - `riskScore`: number (0-100).
   - `primarySymptomCategories`: `[{ category, count, percentage }]`.
   - `uniqueUserCount`: number.
   - `totalReportCount`: number.
   - `timeWindow`: `'24h' | '7d' | '30d'`.
   - `status`: `'active' | 'under_review' | 'resolved' | 'dismissed'`.
   - `reviewHistory`: `[{ reviewerId, reviewerName, action, notes, timestamp }]`.
   - `lastEvaluatedAt`, `alertTriggeredAt`.

### Stage 2: Health Cluster & Aggregation Engine (`health-cluster.service.js`)
- MongoDB aggregation pipeline with `$match` on time windows (`24h`, `7d`, `30d`).
- `$group` by area key (City / Locality / PIN code).
- Deduplicate unique users per area using `$addToSet: "$userId"`.
- Calculate primary symptom category distribution and velocity (growth rate vs prior window).

### Stage 3: Configurable Risk-Scoring Engine (`risk-scoring.service.js`)
- Configurable thresholds (configurable via env or default config):
  - Baseline expected reports per area.
  - Threshold weights for:
    - Unique user count ($W_u$)
    - Symptom uniformity/clustering ($W_s$)
    - Velocity / 24h spike vs 7d average ($W_v$)
    - Geographical density ($W_g$)
- Compute final Risk Score ($0 - 100$).
- Output classification: `Normal` (< 35), `Watch` (35 - 59), `Elevated` (60 - 79), `Critical` (>= 80).

### Stage 4: Alert Lifecycle & Deduplication Service (`area-alert.service.js`)
- Process cluster evaluation results.
- If classification is `Watch`, `Elevated`, or `Critical`:
  - Find existing active or under_review alert for the same `areaKey`.
  - If existing: update metrics, escalate/de-escalate severity, update `lastEvaluatedAt`.
  - If new: create alert with `status: 'active'`.
- If classification returns to `Normal`: auto-resolve or mark ready for review.
- Provide reviewer action handlers: `under_review`, `resolved`, `dismissed`.

### Stage 5: Backend API Routes & Controller (`health-risk.controller.js`, `health-risk.routes.js`)
- `POST /api/health-risk/reports` – Patient submits symptom report (authenticated, auto-inheriting user location).
- `GET /api/health-risk/reports/my` – Patient views their own submitted reports.
- `GET /api/health-risk/alerts` – List area alerts with filters (`severity`, `area`, `status`, `timeWindow`) (doctors & admins).
- `GET /api/health-risk/clusters` – Aggregated anonymous cluster summary for mapping and dashboard.
- `GET /api/health-risk/overview` – High-level metrics for dashboard cards.
- `PATCH /api/health-risk/alerts/:id/status` – Doctor/Admin updates alert status with review notes.
- Mount `/api/health-risk` in `server/app.js`.

### Stage 6: Frontend Patient Symptom Reporting Component & Integration
- Create `QuickSymptomReportModal.jsx` allowing patients to report symptoms with instant suggestions from taxonomy, severity slider, and location confirmation.
- Add quick action button in `DashboardPage.jsx` navigation / header.

### Stage 7: Frontend Area Health Monitoring Section on Dashboard
- Create `AreaHealthMonitoringView.jsx`:
  - Metric summary cards (Active Clusters, Critical Alerts, Monitored Localities, Unique Affected Users).
  - Filter bar (Severity, Locality/City, Time Window: 24h, 7d, 30d).
  - Area Alert cards with severity pill, symptom badges, trend indicators, approximate locality, and reviewer action buttons.
  - Integrated into `DashboardPage.jsx` and `DoctorDashboardView.jsx` / `AdminPage.jsx`.

### Stage 8: Automated & Integration Testing
- Test suite script covering all 10 testing requirements from user prompt.
- Verification of zero duplicate alerts, privacy preservation, role enforcement, and clean build.
