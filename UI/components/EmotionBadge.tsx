'use client';

interface EmotionBadgeProps {
  emotion: string;
  probability: number;
}

const emotionConfig: {
  [key: string]: { bg: string; text: string; icon: string };
} = {
  happy: { bg: 'bg-amber-500', text: 'text-white', icon: '😊' },
  sad: { bg: 'bg-blue-500', text: 'text-white', icon: '😢' },
  angry: { bg: 'bg-red-500', text: 'text-white', icon: '😠' },
  fear: { bg: 'bg-purple-500', text: 'text-white', icon: '😨' },
  disgust: { bg: 'bg-green-600', text: 'text-white', icon: '🤢' },
  surprised: { bg: 'bg-pink-500', text: 'text-white', icon: '😲' },
  neutral: { bg: 'bg-gray-500', text: 'text-white', icon: '😐' },
  calm: { bg: 'bg-teal-500', text: 'text-white', icon: '😌' },
};

export default function EmotionBadge({ emotion, probability }: EmotionBadgeProps) {
  const config = emotionConfig[emotion.toLowerCase()] || emotionConfig.neutral;
  const percentage = Math.round(probability * 100);

  return (
    <div
      className={`rounded-lg ${config.bg} ${config.text} px-6 py-4`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <p className="text-sm font-medium opacity-90">EMOTION</p>
            <p className="text-xl font-bold">{emotion.toUpperCase()}</p>
          </div>
        </div>
        <p className="text-2xl font-bold">{percentage}%</p>
      </div>
    </div>
  );
}
