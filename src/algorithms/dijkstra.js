import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

const CircleNode = ({ data }) => (
    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
        {data.label}
        <Handle type="source" position={Position.Top} className="w-2 h-2" />
        <Handle type="target" position={Position.Bottom} className="w-2 h-2" />
    </div>
);

const nodeTypes = {
    circle: CircleNode,
};

const WeightModal = ({ isOpen, onClose, onSubmit, initialWeight = '' }) => {
    const [weight, setWeight] = useState(initialWeight);
    const { t } = useTranslation();

    useEffect(() => {
        setWeight(initialWeight);
    }, [initialWeight]);

    const handleSubmit = () => {
        onSubmit(weight);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center space-x-4">
                    <label className="font-semibold text-gray-700">{t('weight')}</label>
                    <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="border-2 border-gray-300 p-2 rounded focus:outline-none focus:border-blue-500 transition duration-200"
                        style={{ minWidth: '100px' }}
                    />
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
                    >
                        {t('submit')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const GraphEditor = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [matrix, setMatrix] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalParams, setModalParams] = useState({ edge: null, params: null });
    const { t } = useTranslation();
    const flowRef = useRef(null);

    const updateMatrix = (nodes, edges) => {
        const size = nodes.length;
        const newMatrix = Array(size + 1).fill(null).map(() => Array(size + 1).fill('Inf'));

        for (let i = 1; i <= size; i++) {
            newMatrix[0][i] = nodes[i - 1].data.label;
            newMatrix[i][0] = nodes[i - 1].data.label;
        }

        edges.forEach(edge => {
            const sourceIndex = nodes.findIndex(n => n.id === edge.source) + 1;
            const targetIndex = nodes.findIndex(n => n.id === edge.target) + 1;
            if (sourceIndex && targetIndex) {
                newMatrix[sourceIndex][targetIndex] = edge.label;
                newMatrix[targetIndex][sourceIndex] = edge.label; // 因为是无向图
            }
        });

        setMatrix(newMatrix);
    };

    useEffect(() => {
        updateMatrix(nodes, edges);
    }, [nodes, edges]);

    const handleWeightSubmit = (weight) => {
        if (modalParams.edge) {
            // 更新现有连线的权重
            setEdges((eds) =>
                eds.map((e) => e.id === modalParams.edge.id ? { ...e, label: weight, animated: true } : e)
            );
        } else if (modalParams.params) {
            // 创建新的连线
            setEdges((eds) => addEdge({ ...modalParams.params, label: weight, animated: true }, eds));
        }
        setIsModalOpen(false);
        setModalParams({ params: null, edge: null }); // 清理参数，防止重复使用
    };

    const onConnect = useCallback((params) => {
        setModalParams({ params, edge: null });
        setIsModalOpen(true);
    }, []);

    const onEdgeDoubleClick = (event, edge) => {
        setModalParams({ edge, params: null });
        setIsModalOpen(true);
    };

    const addNode = () => {
        const newId = (Math.max(...nodes.map(n => parseInt(n.id)), 0) + 1).toString();
        const newNode = {
          id: newId,
          data: { label: newId },
          position: { x: 0, y: 0 },
          type: 'circle',
        };
        const newNodes = [...nodes, newNode];
    
        // 确保 ReactFlow 实例已经渲染
        if (flowRef.current) {
            const flowBounds = flowRef.current.getBoundingClientRect();
            const centerX = flowBounds.width;
            const centerY = flowBounds.height / 4;
            const radius = Math.min(flowBounds.width, flowBounds.height) / 8;
            const totalNodes = newNodes.length;
    
            newNodes.forEach((node, index) => {
              const angle = (index / totalNodes) * 2 * Math.PI;
              node.position = {
                x: centerX + radius * Math.cos(angle) - flowBounds.left,
                y: centerY + radius * Math.sin(angle) - flowBounds.top,
              };
            });
        }
    
        setNodes(newNodes);
    };
    
    const onNodesDelete = useCallback(
        (deleted) => {
            const newEdges = edges.filter(edge => !deleted.some(node => node.id === edge.source || node.id === edge.target));
            setEdges(newEdges);
            updateMatrix(nodes.filter(n => !deleted.some(d => d.id === n.id)), newEdges);
        },
        [edges, setEdges, nodes]
    );

    useEffect(() => {
        const forceLayout = () => {
            setNodes((nds) => {
                const nodesCopy = [...nds];
                for (let i = 0; i < nodesCopy.length; i++) {
                    let fx = 0, fy = 0;
                    for (let j = 0; j < nodesCopy.length; j++) {
                        if (i !== j) {
                            const dx = nodesCopy[i].position.x - nodesCopy[j].position.x;
                            const dy = nodesCopy[i].position.y - nodesCopy[j].position.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const force = 1 / (distance * distance);
                            fx += (dx / distance) * force;
                            fy += (dy / distance) * force;
                        }
                    }
                    nodesCopy[i] = {
                        ...nodesCopy[i],
                        position: {
                            x: nodesCopy[i].position.x + fx,
                            y: nodesCopy[i].position.y + fy,
                        },
                    };
                }
                return nodesCopy;
            });
        };

        const interval = setInterval(forceLayout, 100);
        return () => clearInterval(interval);
    }, [setNodes]);

    return (
        <div className="flex h-screen">
            <div className="w-3/5 h-full relative">
                <button
                    onClick={addNode}
                    className="absolute top-4 left-4 z-10 px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200"
                >
                    {t('insert_node')}
                </button>
                <ReactFlow
                    ref={flowRef}
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodesDelete={onNodesDelete}
                    onEdgeDoubleClick={onEdgeDoubleClick}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Controls />
                    <MiniMap />
                    <Background variant="dots" gap={12} size={1} />
                </ReactFlow>
            </div>
            <div className="w-2/5 p-5 overflow-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            {matrix[0] && matrix[0].map((id, index) => (
                                <th key={index} scope="col" className="px-6 py-3">
                                    {id || ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.slice(1).map((row, i) => (
                            <tr key={i} className="bg-white border-b">
                                {row.map((cell, j) => (
                                    <td key={j} className="px-6 py-4">{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <WeightModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setModalParams({ params: null, edge: null }); // 关闭模态框时清理参数
                }}

                onSubmit={handleWeightSubmit}
                initialWeight={modalParams.edge ? modalParams.edge.label : ''}
            />
        </div>
    );
};


export default GraphEditor;