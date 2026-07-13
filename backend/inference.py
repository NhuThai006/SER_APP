"""
SER Inference Pipeline — Load Wav2Vec2 + ResLSTM và predict emotion từ audio.
"""
import sys
import os
import numpy as np
import torch
import torch.nn.functional as F
import librosa

# Thêm path tới thư mục model/src để import ResLSTM_Multi_Att
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'model'))
from src.models.res_lstm import ResLSTM_Multi_Att
from wav2vec_feature_extractor import load_wav2vec2

# ═══════════════════════════════════════════════════════
# CẤU HÌNH — PHẢI KHỚP VỚI TRAINING NOTEBOOK (train3.ipynb)
# ═══════════════════════════════════════════════════════
MODEL_CONFIG = {
    "input_size": 768,           # Wav2Vec2-base hidden dim
    "hidden_size": 512,          # LSTM2 hidden size (H512)
    "num_layers": 1,
    "num_att": 4,                # Multi-Vector Attention heads
    "num_classes": 8,
    "projection_dim": 256,       # Projection: 768 → 256
    "projection_dropout": 0.3,
    "dropout_p": 0.28,           # Best from Optuna
}

# Nhãn cảm xúc — THỨ TỰ PHẢI KHỚP với training
# Lưu ý: index 5 là "fear" (KHÔNG phải "fearful")
EMOTION_LABELS = [
    "neutral",    # 0
    "calm",       # 1
    "happy",      # 2
    "sad",        # 3
    "angry",      # 4
    "fear",       # 5  ← "fear" chứ KHÔNG phải "fearful"
    "disgust",    # 6
    "surprised",  # 7
]

# Path tới best model checkpoint
BEST_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'model', 'bestmodel',
    'best_ResLSTM_Wav2Vec_H512_Triplet_tuning_v3.pt'
)

# Wav2Vec2 model name
WAV2VEC2_MODEL_NAME = "facebook/wav2vec2-base"


class SERPredictor:
    """Speech Emotion Recognition inference pipeline."""

    def __init__(self, device: str = None):
        # Auto-detect device
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        print(f"[SERPredictor] Using device: {self.device}")

        # 1. Load Wav2Vec2 processor + model (feature extractor)
        print(f"[SERPredictor] Loading Wav2Vec2: {WAV2VEC2_MODEL_NAME}...")
        self.w2v_processor, self.w2v_model = load_wav2vec2(
            model_name=WAV2VEC2_MODEL_NAME,
            device=self.device
        )

        # 2. Load ResLSTM classifier
        print(f"[SERPredictor] Loading ResLSTM from: {BEST_MODEL_PATH}...")
        self.model = ResLSTM_Multi_Att(
            input_size=MODEL_CONFIG["input_size"],
            hidden_size=MODEL_CONFIG["hidden_size"],
            num_layers=MODEL_CONFIG["num_layers"],
            num_att=MODEL_CONFIG["num_att"],
            num_classes=MODEL_CONFIG["num_classes"],
            projection_dim=MODEL_CONFIG["projection_dim"],
            projection_dropout=MODEL_CONFIG["projection_dropout"],
            dropout_p=MODEL_CONFIG["dropout_p"],
            device=self.device,
        )

        # Load checkpoint (state_dict only)
        state_dict = torch.load(BEST_MODEL_PATH, map_location=self.device, weights_only=True)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.model.eval()

        print("[SERPredictor] ✅ All models loaded successfully!")

    def predict(self, audio_bytes: bytes) -> dict:
        """
        Predict emotion from raw audio bytes.

        Args:
            audio_bytes: Raw audio file content (WAV/MP3)

        Returns:
            {
                "dominant_emotion": "happy",
                "confidence": 0.85,
                "probabilities": {"neutral": 0.05, "calm": 0.02, ...}
            }
        """
        import tempfile
        import subprocess
        import imageio_ffmpeg

        # 1. Lưu audio bytes vào temp file gốc (có thể là webm, mp3, mp4, etc.)
        with tempfile.NamedTemporaryFile(delete=False) as tmp_in:
            tmp_in.write(audio_bytes)
            tmp_in_path = tmp_in.name
            
        tmp_out_path = tmp_in_path + "_converted.wav"
        
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

        try:
            # Dùng bản ffmpeg độc lập (từ imageio_ffmpeg) để convert tránh lỗi DLL của Windows/Conda
            subprocess.run([
                ffmpeg_exe, "-y", "-i", tmp_in_path, 
                "-ar", "16000", "-ac", "1", tmp_out_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            
            # 2. Load audio (lúc này chắc chắn là file WAV chuẩn 16kHz, mono)
            audio, sr = librosa.load(tmp_out_path, sr=16000, mono=True)

            # 3. Trích Wav2Vec2 features — Layer 8 hidden states
            inputs = self.w2v_processor(
                audio, sampling_rate=16000, return_tensors="pt"
            )
            input_values = inputs.input_values.to(self.device)

            with torch.no_grad():
                outputs = self.w2v_model(
                    input_values=input_values,
                    output_hidden_states=True
                )
                # Lấy layer 8 (KHÔNG phải last_hidden_state)
                features = outputs.hidden_states[8].squeeze(0)  # (T, 768)

            # 4. Chuẩn bị input cho ResLSTM
            # Thêm batch dimension: (T, 768) → (1, T, 768)
            features = features.unsqueeze(0).to(self.device)
            lengths = torch.tensor([features.size(1)], dtype=torch.long).to(self.device)

            # 5. Run ResLSTM inference
            with torch.no_grad():
                logits = self.model(features, lengths)  # (1, 8)
                probabilities = F.softmax(logits, dim=1).squeeze(0)  # (8,)

            # 6. Map kết quả
            probs = probabilities.cpu().numpy()
            result = {}
            for i, label in enumerate(EMOTION_LABELS):
                result[label] = float(probs[i])

            dominant_idx = int(np.argmax(probs))

            return {
                "dominant_emotion": EMOTION_LABELS[dominant_idx],
                "confidence": float(probs[dominant_idx]),
                "probabilities": result,
            }

        finally:
            if 'tmp_in_path' in locals() and os.path.exists(tmp_in_path):
                os.unlink(tmp_in_path)
            if 'tmp_out_path' in locals() and os.path.exists(tmp_out_path):
                os.unlink(tmp_out_path)
