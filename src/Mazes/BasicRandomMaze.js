function isSpecialNode(board, node) {
  return node === board.start || node === board.target || (board.object && node === board.object);
}

function addBorder(board) {
  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      if (row === 0 || col === 0 || row === board.height - 1 || col === board.width - 1) {
        const node = `${row}-${col}`;
        if (!isSpecialNode(board, node)) {
          board.nodes[node].status = 'wall';
          board.wallsToAnimate.push({ id: node });
        }
      }
    }
  }
}

export function generateBasicRandomMaze(board) {
  const { height, width } = board;
  const density = 0.25; // 25% wall density
  
  // Add border walls
  addBorder(board);

  // Create walls in a checkerboard pattern with random skips
  for (let row = 2; row < height - 2; row += 2) {
    for (let col = 2; col < width - 2; col += 2) {
      const node = `${row}-${col}`;
      
      if (!isSpecialNode(board, node) && Math.random() < density) {
        // Add center wall
        board.nodes[node].status = 'wall';
        board.wallsToAnimate.push({ id: node });

        // Randomly extend walls in cardinal directions
        const directions = [
          [0, 1], // right
          [0, -1], // left
          [1, 0], // down
          [-1, 0], // up
        ];

        // Randomly choose 1 or 2 directions to extend the wall
        const numExtensions = Math.random() < 0.3 ? 2 : 1;
        const shuffledDirections = directions.sort(() => Math.random() - 0.5);

        for (let i = 0; i < numExtensions; i++) {
          const [dx, dy] = shuffledDirections[i];
          const extendedNode = `${row + dx}-${col + dy}`;
          
          if (!isSpecialNode(board, extendedNode)) {
            board.nodes[extendedNode].status = 'wall';
            board.wallsToAnimate.push({ id: extendedNode });
          }
        }
      }
    }
  }

  // Clear paths around special nodes
  [board.start, board.target].forEach(specialNode => {
    const [row, col] = specialNode.split('-').map(Number);
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const newRow = row + i;
        const newCol = col + j;
        if (newRow >= 0 && newRow < height && newCol >= 0 && newCol < width) {
          const node = `${newRow}-${newCol}`;
          if (!isSpecialNode(board, node)) {
            board.nodes[node].status = 'unvisited';
            // Remove from wallsToAnimate if it exists
            const index = board.wallsToAnimate.findIndex(wall => wall.id === node);
            if (index !== -1) {
              board.wallsToAnimate.splice(index, 1);
            }
          }
        }
      }
    }
  });

  return board;
}