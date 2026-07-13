import Meyda from 'meyda';
import { MODEL_CONFIG } from './modelConfig';

/**
 * Hàm giải mã file audio thành AudioBuffer
 */
export async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  // Khởi tạo AudioContext với sample rate chuẩn
  // Note: OfflineAudioContext giúp resample trực tiếp không cần play
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: MODEL_CONFIG.SAMPLE_RATE,
  });
  
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    // Đảm bảo đóng context để tránh rò rỉ bộ nhớ
    if (audioCtx.state !== 'closed') {
      await audioCtx.close();
    }
  }
}

/**
 * Trích xuất MFCC và Chroma bằng Meyda.
 * Hàm này mô phỏng librosa.feature.mfcc và chroma_stft
 */
export function extractFeatures(audioBuffer) {
  // Lấy dữ liệu kênh trái (mono)
  const channelData = audioBuffer.getChannelData(0); 
  const { n_fft, hop_length, n_mfcc, n_chroma } = MODEL_CONFIG.MFCC_PARAMS;
  
  Meyda.bufferSize = n_fft;
  Meyda.sampleRate = audioBuffer.sampleRate;
  Meyda.numberOfMFCCCoefficients = n_mfcc;
  
  const features = [];
  
  // Trượt window qua audio signal (tương tự librosa)
  for (let i = 0; i + n_fft < channelData.length; i += hop_length) {
    const frame = channelData.slice(i, i + n_fft);
    
    // Meyda yêu cầu buffer phải chính xác là power of 2 (vd: 4096)
    if (frame.length !== n_fft) break;

    // Trích xuất mfcc và chroma
    const extracted = Meyda.extract(['mfcc', 'chroma'], frame);
    
    if (extracted && extracted.mfcc && extracted.chroma) {
      // Meyda trả về mảng mfcc (độ dài n_mfcc) và chroma (độ dài 12)
      // Cắt/pad chroma về n_chroma nếu cần (meyda chroma luôn là 12)
      const mfcc = extracted.mfcc;
      const chroma = extracted.chroma.slice(0, n_chroma);
      
      // Concatenate mfcc và chroma: shape [1, time_steps, 46]
      const combined = [...mfcc, ...chroma];
      features.push(combined);
    }
  }

  // Kết quả features là mảng 2D: [time_steps, n_features]
  // Chuyển sang Float32Array 1D (để đưa vào tensor onnx)
  const time_steps = features.length;
  const n_features = MODEL_CONFIG.N_FEATURES;
  
  const flatFeatures = new Float32Array(time_steps * n_features);
  for (let t = 0; t < time_steps; t++) {
    for (let f = 0; f < n_features; f++) {
      flatFeatures[t * n_features + f] = features[t][f];
    }
  }

  return { flatFeatures, time_steps };
}
