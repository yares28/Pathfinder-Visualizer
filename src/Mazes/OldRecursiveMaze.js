import { ANIMATION_SPEEDS } from './NewMazeAlgorithms';

export function generateRecursiveMaze(grid, startNode, finishNode, checkpointNode = null) {
    if (!startNode || !finishNode) return;

    const walls = [];
    const visited = new Set();

    // Initialize borders
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[0].length; col++) {
            if (row === 0 || col === 0 || row === grid.length - 1 || col === grid[0].length - 1) {
                if (!isSpecialNode(row, col, startNode, finishNode, checkpointNode)) {
                    walls.push([row, col]);
                }
            }
        }
    }

    function isSpecialNode(row, col, startNode, finishNode, checkpointNode) {
        return (
            (row === startNode.row && col === startNode.col) ||
            (row === finishNode.row && col === finishNode.col) ||
            (checkpointNode && row === checkpointNode.row && col === checkpointNode.col)
        );
    }

    function addInnerWalls(h, minX, maxX, minY, maxY) {
        if (h) {
            if (maxX - minX < 2) return;

            const y = Math.floor(randomNumber(minY, maxY) / 2) * 2;
            addHorizontalWall(minX, maxX, y);

            addInnerWalls(!h, minX, maxX, minY, y - 1);
            addInnerWalls(!h, minX, maxX, y + 1, maxY);
        } else {
            if (maxY - minY < 2) return;

            const x = Math.floor(randomNumber(minX, maxX) / 2) * 2;
            addVerticalWall(minY, maxY, x);

            addInnerWalls(!h, minX, x - 1, minY, maxY);
            addInnerWalls(!h, x + 1, maxX, minY, maxY);
        }
    }

    function addHorizontalWall(minX, maxX, y) {
        const hole = Math.floor(randomNumber(minX, maxX) / 2) * 2 + 1;

        for (let i = minX; i <= maxX; i++) {
            if (i === hole) continue;
            if (!isSpecialNode(y, i, startNode, finishNode, checkpointNode)) {
                walls.push([y, i]);
            }
        }
    }

    function addVerticalWall(minY, maxY, x) {
        const hole = Math.floor(randomNumber(minY, maxY) / 2) * 2 + 1;

        for (let i = minY; i <= maxY; i++) {
            if (i === hole) continue;
            if (!isSpecialNode(i, x, startNode, finishNode, checkpointNode)) {
                walls.push([i, x]);
            }
        }
    }

    function randomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    // Start the recursive division
    addInnerWalls(true, 1, grid[0].length - 2, 1, grid.length - 2);

    return walls;
}