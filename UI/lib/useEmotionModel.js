import { useState, useEffect } from 'react';
import { MODEL_CONFIG } from './modelConfig';

export function useEmotionModel() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState('');

  // Kiểm tra backend có sẵn sàng không khi component mount
  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch(`${MODEL_CONFIG.API_URL}/health`);
        const data = await res.json();
        if (data.status === 'ok' && data.model_loaded) {
          setIsModelLoaded(true);
        } else {
          setModelError('Backend model chưa sẵn sàng. Đảm bảo FastAPI server đang chạy.');
        }
      } catch (err) {
        setModelError(
          `Không thể kết nối backend tại ${MODEL_CONFIG.API_URL}. ` +
          `Hãy chạy: cd backend && uvicorn main:app --port 8000`
        );
      }
    }
    checkBackend();
  }, []);

  const predict = async (audioFile) => {
    // Gửi audio file tới backend API
    const formData = new FormData();
    formData.append('file', audioFile);

    const response = await fetch(`${MODEL_CONFIG.API_URL}/api/predict`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    const result = await response.json();

    return {
      dominant_emotion: result.dominant_emotion,
      confidence: result.confidence,
      probabilities: result.probabilities,
    };
  };

  return { isModelLoaded, modelError, predict };
}
