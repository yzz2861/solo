import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface FeedbackItem {
  id: string;
  type: 'success' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

interface FeedbackBubbleProps {
  feedback: FeedbackItem;
}

const FeedbackBubble: React.FC<FeedbackBubbleProps> = ({ feedback }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  const getIcon = () => {
    switch (feedback.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getStyles = () => {
    switch (feedback.type) {
      case 'success':
        return 'bg-mint-500 text-white border-mint-600';
      case 'warning':
        return 'bg-sunshine-400 text-amber-900 border-sunshine-500';
      case 'info':
        return 'bg-sky2-500 text-white border-sky2-600';
      default:
        return 'bg-gray-500 text-white border-gray-600';
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 shadow-lg animate-pop ${getStyles()}`}
    >
      {getIcon()}
      <span className="text-sm font-medium whitespace-nowrap">
        {feedback.message}
      </span>
    </div>
  );
};

interface FeedbackBubblesProps {
  feedbacks: FeedbackItem[];
}

const FeedbackBubbles: React.FC<FeedbackBubblesProps> = ({ feedbacks }) => {
  return (
    <div className="flex flex-col items-center gap-2 pointer-events-none">
      {feedbacks.map((feedback, index) => (
        <div
          key={feedback.id}
          style={{
            animationDelay: `${index * 0.1}s`,
            opacity: 1 - index * 0.3,
            transform: `translateY(${index * 8}px) scale(${1 - index * 0.05})`,
          }}
        >
          <FeedbackBubble feedback={feedback} />
        </div>
      ))}
    </div>
  );
};

export default FeedbackBubbles;
