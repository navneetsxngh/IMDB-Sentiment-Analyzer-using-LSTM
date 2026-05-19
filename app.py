import uvicorn
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from typing import List

from src.IMDBSentimentAnalysis.pipeline.predictionpipeline import PredictionStagePipeline

# ── Logging ───────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App Init ──────────────────────────────────────────────────────
app = FastAPI(
    title       = "IMDB Sentiment Analysis API",
    description = "Predict sentiment of movie reviews using Bi-LSTM model",
    version     = "1.0.0"
)

# ── Static files & Templates ──────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"]
)

# ── Load Pipeline Once at Startup ─────────────────────────────────
predictor = None

@app.on_event("startup")
async def load_pipeline():
    global predictor
    try:
        logger.info("Loading prediction pipeline...")
        predictor = PredictionStagePipeline()
        logger.info("✅ Pipeline loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load pipeline: {e}")
        raise e


# ── Request & Response Schemas ────────────────────────────────────
class SingleReviewRequest(BaseModel):
    review: str = Field(
        ...,
        min_length = 10,
        example    = "This movie was absolutely fantastic! The acting was brilliant."
    )


class BatchReviewRequest(BaseModel):
    reviews: List[str] = Field(
        ...,
        min_items = 1,
        max_items = 50,
        example   = [
            "This movie was absolutely fantastic!",
            "Worst movie I have ever seen."
        ]
    )


class PredictionResponse(BaseModel):
    review      : str
    sentiment   : str
    confidence  : float
    probability : float


class BatchPredictionResponse(BaseModel):
    total   : int
    results : List[PredictionResponse]


class HealthResponse(BaseModel):
    status  : str
    model   : str
    version : str


# ── UI Routes ─────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse, include_in_schema=False, tags=["UI"])
async def landing(request: Request):
    return templates.TemplateResponse(request, "landing.html")


@app.get("/ui", response_class=HTMLResponse, include_in_schema=False, tags=["UI"])
async def ui_home(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.get("/ui/batch", response_class=HTMLResponse, include_in_schema=False, tags=["UI"])
async def ui_batch(request: Request):
    return templates.TemplateResponse(request, "batch_predict.html")


# ── API Routes ────────────────────────────────────────────────────

# Health Check
@app.get(
    "/health",
    response_model = HealthResponse,
    tags           = ["Health"],
    summary        = "API health check"
)
async def health():
    return HealthResponse(
        status  = "✅ API is running",
        model   = "Bi-LSTM Sentiment Classifier",
        version = "1.0.0"
    )


@app.get(
    "/api/health",
    response_model = HealthResponse,
    tags           = ["Health"],
    summary        = "API health check (alias)"
)
async def health_alias():
    return HealthResponse(
        status  = "✅ API is running",
        model   = "Bi-LSTM Sentiment Classifier",
        version = "1.0.0"
    )


# Single Prediction
@app.post(
    "/predict",
    response_model = PredictionResponse,
    tags           = ["Prediction"],
    summary        = "Predict sentiment of a single review"
)
async def predict_single(request: SingleReviewRequest):
    try:
        logger.info(f"Single prediction request received")
        result = predictor.predict_single(request.review)

        return PredictionResponse(
            review      = result['review'],
            sentiment   = result['sentiment'],
            confidence  = result['confidence'],
            probability = result['probability']
        )

    except Exception as e:
        logger.error(f"❌ Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Batch Prediction
@app.post(
    "/predict/batch",
    response_model = BatchPredictionResponse,
    tags           = ["Prediction"],
    summary        = "Predict sentiment of multiple reviews at once"
)
async def predict_batch(request: BatchReviewRequest):
    try:
        logger.info(f"Batch prediction request: {len(request.reviews)} reviews")
        results = predictor.predict_batch(request.reviews)

        return BatchPredictionResponse(
            total   = len(results),
            results = [
                PredictionResponse(
                    review      = r['review'],
                    sentiment   = r['sentiment'],
                    confidence  = r['confidence'],
                    probability = r['probability']
                )
                for r in results
            ]
        )

    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Run ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host    = "0.0.0.0",
        port    = 8080,
        reload  = True
    )