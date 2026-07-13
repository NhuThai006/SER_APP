'use client';

interface EmotionBarsProps {
  emotions: {
    [key: string]: number;
  };
}

const emotionConfig: {
  [key: string]: { barColor: string; textColor: string };
} = {
  happy: { barColor: 'bg-amber-500', textColor: 'text-amber-600' },
  sad: { barColor: 'bg-blue-500', textColor: 'text-blue-600' },
  angry: { barColor: 'bg-red-500', textColor: 'text-red-600' },
  fear: { barColor: 'bg-purple-500', textColor: 'text-purple-600' },
  disgust: { barColor: 'bg-green-600', textColor: 'text-green-700' },
  surprised: { barColor: 'bg-pink-500', textColor: 'text-pink-600' },
  neutral: { barColor: 'bg-gray-400', textColor: 'text-gray-600' },
  calm: { barColor: 'bg-teal-600', textColor: 'text-teal-700' },
};

const emotionOrder = ['happy', 'sad', 'angry', 'fear', 'disgust', 'surprised', 'neutral', 'calm'];

export default function EmotionBars({ emotions }: EmotionBarsProps) {
  const sortedEmotions = emotionOrder
    .map(emotion => ({
      emotion,
      value: emotions[emotion] || 0,
      config: emotionConfig[emotion],
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-3">
      {sortedEmotions.map(({ emotion, value, config }) => {
        const percentage = Math.round(value * 100);
        const displayName = emotion.toUpperCase();

        return (
          <div key={emotion} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">{displayName}</span>
              <span className={`text-xs font-semibold ${config.textColor}`}>
                {percentage}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full ${config.barColor} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
