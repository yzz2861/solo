import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  id?: string;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  titleExtra?: React.ReactNode;
  animationDelay?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const accentBorder: Record<string, string> = {
  primary: 'border-l-accent-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
  info: 'border-l-info',
};

export const Card: React.FC<CardProps> = ({
  id,
  title,
  icon,
  children,
  footer,
  className = '',
  titleExtra,
  animationDelay = 0,
  collapsible = false,
  defaultCollapsed = false,
  accent,
}) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const contentVariants = {
    open: { height: 'auto', opacity: 1, overflow: 'visible' },
    collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  };

  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: animationDelay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card relative overflow-hidden border-l-[3px] ${
        accent ? accentBorder[accent] : 'border-l-accent-primary'
      } ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent pointer-events-none" />

      {(title || icon || titleExtra || collapsible) && (
        <header
          className={`flex items-center justify-between px-5 py-4 border-b border-custom ${
            collapsible ? 'cursor-pointer select-none' : ''
          }`}
          onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
        >
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-accent-primary/25 to-accent-secondary/25 border border-accent-primary/30 flex items-center justify-center text-lg shadow-glow/50">
                {icon}
              </div>
            )}
            {title && (
              <h2 className="font-mono font-semibold text-[15px] tracking-wide text-text-primary flex items-center gap-2 min-w-0">
                {title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {titleExtra}
            {collapsible && (
              <motion.span
                animate={{ rotate: collapsed ? -90 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-text-muted"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </motion.span>
            )}
          </div>
        </header>
      )}

      {collapsible ? (
        <motion.div
          initial={defaultCollapsed ? 'collapsed' : 'open'}
          animate={collapsed ? 'collapsed' : 'open'}
          variants={contentVariants}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="p-5">{children}</div>
        </motion.div>
      ) : (
        <div className="p-5">{children}</div>
      )}

      {footer && (
        <footer className="px-5 py-3 border-t border-custom bg-black/15 text-text-secondary text-sm">
          {footer}
        </footer>
      )}
    </motion.section>
  );
};
