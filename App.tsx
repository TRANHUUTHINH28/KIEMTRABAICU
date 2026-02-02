
import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCw, 
  HelpCircle, 
  ChevronRight, 
  Trophy,
  CheckCircle2,
  XCircle,
  Ghost,
  GraduationCap,
  Loader2,
  Star,
  Gift,
  Flame,
  Maximize,
  Minimize,
  Home,
  Volume2,
  VolumeX,
  Play,
  Music
} from 'lucide-react';
import katex from 'katex';
import { Student, Question, AppState, Grade } from './types';
import { fetchGradeData } from './services/dataService';
import MagneticCage from './components/MagneticCage';

const GAS_URL = "https://script.google.com/macros/s/AKfycbw3ivwPabdtIEiOHMkMq_GA3JpHbCODYQDzwnZ3rOqGKYYV9kG6lcZciGM4pfA31bSw/exec"; 

const SOUND_URLS = {
  BGM: 'https://cdn.pixabay.com/audio/2024/01/15/audio_732d847844.mp3',
  SUCCESS: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  FAIL: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  REVEAL: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  SPIN: 'https://assets.mixkit.co/active_storage/sfx/134/134-preview.mp3'
};

const FAIL_MESSAGES = [
  "Mất lộc rồi sếp ơi!", "Toang rồi, lì xì bay mất tiêu!", "Xu cà na đầu năm luôn!",
  "Cái này là tại... chưa ăn bánh chưng!", "Ối dồi ôi, kiến thức đã bay theo pháo!",
  "Quả này là mất bánh chưng nhân thịt rồi!", "Hết cứu! Đưa lì xì đây trả lại nào!"
];

const SUCCESS_MESSAGES = [
  "Lộc lá đầy mình luôn em ơi!", "Khai xuân đại cát! Quá giỏi!", "Đỉnh nóc kịch trần, lì xì đầy túi!",
  "Out trình thực sự, bậc thầy Lý học!", "Mãi đỉnh! Năm mới thắng lợi mới!",
  "Quá tuyệt vời! Nhận ngay một tràng pháo tay!", "Bính Ngọ hóa rồng là đây chứ đâu!"
];

// Helper để nhận diện URL ảnh
const isUrl = (text: string) => {
  if (!text) return false;
  return text.startsWith('http') || text.startsWith('https');
};

const MathText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const parts = text.split('$');
  return (
    <span>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          try {
            return (
              <span
                key={i}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(part, { throwOnError: false, displayMode: false })
                }}
              />
            );
          } catch (e) {
            return <span key={i} className="text-red-500">${part}$</span>;
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.SELECT_GRADE);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [usedStudentIds, setUsedStudentIds] = useState<number[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const audios = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    audios.current = {
      bgm: new Audio(SOUND_URLS.BGM),
      success: new Audio(SOUND_URLS.SUCCESS),
      fail: new Audio(SOUND_URLS.FAIL),
      reveal: new Audio(SOUND_URLS.REVEAL),
      spin: new Audio(SOUND_URLS.SPIN),
    };
    audios.current.bgm.loop = true;
    audios.current.bgm.volume = 0.25;
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      Object.values(audios.current).forEach(a => {
        a.pause();
        a.src = '';
      });
    };
  }, []);

  useEffect(() => {
    Object.values(audios.current).forEach(a => {
      a.muted = isMuted;
    });
  }, [isMuted]);

  const handleStartApp = () => {
    const unlockPromises = Object.values(audios.current).map(audio => {
      return audio.play().then(() => {
        if (audio !== audios.current.bgm) {
          audio.pause();
          audio.currentTime = 0;
        }
      }).catch(err => console.warn("Unlock failed for audio", err));
    });
    Promise.all(unlockPromises).then(() => {
      setAudioUnlocked(true);
      if (!isMuted) {
        audios.current.bgm.play().catch(e => console.error("BGM failed", e));
      }
    });
  };

  const playEffect = (key: 'success' | 'fail' | 'reveal' | 'spin') => {
    const audio = audios.current[key];
    if (audio && audioUnlocked) {
      if (key === 'spin') if (audios.current.bgm) audios.current.bgm.volume = 0.1;
      audio.currentTime = 0;
      audio.volume = key === 'spin' ? 0.9 : 0.7;
      audio.play().catch(e => console.warn(`Play ${key} failed`, e));
    }
  };

  const stopEffect = (key: 'spin') => {
    const audio = audios.current[key];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      if (audios.current.bgm) audios.current.bgm.volume = 0.25;
    }
  };

  const resetApp = () => {
    setState(AppState.SELECT_GRADE);
    setSelectedGrade(null);
    setStudents([]);
    setQuestions([]);
    setUsedStudentIds([]);
    setUsedQuestionIds([]);
    setSelectedStudent(null);
    setCurrentQuestion(null);
    setUserAnswer(null);
    setError(null);
  };

  const loadGradeData = async (grade: Grade) => {
    setState(AppState.LOADING);
    setSelectedGrade(grade);
    setError(null);
    try {
      const data = await fetchGradeData(GAS_URL, grade);
      setStudents(data.students);
      setQuestions(data.questions);
      setUsedQuestionIds([]);
      setState(AppState.READY);
    } catch (err: any) {
      setError(err.message);
      setState(AppState.SELECT_GRADE);
    }
  };

  const startSpin = () => {
    const availableStudents = students.filter(s => !usedStudentIds.includes(s.id));
    if (availableStudents.length === 0) {
      setError('Hết sĩ tử rồi sếp ơi!');
      return;
    }
    setState(AppState.SPINNING);
    playEffect('spin');
    setError(null);
    setTimeout(() => {
      stopEffect('spin');
      const randomIndex = Math.floor(Math.random() * availableStudents.length);
      const winner = availableStudents[randomIndex];
      setSelectedStudent(winner);
      setUsedStudentIds(prev => [...prev, winner.id]);
      setState(AppState.REVEALED);
      playEffect('reveal');
    }, 4500);
  };

  const showQuestion = () => {
    const nextQuestion = questions.find(q => !usedQuestionIds.includes(q.id));
    if (!nextQuestion) {
      setError('Đã hoàn thành tất cả câu hỏi trong danh sách!');
      return;
    }
    setCurrentQuestion(nextQuestion);
    setUsedQuestionIds(prev => [...prev, nextQuestion.id]);
    setUserAnswer(null);
    setImgError(false);
    setState(AppState.QUESTION);
  };

  const submitAnswer = (idx: number) => {
    setUserAnswer(idx);
    const isCorrect = currentQuestion && idx === currentQuestion.correctAnswer;
    if (isCorrect) playEffect('success');
    else playEffect('fail');
    const msgs = isCorrect ? SUCCESS_MESSAGES : FAIL_MESSAGES;
    setFeedbackMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    setState(AppState.ANSWERED);
  };

  const nextTurn = () => {
    setSelectedStudent(null);
    setCurrentQuestion(null);
    setState(AppState.READY);
  };

  return (
    <div className="min-h-screen tet-gradient flex text-amber-50 font-['Plus_Jakarta_Sans'] overflow-hidden relative">
      <aside className="w-20 md:w-64 bg-red-950/70 backdrop-blur-xl border-r-4 border-black flex flex-col p-4 z-50">
        <div className="flex items-center gap-3 bg-yellow-400 text-red-700 px-3 py-2 genz-border -rotate-2 mb-10 hidden md:flex">
          <Gift className="animate-bounce" />
          <h1 className="font-black text-lg tracking-tighter uppercase">LỘC XUÂN 2026</h1>
        </div>
        <div className="flex flex-col gap-4">
          <button onClick={resetApp} className="flex items-center gap-4 p-4 rounded-xl genz-border bg-red-600 text-yellow-400 hover:bg-red-700 transition-all mb-4 group">
            <Home className="group-hover:scale-125 transition-transform" />
            <span className="font-black text-lg hidden md:block">TRANG CHỦ</span>
          </button>
          <div className="h-1 bg-yellow-400/20 my-2 rounded-full hidden md:block"></div>
          {(['10', '11', '12'] as Grade[]).map((g) => (
            <button key={g} onClick={() => loadGradeData(g)} disabled={state === AppState.LOADING || !audioUnlocked}
              className={`group relative flex items-center gap-4 p-4 rounded-xl genz-border transition-all
                ${selectedGrade === g ? 'bg-yellow-400 text-red-700 translate-x-2' : 'bg-red-900/50 hover:bg-red-800 text-amber-100'}
                ${!audioUnlocked ? 'opacity-50 cursor-not-allowed' : ''}
              `}>
              <GraduationCap className={selectedGrade === g ? 'text-red-700' : 'text-yellow-400'} />
              <span className="font-black text-xl hidden md:block">KHỐI {g}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col items-center gap-4">
          <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full transition-all shadow-lg ${isMuted ? 'bg-red-600 text-white' : 'bg-yellow-400 text-red-700'}`}>
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} className="animate-pulse" />}
          </button>
          <div className="hidden md:block p-4 bg-yellow-400/10 rounded-xl border border-yellow-500/30 text-[10px] font-bold italic text-yellow-200 text-center">Chúc mừng năm mới Bính Ngọ! 🧧</div>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col items-center p-4 md:p-8 overflow-y-auto overflow-x-hidden">
        <button onClick={() => !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen()}
          className="absolute top-6 right-6 z-[60] p-3 bg-yellow-400 text-red-700 genz-border hover:scale-110 active:scale-95 transition-all shadow-[4px_4px_0px_#000]">
          {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
        </button>

        {!audioUnlocked ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl animate-[scaleIn_0.5s_ease-out]">
            <div className="w-40 h-40 bg-yellow-400 rounded-full flex items-center justify-center genz-border mb-8 animate-bounce">
              <Flame size={80} className="text-red-600 fill-red-600" />
            </div>
            <h2 className="text-4xl md:text-7xl font-black mb-6 uppercase italic tracking-tight text-yellow-400 drop-shadow-[0_5px_0_#000]">MAGNOSPIN 2026</h2>
            <p className="text-amber-200 font-bold text-xl mb-10">Chào mừng bạn đến với hội xuân Vật Lý!</p>
            <button onClick={handleStartApp} className="group flex flex-col items-center gap-6 bg-red-600 text-yellow-400 p-12 genz-border hover:scale-105 transition-all shadow-[15px_15px_0px_#000]">
              <div className="bg-yellow-400 text-red-600 p-8 rounded-full group-hover:animate-ping"><Play size={64} fill="currentColor" /></div>
              <span className="font-black text-4xl uppercase tracking-tighter">NHẤN ĐỂ BẮT ĐẦU</span>
            </button>
          </div>
        ) : (
          <>
            {(state === AppState.SELECT_GRADE) && (
              <div className="flex flex-col items-center justify-center h-full text-center animate-[scaleIn_0.5s_ease-out]">
                <div className="p-12 bg-white/10 backdrop-blur-sm rounded-3xl border-4 border-dashed border-yellow-500/50 animate-pulse">
                  <Star className="text-yellow-400 mx-auto mb-6" size={64} />
                  <h2 className="text-3xl font-black text-yellow-400 uppercase tracking-widest mb-4">SẴN SÀNG KHAI XUÂN</h2>
                  <p className="text-amber-100 font-bold text-lg">Vui lòng chọn khối lớp ở thanh bên trái</p>
                </div>
                {error && <p className="mt-6 text-red-400 font-black bg-black/60 px-6 py-3 rounded-xl border-2 border-red-500">{error}</p>}
              </div>
            )}

            {state === AppState.LOADING && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 size={80} className="animate-spin text-yellow-400" />
                <p className="font-black text-2xl animate-pulse uppercase text-yellow-400">Đang chuẩn bị lì xì kiến thức...</p>
              </div>
            )}

            {(state === AppState.READY || state === AppState.SPINNING || state === AppState.REVEALED) && (
              <div className="flex flex-col items-center gap-10 w-full animate-[scaleIn_0.3s_ease-out] mt-10">
                <div className="relative">
                  <MagneticCage isSpinning={state === AppState.SPINNING} ballCount={students.length - usedStudentIds.length} />
                  <div className="absolute -right-24 top-0 bg-yellow-400 text-red-700 font-black p-4 genz-border rotate-12 hidden lg:block text-xl">
                    KHỐI {selectedGrade}<br/>CÒN LẠI: {students.length - usedStudentIds.length}
                  </div>
                </div>
                {state === AppState.READY && (
                  <button onClick={startSpin} className="bg-red-600 text-yellow-400 font-black text-4xl px-20 py-10 uppercase genz-border hover:-translate-y-2 hover:shadow-[10px_10px_0px_#facc15] transition-all flex items-center gap-6">
                    QUAY LỘC <RotateCw size={48} className="animate-spin-slow" />
                  </button>
                )}
                {state === AppState.REVEALED && selectedStudent && (
                  <div className="flex flex-col items-center gap-8 animate-[scaleIn_0.4s_ease-out]">
                    <div className="bg-white p-12 genz-border -rotate-2 shadow-[20px_20px_0px_#facc15]">
                       <p className="text-red-600 font-black text-xl uppercase mb-4 tracking-widest text-center">Chúc mừng sĩ tử:</p>
                       <div className="text-black text-6xl md:text-9xl font-black text-center">{selectedStudent.name}</div>
                    </div>
                    <button onClick={showQuestion} className="bg-yellow-500 text-red-900 font-black text-3xl px-16 py-8 uppercase genz-border flex items-center gap-4 hover:scale-110 transition-all">
                      NHẬN QUẺ CÂU HỎI <HelpCircle size={40} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {(state === AppState.QUESTION || state === AppState.ANSWERED) && currentQuestion && (
              <div className={`w-[95%] max-w-[1400px] bg-white text-black p-10 md:p-16 genz-border relative shadow-[30px_30px_0px_#facc15] my-10 ${state === AppState.ANSWERED && userAnswer !== currentQuestion.correctAnswer ? 'animate-shake-strong' : 'animate-[scaleIn_0.3s_ease-out]'}`}>
                <div className="absolute -top-10 -left-6 bg-red-600 text-yellow-400 p-6 genz-border font-black -rotate-2 z-20 text-3xl shadow-[5px_5px_0px_#000]">🧧 THỬ THÁCH ĐẦU XUÂN</div>
                
                <div className="flex flex-col items-center gap-12 mt-4">
                  {currentQuestion.image && !imgError && (
                    <div className="flex justify-center w-full">
                      <div className="genz-border bg-slate-50 p-4 w-full max-w-[900px]">
                        <img src={currentQuestion.image} alt="Q" className="w-full max-h-[450px] object-contain rounded-xl" onError={() => setImgError(true)} />
                      </div>
                    </div>
                  )}

                  <h3 className="text-4xl md:text-6xl font-black leading-[1.2] text-center text-red-800 w-full mb-8">
                    <MathText text={currentQuestion.content} />
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    {currentQuestion.options.map((opt, idx) => {
                      const isCorrect = idx === currentQuestion.correctAnswer;
                      const isSelected = userAnswer === idx;
                      const isOptImage = isUrl(opt);
                      
                      let btnClass = "text-left p-8 font-black text-2xl md:text-4xl genz-border transition-all flex items-center justify-between min-h-[140px] ";
                      if (state === AppState.ANSWERED) {
                        if (isCorrect) btnClass += "bg-green-400 border-black translate-y-3 scale-105 z-10 shadow-[8px_8px_0px_#000] ";
                        else if (isSelected) btnClass += "bg-red-400 border-black translate-y-3 shadow-[8px_8px_0px_#000] ";
                        else btnClass += "bg-slate-100 opacity-30 ";
                      } else {
                        btnClass += "bg-white hover:bg-yellow-50 hover:-translate-y-3 hover:shadow-[12px_12px_0px_#000] ";
                      }

                      return (
                        <button key={idx} disabled={state === AppState.ANSWERED} onClick={() => submitAnswer(idx)} className={btnClass}>
                          <div className="flex gap-6 items-center w-full">
                            <span className="text-red-600 font-black px-4 py-1 bg-red-50 rounded-lg border-2 border-red-600/20 flex-shrink-0 self-start mt-2">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <div className="flex-1 flex justify-center overflow-hidden">
                              {isOptImage ? (
                                <img src={opt} alt={`Option ${idx}`} className="max-h-[200px] w-auto object-contain rounded-lg" />
                              ) : (
                                <span className="w-full"><MathText text={opt} /></span>
                              )}
                            </div>
                          </div>
                          {state === AppState.ANSWERED && (
                            <div className="flex-shrink-0 ml-4">
                               {isCorrect ? <CheckCircle2 className="text-black" size={48} /> : (isSelected ? <XCircle className="text-black" size={48} /> : null)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {state === AppState.ANSWERED && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-12 border-t-[10px] border-red-600 pt-12 mt-12">
                    <div className="flex items-center gap-10">
                      <div className={`p-8 rounded-[40px] genz-border shadow-[8px_8px_0px_#000] ${userAnswer === currentQuestion.correctAnswer ? 'bg-yellow-400 animate-bounce' : 'bg-red-400 animate-shake'}`}>
                        {userAnswer === currentQuestion.correctAnswer ? <Trophy size={72} className="text-red-700" /> : <Ghost size={72} />}
                      </div>
                      <div className="max-w-xl">
                        <p className={`font-black text-4xl md:text-6xl uppercase italic leading-tight mb-4 ${userAnswer === currentQuestion.correctAnswer ? 'text-yellow-600' : 'text-red-600'}`}>
                          {feedbackMsg}
                        </p>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xl">ĐÁP ÁN ĐÚNG LÀ: <span className="text-black font-black text-5xl ml-4 bg-yellow-200 px-4 py-1 rounded-xl">{String.fromCharCode(65 + currentQuestion.correctAnswer)}</span></p>
                      </div>
                    </div>
                    <button onClick={nextTurn} className="w-full md:w-auto bg-red-600 text-yellow-400 font-black text-4xl px-20 py-10 uppercase genz-border flex items-center justify-center gap-6 hover:bg-red-700 hover:scale-105 transition-all shadow-[12px_12px_0px_#000]">
                      TIẾP TỤC <ChevronRight size={48} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        @keyframes shake-strong { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-15px); } 20%, 40%, 60%, 80% { transform: translateX(15px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 2; }
        .animate-shake-strong { animation: shake-strong 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        .animate-spin-slow { animation: spin 4s linear infinite; }
      `}</style>
    </div>
  );
};

export default App;
