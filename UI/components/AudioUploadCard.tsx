'use client';

import { useState, useRef } from 'react';
import { Cloud, Mic } from 'lucide-react';

interface AudioUploadCardProps {
  fileName: string;
  duration: number;
  isAnalyzing: boolean;
  error: string;
  onFileSelect: (file: File, duration: number) => void;
  onAnalyze: () => void;
}

export default function AudioUploadCard({
  fileName,
  duration,
  isAnalyzing,
  error,
  onFileSelect,
  onAnalyze,
}: AudioUploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const processFile = (file: File) => {
    // Validate file type
    if (!['audio/wav', 'audio/mpeg', 'audio/mp3'].includes(file.type)) {
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    const audio = new Audio();
    let metadataLoaded = false;

    audio.onloadedmetadata = () => {
      metadataLoaded = true;
      onFileSelect(file, audio.duration);
    };

    // Fallback timeout if metadata doesn't load (for testing)
    const timeout = setTimeout(() => {
      if (!metadataLoaded) {
        onFileSelect(file, 0);
      }
    }, 1000);

    audio.onload = () => clearTimeout(timeout);
    audio.onerror = () => clearTimeout(timeout);

    try {
      audio.src = URL.createObjectURL(file);
    } catch (err) {
      console.error('Failed to create audio object:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Add a direct file processing function that can be called from outside
  const handleDirectFileInput = (file: File) => {
    processFile(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRecordClick = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });

          const audio = new Audio();
          audio.onloadedmetadata = () => {
            onFileSelect(file, audio.duration);
          };
          audio.src = URL.createObjectURL(audioBlob);

          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Microphone access denied:', err);
      }
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">INPUT AUDIO</h2>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed py-12 transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        }`}
      >
        <Cloud className={`h-12 w-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">Drag & drop an audio file (max 10MB)</p>
          <p className="text-sm text-gray-600">or</p>
        </div>
        <button
          onClick={handleBrowseClick}
          className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          Browse Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Selected File Display */}
      {fileName && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <div className="text-lg">🎵</div>
            <div>
              <p className="text-sm font-medium text-gray-900">{fileName}</p>
              <p className="text-xs text-gray-600">{formatDuration(duration)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Record Button */}
      <button
        onClick={handleRecordClick}
        disabled={isAnalyzing}
        className={`flex items-center justify-center gap-2 rounded-lg py-3 font-medium text-white transition-colors ${
          isRecording
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'
        }`}
      >
        <Mic className="h-5 w-5" />
        {isRecording ? 'Stop Recording' : 'Record from mic'}
      </button>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={onAnalyze}
        disabled={!fileName || isAnalyzing}
        className={`rounded-lg py-3 font-medium text-white transition-colors ${
          isAnalyzing
            ? 'flex items-center justify-center gap-2 bg-blue-600'
            : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'
        }`}
      >
        {isAnalyzing ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Analyzing...
          </>
        ) : (
          'Analyze'
        )}
      </button>
    </div>
  );
}
