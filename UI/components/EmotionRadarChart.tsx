'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

interface EmotionRadarChartProps {
  emotions: {
    [key: string]: number;
  };
  dominantEmotion: string;
}

const emotionColors: { [key: string]: string } = {
  happy: '#f59e0b',
  sad: '#3b82f6',
  angry: '#ef4444',
  fear: '#a855f7',
  disgust: '#22c55e',
  surprised: '#ec4899',
  neutral: '#9ca3af',
  calm: '#14b8a6',
};

export default function EmotionRadarChart({
  emotions,
  dominantEmotion,
}: EmotionRadarChartProps) {
  const data = Object.entries(emotions).map(([emotion, value]) => ({
    name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
    value: Math.round(value * 100),
  }));

  const dominantColor =
    emotionColors[dominantEmotion.toLowerCase()] || emotionColors.neutral;

  return (
    <div className="flex justify-center">
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={90}
            orientation="outer"
          />
          <Radar
            name="Emotion Probability"
            dataKey="value"
            stroke={dominantColor}
            fill={dominantColor}
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
