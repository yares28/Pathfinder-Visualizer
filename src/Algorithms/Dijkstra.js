/**
 * =====================================================
 * Dijkstra.js
 * This file implements Dijkstra's algorithm to compute the shortest
 * path on a grid between a start node and an end node.
 * It updates each node with a distance value and a previousNode pointer,
 * allowing backtracking to reconstruct the optimal path.
 * The algorithm supports both animated (delayed) and instant executions.
 * =====================================================
 */

/**
 * Performs Dijkstra's algorithm on a grid to find the shortest path.
 * Returns an array of nodes in the order they were visited.
 *
 * @param {Array<Array<Object>>} grid - 2D array representing the grid.
 * @param {Object} startNode - The starting node.
 * @param {Object} endNode - The target node.
 * @param {string} speed - Visualization speed; 'instant' for no delay.
 * @param {boolean} isSecondPhase - Flag for applying second-phase styling.
 * @returns {Array<Object>} List of visited nodes in order.
 */
export async function dijkstra(grid, startNode, endNode, speed = 'fast', isSecondPhase = false) {
  // Array to capture the order of visited nodes
  const visitedNodesInOrder = [];
  // Initialize the start node's distance to 0
  startNode.distance = 0;
  // Flatten the grid into an array of nodes for easier processing
  const unvisitedNodes = getAllNodes(grid);

  // Reset every node's distance, previous pointer, and visited status
  for (const node of unvisitedNodes) {
    node.distance = Infinity;
    node.previousNode = null;
    node.isVisited = false;
  }
  // Ensure the start node distance remains 0 after reset
  startNode.distance = 0;

  // If using instant speed, perform algorithm without delays
  if (speed === 'instant') {
    while (unvisitedNodes.length) {
      // Sort the nodes based on their current distance
      sortNodesByDistance(unvisitedNodes);
      // Get the closest node (with the smallest distance)
      const closestNode = unvisitedNodes.shift();
      
      // Skip walls since they are not passable
      if (closestNode.isWall) continue;
      // If the smallest distance is Infinity, no further reachable nodes exist
      if (closestNode.distance === Infinity) return visitedNodesInOrder;
      
      // Mark node as visited and record it
      closestNode.isVisited = true;
      visitedNodesInOrder.push(closestNode);

      // Update visual style for non-special nodes to indicate they've been visited
      if (!closestNode.isStart && !closestNode.isEnd && !closestNode.isCheckpoint) {
        const element = document.getElementById(`node-${closestNode.row}-${closestNode.col}`);
        if (element) {
          element.className = `node ${isSecondPhase ? 'node-visited-second' : 'node-visited'} instant`;
        }
      }
      
      // If the target node is reached, return the order of visited nodes
      if (closestNode === endNode) {
        return visitedNodesInOrder;
      }
      
      // Update all unvisited neighbors of the current node
      updateUnvisitedNeighbors(closestNode, grid);
    }
    return visitedNodesInOrder;
  }

  // Set delay for animation: slower speed means longer delay
  const delay = speed === 'slow' ? 50 : 10;
  
  while (unvisitedNodes.length) {
    sortNodesByDistance(unvisitedNodes);
    const closestNode = unvisitedNodes.shift();
    
    if (closestNode.isWall) continue;
    if (closestNode.distance === Infinity) return visitedNodesInOrder;
    
    closestNode.isVisited = true;
    visitedNodesInOrder.push(closestNode);

    // Update node's visual representation if it's not a special node
    if (!closestNode.isStart && !closestNode.isEnd && !closestNode.isCheckpoint) {
      const element = document.getElementById(`node-${closestNode.row}-${closestNode.col}`);
      if (element) {
        element.className = `node ${isSecondPhase ? 'node-visited-second' : 'node-visited'}`;
      }
    }
    
    // If we have reached the end node, finish the algorithm
    if (closestNode === endNode) {
      return visitedNodesInOrder;
    }
    
    // Update neighboring nodes with new distances
    updateUnvisitedNeighbors(closestNode, grid);
    // Wait for the specified delay to create an animation effect
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  return visitedNodesInOrder;
}

/**
 * Sorts nodes in ascending order based on their 'distance' property.
 *
 * @param {Array<Object>} nodes - List of nodes to sort.
 */
function sortNodesByDistance(nodes) {
  nodes.sort((nodeA, nodeB) => nodeA.distance - nodeB.distance);
}

/**
 * For a given node, update its unvisited neighbors:
 * Set the neighbor's distance to current node's distance + 1 and update its previous pointer.
 *
 * @param {Object} node - The current node.
 * @param {Array<Array<Object>>} grid - The grid of nodes.
 */
function updateUnvisitedNeighbors(node, grid) {
  const unvisitedNeighbors = getUnvisitedNeighbors(node, grid);
  for (const neighbor of unvisitedNeighbors) {
    // Each move to a neighbor has a cost of 1
    neighbor.distance = node.distance + 1;
    // Set the previous node to help reconstruct the path later
    neighbor.previousNode = node;
  }
}

/**
 * Retrieves all unvisited neighbor nodes (up, down, left, right) for a given node.
 *
 * @param {Object} node - The current node.
 * @param {Array<Array<Object>>} grid - The grid of nodes.
 * @returns {Array<Object>} Array of unvisited neighbors.
 */
function getUnvisitedNeighbors(node, grid) {
  const neighbors = [];
  const { row, col } = node;

  // Check neighbor above if it exists
  if (row > 0) neighbors.push(grid[row - 1][col]);
  // Check neighbor below
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
  // Check neighbor to the left
  if (col > 0) neighbors.push(grid[row][col - 1]);
  // Check neighbor to the right
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);

  // Return only those neighbors that have not yet been visited
  return neighbors.filter(neighbor => !neighbor.isVisited);
}

/**
 * Flattens the 2D grid array into a single array containing all nodes.
 *
 * @param {Array<Array<Object>>} grid - The grid structure.
 * @returns {Array<Object>} Flat array of nodes.
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
 * Backtracks from the end node using previousNode pointers to construct the shortest path.
 *
 * @param {Object} finishNode - The finish node.
 * @returns {Array<Object>} Array of nodes representing the shortest path.
 */
export function getNodesInShortestPathOrder(finishNode) {
  const nodesInShortestPathOrder = [];
  let currentNode = finishNode;
  
  // Traverse backwards from finish to start, unshifting nodes into the array
  while (currentNode !== null) {
    nodesInShortestPathOrder.unshift(currentNode);
    currentNode = currentNode.previousNode;
  }
  return nodesInShortestPathOrder;
}
