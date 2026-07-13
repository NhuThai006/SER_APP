"""
FastAPI server cho Speech Emotion Recognition.
Chạy: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from inference import SERPredictor

app = FastAPI(
    title="Speech Emotion Recognition API",
    description="Predict emotions from speech audio using ResLSTM + Wav2Vec2",
    version="1.0.0",
)

# CORS — cho phép Next.js frontend gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model 1 lần khi server khởi động
predictor: SERPredictor = None


@app.on_event("startup")
async def startup_event():
    global predictor
    predictor = SERPredictor()


@app.get("/health")
async def health_check():
    return {"status": "ok", "model_loaded": predictor is not None}


@app.post("/api/predict")
async def predict_emotion(file: UploadFile = File(...)):
    """
    Nhận file audio (WAV/MP3), trả về emotion probabilities.

    Response format:
    {
        "dominant_emotion": "happy",
        "confidence": 0.85,
        "probabilities": {
            "neutral": 0.05,
            "calm": 0.02,
            "happy": 0.85,
            "sad": 0.01,
            "angry": 0.03,
            "fear": 0.01,
            "disgust": 0.02,
            "surprised": 0.01
        }
    }
    """
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    # Validate file type
    if file.content_type not in ["audio/wav", "audio/mpeg", "audio/mp3",
                                  "audio/x-wav", "audio/wave", "audio/webm",
                                  "audio/ogg", "application/octet-stream"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {file.content_type}. Use WAV or MP3."
        )

    try:
        audio_bytes = await file.read()
        result = predictor.predict(audio_bytes)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e) or repr(e)}")
