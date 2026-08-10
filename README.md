# Frontline Sentinel

**Live Demo:** [frontline-sentinel.onrender.com](https://frontline-sentinel.onrender.com/)

Frontline Sentinel is an AI-powered customer support triage, routing, and safety system. It categorizes tickets, assigns priorities, suggests actions, and automatically escalates high-risk or ambiguous requests to human operators.

The product is built on the core safety principle:
> **Automate confident cases. Escalate uncertain or risky cases. Never guess.**

---

## 1. Architecture Flow

```text
  Customer Message 
         │
         ▼
  Gemini AI Classification
         │
         ▼
  Schema Verification (Zod)
         │
         ▼
  Safety Guardrails (Thresholds / Security check / Financial risk)
         │
         ├───────────────────────────────┐
         ▼ (Confident)                   ▼ (Needs Human Review)
  Automated Triage ('completed')    Escalated Triage ('human_review')
         │                               │
         ▼                               ▼
  Saved to MongoDB                 Saved to MongoDB + Operator Queue
                                         │
                                         ▼
                                  Human Review Desk
                                  (Accept / Override Decision)
```

---

## 2. Key Features
* **Native Structured Output**: Uses Gemini's schema parameters to enforce standardized JSON output.
* **Input & Output Validation**: Zod validation at the api layer and model pipeline layer prevents malformed classifications.
* **Custom Guardrails**: Checks confidence scores, financial risk (card data/transactions), and adversarial injections.
* **Human Review Queue**: A dedicated audit dashboard with prioritization (P0 -> P3) and low-confidence sorting.
* **Original Decision Immutability**: All human review override actions preserve the original AI decision for evaluation and compliance audits.
* **Model Evaluation Suite**: Integrated ground-truth comparison calculating Overall, Category, and Priority agreement rates, alongside recall of human escalations.
* **Failure Analysis Logs**: Identifies mismatches between AI predictions and ground truths, highlighting safety failures (false negatives).
* **Sequential Bulk processing**: Sequential batch importer ensuring rate-limits are not hit during batch triage operations.

---

## 3. Setup & Environment Variables

Ensure a `.env` file is present in the `backend/` directory:

```bash
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/frontline_sentinel

# Gemini credentials
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Telemetry pricing coefficients (per million tokens)
INPUT_TOKEN_PRICE_PER_M=0.075
OUTPUT_TOKEN_PRICE_PER_M=0.30
```

---

## 4. Running the System

### Backend
Install dependencies and run in development mode:
```bash
cd backend
npm install
npm run dev
```

### Frontend
Install dependencies and run the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```

To test the production build:
```bash
npm run build
```

---

## 5. Evaluation & Testing

### Automatic Evaluation Setup
1. Seed the evaluation dataset (10 representative messages) via the UI or by calling:
   ```bash
   POST http://127.0.0.1:5000/api/evaluations/seed
   ```
2. Trigger the bulk triage engine to analyze the seeded tickets:
   ```bash
   POST http://127.0.0.1:5000/api/triage/bulk
   ```
3. Input Ground Truth labels and observations on the **Evaluation** page in the dashboard.
4. Review the computed agreement rates and the failure analysis section.

### Automated Tests
Run integration tests for the new review APIs:
```bash
cd backend
npm run verify:phase6
```

To run Phase 5 metrics verification:
```bash
npm run verify:phase5
npm run verify:e2e:phase5
```

---

## 6. Known Limitations
* **CDP Environment Issues**: Browser automation testing is restricted due to sandbox restrictions in the local containerized CDP setup. Use the verified REST API scripts (`npm run verify:phase6`) for programmatic assurance.
* **Sequential Bulk Triage Speed**: Bulk triage is processed sequentially to prevent model provider rate limits (429 errors).

---

## 7. Security Best Practices
* `.env` configurations are ignored by Git. No keys are logged or served to client browsers.
* Customer text input is rendered using secure HTML escaping to prevent XSS.
* Raw LLM provider stack traces are caught and sanitized in the backend error handling middleware.
