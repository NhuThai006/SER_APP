'use client';

import { useState } from 'react';
import AudioUploadCard from '@/components/AudioUploadCard';
import ResultsDashboard from '@/components/ResultsDashboard';
import { useEmotionModel } from '@/lib/useEmotionModel';

export interface AnalysisResult {
  emotion: string;
  probability: number;
  emotions: {
    [key: string]: number;
  };
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');

  const { isModelLoaded, modelError, predict } = useEmotionModel();

  const handleFileSelect = (file: File, dur: number) => {
    setSelectedFile(file);
    setFileName(file.name);
    setDuration(dur);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select or record an audio file');
      return;
    }

    if (!isModelLoaded) {
      setError('Model is still loading or failed to load. Please wait or check errors.');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const result = await predict(selectedFile);
      
      setAnalysisResult({
        emotion: result.dominant_emotion.charAt(0).toUpperCase() + result.dominant_emotion.slice(1),
        probability: result.confidence,
        emotions: result.probabilities,
      });
    } catch (err) {
      console.error(err);
      setError(`Failed to analyze audio: ${err.message || err}. Please try again.`);
    } finally {
      setIsAnalyzing(false);
    }
  };


  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔊</div>
              <h1 className="text-2xl font-semibold text-gray-900">Speech Emotion AI</h1>
            </div>
            <div className="h-10 w-10 rounded-full bg-gray-200"></div>
          </div>
          <nav className="mt-4 flex gap-8 border-t border-gray-100 pt-4">
            <button className="border-b-2 border-blue-600 pb-3 text-sm font-medium text-blue-600">
              Dashboard
            </button>
            <button className="pb-3 text-sm font-medium text-gray-600 hover:text-gray-900">
              Uploads
            </button>
            <button className="pb-3 text-sm font-medium text-gray-600 hover:text-gray-900">
              Reports
            </button>
            <button className="pb-3 text-sm font-medium text-gray-600 hover:text-gray-900">
              Help
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <AudioUploadCard
            fileName={fileName}
            duration={duration}
            isAnalyzing={isAnalyzing}
            error={error || modelError}
            onFileSelect={handleFileSelect}
            onAnalyze={handleAnalyze}
          />
          <ResultsDashboard result={analysisResult} isAnalyzing={isAnalyzing} />
        </div>
      </main>
    </div>
  );
}
