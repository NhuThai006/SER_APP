'use client';

import { AnalysisResult } from '@/app/page';
import EmotionRadarChart from './EmotionRadarChart';
import EmotionBars from './EmotionBars';
import EmotionBadge from './EmotionBadge';

interface ResultsDashboardProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
}

export default function ResultsDashboard({ result, isAnalyzing }: ResultsDashboardProps) {
  return (
    <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">ANALYSIS RESULTS</h2>

      {!result && !isAnalyzing && (
        <div className="flex min-h-96 items-center justify-center rounded-lg bg-gray-50">
          <p className="text-center text-gray-500">
            Upload and analyze an audio file to see results
          </p>
        </div>
      )}

      {isAnalyzing && (
        <div className="flex min-h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            <p className="text-gray-600">Analyzing audio...</p>
          </div>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          {/* Emotion Badge */}
          <EmotionBadge emotion={result.emotion} probability={result.probability} />

          {/* Radar Chart */}
          <div>
            <EmotionRadarChart emotions={result.emotions} dominantEmotion={result.emotion} />
          </div>

          {/* Emotion Bars */}
          <div className="flex flex-col gap-3">
            <EmotionBars emotions={result.emotions} />
          </div>
        </div>
      )}
    </div>
  );
}
