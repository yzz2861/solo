import { forwardRef, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff, Loader2 } from 'lucide-react';

export interface ImagePreviewProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: ReactNode;
  loadingIndicator?: ReactNode;
  aspectRatio?: string;
}

export const ImagePreview = forwardRef<HTMLImageElement, ImagePreviewProps>(
  ({ src, alt, fallback, loadingIndicator, aspectRatio = 'aspect-square', className, ...props }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoad = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    return (
      <div
        className={cn(
          'relative w-full overflow-hidden rounded bg-ink-900 border border-ink-700',
          aspectRatio,
          className
        )}
      >
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900">
            {loadingIndicator || (
              <div className="flex flex-col items-center gap-2 text-ink-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            )}
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900">
            {fallback || (
              <div className="flex flex-col items-center gap-2 text-ink-400 p-4 text-center">
                <ImageOff className="w-10 h-10" />
                <span className="text-sm">图片加载失败</span>
              </div>
            )}
          </div>
        )}

        {!hasError && (
          <img
            ref={ref}
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'w-full h-full object-cover',
              'transition-opacity duration-300',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            {...props}
          />
        )}
      </div>
    );
  }
);

ImagePreview.displayName = 'ImagePreview';
