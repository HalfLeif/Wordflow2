
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface LetterWheelProps {
  letters: string[];
  onWordComplete: (word: string) => void;
  currentWord: string;
  setCurrentWord: (word: string) => void;
}

const LetterWheel: React.FC<LetterWheelProps> = ({ letters, onWordComplete, currentWord, setCurrentWord }) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const letterRadius = dimensions.width * 0.34;
  const selectionThreshold = dimensions.width * 0.14;

  const letterPositions = useMemo(() => {
    if (dimensions.width === 0) return [];
    return letters.map((_, i) => {
      const angle = (i / letters.length) * 2 * Math.PI - Math.PI / 2;
      return {
        x: centerX + Math.cos(angle) * letterRadius,
        y: centerY + Math.sin(angle) * letterRadius,
        index: i
      };
    });
  }, [letters, dimensions, centerX, centerY, letterRadius]);

  const updatePointerPosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPointerPos({
      x: clientX - rect.left,
      y: clientY - rect.top
    });
  };

  const handleStart = (index: number, clientX: number, clientY: number) => {
    setSelectedIndices([index]);
    setCurrentWord(letters[index]);
    updatePointerPosition(clientX, clientY);
    if (navigator.vibrate) navigator.vibrate(5);
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (selectedIndices.length === 0 || !containerRef.current || dimensions.width === 0) return;
    
    updatePointerPosition(clientX, clientY);
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    letterPositions.forEach((pos) => {
      const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (dist < selectionThreshold) {
        if (!selectedIndices.includes(pos.index)) {
          setSelectedIndices(prev => {
            const next = [...prev, pos.index];
            const word = next.map(idx => letters[idx]).join('');
            setCurrentWord(word);
            if (navigator.vibrate) navigator.vibrate(10);
            return next;
          });
        } else if (selectedIndices.length > 1 && selectedIndices[selectedIndices.length - 2] === pos.index) {
          setSelectedIndices(prev => {
            const next = prev.slice(0, -1);
            const word = next.map(idx => letters[idx]).join('');
            setCurrentWord(word);
            return next;
          });
        }
      }
    });
  }, [selectedIndices, letterPositions, letters, setCurrentWord, dimensions, selectionThreshold]);

  const handleEnd = useCallback(() => {
    if (selectedIndices.length > 0) {
      onWordComplete(currentWord.toLowerCase());
    }
    setSelectedIndices([]);
    setPointerPos(null);
    setCurrentWord("");
  }, [selectedIndices, currentWord, onWordComplete, setCurrentWord]);

  useEffect(() => {
    const onGlobalMove = (e: PointerEvent) => handleMove(e.clientX, e.clientY);
    const onGlobalUp = () => handleEnd();

    if (selectedIndices.length > 0) {
      window.addEventListener('pointermove', onGlobalMove);
      window.addEventListener('pointerup', onGlobalUp);
    }

    return () => {
      window.removeEventListener('pointermove', onGlobalMove);
      window.removeEventListener('pointerup', onGlobalUp);
    };
  }, [selectedIndices.length, handleMove, handleEnd]);

  const wheelSizeClass = "w-[min(48vw,192px)] h-[min(48vw,192px)]";

  return (
    <div 
      className={`relative ${wheelSizeClass} mx-auto no-select touch-none`} 
      ref={containerRef}
    >
      <div className="absolute inset-0 rounded-full bg-teal-900/20 border-2 border-teal-500/20 backdrop-blur-sm shadow-2xl"></div>
      
      <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-10">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {selectedIndices.length > 1 && (
          <path
            d={selectedIndices.map((idx, i) => {
              const pos = letterPositions.find(p => p.index === idx);
              if (!pos) return '';
              return `${i === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`;
            }).join(' ')}
            fill="none"
            stroke="#2dd4bf"
            strokeWidth={dimensions.width * 0.05}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-70 transition-all duration-75"
            filter="url(#glow)"
          />
        )}

        {selectedIndices.length > 0 && pointerPos && (
          <line
            x1={letterPositions.find(p => p.index === selectedIndices[selectedIndices.length - 1])?.x}
            y1={letterPositions.find(p => p.index === selectedIndices[selectedIndices.length - 1])?.y}
            x2={pointerPos.x}
            y2={pointerPos.y}
            stroke="#2dd4bf"
            strokeWidth={dimensions.width * 0.05}
            strokeLinecap="round"
            className="opacity-40"
          />
        )}
      </svg>

      {letterPositions.map((pos) => {
        const isSelected = selectedIndices.includes(pos.index);
        const isLast = selectedIndices[selectedIndices.length - 1] === pos.index;
        const letterSize = dimensions.width * 0.22;

        return (
          <div
            key={`${pos.index}-${letters[pos.index]}`}
            onPointerDown={(e) => {
              e.preventDefault();
              handleStart(pos.index, e.clientX, e.clientY);
            }}
            className={`absolute flex items-center justify-center rounded-full font-extrabold transition-all duration-300 transform cursor-pointer select-none
              ${isSelected 
                ? 'bg-teal-500 text-white scale-110 shadow-[0_0_25px_rgba(45,212,191,0.6)] z-20' 
                : 'bg-teal-950/60 text-teal-50 hover:bg-teal-900 border border-teal-500/30'}
              ${isLast ? 'ring-4 ring-teal-300 ring-opacity-40' : ''}
            `}
            style={{ 
              left: pos.x, 
              top: pos.y, 
              width: letterSize, 
              height: letterSize,
              marginLeft: -letterSize / 2,
              marginTop: -letterSize / 2,
              fontSize: `${letterSize * 0.45}px`
            }}
          >
            {letters[pos.index]}
          </div>
        );
      })}
    </div>
  );
};

export default LetterWheel;
