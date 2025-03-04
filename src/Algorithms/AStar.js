/**
 * =====================================================
 * AStar.js
 * This file implements the A* pathfinding algorithm to compute the
 * shortest path from a start node to a finish node on a grid.
 * It updates nodes with distance, heuristic, and previousNode values,
 * and supports both animated and instant visualizations.
 * =====================================================
 */

/**
 * Performs the A* algorithm on a grid to find the shortest path.
 * Returns an array of nodes in the order they were visited.
 *
 * @param {Array<Array<Object>>} grid - 2D array representing the grid.
 * @param {Object} startNode - The starting node.
 * @param {Object} finishNode - The target node.
 * @param {string} speed - Visualization speed; 'instant' skips animations.
 * @param {boolean} isSecondPhase - If true, applies second-phase styling (e.g., for checkpoint paths).
 * @returns {Array<Object>} List of visited nodes in order.
 */
export async function astar(grid, startNode, finishNode, speed = 'fast', isSecondPhase = false) {
  // Array to hold the order in which nodes are visited
  const visitedNodesInOrder = [];
  // Get all nodes from the grid into a flat array
  const unvisitedNodes = getAllNodes(grid);

  // Reset all nodes (except the start) for the new search:
  for (const node of unvisitedNodes) {
    if (node !== startNode) {
      node.distance = Infinity;           // Cost from start to this node
      node.totalDistance = Infinity;      // Sum of distance and heuristic
      node.previousNode = null;           // Pointer for backtracking
      node.isVisited = false;             // Mark as unvisited
      // Compute heuristic using Manhattan distance from current node to finish
      node.heuristic = manhattanDistance(node, finishNode);
    }
  }

  // Initialize start node values
  startNode.distance = 0;
  startNode.heuristic = manhattanDistance(startNode, finishNode);
  startNode.totalDistance = startNode.heuristic;
  startNode.previousNode = null;
  startNode.isVisited = false;

  // If speed is 'instant', run without delay for immediate results
  if (speed === 'instant') {
    while (unvisitedNodes.length) {
      // Sort nodes by their total estimated distance (distance + heuristic)
      sortNodesByTotalDistance(unvisitedNodes);
      // Select the node with the lowest totalDistance
      const closestNode = unvisitedNodes.shift();

      // Skip walls as they are impassable
      if (closestNode.isWall) continue;
      // If the smallest distance is Infinity, there's no path
      if (closestNode.totalDistance === Infinity) return visitedNodesInOrder;

      // Mark the node as visited and add it to the visited order
      closestNode.isVisited = true;
      visitedNodesInOrder.push(closestNode);

      // For non-special nodes, update the visual representation immediately
      if (!closestNode.isStart && !closestNode.isEnd && !closestNode.isCheckpoint) {
        const element = document.getElementById(`node-${closestNode.row}-${closestNode.col}`);
        if (element) {
          // Apply either the primary or secondary visited class based on phase
          element.className = `node ${isSecondPhase ? 'node-visited-second' : 'node-visited'}`;
        }
      }

      // If finish node is reached, return the visited nodes
      if (closestNode === finishNode) {
        return visitedNodesInOrder;
      }

      // Update neighboring nodes' distances and pointers
      updateUnvisitedNeighborsAstar(closestNode, grid, finishNode);
    }
    return visitedNodesInOrder;
  }

  // For animated visualization, set a delay between iterations
  const delay = speed === 'slow' ? 50 : 10;

  while (unvisitedNodes.length) {
    sortNodesByTotalDistance(unvisitedNodes);
    const closestNode = unvisitedNodes.shift();

    if (closestNode.isWall) continue;
    if (closestNode.totalDistance === Infinity) return visitedNodesInOrder;

    closestNode.isVisited = true;
    visitedNodesInOrder.push(closestNode);

    // Update node's appearance to show it has been visited
    if (!closestNode.isStart && !closestNode.isEnd && !closestNode.isCheckpoint) {
      const element = document.getElementById(`node-${closestNode.row}-${closestNode.col}`);
      if (element) {
        element.className = `node ${isSecondPhase ? 'node-visited-second' : 'node-visited'}`;
      }
    }

    if (closestNode === finishNode) {
      return visitedNodesInOrder;
    }

    // Update the neighbor nodes for the current node
    updateUnvisitedNeighborsAstar(closestNode, grid, finishNode);
    // Pause for the delay period to animate the process
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return visitedNodesInOrder;
}

/**
 * Computes the Manhattan distance between a node and the finish node.
 * This heuristic assumes only vertical and horizontal movement.
 *
 * @param {Object} node - Current node.
 * @param {Object} finishNode - Target node.
 * @returns {number} Manhattan distance between the two nodes.
 */
function manhattanDistance(node, finishNode) {
  return Math.abs(node.row - finishNode.row) + Math.abs(node.col - finishNode.col);
}

/**
 * Sorts an array of nodes in ascending order based on their totalDistance property.
 *
 * @param {Array<Object>} unvisitedNodes - List of nodes to sort.
 */
function sortNodesByTotalDistance(unvisitedNodes) {
  unvisitedNodes.sort((nodeA, nodeB) => nodeA.totalDistance - nodeB.totalDistance);
}

/**
 * For each unvisited neighbor, updates its distance, totalDistance, and previousNode.
 * This helps to determine the best path to the finish node.
 *
 * @param {Object} node - The current node.
 * @param {Array<Array<Object>>} grid - The grid of nodes.
 * @param {Object} finishNode - The target node.
 */
function updateUnvisitedNeighborsAstar(node, grid, finishNode) {
  const unvisitedNeighbors = getUnvisitedNeighbors(node, grid);
  for (const neighbor of unvisitedNeighbors) {
    // Calculate the tentative distance from the start node via the current node
    const tentativeDistance = node.distance + 1;
    if (tentativeDistance < neighbor.distance) {
      // If a shorter path is found, update neighbor's values
      neighbor.previousNode = node;
      neighbor.distance = tentativeDistance;
      neighbor.totalDistance = neighbor.distance + manhattanDistance(neighbor, finishNode);
    }
  }
}

/**
 * Returns all unvisited neighbor nodes (up, down, left, right) of a given node.
 *
 * @param {Object} node - The current node.
 * @param {Array<Array<Object>>} grid - The grid of nodes.
 * @returns {Array<Object>} List of unvisited neighbors.
 */
function getUnvisitedNeighbors(node, grid) {
  const neighbors = [];
  const { row, col } = node;
  // Check top neighbor if exists
  if (row > 0) neighbors.push(grid[row - 1][col]);
  // Check bottom neighbor
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
  // Check left neighbor
  if (col > 0) neighbors.push(grid[row][col - 1]);
  // Check right neighbor
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);
  // Return only those neighbors that haven't been visited
  return neighbors.filter(neighbor => !neighbor.isVisited);
}

/**
 * Flattens the 2D grid into a single array of nodes.
 *
 * @param {Array<Array<Object>>} grid - The grid structure.
 * @returns {Array<Object>} Flat array containing all nodes.
 */
function getAllNodes(grid) {
  const nodes = [];
  for (const row of grid) {
    for (const node of row) {
      nodes.push(node);
    }
  }
  return nodes;
}

/**
 * Backtracks from the finish node to construct the shortest path.
 * Follows the previousNode pointers from finish back to start.
 *
 * @param {Object} finishNode - The finish node.
 * @returns {Array<Object>} List of nodes forming the shortest path.
 */
export function getNodesInShortestPathOrder(finishNode) {
  const nodesInShortestPathOrder = [];
  let currentNode = finishNode;

  // Unshift adds the node at the beginning to reverse the order
  while (currentNode !== null) {
    nodesInShortestPathOrder.unshift(currentNode);
    currentNode = currentNode.previousNode;
  }
  return nodesInShortestPathOrder;
}
