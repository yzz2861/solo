import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  stars: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  stars,
  maxStars = 3,
  size = 'md',
  animated = true,
}) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }).map((_, i) => {
        const isFilled = i < stars;
        return (
          <div
            key={i}
            className={`transition-all duration-300 ${
              animated && isFilled ? 'animate-bounce' : ''
            }`}
            style={{
              animationDelay: animated ? `${i * 0.15}s` : '0s',
            }}
          >
            <Star
              className={`${sizeMap[size]} ${
                isFilled
                  ? 'text-sunshine-400 fill-sunshine-400 drop-shadow-md'
                  : 'text-gray-300'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;
