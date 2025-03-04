/**
 * Generates a perfect maze using the Depth-First Search (DFS) algorithm.
 * @param {Array<Array<Object>>} grid - The grid of nodes.
 * @param {string} speed - The speed of the animation (optional).
 * @returns {Array<Array<Object>>} The grid with walls removed to form a maze.
 */
export async function generateDFSMaze(grid, speed = 'fast') {
  const stack = [];
  const startNode = grid[0][0];
  startNode.isVisited = true;
  stack.push(startNode);

  // Animation delay based on speed
  const speeds = {
    instant: 0,
    fast: 1,
    slow: 100,
  };

  const delay = speeds[speed] || speeds.fast;

  // Recursive function to generate the maze
  const dfs = async (node) => {
    // Get unvisited neighbors in random order
    const neighbors = getUnvisitedNeighbors(node, grid);

    if (delay <= 1) {
      // For instant/fast speed, process all neighbors without animation
      while (neighbors.length > 0) {
        const randomIndex = Math.floor(Math.random() * neighbors.length);
        const neighbor = neighbors[randomIndex];

        const wallNode = getWallBetween(node, neighbor, grid);
        if (wallNode) {
          wallNode.isWall = false;
          const wallElement = document.getElementById(`node-${wallNode.row}-${wallNode.col}`);
          if (wallElement) {
            wallElement.className = 'node';
          }
        }

        neighbor.isVisited = true;
        stack.push(neighbor);
        await dfs(neighbor);
        neighbors.splice(randomIndex, 1);
      }
    } else {
      // For slow speed, animate the process
      while (neighbors.length > 0) {
        const randomIndex = Math.floor(Math.random() * neighbors.length);
        const neighbor = neighbors[randomIndex];

        const wallNode = getWallBetween(node, neighbor, grid);
        if (wallNode) {
          wallNode.isWall = false;
          const wallElement = document.getElementById(`node-${wallNode.row}-${wallNode.col}`);
          if (wallElement) {
            wallElement.className = 'node';
          }
        }

        neighbor.isVisited = true;
        stack.push(neighbor);

        const element = document.getElementById(`node-${node.row}-${node.col}`);
        if (element) {
          element.className = 'node node-visited';
          await new Promise(resolve => setTimeout(resolve, delay));
          element.className = 'node';
        }

        await dfs(neighbor);
        neighbors.splice(randomIndex, 1);
      }
    }
  };

  // Initialize all nodes as walls
  for (const row of grid) {
    for (const node of row) {
      if (!node.isStart && !node.isEnd && !node.isCheckpoint) {
        node.isWall = true;
        const element = document.getElementById(`node-${node.row}-${node.col}`);
        if (element) {
          element.className = 'node node-wall';
        }
      }
    }
  }

  await dfs(startNode);

  // Clear walls around special nodes
  clearAroundSpecialNodes(grid);

  return grid;
}

/**
 * Retrieves all unvisited neighbors of a given node.
 * @param {Object} node - The current node.
 * @param {Array<Array<Object>>} grid - The grid of nodes.
 * @returns {Array<Object>} An array of unvisited neighbor nodes.
 */
function getUnvisitedNeighbors(node, grid) {
  const neighbors = [];
  const { col, row } = node;

  // Check the node above.
  if (row > 0 && !grid[row - 1][col].isVisited) neighbors.push(grid[row - 1][col]);
  // Check the node below.
  if (row < grid.length - 1 && !grid[row + 1][col].isVisited) neighbors.push(grid[row + 1][col]);
  // Check the node to the left.
  if (col > 0 && !grid[row][col - 1].isVisited) neighbors.push(grid[row][col - 1]);
  // Check the node to the right.
  if (col < grid[0].length - 1 && !grid[row][col + 1].isVisited) neighbors.push(grid[row][col + 1]);

  return neighbors;
}

function getWallBetween(nodeA, nodeB, grid) {
  const rowDiff = nodeB.row - nodeA.row;
  const colDiff = nodeB.col - nodeA.col;

  if (Math.abs(rowDiff) === 2) {
    return grid[nodeA.row + rowDiff / 2][nodeA.col];
  } else if (Math.abs(colDiff) === 2) {
    return grid[nodeA.row][nodeA.col + colDiff / 2];
  }
  return null;
}

function clearAroundSpecialNodes(grid) {
  for (const row of grid) {
    for (const node of row) {
      if (node.isStart || node.isEnd || node.isCheckpoint) {
        // Clear walls in a small radius around special nodes
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const newRow = node.row + i;
            const newCol = node.col + j;
            if (newRow >= 0 && newRow < grid.length &&
              newCol >= 0 && newCol < grid[0].length) {
              const neighbor = grid[newRow][newCol];
              neighbor.isWall = false;
              const element = document.getElementById(`node-${newRow}-${newCol}`);
              if (element) {
                element.className = 'node';
              }
            }
          }
        }
      }
    }
  }
}

const createNode = (row, col) => ({
  row,
  col,
  isVisited: false,
  // Add other properties as needed
});
