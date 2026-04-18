/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  Clock, 
  Hash, 
  ChevronRight,
  Target,
  AlertCircle
} from 'lucide-react';
import { GameMode, GameState, BlockData, GameStats } from './types.ts';
import { 
  GRID_COLS, 
  GRID_ROWS, 
  INITIAL_ROWS, 
  MIN_SUM, 
  MAX_SUM, 
  MAX_VAL, 
  TIME_LIMIT, 
  SCORE_PER_BLOCK 
} from './constants.ts';

// Helper to generate a random number
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.CLASSIC);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    level: 1,
    targetSum: 0,
    timeLeft: TIME_LIMIT,
    currentSum: 0,
  });

  // Calculate current selection sum
  const currentSum = useMemo(() => {
    return blocks
      .filter((b) => b.selected)
      .reduce((acc, b) => acc + b.value, 0);
  }, [blocks]);

  // Update current sum in stats
  useEffect(() => {
    setStats(prev => ({ ...prev, currentSum }));
  }, [currentSum]);

  // Generate a new target sum that is achievable
  const generateTargetSum = useCallback((currentBlocks: BlockData[]) => {
    if (currentBlocks.length === 0) return randomInt(MIN_SUM, MAX_SUM);
    
    // Pick 2-4 random blocks to determine a valid sum
    const count = randomInt(2, 4);
    const shuffled = [...currentBlocks].sort(() => 0.5 - Math.random());
    const sum = shuffled.slice(0, Math.min(count, shuffled.length)).reduce((acc, b) => acc + b.value, 0);
    
    return Math.max(MIN_SUM, Math.min(sum, MAX_SUM * 2));
  }, []);

  // Check if target reached
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    if (currentSum === stats.targetSum && currentSum !== 0) {
      // Clear blocks
      const selectedIds = blocks.filter(b => b.selected).map(b => b.id);
      
      // Update stats before blocks to avoid stale state in generateTargetSum
      const remainingBlocksAfterClear = blocks.filter(b => !selectedIds.includes(b.id));

      setStats(prev => ({
        ...prev,
        score: prev.score + (selectedIds.length * SCORE_PER_BLOCK * prev.level),
        targetSum: generateTargetSum(remainingBlocksAfterClear),
        timeLeft: TIME_LIMIT, // reset time on success
      }));

      // Update blocks 
      setBlocks(prev => {
        const remaining = prev.filter(b => !b.selected);
        // After clearing, we might need to add a row in Classic mode
        if (gameMode === GameMode.CLASSIC) {
          return addNewRow(remaining);
        }
        // Even in Time mode, if we cleared the ENTIRE board, add a row
        if (remaining.length === 0) {
          return addNewRow([]);
        }
        return remaining;
      });
    } else if (currentSum > stats.targetSum) {
      // Flash error and deselect all after a short delay to see the error
      const timeout = setTimeout(() => {
        setBlocks(prev => prev.map(b => ({ ...b, selected: false })));
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [currentSum, stats.targetSum, gameState, gameMode, generateTargetSum]);

  // Game Logic: Adding a new row
  const addNewRow = (currentBlocks: BlockData[]): BlockData[] => {
    // Check for Game Over: If any block is at row 0 (top)
    const topBlocks = currentBlocks.filter(b => b.row === 0);
    if (topBlocks.length > 0) {
      setGameState(GameState.GAMEOVER);
      return currentBlocks;
    }

    // Shift all current blocks UP (decrease row index)
    const shiftedBlocks = currentBlocks.map(b => ({
      ...b,
      row: b.row - 1,
      selected: false
    }));

    // Add new row at bottom (row = GRID_ROWS - 1)
    const newRow: BlockData[] = Array.from({ length: GRID_COLS }).map((_, col) => ({
      id: generateId(),
      value: randomInt(1, MAX_VAL),
      selected: false,
      row: GRID_ROWS - 1,
      col
    }));

    return [...shiftedBlocks, ...newRow];
  };

  // Timer logic for TIME mode
  useEffect(() => {
    if (gameState !== GameState.PLAYING || gameMode !== GameMode.TIME) return;

    const timer = setInterval(() => {
      setStats(prev => {
        if (prev.timeLeft <= 0) {
          // Time out - add row and reset timer
          setBlocks(oldBlocks => addNewRow(oldBlocks));
          return { ...prev, timeLeft: TIME_LIMIT };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, gameMode]);

  // Start new game
  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    setGameState(GameState.PLAYING);
    
    // Initial blocks: 4 rows at the bottom
    const initialBlocks: BlockData[] = [];
    for (let r = GRID_ROWS - INITIAL_ROWS; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        initialBlocks.push({
          id: generateId(),
          value: randomInt(1, MAX_VAL),
          selected: false,
          row: r,
          col: c
        });
      }
    }
    
    setBlocks(initialBlocks);
    setStats({
      score: 0,
      level: 1,
      targetSum: generateTargetSum(initialBlocks),
      timeLeft: TIME_LIMIT,
      currentSum: 0,
    });
  };

  const handleBlockClick = (id: string) => {
    if (gameState !== GameState.PLAYING) return;
    setBlocks(prev => prev.map(b => 
      b.id === id ? { ...b, selected: !b.selected } : b
    ));
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-2 md:p-4 relative overflow-hidden grid-pattern">
      
      {/* HUD Bar */}
      {gameState !== GameState.MENU && (
        <div className="max-w-md w-full mb-2 md:mb-6 z-10 px-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-accent" />
              <span className="font-mono font-bold text-lg md:text-xl">{stats.score.toLocaleString()}</span>
            </div>
            {gameMode === GameMode.TIME && (
              <div className={`flex items-center gap-2 px-2 py-0.5 md:px-3 md:py-1 rounded-full border transition-colors ${stats.timeLeft < 5 ? 'bg-error/10 border-error text-error animate-pulse' : 'border-primary/20'}`}>
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                <span className="font-mono text-xs md:text-sm font-bold">{stats.timeLeft}s</span>
              </div>
            )}
          </div>
          
          <div className="bg-primary text-secondary p-3 md:p-6 rounded-xl md:rounded-2xl shadow-2xl flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-[8px] md:text-[10px] uppercase tracking-widest opacity-60 mb-1 font-bold">目标总和</div>
              <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter text-success">{stats.targetSum}</div>
            </div>
            
            <div className="h-8 md:h-12 w-px bg-secondary/20" />
            
            <div className="text-right relative z-10">
              <div className="text-[8px] md:text-[10px] uppercase tracking-widest opacity-60 mb-1 font-bold">当前已选</div>
              <motion.div 
                animate={stats.currentSum > stats.targetSum ? { x: [-2, 2, -2, 2, 0] } : {}}
                className={`text-2xl md:text-4xl font-mono font-bold transition-colors ${stats.currentSum > stats.targetSum ? 'text-error' : 'text-accent'}`}
              >
                {stats.currentSum}
              </motion.div>
            </div>

            {/* Background decorative sum */}
            <div className="absolute -right-4 -bottom-4 text-7xl md:text-9xl font-mono font-bold opacity-5 pointer-events-none">
              {stats.targetSum}
            </div>
          </div>
        </div>
      )}

      {/* Game Board */}
      {gameState !== GameState.MENU && (
        <div 
          className="relative bg-primary/5 rounded-xl p-1 md:p-2 border border-primary/10 shadow-inner overflow-hidden"
          style={{ 
            width: 'min(95vw, 400px)', 
            height: 'min(140vw, 600px, calc(100svh - 180px - 2rem))',
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            gap: 'min(2vw, 8px)'
          }}
        >
          {/* Visual Grid Lines */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-10 pointer-events-none opacity-20">
            {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, i) => (
              <div key={i} className="border border-primary/5" />
            ))}
          </div>

          <AnimatePresence>
            {blocks.map((block) => (
              <motion.button
                key={block.id}
                layoutId={block.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: 0,
                  y: 0,
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 1.5,
                  filter: 'brightness(1.5) blur(4px)',
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleBlockClick(block.id)}
                className={`
                  relative flex items-center justify-center rounded-md md:rounded-lg shadow-sm border-b-2 md:border-b-4 transition-all
                  ${block.selected 
                    ? 'bg-accent border-accent/80 text-white scale-95 shadow-lg' 
                    : 'bg-white border-primary/10 hover:border-primary/30 text-primary'
                  }
                `}
                style={{
                  gridColumn: block.col + 1,
                  gridRow: block.row + 1,
                }}
              >
                <span className="text-xl md:text-2xl font-mono font-bold select-none">{block.value}</span>
                {block.selected && (
                  <motion.div 
                    layoutId={`ring-${block.id}`}
                    className="absolute -inset-0.5 md:-inset-1 border-2 border-accent rounded-md md:rounded-xl"
                  />
                )}
              </motion.button>
            ))}
          </AnimatePresence>

          {/* Warning Line */}
          <div className="absolute top-[10%] left-0 right-0 h-px bg-error/30 border-t border-dashed border-error/50 z-0 flex items-center justify-center">
            <span className="bg-secondary text-error text-[8px] px-2 font-bold tracking-widest -mt-px opacity-50 uppercase">危险区域</span>
          </div>
        </div>
      )}

      {/* Main Menu */}
      <AnimatePresence>
        {gameState === GameState.MENU && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-2xl border border-primary/5 flex flex-col items-center text-center z-50"
          >
            <div className="w-20 h-20 bg-primary text-secondary rounded-2xl flex items-center justify-center mb-6 shadow-xl rotate-3">
              <Hash className="w-10 h-10" />
            </div>
            
            <h1 className="text-4xl font-mono font-bold tracking-tighter mb-2">BlokSum</h1>
            <p className="text-primary/60 mb-8 text-sm px-4">
              选择数字方块使总和等于<span className="text-accent font-bold">目标值</span>。<br/>不要让方块堆叠到顶部！
            </p>

            <div className="w-full space-y-4">
              <button 
                onClick={() => startGame(GameMode.CLASSIC)}
                className="w-full bg-primary text-secondary py-4 px-6 rounded-xl font-bold flex items-center justify-between hover:scale-[1.02] transition-transform group"
              >
                <div className="flex items-center gap-3">
                  <Play className="w-5 h-5 fill-current" />
                  <span>经典模式</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-40 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => startGame(GameMode.TIME)}
                className="w-full bg-accent text-white py-4 px-6 rounded-xl font-bold flex items-center justify-between hover:scale-[1.02] transition-transform group shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5" />
                  <span>计时模式</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-40 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="mt-8 flex gap-4 text-primary/40 text-xs font-medium">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>数学求和</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>生存挑战</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameState === GameState.GAMEOVER && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-primary/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-xs w-full bg-white p-8 rounded-3xl shadow-2xl text-center"
            >
              <div className="text-primary/40 text-xs uppercase tracking-widest font-bold mb-2">最终得分</div>
              <div className="text-6xl font-mono font-bold tracking-tighter mb-8">{stats.score.toLocaleString()}</div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => startGame(gameMode)}
                  className="w-full bg-primary text-secondary py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>再来一局</span>
                </button>
                <button 
                  onClick={() => setGameState(GameState.MENU)}
                  className="w-full bg-secondary text-primary py-4 px-6 rounded-xl font-bold hover:scale-[1.02] transition-transform"
                >
                  返回主菜单
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background decoration */}
      <div className="fixed bottom-0 left-0 p-8 opacity-5 pointer-events-none hidden lg:block">
        <h2 className="text-9xl font-mono font-bold tracking-tighter leading-none">
          求和<br/>或者<br/>出局
        </h2>
      </div>

    </div>
  );
}
