
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LevelData } from '../types.ts';

interface CrosswordGridProps {
  level: LevelData;
  revealedIndices: Record<string, number[]>;
}

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ level, revealedIndices }) => {
  const { gridWidth, gridHeight, placedWords, foundWords } = level;
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Reset offset when level changes
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [level.rootLetters]);

  const cellMap: (string | null)[][] = useMemo(() => {
    const map = Array.from({ length: gridHeight }, () => 
      Array.from({ length: gridWidth }, () => null)
    );
    placedWords.forEach(pw => {
      for (let i = 0; i < pw.word.length; i++) {
        const curX = pw.direction === 'horizontal' ? pw.x + i : pw.x;
        const curY = pw.direction === 'horizontal' ? pw.y : pw.y + i;
        map[curY][curX] = pw.word[i].toUpperCase();
      }
    });
    return map;
  }, [gridWidth, gridHeight, placedWords]);

  const cellStatus = useMemo(() => {
    const status = Array.from({ length: gridHeight }, () => 
      Array.from({ length: gridWidth }, () => 'empty' as 'empty' | 'hidden' | 'found' | 'hinted')
    );

    placedWords.forEach(pw => {
      const isWordFound = foundWords.has(pw.word);
      const hints = revealedIndices[pw.word] || [];
      
      for (let i = 0; i < pw.word.length; i++) {
        const curX = pw.direction === 'horizontal' ? pw.x + i : pw.x;
        const curY = pw.direction === 'horizontal' ? pw.y : pw.y + i;

        if (isWordFound) {
          status[curY][curX] = 'found';
        } else if (hints.includes(i)) {
          if (status[curY][curX] !== 'found') status[curY][curX] = 'hinted';
        } else {
          if (status[curY][curX] === 'empty') status[curY][curX] = 'hidden';
        }
      }
    });
    return status;
  }, [gridWidth, gridHeight, placedWords, foundWords, revealedIndices]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current || !gridRef.current) return;
    
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    const containerRect = containerRef.current.getBoundingClientRect();
    const gridRect = gridRef.current.getBoundingClientRect();

    // The grid is centered via Flexbox. Offset 0 means center.
    const limitX = Math.max(0, (gridRect.width - containerRect.width) / 2);
    const limitY = Math.max(0, (gridRect.height - containerRect.height) / 2);

    setOffset(prev => ({
      x: Math.max(-limitX, Math.min(limitX, prev.x + dx)),
      y: Math.max(-limitY, Math.min(limitY, prev.y + dy))
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const maxDim = Math.max(gridWidth, gridHeight);
  const baseSize = Math.min(85 / maxDim, 12);
  const cellSize = `min(${baseSize}vw, 45px)`; 

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-visible touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div 
        ref={gridRef}
        className="grid gap-1.5 transition-transform duration-75 ease-out will-change-transform"
        style={{
          gridTemplateColumns: `repeat(${gridWidth}, ${cellSize})`,
          width: 'fit-content',
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        }}
      >
        {cellMap.map((row, y) => (
          row.map((char, x) => {
            const status = cellStatus[y][x];
            if (status === 'empty') return <div key={`${x}-${y}`} style={{ width: cellSize, height: cellSize }} />;

            return (
              <div
                key={`${x}-${y}`}
                style={{ width: cellSize, height: cellSize }}
                className={`flex items-center justify-center rounded-lg text-[min(4vw,20px)] font-black transition-all duration-500 border no-select
                  ${status === 'found' 
                    ? 'bg-teal-600 border-teal-300 text-white animate-success shadow-lg shadow-teal-950/40 z-10' 
                    : status === 'hinted'
                      ? 'bg-teal-900/40 border-teal-700/50 text-teal-200/80'
                      : 'bg-teal-500/5 border-teal-500/10 text-transparent'}`}
              >
                {(status === 'found' || status === 'hinted') ? char : ''}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};

export default CrosswordGrid;
