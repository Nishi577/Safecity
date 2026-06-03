"""
CityWatch ML Models
- Severity prediction (TF-IDF + Logistic Regression)
- Fake report detection
- Incident similarity
- Hotspot intelligence
- Priority queue
- Predictive alerts
- Trend analysis
- Officer recommendations
"""

import os
import re
import json
import pickle
import logging
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import List, Tuple, Optional, Dict, Any

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)

DATA_PATH = os.path.join(os.path.dirname(__file__), "cleaned_crime_data.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models")


class MLModels:
    def __init__(self):
        self.model_trained = False
        self.severity_vectorizer: Optional[TfidfVectorizer] = None
        self.severity_model: Optional[LogisticRegression] = None
        self.similarity_vectorizer: Optional[TfidfVectorizer] = None
        self.train_descriptions: List[str] = []
        self.train_data: Optional[pd.DataFrame] = None
        os.makedirs(MODEL_PATH, exist_ok=True)

    # ─────────────────────────── Training ───────────────────────────

    def load_or_train(self):
        severity_model_file = os.path.join(MODEL_PATH, "severity_model.pkl")
        severity_vec_file = os.path.join(MODEL_PATH, "severity_vectorizer.pkl")
        sim_vec_file = os.path.join(MODEL_PATH, "similarity_vectorizer.pkl")
        train_desc_file = os.path.join(MODEL_PATH, "train_descriptions.pkl")

        if all(os.path.exists(f) for f in [severity_model_file, severity_vec_file, sim_vec_file, train_desc_file]):
            logger.info("Loading pre-trained models...")
            with open(severity_model_file, "rb") as f:
                self.severity_model = pickle.load(f)
            with open(severity_vec_file, "rb") as f:
                self.severity_vectorizer = pickle.load(f)
            with open(sim_vec_file, "rb") as f:
                self.similarity_vectorizer = pickle.load(f)
            with open(train_desc_file, "rb") as f:
                self.train_descriptions = pickle.load(f)
            self.model_trained = True
            logger.info("Models loaded successfully.")
        else:
            self._train()

    def _train(self):
        logger.info("Training ML models from dataset...")
        if not os.path.exists(DATA_PATH):
            logger.warning("Dataset not found, using rule-based fallback only.")
            self.model_trained = False
            return

        df = pd.read_csv(DATA_PATH)
        df = df.dropna(subset=["description", "severity"])
        df["description"] = df["description"].str.lower().str.strip()
        df["severity"] = df["severity"].str.upper().str.strip()

        # Map to 4-class severity (dataset only has LOW/HIGH, expand with rules)
        df["severity_mapped"] = df["severity"].apply(self._map_severity_4class)

        X = df["description"].values
        y = df["severity_mapped"].values

        # Severity model
        self.severity_vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words="english",
            sublinear_tf=True,
        )
        X_vec = self.severity_vectorizer.fit_transform(X)
        self.severity_model = LogisticRegression(
            max_iter=1000, C=1.0, class_weight="balanced", random_state=42
        )
        self.severity_model.fit(X_vec, y)

        # Similarity vectorizer (trained on same corpus)
        self.similarity_vectorizer = TfidfVectorizer(
            max_features=3000,
            ngram_range=(1, 2),
            stop_words="english",
            sublinear_tf=True,
        )
        self.similarity_vectorizer.fit(X)
        self.train_descriptions = list(X[:2000])  # Store up to 2000 for similarity

        self.train_data = df

        # Save models
        with open(os.path.join(MODEL_PATH, "severity_model.pkl"), "wb") as f:
            pickle.dump(self.severity_model, f)
        with open(os.path.join(MODEL_PATH, "severity_vectorizer.pkl"), "wb") as f:
            pickle.dump(self.severity_vectorizer, f)
        with open(os.path.join(MODEL_PATH, "similarity_vectorizer.pkl"), "wb") as f:
            pickle.dump(self.similarity_vectorizer, f)
        with open(os.path.join(MODEL_PATH, "train_descriptions.pkl"), "wb") as f:
            pickle.dump(self.train_descriptions, f)

        self.model_trained = True
        logger.info(f"Training complete. Classes: {set(y)}")

    def _map_severity_4class(self, severity: str) -> str:
        """Map dataset 2-class to 4-class severity."""
        if severity == "HIGH":
            return "HIGH"
        if severity == "CRITICAL":
            return "CRITICAL"
        return "LOW"

    # ─────────────────────── Severity Prediction ────────────────────

    def predict_severity(self, description: str) -> Tuple[str, float]:
        if not self.model_trained or self.severity_model is None:
            return self.rule_based_severity(description), 0.5

        desc_clean = description.lower().strip()
        X_vec = self.severity_vectorizer.transform([desc_clean])
        pred = self.severity_model.predict(X_vec)[0]
        proba = self.severity_model.predict_proba(X_vec).max()

        # Apply rule-based override for extreme keywords
        rule_sev = self.rule_based_severity(description)
        if rule_sev == "CRITICAL" and pred in ["LOW", "MEDIUM"]:
            return "CRITICAL", float(proba)

        return str(pred), float(proba)

    def rule_based_severity(self, description: str) -> str:
        desc = description.lower()

        critical_keywords = [
            # Violence & death
            "murder", "killed", "kill", "dead body", "corpse", "homicide", "manslaughter",
            "genocide", "mass murder", "mass shooting", "serial killer",
            # Weapons of mass destruction
            "bomb", "bombing", "explosion", "blast", "explosive", "grenade", "ied",
            "chemical attack", "bioterror", "nuclear", "toxic gas",
            # Terrorism
            "terrorist", "terrorism", "terror attack", "suicide bomber",
            "extremist attack", "militant", "insurgent",
            # Kidnapping & hostage
            "hostage", "kidnap", "kidnapping", "abducted", "abduction", "held captive",
            "ransom", "missing child", "child abduction",
            # Sexual violence
            "rape", "gang rape", "sexual assault", "molest", "molestation",
            "child abuse", "child sexual", "pedophile",
            # Life threatening
            "shot dead", "stabbed to death", "beheaded", "lynched", "burned alive",
            "acid attack", "honour killing", "dowry death",
        ]

        high_keywords = [
            # Physical assault
            "assault", "attacked", "beaten", "beat up", "punched", "kicked",
            "physical attack", "bodily harm", "grievous hurt", "serious injury",
            "hit with", "bludgeoned", "strangled", "choked",
            # Armed threat
            "gun", "gunpoint", "firearm", "pistol", "revolver", "rifle", "shotgun",
            "knife", "sharp weapon", "sword", "machete", "blade", "armed",
            "weapon", "threatening with", "brandishing",
            # Robbery
            "robbery", "armed robbery", "dacoity", "dacoit", "looting", "mugging",
            "snatching", "chain snatching", "carjacking", "hijack",
            # Fire & arson
            "fire", "arson", "set on fire", "burning building", "building on fire",
            "shop on fire", "house fire", "fire outbreak",
            # Riots
            "riot", "mob attack", "mob violence", "communal violence", "lynching",
            "stone pelting", "violent protest", "clashes",
            # Shooting & stabbing
            "shooting", "stabbing", "stabbed", "shot", "bullet", "gunshot",
            "knife attack", "stab wound",
            # Domestic violence
            "domestic violence", "wife beating", "husband beating", "dowry harassment",
            "eve teasing",
            # Other
            "hit and run", "road rage", "drunk driving accident", "serious accident",
            "suicide attempt", "self harm", "overdose",
            "extortion", "blackmail", "threatening", "death threat",
        ]

        medium_keywords = [
            # Theft
            "theft", "stolen", "steal", "stole", "pickpocket", "shoplifting",
            "burglary", "break-in", "broke into", "house break", "vehicle theft",
            "bike theft", "car theft", "mobile theft", "wallet stolen",
            # Fraud
            "fraud", "scam", "cheating", "swindled", "conned", "fake",
            "cyber fraud", "online fraud", "upi fraud", "atm fraud", "phishing",
            "identity theft", "impersonation", "forgery",
            # Harassment
            "harassment", "stalking", "stalker", "following me", "being followed",
            "sexual harassment", "workplace harassment", "cyber bullying",
            "threatening messages", "obscene calls",
            # Drugs
            "drug", "drugs", "narcotics", "cocaine", "heroin", "ganja", "weed",
            "marijuana", "intoxicated", "substance abuse",
            # Vandalism
            "vandalism", "damaged", "destroyed property", "broken windows",
            "graffiti", "slashed tyres",
            # Accidents
            "accident", "collision", "crashed", "vehicle accident", "bike accident",
            "road accident", "injured in accident",
            # Missing
            "missing person", "missing", "disappeared", "not returned home",
            "person missing", "runaway",
            # Trespassing
            "trespassing", "trespasser", "encroachment", "illegal entry",
            "breaking into", "unauthorised entry",
            # Disputes
            "domestic dispute", "family dispute", "neighbour dispute",
            "land dispute", "property dispute",
        ]

        low_keywords = [
            # Noise
            "noise", "loud noise", "loud music", "loud party", "nuisance",
            "neighbourhood noise", "late night noise",
            # Minor disturbances
            "disturbance", "argument", "quarrel", "verbal fight", "shouting",
            "abusive language", "verbal abuse",
            # Traffic
            "parking", "wrong parking", "traffic jam", "traffic issue",
            "signal violation", "pothole", "blocked road",
            # Animals
            "stray dog", "stray animal", "dog bite", "animal nuisance",
            "cow on road", "snake spotted",
            # Sanitation
            "garbage", "waste", "littering", "dirty road",
            "overflowing drain", "waterlogging", "street light",
            # Minor
            "minor", "complaint", "concern", "suspicious activity",
            "suspicious person", "unfamiliar person",
            "beggars", "hawkers", "broken road", "power cut",
        ]

        for kw in critical_keywords:
            if kw in desc:
                return "CRITICAL"
        for kw in high_keywords:
            if kw in desc:
                return "HIGH"
        for kw in medium_keywords:
            if kw in desc:
                return "MEDIUM"
        for kw in low_keywords:
            if kw in desc:
                return "LOW"
        return "LOW"

    # ──────────────────────── Fake Detection ────────────────────────

    def detect_fake(self, description: str) -> Dict[str, Any]:
        desc = description.strip()
        reasons = []

        if len(desc) < 10:
            reasons.append("Description too short")

        if len(set(desc.lower().split())) < 3:
            reasons.append("Very few unique words")

        nonsense_patterns = [
            r"^[a-z]{1,3}$", r"^test\b", r"^dummy", r"^abc",
            r"^(asdf|qwerty|aaaa|zzzz)", r"^\d+$"
        ]
        for pattern in nonsense_patterns:
            if re.match(pattern, desc.lower()):
                reasons.append("Meaningless content detected")
                break

        if len(desc) > 5 and len(set(desc.lower())) < 5:
            reasons.append("Repetitive characters detected")

        is_suspicious = len(reasons) > 0
        reason = "; ".join(reasons) if reasons else "Report appears genuine"
        return {"is_suspicious": is_suspicious, "reason": reason}

    # ─────────────────────── Incident Similarity ────────────────────

    def find_similar(self, description: str, top_k: int = 5) -> Dict[str, Any]:
        if not self.model_trained or not self.train_descriptions:
            return {
                "similar_count": 0,
                "message": "No historical data available for comparison",
                "similar_cases": []
            }

        desc_vec = self.similarity_vectorizer.transform([description.lower()])
        corpus_vec = self.similarity_vectorizer.transform(self.train_descriptions)
        scores = cosine_similarity(desc_vec, corpus_vec)[0]
        top_indices = scores.argsort()[::-1][:top_k]
        THRESHOLD = 0.2

        similar = []
        for idx in top_indices:
            score = scores[idx]
            if score >= THRESHOLD:
                similar.append({
                    "description": self.train_descriptions[idx][:100] + "...",
                    "similarity_score": round(float(score), 2)
                })

        count = len(similar)
        if count == 0:
            message = "No similar past incidents found"
        elif count == 1:
            message = "This incident is similar to 1 previous case"
        else:
            message = f"This incident is similar to {count} previous cases"

        return {"similar_count": count, "message": message, "similar_cases": similar}

    # ─────────────────────── Hotspot Intelligence ───────────────────

    def compute_hotspots(self, incidents: List[Dict]) -> Dict:
        location_counts = Counter()
        for inc in incidents:
            city = inc.get("city", "Unknown")
            area = inc.get("area", "")
            key = f"{city} - {area}" if area else city
            location_counts[key] += 1

        total = sum(location_counts.values()) or 1
        hotspots = []
        for loc, count in location_counts.most_common(10):
            freq = count / total
            if freq >= 0.20 or count >= 5:
                risk = "HIGH"
            elif freq >= 0.10 or count >= 3:
                risk = "MEDIUM"
            else:
                risk = "LOW"

            hotspots.append({
                "location": loc,
                "count": count,
                "risk_level": risk,
                "reason": f"{count} incident(s) reported — {'active hotspot' if risk == 'HIGH' else 'monitored area'}"
            })

        return {"hotspots": hotspots}

    # ─────────────────────── Priority Queue ─────────────────────────

    def compute_priority_queue(self, incidents: List[Dict]) -> Dict:
        SEVERITY_WEIGHTS = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        URGENCY_WEIGHTS = {"high": 3, "medium": 2, "low": 1}

        # Build location frequency map
        location_counts = Counter()
        for inc in incidents:
            loc = f"{inc.get('city', '')}-{inc.get('area', '')}"
            location_counts[loc] += 1
        max_loc_count = max(location_counts.values(), default=1)

        now = datetime.utcnow()
        scored = []
        for inc in incidents:
            # Severity score
            severity = (inc.get("severity") or inc.get("urgency") or "low").upper()
            urgency = (inc.get("urgency") or "low").lower()
            sev_score = SEVERITY_WEIGHTS.get(severity, URGENCY_WEIGHTS.get(urgency, 1))

            # Recency score (0-3, newer = higher)
            created_at = inc.get("created_at") or inc.get("incident_date")
            recency_score = 1.0
            if created_at:
                try:
                    ts = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
                    ts = ts.replace(tzinfo=None)
                    hours_ago = (now - ts).total_seconds() / 3600
                    recency_score = max(0, 3 - (hours_ago / 24))  # decay over days
                except Exception:
                    pass

            # Hotspot score
            loc = f"{inc.get('city', '')}-{inc.get('area', '')}"
            hotspot_score = location_counts[loc] / max_loc_count * 2

            priority_score = round(sev_score + recency_score + hotspot_score, 2)
            inc_copy = dict(inc)
            inc_copy["computed_priority_score"] = priority_score
            scored.append(inc_copy)

        scored.sort(key=lambda x: x["computed_priority_score"], reverse=True)
        return {"incidents": scored, "top_urgent": scored[:5]}

    # ─────────────────── Predictive Alerts ──────────────────────────

    def generate_predictive_alerts(self, incidents: List[Dict]) -> Dict:
        if not incidents:
            return {"alerts": [{"type": "info", "message": "No incident data available for predictions."}]}

        alerts = []

        # Time-based patterns
        hour_counts = Counter()
        for inc in incidents:
            t = inc.get("incident_time") or inc.get("time")
            if t:
                try:
                    hour = int(str(t).split(":")[0])
                    hour_counts[hour] += 1
                except Exception:
                    pass

        if hour_counts:
            peak_hour, peak_count = hour_counts.most_common(1)[0]
            period = "morning" if 6 <= peak_hour < 12 else \
                     "afternoon" if 12 <= peak_hour < 17 else \
                     "evening" if 17 <= peak_hour < 21 else "night"
            alerts.append({
                "type": "time_pattern",
                "message": f"High chance of crime during {period} hours ({peak_hour}:00). {peak_count} incidents recorded in this window."
            })

        # Category frequency
        cat_counts = Counter()
        for inc in incidents:
            cat = inc.get("category") or inc.get("domain") or "Unknown"
            cat_counts[cat] += 1

        if cat_counts:
            top_cat, top_count = cat_counts.most_common(1)[0]
            alerts.append({
                "type": "category_pattern",
                "message": f"'{top_cat}' is the most frequent crime type with {top_count} incidents. Increased monitoring recommended."
            })

        # Location clustering
        city_counts = Counter()
        for inc in incidents:
            city = inc.get("city", "Unknown")
            city_counts[city] += 1

        if city_counts:
            top_city, top_count = city_counts.most_common(1)[0]
            if top_count >= 3:
                alerts.append({
                    "type": "location_cluster",
                    "message": f"Crime cluster detected in {top_city} — {top_count} incidents. Consider deploying additional patrols."
                })

        return {"alerts": alerts[:3]}

    # ─────────────────────── Trend Analysis ─────────────────────────

    def trend_analysis(self, incidents: List[Dict]) -> Dict:
        if not incidents:
            return {"trends": [], "hourly": [], "categories": [], "monthly": []}

        # Hourly distribution
        hour_counts = Counter()
        for inc in incidents:
            t = inc.get("incident_time") or ""
            try:
                hour = int(str(t).split(":")[0])
                hour_counts[hour] += 1
            except Exception:
                pass

        hourly = [{"hour": h, "count": hour_counts.get(h, 0)} for h in range(0, 24)]

        # Category distribution
        cat_counts = Counter()
        for inc in incidents:
            cat = inc.get("category") or "Other"
            cat_counts[cat] += 1
        categories = [{"category": k, "count": v} for k, v in cat_counts.most_common(8)]

        # Monthly trend
        month_counts = Counter()
        for inc in incidents:
            d = inc.get("incident_date") or inc.get("created_at") or ""
            try:
                dt = datetime.fromisoformat(str(d).replace("Z", "+00:00"))
                month_counts[dt.strftime("%Y-%m")] += 1
            except Exception:
                pass
        monthly = [{"month": m, "count": c} for m, c in sorted(month_counts.items())]

        # Trend direction per category
        trends = []
        for cat, count in cat_counts.most_common(5):
            trends.append({
                "category": cat,
                "count": count,
                "direction": "increasing" if count > 5 else "stable",
                "note": f"{count} total reports"
            })

        return {"trends": trends, "hourly": hourly, "categories": categories, "monthly": monthly}

    # ────────────────── Officer Recommendations ──────────────────────

    def generate_recommendations(self, incidents: List[Dict]) -> Dict:
        recs = []

        # Hotspot-based
        location_counts = Counter()
        for inc in incidents:
            city = inc.get("city", "Unknown")
            area = inc.get("area", "")
            key = f"{city} - {area}" if area else city
            location_counts[key] += 1

        if location_counts:
            top_loc = location_counts.most_common(1)[0][0]
            recs.append({
                "priority": "high",
                "action": f"Increase patrol frequency in {top_loc} — highest incident concentration detected."
            })

        # Time-based
        hour_counts = Counter()
        for inc in incidents:
            t = inc.get("incident_time") or ""
            try:
                hour = int(str(t).split(":")[0])
                hour_counts[hour] += 1
            except Exception:
                pass

        if hour_counts:
            peak_hour = hour_counts.most_common(1)[0][0]
            period = "morning" if 6 <= peak_hour < 12 else \
                     "afternoon" if 12 <= peak_hour < 17 else \
                     "evening" if 17 <= peak_hour < 21 else "night"
            recs.append({
                "priority": "medium",
                "action": f"Allocate additional officers during {period} hours ({peak_hour}:00) — peak crime window identified."
            })

        # Category-based
        cat_counts = Counter()
        for inc in incidents:
            cat = inc.get("category") or "Other"
            cat_counts[cat] += 1

        if cat_counts:
            top_cat = cat_counts.most_common(1)[0][0]
            recs.append({
                "priority": "medium",
                "action": f"Brief officers on '{top_cat}' incidents — highest frequency category. Prepare appropriate response protocols."
            })

        # Unresolved cases
        pending = [i for i in incidents if i.get("status") in ("pending", "under_review")]
        if len(pending) >= 3:
            recs.append({
                "priority": "high",
                "action": f"{len(pending)} cases pending resolution. Prioritize case assignment to reduce backlog."
            })

        # Fallback
        if not recs:
            recs.append({
                "priority": "low",
                "action": "Continue standard patrol operations. No significant anomalies detected."
            })

        return {"recommendations": recs}