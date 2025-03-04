import { ANIMATION_SPEEDS } from './NewMazeAlgorithms';

export function generateRandomMaze(grid, startNode, finishNode, checkpointNode = null) {
    if (!startNode || !finishNode) return;

    const walls = [];
    const wallDensity = 0.28; // 28% chance of a wall

    function isSpecialNode(row, col) {
        return (
            (row === startNode.row && col === startNode.col) ||
            (row === finishNode.row && col === finishNode.col) ||
            (checkpointNode && row === checkpointNode.row && col === checkpointNode.col)
        );
    }

    // First pass: random walls
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[0].length; col++) {
            if (!isSpecialNode(row, col) && Math.random() < wallDensity) {
                walls.push([row, col]);
            }
        }
    }

    // Clear space around special nodes
    function clearAroundNode(node) {
        const clearRadius = 2;
        for (let i = -clearRadius; i <= clearRadius; i++) {
            for (let j = -clearRadius; j <= clearRadius; j++) {
                const newRow = node.row + i;
                const newCol = node.col + j;
                if (
                    newRow >= 0 &&
                    newRow < grid.length &&
                    newCol >= 0 &&
                    newCol < grid[0].length
                ) {
                    walls.forEach((wall, index) => {
                        if (wall[0] === newRow && wall[1] === newCol) {
                            walls.splice(index, 1);
                        }
                    });
                }
            }
        }
    }

    // Clear around special nodes
    clearAroundNode(startNode);
    clearAroundNode(finishNode);
    if (checkpointNode) {
        clearAroundNode(checkpointNode);
    }

    return walls;
}