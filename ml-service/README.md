# CityWatch ML Service

FastAPI microservice providing ML-powered intelligence for the CityWatch app.

## Setup

```bash
cd ml-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /predict | Predict severity from description |
| POST | /similarity | Find similar past incidents |
| POST | /fake-detect | Detect suspicious reports |
| POST | /hotspots | Compute hotspot intelligence |
| POST | /priority-queue | Compute smart priority queue |
| POST | /predictive-alerts | Generate predictive alerts |
| POST | /trend-analysis | Compute trend analysis |
| POST | /recommendations | Generate officer recommendations |

## Model Details

- **Severity Prediction**: TF-IDF + Logistic Regression trained on 15,000 crime records
- **Similarity**: TF-IDF cosine similarity against training corpus
- **Hotspot**: Frequency-based location clustering
- **Priority Score**: severity_weight + recency_weight + hotspot_weight

## Frontend Integration

The React frontend calls this service via the `mlService.ts` helper.
Set `VITE_ML_SERVICE_URL=http://localhost:8000` in `.env`.

If ML service is unavailable, all features fall back gracefully to rule-based logic.
