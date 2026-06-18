import { Author, Work, PhotoFile, FilterOptions } from './types';
import { parseAspectRatio } from './utils';

export interface FilteredResult {
  author: Author;
  works: FilteredWork[];
  totalPhotos: number;
  matchedPhotos: number;
}

export interface FilteredWork {
  work: Work;
  photos: PhotoFile[];
}

export function filterByDimensions(
  authors: Author[],
  options: FilterOptions
): FilteredResult[] {
  const results: FilteredResult[] = [];

  for (const author of authors) {
    const filteredWorks: FilteredWork[] = [];
    let totalPhotos = 0;
    let matchedPhotos = 0;

    for (const work of author.works) {
      const matchingPhotos = work.photos.filter(photo => 
        matchesFilter(photo, options)
      );

      totalPhotos += work.photos.length;
      matchedPhotos += matchingPhotos.length;

      if (matchingPhotos.length > 0) {
        filteredWorks.push({
          work,
          photos: matchingPhotos
        });
      }
    }

    if (filteredWorks.length > 0) {
      results.push({
        author,
        works: filteredWorks,
        totalPhotos,
        matchedPhotos
      });
    }
  }

  return results;
}

function matchesFilter(photo: PhotoFile, options: FilterOptions): boolean {
  const { width, height, megapixels } = photo.metadata;

  if (options.minWidth !== undefined && width < options.minWidth) {
    return false;
  }

  if (options.maxWidth !== undefined && width > options.maxWidth) {
    return false;
  }

  if (options.minHeight !== undefined && height < options.minHeight) {
    return false;
  }

  if (options.maxHeight !== undefined && height > options.maxHeight) {
    return false;
  }

  if (options.minMegapixels !== undefined && megapixels < options.minMegapixels) {
    return false;
  }

  if (options.orientation) {
    const orientation = getOrientation(width, height);
    if (orientation !== options.orientation) {
      return false;
    }
  }

  if (options.aspectRatio) {
    const ratio = parseAspectRatio(options.aspectRatio);
    if (ratio) {
      const photoRatio = width / height;
      const targetRatio = ratio.width / ratio.height;
      const tolerance = 0.05;
      if (Math.abs(photoRatio - targetRatio) > tolerance) {
        return false;
      }
    }
  }

  return true;
}

function getOrientation(width: number, height: number): 'landscape' | 'portrait' | 'square' {
  if (width > height) return 'landscape';
  if (height > width) return 'portrait';
  return 'square';
}

export function calculateSizeDistribution(authors: Author[]): {
  byMegapixels: { range: string; count: number }[];
  byOrientation: { landscape: number; portrait: number; square: number };
  byResolution: { range: string; count: number }[];
} {
  const allPhotos: PhotoFile[] = [];

  for (const author of authors) {
    for (const work of author.works) {
      allPhotos.push(...work.photos);
    }
  }

  const byMegapixels = [
    { range: '< 2MP', count: 0 },
    { range: '2-5MP', count: 0 },
    { range: '5-10MP', count: 0 },
    { range: '10-20MP', count: 0 },
    { range: '20-40MP', count: 0 },
    { range: '> 40MP', count: 0 }
  ];

  const byOrientation = { landscape: 0, portrait: 0, square: 0 };

  const byResolution = [
    { range: '< 1920x1080', count: 0 },
    { range: '1920x1080 ~ 2K', count: 0 },
    { range: '2K ~ 4K', count: 0 },
    { range: '4K ~ 8K', count: 0 },
    { range: '> 8K', count: 0 }
  ];

  for (const photo of allPhotos) {
    const { width, height, megapixels } = photo.metadata;

    if (megapixels < 2) byMegapixels[0].count++;
    else if (megapixels < 5) byMegapixels[1].count++;
    else if (megapixels < 10) byMegapixels[2].count++;
    else if (megapixels < 20) byMegapixels[3].count++;
    else if (megapixels < 40) byMegapixels[4].count++;
    else byMegapixels[5].count++;

    const orientation = getOrientation(width, height);
    byOrientation[orientation]++;

    const maxDim = Math.max(width, height);
    if (maxDim < 1920) byResolution[0].count++;
    else if (maxDim < 2560) byResolution[1].count++;
    else if (maxDim < 3840) byResolution[2].count++;
    else if (maxDim < 7680) byResolution[3].count++;
    else byResolution[4].count++;
  }

  return { byMegapixels, byOrientation, byResolution };
}

export function getCommonSizes(authors: Author[], limit: number = 10): {
  size: string;
  width: number;
  height: number;
  count: number;
  authors: string[];
}[] {
  const sizeMap = new Map<string, {
    width: number;
    height: number;
    count: number;
    authors: Set<string>;
  }>();

  for (const author of authors) {
    for (const work of author.works) {
      for (const photo of work.photos) {
        const key = `${photo.metadata.width}x${photo.metadata.height}`;
        if (!sizeMap.has(key)) {
          sizeMap.set(key, {
            width: photo.metadata.width,
            height: photo.metadata.height,
            count: 0,
            authors: new Set()
          });
        }
        const entry = sizeMap.get(key)!;
        entry.count++;
        entry.authors.add(author.name);
      }
    }
  }

  return Array.from(sizeMap.entries())
    .map(([size, data]) => ({
      size,
      width: data.width,
      height: data.height,
      count: data.count,
      authors: Array.from(data.authors)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
