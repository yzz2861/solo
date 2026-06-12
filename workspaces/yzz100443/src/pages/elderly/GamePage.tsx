import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { elderlyApi } from '../../services/api';
import { FRAUD_TYPE_LABELS } from '../../../shared/types';

interface Dialogue {
  id: number;
  speaker: 'scammer' | 'elderly' | 'system';
  content: string;
  delay?: number;
}

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: {
    title: string;
    content: string;
    explanation: string;
  };
}

interface CaseData {
  id: number;
  title: string;
  fraudType: string;
  description: string;
  difficulty: number;
  dialogues: Dialogue[];
  options: Option[];
  warningPoints: string[];
}

export default function GamePage() {
  const navigate = useNavigate();
  const [currentCase, setCurrentCase] = useState<CaseData | null>(null);
  const [displayedDialogues, setDisplayedDialogues] = useState<Dialogue[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [finished, setFinished] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const dialogTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (dialogTimerRef.current) {
        clearTimeout(dialogTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const elderlyId = localStorage.getItem('elderlyId');
    if (!elderlyId) {
      navigate('/elderly/login');
      return;
    }
    if (!loadingRef.current) {
      loadingRef.current = true;
      loadNextCase();
    }
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedDialogues, showOptions]);

  const loadNextCase = async () => {
    setLoading(true);
    setShowOptions(false);
    setSelectedOption(null);
    setShowFeedback(false);
    setDisplayedDialogues([]);

    try {
      const result = await elderlyApi.getNextCase();
      if (!result.case) {
        setFinished(true);
        setLoading(false);
        return;
      }

      setCurrentCase(result.case);
      playDialogues(result.case.dialogues);
    } catch (err) {
      console.error('加载案例失败:', err);
      alert('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const playDialogues = (dialogues: Dialogue[]) => {
    let index = 0;

    if (dialogTimerRef.current) {
      clearTimeout(dialogTimerRef.current);
    }

    const showNext = () => {
      if (index >= dialogues.length) {
        setShowOptions(true);
        return;
      }

      const dialogue = dialogues[index];
      setDisplayedDialogues((prev) => [...prev, dialogue]);
      index++;

      const delay = dialogue.delay || 1500;
      dialogTimerRef.current = window.setTimeout(showNext, delay);
    };

    dialogTimerRef.current = window.setTimeout(showNext, 500);
  };

  const handleSelectOption = async (option: Option) => {
    if (selectedOption) return;

    setSelectedOption(option);
    setShowFeedback(true);
    setTotalAnswered((prev) => prev + 1);

    if (option.isCorrect) {
      setTotalCorrect((prev) => prev + 1);
    }

    try {
      const result = await elderlyApi.submitAnswer({
        caseId: currentCase!.id,
        dialogueIndex: displayedDialogues.length - 1,
        isCorrect: option.isCorrect,
        selectedOption: option.text,
        fraudType: currentCase!.fraudType,
      });

      setConsecutiveCorrect(result.newConsecutiveCorrect);
      setCurrentDifficulty(result.newDifficulty);
    } catch (err) {
      console.error('提交答案失败:', err);
    }
  };

  const handleContinue = () => {
    if (selectedOption?.isCorrect) {
      loadNextCase();
    } else {
      setShowFeedback(false);
      setSelectedOption(null);
      setShowOptions(true);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl text-gray-600">加载中...</div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">恭喜您！</h1>
          <p className="text-2xl text-gray-600 mb-8">您已经完成了所有案例学习</p>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-8">
            <div className="text-5xl font-bold text-green-600 mb-2">
              {totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}%
            </div>
            <div className="text-xl text-green-700">正确率</div>
            <div className="mt-4 text-lg text-gray-600">
              共答对 {totalCorrect} 题 / {totalAnswered} 题
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/elderly/home')}
              className="w-full h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-2xl font-bold rounded-2xl shadow-lg"
            >
              返回首页
            </button>
          </div>

          <p className="text-gray-400 mt-8 text-lg">
            您的进度已保存，下次可以继续复习
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/elderly/home')}
            className="flex items-center gap-2 text-xl hover:bg-white/20 px-4 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
            <span>返回</span>
          </button>
          
          <div className="text-center">
            <div className="text-lg font-bold">
              {currentCase && FRAUD_TYPE_LABELS[currentCase.fraudType as keyof typeof FRAUD_TYPE_LABELS]}
            </div>
            <div className="text-sm opacity-90">
              难度 {currentDifficulty} · 连续答对 {consecutiveCorrect}
            </div>
          </div>
          
          <div className="w-20" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {currentCase && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-6 h-6 text-amber-600" />
                <span className="text-xl font-bold text-amber-800">
                  场景：{currentCase.title}
                </span>
              </div>
              <p className="text-lg text-amber-700">{currentCase.description}</p>
            </div>
          )}

          {displayedDialogues.map((dialogue, index) => (
            <div
              key={index}
              className={`flex ${
                dialogue.speaker === 'scammer' ? 'justify-start' :
                dialogue.speaker === 'system' ? 'justify-center' : 'justify-end'
              }`}
            >
              {dialogue.speaker === 'system' ? (
                <div className="bg-gray-300 text-gray-700 px-5 py-3 rounded-xl text-lg max-w-[90%]">
                  {dialogue.content}
                </div>
              ) : (
                <div
                  className={`max-w-[80%] px-6 py-4 rounded-3xl shadow-md flex items-start gap-3 ${
                    dialogue.speaker === 'scammer'
                      ? 'bg-white text-gray-800 rounded-tl-none'
                      : 'bg-green-500 text-white rounded-tr-none'
                  }`}
                >
                  <p className="text-xl leading-relaxed">{dialogue.content}</p>
                  <button
                    onClick={() => speak(dialogue.content)}
                    className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                      dialogue.speaker === 'scammer'
                        ? 'hover:bg-gray-100 text-gray-500'
                        : 'hover:bg-white/20 text-white/80'
                    }`}
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {showOptions && !showFeedback && (
            <div className="pt-4 space-y-4 animate-fade-in">
              <p className="text-center text-xl text-gray-600 font-bold mb-6">
                🤔 您会怎么做？请选择：
              </p>
              {currentCase?.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  className="w-full p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all text-left hover:-translate-y-1 border-2 border-transparent hover:border-orange-300 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 group-hover:scale-110 transition-transform">
                      {option.id.toUpperCase()}
                    </div>
                    <p className="text-2xl text-gray-800 leading-relaxed">
                      {option.text}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showFeedback && selectedOption && (
            <div
              className={`mt-6 p-8 rounded-3xl shadow-xl ${
                selectedOption.isCorrect
                  ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-4 border-green-300'
                  : 'bg-gradient-to-br from-amber-50 to-yellow-100 border-4 border-amber-300'
              }`}
            >
              <div className="flex items-center gap-4 mb-6">
                {selectedOption.isCorrect ? (
                  <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-amber-600 flex-shrink-0" />
                )}
                <h2
                  className={`text-3xl font-bold ${
                    selectedOption.isCorrect ? 'text-green-700' : 'text-amber-700'
                  }`}
                >
                  {selectedOption.feedback.title}
                </h2>
              </div>

              <p
                className={`text-2xl mb-6 ${
                  selectedOption.isCorrect ? 'text-green-700' : 'text-amber-700'
                }`}
              >
                {selectedOption.feedback.content}
              </p>

              <div
                className={`p-6 rounded-2xl ${
                  selectedOption.isCorrect ? 'bg-green-100/50' : 'bg-amber-100/50'
                }`}
              >
                <p
                  className={`text-xl whitespace-pre-line leading-relaxed ${
                    selectedOption.isCorrect ? 'text-green-800' : 'text-amber-800'
                  }`}
                >
                  {selectedOption.feedback.explanation}
                </p>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => speak(selectedOption.feedback.explanation)}
                  className="flex-1 h-14 bg-white text-gray-700 text-xl font-semibold rounded-xl shadow hover:shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-6 h-6" />
                  朗读一遍
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-[2] h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {selectedOption.isCorrect ? '继续下一题' : '再试一次'}
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
