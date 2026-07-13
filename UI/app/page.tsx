'use client';

import { useState } from 'react';
import AudioUploadCard, { AudioSession } from '@/components/AudioUploadCard';
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
  const [sessions, setSessions] = useState<AudioSession[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');

  const { isModelLoaded, modelError, predict } = useEmotionModel();

  const handleFileSelect = (file: File, dur: number) => {
    const newSession: AudioSession = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      file,
      fileName: file.name,
      duration: dur,
      audioUrl: URL.createObjectURL(file),
    };
    
    setSessions((prev) => [...prev, newSession]);
    // Không tự động chọn file mới theo yêu cầu
    setError('');
  };

  const handleSessionSelect = (id: string) => {
    if (selectedSessionIds.includes(id)) {
      // Đã chọn rồi thì click lại sẽ bỏ chọn
      setSelectedSessionIds(prev => prev.filter(sessionId => sessionId !== id));
    } else {
      // Chưa chọn
      if (selectedSessionIds.length >= 1) {
        alert("You can only select 1 file to analyze at a time.");
      } else {
        setSelectedSessionIds([id]);
      }
    }
  };

  const handleFileNameChange = (id: string, newName: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === id ? { ...session, fileName: newName } : session
      )
    );
  };

  const handleClearFile = (id: string) => {
    setSessions((prev) => {
      const sessionToRemove = prev.find((s) => s.id === id);
      if (sessionToRemove?.audioUrl) {
        URL.revokeObjectURL(sessionToRemove.audioUrl);
      }
      return prev.filter((s) => s.id !== id);
    });
    
    if (selectedSessionIds.includes(id)) {
      setSelectedSessionIds(prev => prev.filter(sessionId => sessionId !== id));
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (selectedSessionIds.length === 0) {
      alert("Please select an audio file to analyze.");
      return;
    }

    const sessionToAnalyze = sessions.find((s) => s.id === selectedSessionIds[0]);
    
    if (!sessionToAnalyze) {
      alert("Please select an audio file to analyze.");
      return;
    }

    if (!isModelLoaded) {
      setError('Model is still loading or failed to load. Please wait or check errors.');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const result = await predict(sessionToAnalyze.file);
      
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
            sessions={sessions}
            selectedSessionIds={selectedSessionIds}
            isAnalyzing={isAnalyzing}
            error={error || modelError}
            onFileSelect={handleFileSelect}
            onAnalyze={handleAnalyze}
            onFileNameChange={handleFileNameChange}
            onClearFile={handleClearFile}
            onSessionSelect={handleSessionSelect}
          />
          <ResultsDashboard result={analysisResult} isAnalyzing={isAnalyzing} />
        </div>
      </main>
    </div>
  );
}
