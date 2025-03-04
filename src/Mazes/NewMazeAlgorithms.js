// Import all maze generation algorithms
import { generateDFSMaze } from './DFSMazeGeneration';
import { generateRecursiveMaze } from './RecursiveMazeAlgorithm';
import { generateStairMaze } from './StairMaze';
import { generateRandomMaze } from './RandomMaze';
import { generateBasicRandomMaze } from './BasicRandomMaze';

// Define common speed constants for all maze algorithms
export const MAZE_SPEEDS = {
    instant: 0,
    fast: 1,
    slow: 100,
};

// Export them with the new names as expected by PathfindingVisualizer
export const generateDFSMazeNew = generateDFSMaze;
export const recursiveDivisionMazeNew = generateRecursiveMaze;
export const stairMazeNew = generateStairMaze;
export const randomMazeNew = generateRandomMaze;
export const basicRandomMazeNew = generateBasicRandomMaze;