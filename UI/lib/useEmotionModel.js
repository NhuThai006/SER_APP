import { useState, useEffect, useRef } from 'react';
import * as ort from 'onnxruntime-web';
import { MODEL_CONFIG } from './modelConfig';
import { decodeAudioFile, extractFeatures } from './audioPreprocess';

// Sử dụng CDN để đảm bảo tất cả các file .wasm và .mjs worker được tải đúng cách mà không bị lỗi webpack
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

export function useEmotionModel() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState('');
  const sessionRef = useRef(null);

  // Load model ONNX một lần khi mount
  useEffect(() => {
    async function loadModel() {
      try {
        console.log('Loading ONNX model from:', MODEL_CONFIG.MODEL_PATH);
        // Khởi tạo session với WASM backend
        const session = await ort.InferenceSession.create(MODEL_CONFIG.MODEL_PATH, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        });
        sessionRef.current = session;
        setIsModelLoaded(true);
        console.log('ONNX model loaded successfully');
      } catch (err) {
        console.error('Failed to load ONNX model:', err);
        setModelError(`Không thể tải mô hình: ${err.message}. Đảm bảo model.onnx đã được đặt vào thư mục public/model/`);
      }
    }
    loadModel();
  }, []);

  // Hàm tính Softmax cho mảng Float32
  const softmax = (arr) => {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sumExps);
  };

  const predict = async (audioFile) => {
    if (!sessionRef.current) {
      throw new Error('Model is not loaded yet');
    }
    
    let audioBuffer = null;
    try {
      // 1. Tiền xử lý (Decode -> AudioBuffer)
      audioBuffer = await decodeAudioFile(audioFile);
      
      // 2. Trích xuất đặc trưng (MFCC + Chroma)
      const { flatFeatures, time_steps } = extractFeatures(audioBuffer);
      
      if (time_steps === 0) {
        throw new Error('Audio file is too short to extract features');
      }
      
      // 3. Chuẩn bị input tensor
      // Shape: [batch=1, time_steps, n_features]
      const inputTensor = new ort.Tensor(
        'float32',
        flatFeatures,
        [1, time_steps, MODEL_CONFIG.N_FEATURES]
      );
      
      // 4. Chạy inference
      // Tên input phải khớp với lúc export (ở đây là "input")
      const feeds = { input: inputTensor };
      const results = await sessionRef.current.run(feeds);
      
      // Lấy output tensor (tên output mặc định thường là "output")
      const outputTensor = results[Object.keys(results)[0]];
      const rawLogits = Array.from(outputTensor.data);
      
      // 5. Áp dụng Softmax vì ResLSTM output ra logits chưa qua softmax
      const probabilities = softmax(rawLogits);
      
      // 6. Map kết quả sang object
      const emotionsObj = {};
      let maxProb = 0;
      let dominantEmotion = '';
      
      MODEL_CONFIG.CLASSES.forEach((className, idx) => {
        const prob = probabilities[idx];
        emotionsObj[className] = prob;
        if (prob > maxProb) {
          maxProb = prob;
          dominantEmotion = className;
        }
      });
      
      return {
        dominant_emotion: dominantEmotion,
        confidence: maxProb,
        probabilities: emotionsObj
      };
      
    } catch (err) {
      console.error('Prediction error:', err);
      throw err;
    } finally {
      // 7. Dọn dẹp bộ nhớ (garbage collection)
      audioBuffer = null;
    }
  };

  return { isModelLoaded, modelError, predict };
}
