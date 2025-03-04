export function generateRecursiveMaze(board, rowStart = 2, rowEnd = 30, colStart = 2, colEnd = 73, orientation = 'horizontal', surroundingWalls = false, type = 'wall') {
  if (rowEnd < rowStart || colEnd < colStart) {
    return;
  }

  if (!surroundingWalls) {
    // Initialize the board with surrounding walls
    for (let row = 0; row < board.height; row++) {
      for (let col = 0; col < board.width; col++) {
        const node = `${row}-${col}`;
        if (row === 0 || col === 0 || row === board.height - 1 || col === board.width - 1) {
          if (node !== board.start && node !== board.target && (!board.object || node !== board.object)) {
            board.wallsToAnimate.push({ id: node, type });
            board.nodes[node].status = type === "wall" ? "wall" : "unvisited";
            board.nodes[node].weight = type === "wall" ? 0 : 15;
          }
        }
      }
    }
    surroundingWalls = true;
  }

  if (orientation === "horizontal") {
    // Find all possible positions for the horizontal wall
    const possibleRows = [];
    for (let row = rowStart; row <= rowEnd; row += 2) {
      possibleRows.push(row);
    }
    if (possibleRows.length === 0) return;

    // Choose a random row and position for a passage
    const randomRowIndex = Math.floor(Math.random() * possibleRows.length);
    const currentRow = possibleRows[randomRowIndex];
    const passage = Math.floor(Math.random() * (colEnd - colStart + 1)) + colStart;

    // Add the horizontal wall with a passage
    for (let col = colStart; col <= colEnd; col++) {
      const node = `${currentRow}-${col}`;
      if (col !== passage && node !== board.start && node !== board.target && (!board.object || node !== board.object)) {
        board.wallsToAnimate.push({ id: node, type });
        board.nodes[node].status = type === "wall" ? "wall" : "unvisited";
        board.nodes[node].weight = type === "wall" ? 0 : 15;
      }
    }

    // Recursively divide the regions above and below the wall
    if (currentRow - 2 - rowStart > colEnd - colStart) {
      generateRecursiveMaze(board, rowStart, currentRow - 2, colStart, colEnd, orientation, surroundingWalls, type);
    } else {
      generateRecursiveMaze(board, rowStart, currentRow - 2, colStart, colEnd, "vertical", surroundingWalls, type);
    }
    if (rowEnd - (currentRow + 2) > colEnd - colStart) {
      generateRecursiveMaze(board, currentRow + 2, rowEnd, colStart, colEnd, orientation, surroundingWalls, type);
    } else {
      generateRecursiveMaze(board, currentRow + 2, rowEnd, colStart, colEnd, "vertical", surroundingWalls, type);
    }
  } else {
    // Find all possible positions for the vertical wall
    const possibleCols = [];
    for (let col = colStart; col <= colEnd; col += 2) {
      possibleCols.push(col);
    }
    if (possibleCols.length === 0) return;

    // Choose a random column and position for a passage
    const randomColIndex = Math.floor(Math.random() * possibleCols.length);
    const currentCol = possibleCols[randomColIndex];
    const passage = Math.floor(Math.random() * (rowEnd - rowStart + 1)) + rowStart;

    // Add the vertical wall with a passage
    for (let row = rowStart; row <= rowEnd; row++) {
      const node = `${row}-${currentCol}`;
      if (row !== passage && node !== board.start && node !== board.target && (!board.object || node !== board.object)) {
        board.wallsToAnimate.push({ id: node, type });
        board.nodes[node].status = type === "wall" ? "wall" : "unvisited";
        board.nodes[node].weight = type === "wall" ? 0 : 15;
      }
    }

    // Recursively divide the regions to the left and right of the wall
    if (rowEnd - rowStart > currentCol - 2 - colStart) {
      generateRecursiveMaze(board, rowStart, rowEnd, colStart, currentCol - 2, "horizontal", surroundingWalls, type);
    } else {
      generateRecursiveMaze(board, rowStart, rowEnd, colStart, currentCol - 2, orientation, surroundingWalls, type);
    }
    if (rowEnd - rowStart > colEnd - (currentCol + 2)) {
      generateRecursiveMaze(board, rowStart, rowEnd, currentCol + 2, colEnd, "horizontal", surroundingWalls, type);
    } else {
      generateRecursiveMaze(board, rowStart, rowEnd, currentCol + 2, colEnd, orientation, surroundingWalls, type);
    }
  }
  return board;
}

// Function to animate the maze generation
export function animateMazeGeneration(board, type) {
  const speeds = {
    instant: 0,
    fast: 1,
    slow: 100,
  };

  const delay = speeds[board.speed] || speeds.fast;

  if (delay <= 1) {
    // For instant/fast speed, apply all changes immediately without animation
    board.wallsToAnimate.forEach(node => {
      const currentHTMLNode = document.getElementById(node.id);
      if (currentHTMLNode) {
        currentHTMLNode.className = `node ${type === 'wall' ? 'node-wall' : 'node-weight'}`;
      }
    });
  } else {
    // For slow speed, use setTimeout for animation
    board.wallsToAnimate.forEach((node, index) => {
      setTimeout(() => {
        const currentHTMLNode = document.getElementById(node.id);
        if (currentHTMLNode) {
          currentHTMLNode.className = `node ${type === 'wall' ? 'node-wall' : 'node-weight'}`;
        }
      }, index * delay);
    });
  }
}
