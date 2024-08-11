"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Listbox, ListboxOptions, ListboxOption, ListboxButton } from '@headlessui/react';

const DISK_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD700', '#FF69B4', '#20B2AA',
  '#8A2BE2', '#00FA9A', '#FF4500', '#1E90FF', '#FF1493', '#32CD32', '#FF8C00', '#4169E1'
];

const DISK_HEIGHT = 20;
const MAX_DISKS = 20;

const HanoiTower = () => {
  const [disks, setDisks] = useState(6);
  const [speed, setSpeed] = useState(500);
  const [towers, setTowers] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalMoves, setTotalMoves] = useState(0);
  const [mode, setMode] = useState('manual');
  const [message, setMessage] = useState('');
  const [hintMove, setHintMove] = useState(null);

  const resetTowers = useCallback(() => {
    setTowers([
      Array.from({ length: disks }, (_, i) => disks - i),
      [],
      []
    ]);
    setIsPlaying(false);
    setTotalMoves(0);
    setMessage('');
    setHintMove(null);
  }, [disks]);

  useEffect(() => {
    resetTowers();
  }, [disks, resetTowers]);

  const findNextMove = useCallback((h, t, conf) => {
    if (h > 0) {
      const f = conf[h - 1];
      if (f !== t) {
        const r = 3 - f - t;
        const move = findNextMove(h - 1, r, conf);
        if (move) return move;
        return { disk: h - 1, from: f, to: t };
      }
      return findNextMove(h - 1, t, conf);
    }
    return null;
  }, []);

  const towersToConf = useCallback((towers) => {
    const conf = new Array(disks).fill(0);
    towers.forEach((tower, tIndex) => {
      tower.forEach((disk) => {
        conf[disk - 1] = tIndex;
      });
    });
    return conf;
  }, [disks]);

  const getHint = useCallback(() => {
    const conf = towersToConf(towers);
    const move = findNextMove(disks, 2, conf);
    if (move) {
      setHintMove(move);
      setMessage(`提示：从塔 ${String.fromCharCode(65 + move.from)} 移动到塔 ${String.fromCharCode(65 + move.to)}`);
    } else {
      setHintMove(null);
      setMessage('没有可用的提示。您可能已经完成了游戏！');
    }
  }, [towers, disks, findNextMove, towersToConf]);

  const startVisualization = useCallback(() => {
    setIsPlaying(true);
    setMode('auto');
    setMessage('');
  }, []);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    if (newMode === 'manual') {
      setIsPlaying(false);
    } else {
      // When switching to auto, prepare for visualization but don't start immediately
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'auto' && isPlaying) {
      const timer = setTimeout(() => {
        const conf = towersToConf(towers);
        const move = findNextMove(disks, 2, conf);
        if (move) {
          setTowers(prev => {
            const newTowers = prev.map(tower => [...tower]);
            const disk = newTowers[move.from].pop();
            newTowers[move.to].push(disk);
            return newTowers;
          });
          setTotalMoves(prev => prev + 1);
          setMessage('');
        } else {
          setIsPlaying(false);
          setMessage('汉诺塔问题已解决！');
        }
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [mode, isPlaying, towers, speed, disks, findNextMove, towersToConf]);

  const handleDragStart = (e, fromTower, diskIndex) => {
    if (mode !== 'manual') return;
    if (diskIndex !== towers[fromTower].length - 1) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', JSON.stringify({ fromTower, diskSize: towers[fromTower][diskIndex] }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, toTower) => {
    e.preventDefault();
    if (mode !== 'manual') return;

    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { fromTower, diskSize } = data;

    if (fromTower === toTower) return;

    const targetTower = towers[toTower];
    if (targetTower.length === 0 || diskSize < targetTower[targetTower.length - 1]) {
      setTowers(prev => {
        const newTowers = prev.map(tower => [...tower]);
        const disk = newTowers[fromTower].pop();
        newTowers[toTower].push(disk);
        return newTowers;
      });
      setTotalMoves(prev => prev + 1);
      setMessage('移动成功！');
      setHintMove(null);

      // Check if the game is completed
      if (towers[2].length === disks - 1 && toTower === 2) {
        setMessage('恭喜！您已经完成了汉诺塔问题！');
      }
    } else {
      setMessage('移动失败。大圆盘不能放在小圆盘上。');
    }
  };


  const Tower = React.memo(({ disks, index, totalDisks }) => (
    <div
      className="relative flex flex-col items-center justify-end w-full md:w-1/3 mb-4 md:mb-0 ml-2"
      style={{ height: `${totalDisks * DISK_HEIGHT + 40}px` }}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, index)}
    >
      <div className="absolute bottom-0 w-full h-2 bg-gray-400" />
      <div className="absolute bottom-2 w-2 bg-gray-400" style={{ height: `${totalDisks * DISK_HEIGHT + 20}px` }} />
      {disks.map((disk, diskIndex) => (
        <div
          key={diskIndex}
          className={`absolute transition-all duration-500 ease-in-out rounded-md ${mode === 'manual' ? 'cursor-move' : ''}`}
          style={{
            width: `${(disk / totalDisks) * 90}%`,
            height: `${DISK_HEIGHT}px`,
            backgroundColor: DISK_COLORS[disk % DISK_COLORS.length],
            bottom: `${diskIndex * DISK_HEIGHT + 8}px`,
            border: hintMove && hintMove.from === index && diskIndex === disks.length - 1 ? '2px solid yellow' : 'none',
          }}
          draggable={mode === 'manual'}
          onDragStart={(e) => handleDragStart(e, index, diskIndex)}
        />
      ))}
      <div className="absolute bottom-[-24px] text-center w-full">{String.fromCharCode(65 + index)}</div>
    </div>
  ));

  const Controls = React.memo(() => {
    const diskOptions = useMemo(() =>
      Array.from({ length: MAX_DISKS - 2 }, (_, i) => i + 3),
      []);

    const minMoves = 2 ** disks - 1;
    return (
      <div className="w-full md:w-1/4 p-4 flex flex-col space-y-4">
        <h2 className="text-2xl font-bold">Settings</h2>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Number of Disks</label>
          <Listbox value={disks} onChange={setDisks} disabled={isPlaying}>
            <ListboxButton className="relative w-full py-2 pl-3 pr-10 text-left border border-gray-300 rounded-lg cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-opacity-75 focus-visible:ring-white focus-visible:ring-offset-orange-300 focus-visible:ring-offset-2 focus-visible:border-indigo-500 sm:text-sm">
              {disks}
            </ListboxButton>
            <ListboxOptions className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {diskOptions.map((num) => (
                <ListboxOption
                  key={num}
                  className={({ active }) =>
                    `${active ? 'text-amber-900 bg-amber-100' : 'text-gray-900'}
                    cursor-default select-none relative py-2 pl-10 pr-4`
                  }
                  value={num}
                >
                  {({ selected, active }) => (
                    <>
                      <span className={`${selected ? 'font-medium' : 'font-normal'} block truncate`}>
                        {num}
                      </span>
                      {selected && (
                        <span className={`${active ? 'text-amber-600' : 'text-amber-600'}
                          absolute inset-y-0 left-0 flex items-center pl-3`}>
                          ✓
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Listbox>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Speed (ms)</label>
          <input
            type="range"
            min="1"
            max="1000"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full"
            disabled={mode === 'manual'}
          />
          <span>{speed}ms</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Mode</label>
          <select
            value={mode}
            onChange={(e) => handleModeChange(e.target.value)}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="manual">Manual</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        {mode === 'auto' && (
          <button
            onClick={startVisualization}
            disabled={isPlaying}
            className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none focus:shadow-outline disabled:opacity-50"
          >
            {totalMoves > 0 ? 'Continue' : 'Start'}
          </button>
        )}
        {mode === 'manual' && (
          <button
            onClick={getHint}
            className="px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-700 focus:outline-none focus:shadow-outline"
          >
            Get Hint
          </button>
        )}
        <button
          onClick={resetTowers}
          className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-700 focus:outline-none focus:shadow-outline"
        >
          Reset
        </button>
        <div>
          <label className="block text-sm font-medium text-gray-700">Total: {totalMoves} / Minimum: {minMoves}</label>
        </div>
        {message && (
          <div className="mt-4 text-yellow-700 rounded">
            {message}
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="flex flex-col md:flex-row">
      <div className="w-full md:w-3/4 p-4 bg-gray-100">
        <div className="flex flex-col md:flex-row justify-between h-full">
          {towers.map((tower, index) => (
            <Tower key={index} disks={tower} index={index} totalDisks={disks} />
          ))}
        </div>
      </div>
      <Controls />
    </div>
  );
};

export default HanoiTower;