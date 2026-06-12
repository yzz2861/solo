import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating = ({ value, onChange, readOnly = false, size = 'md' }: StarRatingProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const handleClick = (rating: number) => {
    if (!readOnly && onChange) {
      onChange(rating);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={readOnly}
          className={`transition-all duration-200 ${
            !readOnly ? 'cursor-pointer hover:scale-110' : 'cursor-default'
          }`}
        >
          <Star
            className={`${sizeClasses[size]} transition-colors duration-200 ${
              star <= value
                ? 'fill-gold-500 text-gold-500'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
      {readOnly && (
        <span className="ml-2 text-sm text-charcoal/70">{value}/5</span>
      )}
    </div>
  );
};
