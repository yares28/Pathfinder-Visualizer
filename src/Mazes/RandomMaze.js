function isSpecialNode(board, node) {
  return node === board.start || node === board.target || (board.object && node === board.object);
}

function clearAroundSpecialNodes(board) {
  const specialNodes = [board.start, board.target];
  if (board.object) specialNodes.push(board.object);

  specialNodes.forEach(specialNode => {
    const [row, col] = specialNode.split('-').map(Number);
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const newRow = row + i;
        const newCol = col + j;
        if (newRow >= 0 && newRow < board.height && newCol >= 0 && newCol < board.width) {
          const node = `${newRow}-${newCol}`;
          if (!isSpecialNode(board, node)) {
            board.nodes[node].status = 'unvisited';
            board.nodes[node].weight = 0;
          }
        }
      }
    }
  });
}

export function generateRandomMaze(board) {
  const { height, width } = board;
  const density = 0.3; // 30% wall density
  const clusterProbability = 0.45; // Probability of creating wall clusters
  
  // Initialize all nodes as unvisited
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const node = `${row}-${col}`;
      if (!isSpecialNode(board, node)) {
        board.nodes[node].status = 'unvisited';
        board.nodes[node].weight = 0;
      }
    }
  }

  // First pass: Create initial random walls
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const node = `${row}-${col}`;
      if (!isSpecialNode(board, node) && Math.random() < density) {
        board.nodes[node].status = 'wall';
        board.wallsToAnimate.push({ id: node });
      }
    }
  }

  // Second pass: Create wall clusters for more natural-looking maze
  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const node = `${row}-${col}`;
      if (!isSpecialNode(board, node)) {
        // Count adjacent walls
        let adjacentWalls = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const adjacentNode = `${row + i}-${col + j}`;
            if (board.nodes[adjacentNode]?.status === 'wall') {
              adjacentWalls++;
            }
          }
        }

        // Add wall if there are adjacent walls and probability check passes
        if (adjacentWalls >= 2 && Math.random() < clusterProbability) {
          board.nodes[node].status = 'wall';
          board.wallsToAnimate.push({ id: node });
        }
      }
    }
  }

  // Third pass: Ensure maze is traversable by clearing paths
  for (let row = 0; row < height; row += 2) {
    for (let col = 0; col < width; col += 2) {
      const node = `${row}-${col}`;
      if (!isSpecialNode(board, node) && Math.random() < 0.4) {
        board.nodes[node].status = 'unvisited';
        // Remove this node from wallsToAnimate if it exists
        const index = board.wallsToAnimate.findIndex(wall => wall.id === node);
        if (index !== -1) {
          board.wallsToAnimate.splice(index, 1);
        }
      }
    }
  }

  // Clear areas around special nodes
  clearAroundSpecialNodes(board);

  return board;
}