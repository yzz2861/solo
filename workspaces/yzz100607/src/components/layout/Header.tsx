import { Droplets, FileText } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-blue-900 text-white border-b-4 border-blue-700">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-700">
            <Droplets className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">雨棚排水坡度核算系统</h1>
            <p className="text-blue-300 text-sm">Drainage Slope Calculation System</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-blue-300">
            <FileText className="w-4 h-4" />
            <span>技术交底 · 有据可查</span>
          </div>
        </div>
      </div>
    </header>
  );
}
