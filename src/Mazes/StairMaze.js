function stairMaze(board) {
  const { height, width } = board;
  let currentRow = 2;
  let currentCol = 2;
  const step = 3;

  while (currentRow < height - 2 && currentCol < width - 2) {
    // Create horizontal line
    for (let c = currentCol; c < Math.min(currentCol + step, width - 2); c++) {
      const node = `${currentRow}-${c}`;
      if (!isSpecialNode(board, node)) {
        board.nodes[node].status = "wall";
        board.wallsToAnimate.push({ id: node, type: 'wall' });
      }
    }

    // Create vertical line
    for (let r = currentRow; r < Math.min(currentRow + step, height - 2); r++) {
      const node = `${r}-${currentCol + step - 1}`;
      if (!isSpecialNode(board, node)) {
        board.nodes[node].status = "wall";
        board.wallsToAnimate.push({ id: node, type: 'wall' });
      }
    }

    currentRow += step;
    currentCol += step;
  }

  // Add border walls
  addBorder(board);

  return board;
}

function isSpecialNode(board, node) {
  return node === board.start || node === board.target;
}

function addBorder(board) {
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      if (r === 0 || c === 0 || r === board.height - 1 || c === board.width - 1) {
        const node = `${r}-${c}`;
        if (!isSpecialNode(board, node)) {
          const currentHTMLNode = document.getElementById(node);
          board.wallsToAnimate.push(currentHTMLNode);
          board.nodes[node].status = "wall";
        }
      }
    }
  }
}

module.exports = { stairMaze };