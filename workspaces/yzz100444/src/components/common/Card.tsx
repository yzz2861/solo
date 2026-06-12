import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'risk' | 'pinned';
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  onClick,
}) => {
  const variantClasses = {
    default: 'bg-white border-neutral-200 hover:border-primary-300 hover:shadow-md',
    risk: 'bg-warning-50/50 border-warning-300 hover:border-warning-400 hover:shadow-md',
    pinned: 'bg-primary-50/50 border-primary-300 hover:border-primary-400 hover:shadow-md',
  };

  return (
    <div
      className={`rounded-xl border shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer' : ''
      } ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
