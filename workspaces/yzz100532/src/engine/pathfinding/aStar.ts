import type { TunnelNode, TunnelEdge, Route, AccidentType } from '../../types';

const INFINITY = Number.POSITIVE_INFINITY;
const CLOSED_WEIGHT = INFINITY;
const WATER_WEIGHT_MULTIPLIER = 5;
const VENTILATION_WEIGHT_MULTIPLIER = 2;
const WATER_DEPTH_THRESHOLD = 0.5;

interface AStarNode {
  id: string;
  g: number;
  h: number;
  f: number;
  parent: string | null;
  edgeId: string | null;
}

interface NeighborInfo {
  nodeId: string;
  edgeId: string;
  weight: number;
}

/**
 * 计算两个节点之间的欧几里得距离
 * @param nodeA 起点节点
 * @param nodeB 终点节点
 * @returns 欧几里得距离
 */
function euclideanDistance(nodeA: TunnelNode, nodeB: TunnelNode): number {
  const dx = nodeA.x - nodeB.x;
  const dy = nodeA.y - nodeB.y;
  const dz = nodeA.z - nodeB.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 计算边的权重，考虑事故类型和约束条件
 * @param edge 巷道边
 * @param accidentType 事故类型
 * @returns 计算后的边权重
 */
function calculateEdgeWeight(edge: TunnelEdge, accidentType: AccidentType): number {
  if (edge.isClosed) {
    return CLOSED_WEIGHT;
  }

  let weight = edge.length;

  if (edge.waterDepth !== undefined && edge.waterDepth > WATER_DEPTH_THRESHOLD) {
    weight *= WATER_WEIGHT_MULTIPLIER;
  }

  if (accidentType === 'fire' && edge.ventilationDirection === 'forward') {
    weight *= VENTILATION_WEIGHT_MULTIPLIER;
  }

  return weight;
}

/**
 * 构建邻接表表示的图
 * @param nodes 节点列表
 * @param edges 边列表
 * @param accidentType 事故类型
 * @returns 邻接表，键为节点ID，值为相邻节点信息数组
 */
function buildAdjacencyList(
  nodes: TunnelNode[],
  edges: TunnelEdge[],
  accidentType: AccidentType
): Map<string, NeighborInfo[]> {
  const adjacency = new Map<string, NeighborInfo[]>();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    const weight = calculateEdgeWeight(edge, accidentType);

    const fromNeighbors = adjacency.get(edge.from);
    if (fromNeighbors) {
      fromNeighbors.push({ nodeId: edge.to, edgeId: edge.id, weight });
    }

    const toNeighbors = adjacency.get(edge.to);
    if (toNeighbors) {
      toNeighbors.push({ nodeId: edge.from, edgeId: edge.id, weight });
    }
  });

  return adjacency;
}

/**
 * 从open set中找到f值最小的节点
 * @param openSet open set集合
 * @param nodes A*节点信息映射
 * @returns f值最小的节点ID
 */
function findLowestFNode(openSet: Set<string>, nodes: Map<string, AStarNode>): string | null {
  let lowestF = INFINITY;
  let lowestNodeId: string | null = null;

  openSet.forEach((nodeId) => {
    const node = nodes.get(nodeId);
    if (node && node.f < lowestF) {
      lowestF = node.f;
      lowestNodeId = nodeId;
    }
  });

  return lowestNodeId;
}

/**
 * 重构路径，从终点回溯到起点
 * @param endNodeId 终点ID
 * @param startNodeId 起点ID
 * @param aStarNodes A*节点信息映射
 * @param edges 边列表
 * @returns 路径的节点序列、边序列和总距离
 */
function reconstructPath(
  endNodeId: string,
  startNodeId: string,
  aStarNodes: Map<string, AStarNode>,
  edges: TunnelEdge[]
): { nodes: string[]; edges: string[]; totalDistance: number } {
  const nodeSequence: string[] = [];
  const edgeSequence: string[] = [];
  let totalDistance = 0;

  let currentId: string | null = endNodeId;

  while (currentId !== null) {
    const current = aStarNodes.get(currentId);
    if (!current) break;

    nodeSequence.unshift(currentId);

    if (current.edgeId) {
      edgeSequence.unshift(current.edgeId);
      const edge = edges.find((e) => e.id === current.edgeId);
      if (edge) {
        totalDistance += edge.length;
      }
    }

    currentId = current.parent;
  }

  if (nodeSequence[0] !== startNodeId) {
    return { nodes: [], edges: [], totalDistance: 0 };
  }

  return { nodes: nodeSequence, edges: edgeSequence, totalDistance };
}

/**
 * A*寻路算法
 * @param nodes 巷道节点列表
 * @param edges 巷道边列表
 * @param startNodeId 起点节点ID
 * @param endNodeId 终点节点ID
 * @param accidentType 事故类型
 * @returns 最优路径Route对象，若无法到达则返回空路径
 */
export function aStar(
  nodes: TunnelNode[],
  edges: TunnelEdge[],
  startNodeId: string,
  endNodeId: string,
  accidentType: AccidentType
): Route {
  const nodeMap = new Map<string, TunnelNode>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  const startNode = nodeMap.get(startNodeId);
  const endNode = nodeMap.get(endNodeId);

  if (!startNode || !endNode) {
    return {
      id: `route-${Date.now()}`,
      nodes: [],
      edges: [],
      totalDistance: 0,
    };
  }

  if (startNodeId === endNodeId) {
    return {
      id: `route-${Date.now()}`,
      nodes: [startNodeId],
      edges: [],
      totalDistance: 0,
    };
  }

  const adjacency = buildAdjacencyList(nodes, edges, accidentType);

  const openSet = new Set<string>();
  const closedSet = new Set<string>();
  const aStarNodes = new Map<string, AStarNode>();

  const startH = euclideanDistance(startNode, endNode);
  aStarNodes.set(startNodeId, {
    id: startNodeId,
    g: 0,
    h: startH,
    f: startH,
    parent: null,
    edgeId: null,
  });
  openSet.add(startNodeId);

  while (openSet.size > 0) {
    const currentId = findLowestFNode(openSet, aStarNodes);
    if (!currentId) break;

    if (currentId === endNodeId) {
      const path = reconstructPath(endNodeId, startNodeId, aStarNodes, edges);
      return {
        id: `route-${Date.now()}`,
        nodes: path.nodes,
        edges: path.edges,
        totalDistance: path.totalDistance,
      };
    }

    openSet.delete(currentId);
    closedSet.add(currentId);

    const neighbors = adjacency.get(currentId) || [];

    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.nodeId)) continue;
      if (neighbor.weight === INFINITY) continue;

      const current = aStarNodes.get(currentId)!;
      const tentativeG = current.g + neighbor.weight;

      const neighborNode = nodeMap.get(neighbor.nodeId)!;
      const h = euclideanDistance(neighborNode, endNode);

      const existing = aStarNodes.get(neighbor.nodeId);

      if (!existing || tentativeG < existing.g) {
        aStarNodes.set(neighbor.nodeId, {
          id: neighbor.nodeId,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: currentId,
          edgeId: neighbor.edgeId,
        });

        if (!openSet.has(neighbor.nodeId)) {
          openSet.add(neighbor.nodeId);
        }
      }
    }
  }

  return {
    id: `route-${Date.now()}`,
    nodes: [],
    edges: [],
    totalDistance: 0,
  };
}
