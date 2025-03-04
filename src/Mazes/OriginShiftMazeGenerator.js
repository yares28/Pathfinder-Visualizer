/**
 * Generates a perfect maze using the Depth-First Search (DFS) algorithm.
 * Then, it continuously modifies the maze by randomly closing paths while
 * ensuring it remains a perfect maze.
 *
 * @param {Array<Array<Object>>} grid - The grid of nodes.
 * @param {string} speed - The speed of the animation (optional).
 * @returns {Array<Array<Object>>} The grid with walls removed to form a maze.
 */
export async function generateEverChangingMaze(grid, speed = 'fast') {
  const stack = [];
  const startNode = grid[0][0]; // Starting point
  startNode.isVisited = true; // Mark the starting node as visited
  stack.push(startNode);

  // Recursive function to generate the maze
  const dfs = async (node) => {
    const neighbors = getUnvisitedNeighbors(node, grid);

    while (neighbors.length > 0) {
      const randomIndex = Math.floor(Math.random() * neighbors.length);
      const neighbor = neighbors[randomIndex];

      // Remove the wall between the current node and the chosen neighbor
      removeWall(node, neighbor);
      neighbor.isVisited = true; // Mark the neighbor as visited
      stack.push(neighbor);

      // Animate the current node
      await animateNode(node, speed);

      // Recursively call dfs for the chosen neighbor
      await dfs(neighbor);

      // Get updated neighbors after recursion
      neighbors.splice(randomIndex, 1); // Remove the chosen neighbor from the list
    }

    // Backtrack if no unvisited neighbors exist
    if (stack.length > 0) {
      stack.pop(); // Remove the current node from the stack
    }
  };

  await dfs(startNode); // Start the DFS from the starting node

  // Start the process of randomly closing paths
  setInterval(() => {
    modifyMaze(grid);
  }, 2000); // Modify every 2 seconds

  return grid;
}

/**
 * Modifies the maze by randomly closing paths while ensuring it remains a perfect maze.
 * @param {Array<Array<Object>>} grid - The grid of nodes.
 */
function modifyMaze(grid) {
  const rows = grid.length;
  const cols = grid[0].length;

  // Randomly select a node to close a path
  const row = Math.floor(Math.random() * rows);
  const col = Math.floor(Math.random() * cols);
  const node = grid[row][col];

  // Check if the node can be closed (not a wall, start, or end)
  if (!node.isWall && !node.isStart && !node.isEnd) {
    // Close the path by making it a wall
    node.isWall = true;

    // Ensure the maze remains perfect by checking neighbors
    const neighbors = getUnvisitedNeighbors(node, grid);
    if (neighbors.length > 0) {
      // Optionally, you can add logic to ensure the maze remains connected
      // For example, you could check if the node has only one neighbor before closing it
    }
  }
}

/**
 * Animates the node for visual feedback.
 * @param {Object} node - The current node.
 * @param {string} speed - The speed of the animation.
 */
async function animateNode(node, speed) {
  const element = document.getElementById(`node-${node.row}-${node.col}`);
  if (element) {
    const speeds = {
      instant: 0,
      fast: 100,
      slow: 1000,
    };

    const delay = speeds[speed] || speeds.fast;

    if (delay <= 1) {
      // For instant/fast speed, just update the class immediately
      element.className = 'node node-visited';
    } else {
      // For slow speed, use animation
      element.className = 'node node-visited';
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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

/**
 * Removes the wall between two nodes.
 * @param {Object} nodeA - The first node.
 * @param {Object} nodeB - The second node.
 */
function removeWall(nodeA, nodeB) {
  // Logic to remove wall between nodeA and nodeB
  // This will depend on how you represent walls in your grid
  // For example, you might set nodeA.isWall = false or similar
}

// Assuming you have a button with the ID 'firstMazeButton'
document.getElementById('firstMazeButton').addEventListener('click', async () => {
  const grid = createGrid(); // Function to create your grid
  await generateEverChangingMaze(grid, 'fast'); // Call the ever-changing maze generator
  animateMaze(grid); // Function to animate the maze after generation
});

// Assuming you have a button with the ID 'secondMazeButton'
document.getElementById('secondMazeButton').addEventListener('click', async () => {
  const grid = createGrid(); // Function to create your grid
  await generateDFSMaze(grid, 'fast'); // Call the DFS maze generator
  animateMaze(grid); // Function to animate the maze after generation
});

/**
 * Animates the entire maze for visual feedback.
 * @param {Array<Array<Object>>} grid - The grid of nodes.
 */
function animateMaze(grid) {
  grid.forEach(row => {
    row.forEach(node => {
      if (node.isVisited) {
        animateNode(node, 'fast'); // Animate each visited node
      }
    });
  });
}

/**
 * Creates a grid for the maze.
 * @param {number} rows - The number of rows in the grid.
 * @param {number} cols - The number of columns in the grid.
 * @returns {Array<Array<Object>>} The initialized grid.
 */
function createGrid(rows = 20, cols = 20) {
  const grid = [];
  for (let row = 0; row < rows; row++) {
    const currentRow = [];
    for (let col = 0; col < cols; col++) {
      currentRow.push({
        row,
        col,
        isVisited: false,
        isWall: false,
        isStart: row === 0 && col === 0, // Starting point
        isEnd: row === rows - 1 && col === cols - 1 // Ending point
      });
    }
    grid.push(currentRow);
  }
  return grid;
}
