export const MODEL_CONFIG = {
  // Trọng tâm: Sample rate phải khớp với lúc train (Mặc định librosa load sr=None giữ nguyên RAVDESS 48000Hz)
  // Nếu lúc train có resample (vd 16000Hz), bạn cần sửa lại ở đây.
  SAMPLE_RATE: 48000, 
  
  // Các tham số MFCC & Chroma phải khớp 100% với file train.ipynb
  MFCC_PARAMS: {
    n_mfcc: 34,
    n_chroma: 12,
    n_fft: 4096,
    hop_length: 2048, // Tương đương n_fft // 2
  },

  // Tổng số features = n_mfcc (34) + n_chroma (12) = 46
  N_FEATURES: 46,

  // Nhãn cảm xúc (8 class từ RAVDESS)
  CLASSES: [
    'neutral', 'calm', 'happy', 'sad', 
    'angry', 'fearful', 'disgust', 'surprised'
  ],

  // Đường dẫn tới model ONNX trong thư mục public
  MODEL_PATH: '/model/model.onnx'
};
