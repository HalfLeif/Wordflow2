
import React, { useState, useEffect, useCallback } from 'react';
import { wordEngine } from './services/wordEngine.ts';
import { LevelData, GameState } from './types.ts';
import LetterWheel from './components/LetterWheel.tsx';
import CrosswordGrid from './components/CrosswordGrid.tsx';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [level, setLevel] = useState<LevelData | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [message, setMessage] = useState("");
  const [score, setScore] = useState(0);
  const [levelNumber, setLevelNumber] = useState(1);
  const [isSkipped, setIsSkipped] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Record<string, number[]>>({});
  const [displayLetters, setDisplayLetters] = useState<string[]>([]);

  useEffect(() => {
    const initGame = async () => {
      try {
        await wordEngine.init();
        loadNewLevel(6);
      } catch (err) {
        console.error("❌ App: Failed to initialize WordEngine:", err);
      }
    };
    initGame();
  }, []);

  const loadNewLevel = (length: number) => {
    const nextLevelData = wordEngine.generateLevel(length);
    setLevel(nextLevelData);
    setDisplayLetters(nextLevelData.displayLetters);
    setRevealedIndices({});
    setGameState(GameState.PLAYING);
    setMessage("");
    setIsSkipped(false);
  };

  const handleWordComplete = (word: string) => {
    if (!level || gameState !== GameState.PLAYING) return;

    if (word.length < 3) {
      if (word.length > 0) showTemporaryMessage("TOO SHORT");
      return;
    }

    if (level.foundWords.has(word)) {
      showTemporaryMessage("ALREADY FOUND");
      return;
    }

    if (level.validWords.includes(word)) {
      const updatedFound = new Set(level.foundWords);
      updatedFound.add(word);
      
      const newLevel = { ...level, foundWords: updatedFound };
      setLevel(newLevel);
      setScore(prev => prev + word.length * 10);
      showTemporaryMessage("AWESOME", true);

      if (updatedFound.size === level.validWords.length) {
        setGameState(GameState.LEVEL_COMPLETE);
      }
    } else {
      if (wordEngine.isValidWord(word)) {
        showTemporaryMessage("EXTRA WORD!");
        setScore(prev => prev + 5);
      } else {
        showTemporaryMessage("NOPE");
      }
    }
  };

  const handleHelp = () => {
    if (!level || score < 25) {
      showTemporaryMessage("NEED 25 SCORE");
      return;
    }

    const hiddenCells: { x: number, y: number }[] = [];
    const visibleCoords = new Set<string>();
    
    level.placedWords.forEach(pw => {
      const isFound = level.foundWords.has(pw.word);
      const hints = revealedIndices[pw.word] || [];
      for (let i = 0; i < pw.word.length; i++) {
        const cx = pw.direction === 'horizontal' ? pw.x + i : pw.x;
        const cy = pw.direction === 'horizontal' ? pw.y : pw.y + i;
        if (isFound || hints.includes(i)) {
          visibleCoords.add(`${cx},${cy}`);
        }
      }
    });

    level.placedWords.forEach(pw => {
      for (let i = 0; i < pw.word.length; i++) {
        const cx = pw.direction === 'horizontal' ? pw.x + i : pw.x;
        const cy = pw.direction === 'horizontal' ? pw.y : pw.y + i;
        const key = `${cx},${cy}`;
        if (!visibleCoords.has(key)) {
          if (!hiddenCells.some(c => c.x === cx && c.y === cy)) {
            hiddenCells.push({ x: cx, y: cy });
          }
        }
      }
    });

    if (hiddenCells.length === 0) return;

    const target = hiddenCells[Math.floor(Math.random() * hiddenCells.length)];
    setRevealedIndices(prev => {
      const next = { ...prev };
      level.placedWords.forEach(pw => {
        for (let i = 0; i < pw.word.length; i++) {
          const cx = pw.direction === 'horizontal' ? pw.x + i : pw.x;
          const cy = pw.direction === 'horizontal' ? pw.y : pw.y + i;
          if (cx === target.x && cy === target.y) {
            next[pw.word] = [...(next[pw.word] || []), i];
          }
        }
      });
      return next;
    });

    setScore(prev => Math.max(0, prev - 25));
  };

  const handleGiveUp = () => {
    if (!level || gameState !== GameState.PLAYING) return;
    setIsSkipped(true);
    const allFound = new Set(level.validWords);
    setLevel({ ...level, foundWords: allFound });
    setGameState(GameState.LEVEL_COMPLETE);
  };

  const showTemporaryMessage = (msg: string, isPositive: boolean = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 1500);
  };

  const nextLevel = () => {
    if (!isSkipped) {
      setLevelNumber(prev => prev + 1);
    }
    const nextLen = Math.min(7, Math.max(5, (level?.rootLetters.length || 5) + (Math.random() > 0.7 ? 1 : 0)));
    loadNewLevel(nextLen);
  };

  if (gameState === GameState.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white p-8">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h1 className="text-3xl font-black tracking-tighter text-blue-500">WORDFLOW</h1>
        <p className="text-slate-400 mt-2 text-xs uppercase tracking-[0.3em] font-bold animate-pulse">Preparing Puzzle</p>
      </div>
    );
  }

  const isLevelFinished = gameState === GameState.LEVEL_COMPLETE;

  return (
    <div className="flex flex-col h-screen bg-transparent text-white overflow-hidden safe-top safe-bottom select-none">
      <div className="flex justify-between items-center px-6 py-4 shrink-0">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-tighter text-white leading-none">WORDFLOW</h1>
          <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase mt-1">LEVEL {levelNumber}</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Score</p>
          <p className="text-3xl font-black text-blue-500 leading-none drop-shadow-lg">{score}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {level && <CrosswordGrid level={level} revealedIndices={revealedIndices} />}
        
        {isLevelFinished && !message && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 animate-pop z-50">
            <div className="bg-blue-600 px-6 py-2 rounded-full shadow-2xl shadow-blue-900/50 border border-blue-400">
              <span className="text-sm font-black text-white uppercase tracking-[0.2em]">
                {isSkipped ? "SOLVED" : "CHAPTER CLEAR"}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="h-16 flex flex-col items-center justify-center shrink-0">
        {!isLevelFinished ? (
          <div className={`text-3xl font-black tracking-[0.25em] uppercase transition-all duration-200 transform
            ${currentGuess ? 'text-white scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-slate-700/50 scale-100'}
          `}>
            {currentGuess || "••••"}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-center pb-10 shrink-0 relative">
        {!isLevelFinished && (
          <div className="w-full max-w-[min(90vw,360px)] flex justify-between items-center mb-6 px-4">
            <button 
              onClick={handleHelp}
              className="w-14 h-14 rounded-full glass flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <span className="text-2xl">💡</span>
            </button>

            <div className="flex-1 flex items-center justify-center">
              {message && (
                <div className="px-4 py-1.5 rounded-full glass animate-pop border-blue-500/30">
                  <span className="text-xs font-black text-blue-400 uppercase tracking-widest">{message}</span>
                </div>
              )}
            </div>

            <button 
              onClick={handleGiveUp}
              className="w-14 h-14 rounded-full glass flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <span className="text-2xl">🚩</span>
            </button>
          </div>
        )}

        <div className="w-full max-w-[min(90vw,360px)] min-h-[320px] flex items-center justify-center">
          {isLevelFinished ? (
            <div className="w-full animate-pop flex flex-col items-center px-4">
              <button
                onClick={nextLevel}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-[2.5rem] text-2xl shadow-2xl shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-tight"
              >
                Next Puzzle
              </button>
            </div>
          ) : (
            level && (
              <LetterWheel
                letters={displayLetters}
                currentWord={currentGuess}
                setCurrentWord={setCurrentGuess}
                onWordComplete={handleWordComplete}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
