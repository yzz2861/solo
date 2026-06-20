interface StackVisualizationProps {
  layers: number;
  maxSafeLayers: number;
  bottomOverloaded?: boolean;
}

export function StackVisualization({ layers, maxSafeLayers, bottomOverloaded }: StackVisualizationProps) {
  const displayLayers = Math.min(layers, 10);

  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <div className="text-xs text-slate-500 mb-2">堆码示意图</div>
      <div className="flex flex-col-reverse gap-1">
        {Array.from({ length: displayLayers }, (_, i) => {
          const layerNum = layers - i;
          const isBottom = i === 0;
          const isOverSafe = layerNum > maxSafeLayers;
          const isCritical = isBottom && bottomOverloaded;

          let bgClass = 'bg-amber-100 border-amber-300';
          if (isCritical) {
            bgClass = 'bg-red-200 border-red-400 animate-pulse';
          } else if (isOverSafe) {
            bgClass = 'bg-orange-100 border-orange-300';
          } else {
            bgClass = 'bg-emerald-100 border-emerald-300';
          }

          return (
            <div
              key={i}
              className={`relative w-32 h-10 rounded border-2 ${bgClass} flex items-center justify-center text-xs font-medium transition-all duration-300`}
            >
              <span className={isOverSafe ? 'text-orange-700' : 'text-emerald-700'}>
                第 {layerNum} 层
              </span>
              {isBottom && (
                <span className="absolute -right-16 text-xs text-slate-500">
                  底层
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="w-40 h-2 bg-slate-300 rounded-sm mt-1" />
      <div className="text-xs text-slate-400 mt-1">托盘/地面</div>
    </div>
  );
}
