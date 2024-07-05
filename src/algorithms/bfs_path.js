import React, { useState, useEffect, useCallback } from "react";
import { Flag, X } from "lucide-react";

const GRID_MODES = [
  { id: "obstacle", name: "设置障碍物", color: "bg-red-500 hover:bg-red-600" },
  { id: "start", name: "设置起点", color: "bg-blue-500 hover:bg-blue-600" },
  { id: "end", name: "设置终点", color: "bg-gray-300 hover:bg-gray-400" },
];

const BFSPathFind = () => {
  const [gridSize, setGridSize] = useState({ width: 10, height: 10 });
  const [grid, setGrid] = useState([]);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [path, setPath] = useState([]);
  const [visited, setVisited] = useState([]);
  const [mode, setMode] = useState(GRID_MODES[0]);
  const [searchSpeed, setSearchSpeed] = useState(5);
  const [isSearching, setIsSearching] = useState(false);

  const initializeGrid = useCallback(() => {
    const newGrid = Array(gridSize.height)
      .fill()
      .map(() => Array(gridSize.width).fill(0));
    setGrid(newGrid);
    setStart(null);
    setEnd(null);
    setPath([]);
    setVisited([]);
  }, [gridSize]);

  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  const handleCellClick = (x, y) => {
    if (isSearching) return;
    const newGrid = [...grid];
    if (mode.id === "obstacle") {
      newGrid[y][x] = newGrid[y][x] === 1 ? 0 : 1;
      setGrid(newGrid);
    } else if (mode.id === "start") {
      setStart({ x, y });
    } else if (mode.id === "end") {
      setEnd({ x, y });
    }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const findPath = async () => {
    if (!start || !end || isSearching) return;
    setIsSearching(true);
    setPath([]);
    setVisited([]);

    const queue = [[start.x, start.y]];
    const visitedSet = new Set();
    const parent = new Map();

    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const key = `${x},${y}`;

      if (x === end.x && y === end.y) {
        const path = [];
        let current = key;
        while (current) {
          const [cx, cy] = current.split(",").map(Number);
          path.unshift([cx, cy]);
          current = parent.get(current);
        }
        setPath(path);
        setIsSearching(false);
        return;
      }

      if (visitedSet.has(key)) continue;
      visitedSet.add(key);
      setVisited((prev) => [...prev, [x, y]]);

      await sleep(1000 / searchSpeed);

      const directions = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < gridSize.width &&
          ny >= 0 &&
          ny < gridSize.height &&
          grid[ny][nx] !== 1
        ) {
          const nkey = `${nx},${ny}`;
          if (!visitedSet.has(nkey)) {
            queue.push([nx, ny]);
            parent.set(nkey, key);
          }
        }
      }
    }

    alert("未找到路径!");
    setIsSearching(false);
  };

  const renderCell = (x, y) => {
    const isStart = start && start.x === x && start.y === y;
    const isEnd = end && end.x === x && end.y === y;
    const isObstacle = grid[y][x] === 1;
    const isVisited = visited.some(([vx, vy]) => vx === x && vy === y);
    const isPath = path.some(([px, py]) => px === x && py === y);

    let content = null;
    let cellClass =
      "w-10 h-10 border border-black flex items-center justify-center";

    if (isStart) {
      content = <Flag className="text-green-500" />;
      cellClass += " bg-green-100";
    } else if (isEnd) {
      content = <Flag className="text-red-500" />;
      cellClass += " bg-red-100";
    } else if (isObstacle) {
      content = <X className="text-gray-500" />;
    } else if (isPath) {
      cellClass += " bg-green-300";
    } else if (isVisited) {
      cellClass += " bg-gray-200";
    }

    return (
      <div
        key={`${x},${y}`}
        className={cellClass}
        onClick={() => handleCellClick(x, y)}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center p-4 max-w-3xl mx-auto">
      <div className="w-full mb-4 space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-lg flex-shrink-0 whitespace-nowrap">网格宽度：</label>
          <input
            type="number"
            value={gridSize.width}
            onChange={(e) => setGridSize(prev => ({ ...prev, width: parseInt(e.target.value) }))}
            className="w-full ml-4 p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="flex justify-between items-center">
          <label className="text-lg flex-shrink-0 whitespace-nowrap">网格高度：</label>
          <input
            type="number"
            value={gridSize.height}
            onChange={(e) => setGridSize(prev => ({ ...prev, height: parseInt(e.target.value) }))}
            className="w-full ml-4 p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="flex items-center">
          <span className="text-lg mr-4 text-lg flex-shrink-0 whitespace-nowrap">搜索速度：</span>
          <input
            type="range"
            min="1"
            max="20"
            value={searchSpeed}
            onChange={(e) => setSearchSpeed(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex justify-between w-full mb-4">
        {GRID_MODES.map((gridMode) => (
          <button
            key={gridMode.id}
            onClick={() => setMode(gridMode)}
            className={`px-4 py-2 text-white rounded ${gridMode.color} ${mode.id === gridMode.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
            disabled={isSearching}
          >
            {gridMode.name}
          </button>
        ))}
        <button
          onClick={findPath}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={isSearching}
        >
          查找路径
        </button>
      </div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize.width}, minmax(0, 1fr))`,
        }}
      >
        {grid.map((row, y) => row.map((_, x) => renderCell(x, y)))}
      </div>
    </div>
  );
};

export default BFSPathFind;
