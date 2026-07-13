export const MODEL_CONFIG = {
  // URL của FastAPI backend
  API_URL: 'http://localhost:8000',

  // Nhãn cảm xúc (8 class từ RAVDESS) — khớp với backend
  // Lưu ý: index 5 là "fear" (không phải "fearful")
  CLASSES: [
    'neutral', 'calm', 'happy', 'sad',
    'angry', 'fear', 'disgust', 'surprised'
  ],
};
