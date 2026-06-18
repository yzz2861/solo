import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  maxStars?: number;
  size?: number;
  readOnly?: boolean;
  label: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  maxStars = 5,
  size = 28,
  readOnly = false,
  label,
}) => {
  const [hoverValue, setHoverValue] = React.useState(0);

  const handleClick = (starValue: number) => {
    if (!readOnly && onChange) {
      onChange(starValue);
    }
  };

  const getEmoji = () => {
    if (value >= 4.5) return '😍';
    if (value >= 3.5) return '😊';
    if (value >= 2.5) return '😐';
    if (value >= 1.5) return '😕';
    return '😫';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-chocolate-700">{label}</label>
        {value > 0 && (
          <span className="text-2xl" role="img" aria-label="rating">
            {getEmoji()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((starValue) => {
          const isFilled = starValue <= (hoverValue || value);
          return (
            <button
              key={starValue}
              type="button"
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => !readOnly && setHoverValue(starValue)}
              onMouseLeave={() => !readOnly && setHoverValue(0)}
              disabled={readOnly}
              className={`p-1 transition-all duration-200 ${
                !readOnly ? 'cursor-pointer hover:scale-110' : 'cursor-default'
              }`}
            >
              <Star
                size={size}
                fill={isFilled ? '#FFB6C1' : 'none'}
                stroke={isFilled ? '#FFB6C1' : '#D7CCC8'}
                strokeWidth={2}
              />
            </button>
          );
        })}
        {!readOnly && (
          <span className="ml-2 text-lg font-bold text-chocolate-700">
            {value > 0 ? value.toFixed(1) : '-'}
          </span>
        )}
      </div>
    </div>
  );
};

export default StarRating;
