import { useState } from 'react';
import { Droplets, Sun, Leaf, Award, ChevronRight, ChevronLeft } from 'lucide-react';

interface WelcomeGuideProps {
  onClose: () => void;
}

const slides = [
  {
    icon: Droplets,
    title: '欢迎来到园艺浇水节奏赛！',
    desc: '在这里，你将学习如何正确照顾不同的植物。记住，不是水越多越好哦～',
    color: 'from-blue-400 to-cyan-400',
  },
  {
    icon: Sun,
    title: '观察天气和季节',
    desc: '晴天温度高，水分蒸发快；雨天空气潮湿，不用浇水。不同季节植物需求也不同。',
    color: 'from-amber-400 to-orange-400',
  },
  {
    icon: Leaf,
    title: '查看植物状态',
    desc: '点击植物可以查看叶片和根系的状态。叶片蔫了可能是缺水，根系发黑可能是烂根了。',
    color: 'from-green-400 to-emerald-500',
  },
  {
    icon: Award,
    title: '收集徽章，成为园艺达人',
    desc: '正确照顾植物可以获得徽章！看看你最擅长照顾哪种植物吧～',
    color: 'from-purple-400 to-pink-400',
  },
];

export default function WelcomeGuide({ onClose }: WelcomeGuideProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="animate-scale-in w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className={`bg-gradient-to-br ${slide.color} p-8 text-center text-white`}>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Icon size={40} />
          </div>
          <h2 className="font-display text-2xl font-bold">{slide.title}</h2>
        </div>

        <div className="p-6">
          <p className="text-center text-gray-600 leading-relaxed">{slide.desc}</p>
        </div>

        <div className="px-6 pb-6">
          <div className="mb-4 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === currentSlide ? 'w-6 bg-[#4A7C59]' : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentSlide > 0 && (
              <button
                onClick={prevSlide}
                className="flex flex-1 items-center justify-center gap-1 rounded-2xl border-2 border-[#4A7C59]/20 py-3 font-bold text-[#4A7C59] transition-all hover:bg-[#4A7C59]/5 active:scale-95"
              >
                <ChevronLeft size={18} />
                上一步
              </button>
            )}
            <button
              onClick={nextSlide}
              className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-[#4A7C59] to-[#6BA37A] py-3 font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
            >
              {currentSlide === slides.length - 1 ? '开始游戏' : '下一步'}
              <ChevronRight size={18} />
            </button>
          </div>

          {currentSlide < slides.length - 1 && (
            <button
              onClick={onClose}
              className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              跳过引导
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
