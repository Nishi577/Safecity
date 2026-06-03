"""
CityWatch ML Service - FastAPI backend for intelligent crime analysis
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pickle
import os
import logging

from ml_models import MLModels

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CityWatch ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML models on startup
ml = MLModels()

@app.on_event("startup")
async def startup_event():
    logger.info("Loading ML models...")
    ml.load_or_train()
    logger.info("ML models ready.")

# --- Request/Response Schemas ---

class PredictRequest(BaseModel):
    description: str

class PredictResponse(BaseModel):
    severity: str
    confidence: float

class SimilarityRequest(BaseModel):
    description: str
    top_k: int = 5

class SimilarityResponse(BaseModel):
    similar_count: int
    message: str
    similar_cases: List[dict]

class FakeDetectRequest(BaseModel):
    description: str

class FakeDetectResponse(BaseModel):
    is_suspicious: bool
    reason: str

class HotspotRequest(BaseModel):
    incidents: List[dict]

class PriorityRequest(BaseModel):
    incidents: List[dict]

class InsightsRequest(BaseModel):
    incidents: List[dict]

# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": ml.model_trained}

@app.post("/predict", response_model=PredictResponse)
def predict_severity(req: PredictRequest):
    """Predict severity from incident description."""
    try:
        severity, confidence = ml.predict_severity(req.description)
        return PredictResponse(severity=severity, confidence=confidence)
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        # Fallback to rule-based
        severity = ml.rule_based_severity(req.description)
        return PredictResponse(severity=severity, confidence=0.5)

@app.post("/similarity", response_model=SimilarityResponse)
def check_similarity(req: SimilarityRequest):
    """Find similar past incidents."""
    try:
        result = ml.find_similar(req.description, req.top_k)
        return result
    except Exception as e:
        logger.error(f"Similarity error: {e}")
        return SimilarityResponse(similar_count=0, message="Unable to check similarity", similar_cases=[])

@app.post("/fake-detect", response_model=FakeDetectResponse)
def detect_fake(req: FakeDetectRequest):
    """Detect suspicious/fake reports."""
    try:
        result = ml.detect_fake(req.description)
        return result
    except Exception as e:
        logger.error(f"Fake detection error: {e}")
        return FakeDetectResponse(is_suspicious=False, reason="Detection unavailable")

@app.post("/hotspots")
def compute_hotspots(req: HotspotRequest):
    """Compute hotspot intelligence from incidents."""
    try:
        return ml.compute_hotspots(req.incidents)
    except Exception as e:
        logger.error(f"Hotspot error: {e}")
        return {"hotspots": []}

@app.post("/priority-queue")
def compute_priority_queue(req: PriorityRequest):
    """Compute smart priority queue for incidents."""
    try:
        return ml.compute_priority_queue(req.incidents)
    except Exception as e:
        logger.error(f"Priority error: {e}")
        return {"incidents": req.incidents}

@app.post("/predictive-alerts")
def generate_predictive_alerts(req: InsightsRequest):
    """Generate predictive alerts from incident patterns."""
    try:
        return ml.generate_predictive_alerts(req.incidents)
    except Exception as e:
        logger.error(f"Alerts error: {e}")
        return {"alerts": []}

@app.post("/trend-analysis")
def trend_analysis(req: InsightsRequest):
    """Compute trend analysis from incidents."""
    try:
        return ml.trend_analysis(req.incidents)
    except Exception as e:
        logger.error(f"Trend error: {e}")
        return {"trends": [], "hourly": [], "categories": []}

@app.post("/recommendations")
def officer_recommendations(req: InsightsRequest):
    """Generate officer recommendations."""
    try:
        return ml.generate_recommendations(req.incidents)
    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        return {"recommendations": []}
