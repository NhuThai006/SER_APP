'use client';

import { useState, useRef } from 'react';
import { Cloud, Mic, Trash2, CheckCircle2 } from 'lucide-react';

export interface AudioSession {
  id: string;
  file: File;
  fileName: string;
  duration: number;
  audioUrl: string;
}

interface AudioUploadCardProps {
  sessions: AudioSession[];
  selectedSessionIds: string[];
  isAnalyzing: boolean;
  error: string;
  onFileSelect: (file: File, duration: number) => void;
  onAnalyze: () => void;
  onFileNameChange: (id: string, newName: string) => void;
  onClearFile: (id: string) => void;
  onSessionSelect: (id: string) => void;
}

export default function AudioUploadCard({
  sessions,
  selectedSessionIds,
  isAnalyzing,
  error,
  onFileSelect,
  onAnalyze,
  onFileNameChange,
  onClearFile,
  onSessionSelect,
}: AudioUploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // State cho việc đặt tên sau khi thu âm
  const [pendingRecording, setPendingRecording] = useState<{ blob: Blob, duration: number } | null>(null);
  const [recordingName, setRecordingName] = useState('recording.wav');

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
    if (!['audio/wav', 'audio/mpeg', 'audio/mp3'].includes(file.type)) {
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    const audio = new Audio();
    let metadataLoaded = false;

    audio.onloadedmetadata = () => {
      metadataLoaded = true;
      onFileSelect(file, audio.duration);
    };

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
          
          const audio = new Audio();
          audio.onloadedmetadata = () => {
            setPendingRecording({ blob: audioBlob, duration: audio.duration });
          };
          // Nếu không lấy được metadata thì truyền tạm 0
          const timeout = setTimeout(() => {
             setPendingRecording({ blob: audioBlob, duration: 0 });
          }, 500);
          audio.onloadeddata = () => clearTimeout(timeout);
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

  const handleSaveRecording = () => {
    if (pendingRecording) {
      let finalName = recordingName.trim();
      if (!finalName) finalName = 'recording';
      if (!finalName.endsWith('.wav')) finalName += '.wav';
      
      const file = new File([pendingRecording.blob], finalName, { type: 'audio/wav' });
      onFileSelect(file, pendingRecording.duration);
      
      setPendingRecording(null);
      setRecordingName('recording.wav'); // reset
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white p-6 relative">
      {/* Modal hỏi tên file thu âm */}
      {pendingRecording && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Name your recording</h3>
            <input
              type="text"
              value={recordingName}
              onChange={(e) => setRecordingName(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. interview.wav"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingRecording(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecording}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900">INPUT AUDIO</h2>

      {/* Upload Zone & Record Button */}
      <div className="flex flex-col gap-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed py-8 transition-colors ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50'
          }`}
        >
          <Cloud className={`h-10 w-10 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">Drag & drop an audio file</p>
            <p className="text-xs text-gray-500 mt-1">or</p>
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

        <button
          onClick={handleRecordClick}
          disabled={isAnalyzing || pendingRecording !== null}
          className={`flex items-center justify-center gap-2 rounded-lg py-3 font-medium text-white transition-colors ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'
          }`}
        >
          <Mic className="h-5 w-5" />
          {isRecording ? 'Stop Recording' : 'Record from mic'}
        </button>
      </div>

      {/* Sessions List */}
      {sessions.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-700">Uploaded Files ({sessions.length})</h3>
          
          <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
            {sessions.map((session) => {
              const isSelected = selectedSessionIds.includes(session.id);
              
              return (
                <div
                  key={session.id}
                  onClick={() => onSessionSelect(session.id)}
                  className={`flex cursor-pointer flex-col gap-3 rounded-lg border-2 p-4 transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-sm' 
                      : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center gap-3 min-w-0 mr-4">
                      {/* Selection Indicator */}
                      <div className={`flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-300'}`}>
                        {isSelected ? <CheckCircle2 className="h-6 w-6" /> : <div className="h-6 w-6 rounded-full border-2 border-gray-300"></div>}
                      </div>
                      
                      <div className="flex-shrink-0 text-lg">🎵</div>
                      
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={session.fileName}
                          onChange={(e) => onFileNameChange(session.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()} // Tránh kích hoạt select khi đang gõ
                          className={`w-full bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-blue-500 focus:ring-0 truncate ${
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          }`}
                          placeholder="Enter file name"
                          disabled={isAnalyzing}
                        />
                        <p className={`text-xs mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                          {formatDuration(session.duration)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Tránh trigger select khi bấm xóa
                        onClearFile(session.id);
                      }}
                      disabled={isAnalyzing}
                      className="rounded-full p-2 text-gray-400 hover:bg-white hover:text-red-600 transition-colors flex-shrink-0 disabled:opacity-50"
                      title="Remove file"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  {session.audioUrl && (
                    <div onClick={(e) => e.stopPropagation()} className="w-full">
                      <audio controls src={session.audioUrl} className="h-10 w-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing || pendingRecording !== null}
        className={`rounded-lg py-3 font-medium text-white transition-colors mt-2 ${
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
          'Analyze Selected File'
        )}
      </button>
    </div>
  );
}
