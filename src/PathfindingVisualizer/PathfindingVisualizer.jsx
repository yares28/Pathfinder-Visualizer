// =====================================================
// PathfindingVisualizer.jsx
// Main React component for visualizing pathfinding algorithms.
// This file manages the grid state, user interactions (mouse events, drag & drop),
// algorithm visualizations (Dijkstra and A*), maze generation, and UI controls.
// It imports various algorithm and maze generator modules and uses a throttling
// function from lodash to optimize performance.
// =====================================================

import React, { Component } from 'react';
import Node from './Node/Node'; // Import Node component for grid cells
import './PathfindingVisualizer.css'; // Import CSS styling for the visualizer
// Import pathfinding algorithms and helper function to retrieve the shortest path
import { dijkstra, getNodesInShortestPathOrder } from '../Algorithms/Dijkstra';
import { astar } from '../Algorithms/AStar';
// Import maze generation algorithms (new and old)
import { generateDFSMazeNew, recursiveDivisionMazeNew, stairMazeNew, randomMazeNew, basicRandomMazeNew } from '../Mazes/NewMazeAlgorithms';
import { generateRandomMaze as generateOldRandomMaze } from '../Mazes/OldRandomMaze';
import { generateRecursiveMaze as generateOldRecursiveMaze } from '../Mazes/OldRecursiveMaze';
// Import lodash throttle for limiting function calls
import { throttle } from 'lodash';
// Import FontAwesome icons for UI elements
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faBullseye, faLocationDot } from '@fortawesome/free-solid-svg-icons';

// Define animation speed constants
const ANIMATION_SPEEDS = {
  instant: 0,
  fast: 2,  // Fast animation speed (near-instant visual updates)
  slow: 100, // Slow animation speed (delayed visual updates)
};

export default class PathfindingVisualizer extends Component {
  constructor(props) {
    super(props);
    // Initialize state with grid configuration and UI flags
    this.state = {
      grid: [],                     // 2D array representing the grid nodes
      isMousePressed: false,        // Tracks whether the mouse is pressed (for drawing walls)
      isRunning: false,             // Indicates if an algorithm is currently running
      startNode: { row: 15, col: 25 }, // Starting node coordinates
      endNode: { row: 15, col: 51 },   // Ending node coordinates
      visitedNodesFirstPhase: [],   // Holds visited nodes from the first phase (if using a checkpoint)
      checkpoint: null,             // Optional checkpoint for multi-phase visualization
      animationSpeed: ANIMATION_SPEEDS.fast, // Current animation speed setting
      dragging: null,               // Tracks if a special node (start, end, checkpoint) is being dragged
      wallMode: null,               // Indicates if walls are being added or removed
      speed: 'fast',                // Current speed label used by maze/algorithm functions
      isVisualizing: false,         // Indicates if a visualization (maze or algorithm) is in progress
      lastUpdatedCell: null,        // Used to prevent redundant updates when drawing
      boostWallEnabled: false,      // Flag for enabling boost wall mode (affects wall drawing pattern)
      isBoostWallEnabled: false,    // (Possibly redundant state for boost wall; may be used interchangeably)
    };

    // Create a throttled version of grid update to optimize performance during rapid mouse movements
    this.throttledGridUpdate = throttle((newGrid) => {
      this.setState({ grid: newGrid });
    }, 16); // Throttled to roughly 60fps (16ms)

    // Set initial positions for start and end nodes (used for grid reset)
    this.initialStartNode = {
      row: 15,
      col: 15
    };
    this.initialEndNode = {
      row: 15,
      col: 56
    };
  }

  // Lifecycle method: componentDidMount is called once the component is mounted.
  // It initializes the grid.
  componentDidMount() {
    this.initializeGrid();
  }

  // =====================================================
  // Grid Initialization and Node Creation Functions
  // =====================================================

  // Creates a 2D grid of nodes.
  initializeGrid = () => {
    const grid = [];
    // Loop over rows (32 rows)
    for (let row = 0; row < 32; row++) {
      const currentRow = [];
      // Loop over columns (75 columns)
      for (let col = 0; col < 75; col++) {
        // Create a node for each cell in the grid
        currentRow.push(this.createNode(row, col));
      }
      grid.push(currentRow);
    }
    // Update state with the newly created grid
    this.setState({ grid });
  };

  // Creates an individual node object with properties determining its role.
  createNode = (row, col) => {
    const { startNode, endNode, checkpoint } = this.state;
    return {
      row,
      col,
      isStart: row === startNode.row && col === startNode.col,   // Check if node is the start node
      isEnd: row === endNode.row && col === endNode.col,           // Check if node is the end node
      isCheckpoint: checkpoint ? (row === checkpoint.row && col === checkpoint.col) : false, // Optional checkpoint
      isWall: false,         // Whether the node is a wall
      isVisited: false,      // Whether the node has been visited by an algorithm
      distance: Infinity,    // Distance metric for pathfinding algorithms (initialized to infinity)
      previousNode: null,    // Pointer to the previous node for reconstructing the shortest path
    };
  };

  // =====================================================
  // Mouse and Drag Event Handlers for User Interaction
  // =====================================================

  // Handles mouse down events on a grid cell.
  handleMouseDown = (row, col) => {
    // Do not process if an algorithm is running or if a special node is being dragged.
    if (this.state.isRunning || this.state.dragging) return;

    const node = this.state.grid[row][col];
    // Prevent modifying start, end, or checkpoint nodes
    if (node.isStart || node.isEnd || node.isCheckpoint) return;

    // Determine wall mode: if node is already a wall, then remove it; otherwise, add a wall.
    const wallMode = node.isWall ? 'remove' : 'add';

    // If boost wall mode is enabled and adding a wall, create a pattern of walls.
    if (this.state.boostWallEnabled && wallMode === 'add') {
      this.createBoostWalls(row, col, wallMode);
    } else {
      // Update the visual representation of the node immediately.
      this.updateNodeVisual(row, col, wallMode);
      // Get a new grid with the updated wall state.
      const newGrid = this.getNewGridWithWallMode(this.state.grid, row, col, wallMode);
      this.setState({
        isMousePressed: true,
        wallMode,
        grid: newGrid,
        lastUpdatedCell: `${row}-${col}`,
      });
    }

    // Set the flag for mouse pressed and update the wall mode.
    this.setState({ isMousePressed: true, wallMode });
  };

  // Handles mouse entering a grid cell (for dragging to draw walls).
  handleMouseEnter = (row, col) => {
    // Only process if mouse is pressed and not dragging a special node.
    if (!this.state.isMousePressed || this.state.dragging) return;

    const { wallMode, grid, lastUpdatedCell, boostWallEnabled } = this.state;
    const currentCell = `${row}-${col}`;

    // Prevent processing the same cell multiple times
    if (lastUpdatedCell === currentCell) return;

    const node = grid[row][col];
    // Skip if the node is a special node (start, end, or checkpoint)
    if (node.isStart || node.isEnd || node.isCheckpoint) return;

    // If boost wall mode is enabled, apply boost wall logic.
    if (boostWallEnabled && wallMode === 'add') {
      this.createBoostWalls(row, col, wallMode);
    } else {
      // Update visual and grid state for the node.
      this.updateNodeVisual(row, col, wallMode);
      const newGrid = this.getNewGridWithWallMode(grid, row, col, wallMode);
      // Use throttling to avoid performance issues during rapid mouse movement.
      this.throttledGridUpdate(newGrid);
      this.setState({ lastUpdatedCell: currentCell });
    }
  };

  // Updates the CSS class for a node element to reflect wall status.
  updateNodeVisual = (row, col, wallMode) => {
    const element = document.getElementById(`node-${row}-${col}`);
    if (element) {
      // If adding a wall, include 'node-wall' class; otherwise, remove it.
      element.className = `node ${wallMode === 'add' ? 'node-wall' : ''}`;
    }
  };

  // Handles mouse up event; stops drawing walls and cancels throttled updates.
  handleMouseUp = () => {
    // Cancel any pending throttled grid updates
    this.throttledGridUpdate.cancel();
    this.setState({
      isMousePressed: false,
      wallMode: null,
      lastUpdatedCell: null,
      // Preserve visited nodes if already in first phase of visualization
      visitedNodesFirstPhase: this.state.visitedNodesFirstPhase 
    });
  };

  // Returns a new grid with an updated wall state for the targeted cell.
  getNewGridWithWallMode = (grid, row, col, wallMode) => {
    const newGrid = grid.slice(); // Shallow copy of grid
    const node = newGrid[row][col];

    // Do not update special nodes
    if (node.isStart || node.isEnd || node.isCheckpoint) return newGrid;

    // Update the node’s wall status based on the wall mode.
    newGrid[row][col] = {
      ...node,
      isWall: wallMode === 'add'
    };

    return newGrid;
  };

  // Creates walls in a boost pattern (center plus adjacent cells).
  createBoostWalls = (centerRow, centerCol, wallMode) => {
    const { grid } = this.state;
    const newGrid = grid.slice();
    // Define the pattern: center, above, below, left, and right cells.
    const pattern = [
      [0, 0],  // Center cell
      [-1, 0], // Cell above
      [1, 0],  // Cell below
      [0, -1], // Cell to the left
      [0, 1]   // Cell to the right
    ];

    let anyWallCreated = false;
    // Loop through each offset in the pattern.
    pattern.forEach(([rowOffset, colOffset]) => {
      const newRow = centerRow + rowOffset;
      const newCol = centerCol + colOffset;

      // Check grid boundaries
      if (newRow >= 0 && newRow < grid.length && newCol >= 0 && newCol < grid[0].length) {
        const node = grid[newRow][newCol];
        // Do not override special nodes
        if (!node.isStart && !node.isEnd && !node.isCheckpoint) {
          this.updateNodeVisual(newRow, newCol, wallMode);
          newGrid[newRow][newCol] = {
            ...node,
            isWall: wallMode === 'add'
          };
          anyWallCreated = true;
        }
      }
    });

    if (anyWallCreated) {
      // Cancel any pending updates to maintain consistency
      this.throttledGridUpdate.cancel();

      // Immediately update state with the new grid and wall mode
      this.setState({
        grid: newGrid,
        lastUpdatedCell: `${centerRow}-${centerCol}`,
        isMousePressed: true,
        wallMode
      });
    }
  };

  // Searches the grid for a checkpoint node and returns its position.
  findCheckpointPosition = (grid) => {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[0].length; col++) {
        if (grid[row][col].isCheckpoint) {
          return { row, col };
        }
      }
    }
    return null;
  };

  // Returns a random empty position from the grid (not a wall or special node).
  getRandomEmptyPosition = (grid) => {
    const rows = grid.length;
    const cols = grid[0].length;
    let attempts = 0;
    const maxAttempts = 100;

    // Attempt to find a random empty cell
    while (attempts < maxAttempts) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      const node = grid[row][col];

      if (!node.isWall && !node.isStart && !node.isEnd && !node.isCheckpoint) {
        return { row, col };
      }
      attempts++;
    }

    // If random attempts fail, perform a full scan for an empty cell.
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const node = grid[row][col];
        if (!node.isWall && !node.isStart && !node.isEnd && !node.isCheckpoint) {
          return { row, col };
        }
      }
    }
    return null;
  };

  // =====================================================
  // Visualization Functions for Algorithms (Dijkstra and A*)
  // =====================================================

  // Visualizes Dijkstra’s algorithm.
  visualizeDijkstra = async () => {
    // Prevent multiple concurrent visualizations
    if (this.state.isRunning) return;
    this.setState({ isRunning: true, isVisualizing: true });

    const { grid, speed } = this.state;
    let start = null;
    let end = null;
    
    // Find the current start and end nodes in the grid
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[0].length; col++) {
        if (grid[row][col].isStart) start = grid[row][col];
        if (grid[row][col].isEnd) end = grid[row][col];
      }
    }

    // If either start or end is missing, cancel the visualization.
    if (!start || !end) {
      this.setState({ isRunning: false, isVisualizing: false });
      return;
    }

    // Clear any previous visualization markings.
    this.clearVisualization();

    try {
      const checkpointPos = this.findCheckpointPosition(grid);

      // If a checkpoint exists, perform a two-phase visualization.
      if (checkpointPos) {
        const checkpointNode = grid[checkpointPos.row][checkpointPos.col];
        
        // Phase 1: From start node to checkpoint node.
        const visitedNodesFirst = await dijkstra(grid, start, checkpointNode, speed);
        
        if (!checkpointNode.isVisited) {
          // If checkpoint is unreachable, try a direct path from start to end.
          const directPath = await dijkstra(grid, start, end, speed);
          const pathNodes = getNodesInShortestPathOrder(end);
          await this.animatePath(pathNodes, speed);
        } else {
          // If checkpoint is reached, retrieve the path to the checkpoint.
          const pathToCheckpoint = getNodesInShortestPathOrder(checkpointNode);

          // Reset grid parameters for phase 2.
          for (const row of grid) {
            for (const node of row) {
              node.distance = Infinity;
              node.previousNode = null;
              node.isVisited = false;
            }
          }

          // Phase 2: From checkpoint to end node.
          const visitedNodesSecond = await dijkstra(grid, checkpointNode, end, speed, true);
          
          // Animate both phases sequentially.
          await this.animatePath(pathToCheckpoint, speed);
          const pathToEnd = getNodesInShortestPathOrder(end);
          await this.animatePath(pathToEnd, speed);
        }
      } else {
        // No checkpoint: perform direct visualization from start to end.
        const visitedNodes = await dijkstra(grid, start, end, speed);
        const pathNodes = getNodesInShortestPathOrder(end);
        await this.animatePath(pathNodes, speed);
      }
    } catch (error) {
      console.error('Algorithm error:', error);
    }

    // Reset visualization flags.
    this.setState({ isRunning: false, isVisualizing: false });
  };

  // Visualizes the A* algorithm (similar structure to Dijkstra's visualization).
  visualizeAStar = async () => {
    if (this.state.isRunning) return;
    this.setState({ isRunning: true, isVisualizing: true });

    let start = null;
    let end = null;
    const { grid, speed } = this.state;

    // Locate the start and end nodes.
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[0].length; col++) {
        if (grid[row][col].isStart) start = grid[row][col];
        if (grid[row][col].isEnd) end = grid[row][col];
      }
    }

    if (!start || !end) {
      this.setState({ isRunning: false, isVisualizing: false });
      return;
    }

    // Clear any previous visualization.
    this.clearVisualization();

    try {
      const checkpointPos = this.findCheckpointPosition(grid);

      if (checkpointPos) {
        const checkpointNode = grid[checkpointPos.row][checkpointPos.col];

        // Phase 1: A* from start to checkpoint.
        const visitedNodesFirst = await astar(grid, start, checkpointNode, speed);

        if (!checkpointNode.isVisited) {
          // If checkpoint is unreachable, try direct A* from start to end.
          const directPath = await astar(grid, start, end, speed);
          const pathNodes = getNodesInShortestPathOrder(end);
          await this.animatePath(pathNodes, speed);
        } else {
          const pathToCheckpoint = getNodesInShortestPathOrder(checkpointNode);

          // Reset grid values for phase 2.
          for (const row of grid) {
            for (const node of row) {
              node.distance = Infinity;
              node.totalDistance = Infinity;
              node.previousNode = null;
              node.isVisited = false;
            }
          }

          // Phase 2: A* from checkpoint to end.
          const visitedNodesSecond = await astar(grid, checkpointNode, end, speed, true);

          // Animate both segments sequentially.
          await this.animatePath(pathToCheckpoint, speed);
          const pathToEnd = getNodesInShortestPathOrder(end);
          await this.animatePath(pathToEnd, speed);
        }
      } else {
        // No checkpoint: perform direct A* visualization.
        const visitedNodes = await astar(grid, start, end, speed);
        const pathNodes = getNodesInShortestPathOrder(end);
        await this.animatePath(pathNodes, speed);
      }
    } catch (error) {
      console.error('Algorithm error:', error);
    }

    this.setState({ isRunning: false, isVisualizing: false });
  };

  // Clears all visualization markings from the grid, resetting nodes to their original state.
  clearVisualization = () => {
    const { grid, visitedNodesFirstPhase } = this.state;
    for (const row of grid) {
      for (const node of row) {
        node.isVisited = false;
        node.distance = Infinity;
        node.previousNode = null;
        // Update the node’s CSS class based on its type.
        const element = document.getElementById(`node-${node.row}-${node.col}`);
        if (node.isStart) element.className = 'node node-start';
        else if (node.isEnd) element.className = 'node node-end';
        else if (node.isCheckpoint) element.className = 'node node-checkpoint';
        else if (node.isWall) element.className = 'node node-wall';
        else element.className = 'node';
      }
    }
    // Preserve visited nodes from the first phase if needed.
    this.setState({ visitedNodesFirstPhase });
  };

  // Clears only the visited nodes’ styles (useful for re-running the algorithm without removing walls).
  clearVisitedNodes = () => {
    const { grid } = this.state;
    for (const row of grid) {
      for (const node of row) {
        node.isVisited = false;
        const element = document.getElementById(`node-${node.row}-${node.col}`);
        if (element.className.includes('node-visited') || element.className.includes('node-path')) {
          if (node.isStart) element.className = 'node node-start';
          else if (node.isEnd) element.className = 'node node-end';
          else if (node.isCheckpoint) element.className = 'node node-checkpoint';
          else if (node.isWall) element.className = 'node node-wall';
          else element.className = 'node';
        }
      }
    }
  };

  // Animates the shortest path by iterating over the path nodes and updating their visual class.
  animatePath = async (pathNodes, speed) => {
    // Determine delay based on speed setting.
    const delay = speed === 'instant' ? 0 : speed === 'slow' ? 100 : 50;
  
    if (speed === 'instant') {
      // For instant speed, update all nodes immediately.
      pathNodes.forEach(node => {
        if (!node.isStart && !node.isEnd && !node.isCheckpoint) {
          document.getElementById(`node-${node.row}-${node.col}`).className = 'node node-path instant';
        }
      });
      return;
    }
  
    // Animate each node sequentially with the determined delay.
    for (let i = 0; i < pathNodes.length; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const node = pathNodes[i];
      if (!node.isStart && !node.isEnd && !node.isCheckpoint) {
        document.getElementById(`node-${node.row}-${node.col}`).className = 'node node-path';
      }
    }
  };
  
  // Animates visited nodes during the algorithm’s run.
  animateVisitedNodes = async (visitedNodes, isSecondPhase = false) => {
    const delay = Math.max(1, (100 - this.state.animationSpeed) / 16);
  
    for (let i = 0; i < visitedNodes.length; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const node = visitedNodes[i];
      if (!node.isStart && !node.isEnd && !node.isCheckpoint) {
        const element = document.getElementById(`node-${node.row}-${node.col}`);
        if (element) {
          if (isSecondPhase) {
            // In second phase, add a secondary visited class
            element.classList.add('node-visited-second');
          } else {
            element.className = 'node node-visited';
          }
        }
      }
    }
  };

  // Handler to update the animation speed setting.
  setAnimationSpeed = (speed) => {
    if (this.state.isRunning) return;
    console.log('Setting speed to:', speed);
    this.setState({ animationSpeed: speed }, () => {
      console.log('New animation speed:', this.state.animationSpeed);
    });
  };

  // =====================================================
  // Drag & Drop Handlers for Moving Special Nodes (start, end, checkpoint)
  // =====================================================

  // Initiates the drag for a special node.
  handleDragStart = (e, node) => {
    if (this.state.isRunning) return;

    // Determine which special node is being dragged.
    if (node.isStart) {
      this.setState({ dragging: 'start' });
    } else if (node.isEnd) {
      this.setState({ dragging: 'end' });
    } else if (node.isCheckpoint) {
      this.setState({ dragging: 'checkpoint' });
    }

    // Create an invisible drag ghost element to improve the drag effect.
    const dragGhost = document.createElement('div');
    dragGhost.style.opacity = '0';
    document.body.appendChild(dragGhost);
    e.dataTransfer.setDragImage(dragGhost, 0, 0);
    document.body.removeChild(dragGhost);
  };

  // Prevents the default behavior during drag over.
  handleDragOver = (e) => {
    e.preventDefault();
  };

  // Removes the visual hover effect from a node when dragging leaves it.
  handleDragLeave = (row, col) => {
    const element = document.getElementById(`node-${row}-${col}`);
    if (element) {
      element.classList.remove('node-drag-hover');
    }
  };

  // Handles dropping a dragged special node onto a target cell.
  handleDrop = (e, targetNode) => {
    e.preventDefault();
    const { dragging, grid } = this.state;
    // Do not allow dropping on walls.
    if (!dragging || targetNode.isWall) return;

    // Create a new grid copy.
    const newGrid = grid.map(row => [...row]);

    // Remove the special designation from any node that currently holds it.
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[0].length; col++) {
        if ((dragging === 'start' && grid[row][col].isStart) ||
          (dragging === 'end' && grid[row][col].isEnd) ||
          (dragging === 'checkpoint' && grid[row][col].isCheckpoint)) {
          newGrid[row][col] = {
            ...grid[row][col],
            isStart: false,
            isEnd: false,
            isCheckpoint: false
          };
        }
      }
    }

    // Set the dropped cell to be the new special node.
    newGrid[targetNode.row][targetNode.col] = {
      ...targetNode,
      isStart: dragging === 'start',
      isEnd: dragging === 'end',
      isCheckpoint: dragging === 'checkpoint'
    };

    // Update state with the new grid and reset dragging.
    this.setState({
      grid: newGrid,
      dragging: null
    });
  };

  // Moves a special node from one position to another (alternative method).
  moveSpecialNode = (grid, sourceRow, sourceCol, targetRow, targetCol, nodeType) => {
    const newGrid = grid.slice();
    const sourceNode = newGrid[sourceRow][sourceCol];
    const targetNode = newGrid[targetRow][targetCol];

    // Clear the special status from the source node.
    sourceNode.isStart = false;
    sourceNode.isEnd = false;
    sourceNode.isCheckpoint = false;

    // Set the target node to the corresponding special status.
    switch (nodeType) {
      case 'start':
        targetNode.isStart = true;
        break;
      case 'end':
        targetNode.isEnd = true;
        break;
      case 'checkpoint':
        targetNode.isCheckpoint = true;
        break;
    }

    return newGrid;
  };

  // =====================================================
  // Utility Functions for Grid and Maze Management
  // =====================================================

  // Clears the visual path by removing visited and path classes from nodes.
  clearPath = () => {
    const { grid } = this.state;
    for (const row of grid) {
      for (const node of row) {
        const element = document.getElementById(`node-${node.row}-${node.col}`);
        if (element) {
          const classList = element.classList;
          // Remove visualization classes and restore original state.
          if (classList.contains('node-visited') ||
            classList.contains('node-visited-second') ||
            classList.contains('node-path')) {
            element.className = 'node' +
              (node.isStart ? ' node-start' : '') +
              (node.isEnd ? ' node-end' : '') +
              (node.isWall ? ' node-wall' : '') +
              (node.isCheckpoint ? ' node-checkpoint' : '');
          }
        }
      }
    }
  };

  // Clears all wall nodes from the grid.
  clearWalls = () => {
    const newGrid = this.state.grid.map(row =>
      row.map(node => (
        node.isWall ? { ...node, isWall: false } : node
      ))
    );
    this.setState({ grid: newGrid });
  };

  // Resets the grid to its initial configuration.
  resetGrid = () => {
    const newGrid = this.state.grid.map(row =>
      row.map(node => {
        // Determine if the node should be the new start or end based on initial positions.
        const isStart = node.row === this.initialStartNode.row && node.col === this.initialStartNode.col;
        const isEnd = node.row === this.initialEndNode.row && node.col === this.initialEndNode.col;

        return {
          ...node,
          isWall: false,
          isVisited: false,
          distance: Infinity,
          isStart,
          isEnd,
          isCheckpoint: false,
          previousNode: null,
        };
      })
    );

    // Update state with the reset grid and initial special node positions.
    this.setState({
      grid: newGrid,
      startNode: this.initialStartNode,
      endNode: this.initialEndNode,
      checkpoint: null,
      visitedNodesFirstPhase: [],
      isVisualizing: false
    });

    // Update each node’s visual class according to its new state.
    for (const row of newGrid) {
      for (const node of row) {
        const element = document.getElementById(`node-${node.row}-${node.col}`);
        if (element) {
          element.className = node.isStart ? 'node node-start' : 
                            node.isEnd ? 'node node-end' : 
                            'node';
        }
      }
    }
  };

  // Adds a checkpoint to a random empty node on the grid.
  addCheckpoint = () => {
    const { grid } = this.state;
    const position = this.getRandomEmptyPosition(grid);

    if (position) {
      const newGrid = grid.slice();
      const node = newGrid[position.row][position.col];
      // Mark the node as a checkpoint.
      newGrid[position.row][position.col] = { ...node, isCheckpoint: true };
      this.setState({ grid: newGrid, checkpoint: position });
    }
  };

  // Removes the checkpoint from the grid.
  removeCheckpoint = () => {
    const { grid, checkpoint } = this.state;
    if (!checkpoint) return;
    const newGrid = grid.slice();
    const node = newGrid[checkpoint.row][checkpoint.col];
    // Remove checkpoint status from the node.
    newGrid[checkpoint.row][checkpoint.col] = { ...node, isCheckpoint: false };
    this.setState({ grid: newGrid, checkpoint: null });
  };

  // Handles speed change for algorithm animations.
  handleSpeedChange = (speed) => {
    this.setState({ speed });
  };

  // Randomizes the positions of the start, end, and (optionally) checkpoint nodes.
  randomizeNodes = () => {
    const { grid, startNode, endNode, checkpoint } = this.state;
    // First, clear current special node flags from all nodes.
    const newGrid = grid.map(row => row.map(node => ({
      ...node,
      isStart: false,
      isEnd: false,
      isCheckpoint: false,
    })));

    // Get random empty positions for start and end.
    const newStart = this.getRandomEmptyPosition(newGrid);
    const newEnd = this.getRandomEmptyPosition(newGrid);

    // If a checkpoint exists, also assign a random empty position.
    if (checkpoint) {
      const newCheckpoint = this.getRandomEmptyPosition(newGrid);
      if (newCheckpoint) {
        newGrid[newCheckpoint.row][newCheckpoint.col].isCheckpoint = true;
        this.setState({ checkpoint: newCheckpoint });
      }
    }

    if (newStart) newGrid[newStart.row][newStart.col].isStart = true;
    if (newEnd) newGrid[newEnd.row][newEnd.col].isEnd = true;

    this.setState({ grid: newGrid, startNode: newStart, endNode: newEnd });
  };

  // ================= Maze Generation Functions (New Algorithms) =================

  // Generates a maze using the recursive division algorithm.
  generateRecursiveMaze = async () => {
    if (this.state.isVisualizing) return;
    this.setState({ isVisualizing: true });

    // Prepare a board object with metadata and grid state.
    const board = {
      nodes: {},
      wallsToAnimate: [],
      height: 32,
      width: 75,
      start: `${this.state.startNode.row}-${this.state.startNode.col}`,
      target: `${this.state.endNode.row}-${this.state.endNode.col}`,
      speed: this.state.speed
    };

    // Populate board.nodes with current grid node statuses.
    this.state.grid.forEach(row => {
      row.forEach(node => {
        board.nodes[`${node.row}-${node.col}`] = {
          status: node.isWall ? 'wall' : 'unvisited',
          weight: 0
        };
      });
    });

    // Execute the recursive division maze algorithm.
    recursiveDivisionMazeNew(board, 2, 30, 2, 73, 'horizontal', false, 'wall');
    // Animate the walls generated by the algorithm.
    await this.animateMaze(board.wallsToAnimate);
    this.setState({ isVisualizing: false });
  };

  // Generates a stair-pattern maze.
  generateStairMaze = async () => {
    if (this.state.isVisualizing) return;
    this.setState({ isVisualizing: true });

    const board = {
      nodes: {},
      wallsToAnimate: [],
      height: 32,
      width: 75,
      start: `${this.state.startNode.row}-${this.state.startNode.col}`,
      target: `${this.state.endNode.row}-${this.state.endNode.col}`,
      speed: this.state.speed
    };

    this.state.grid.forEach(row => {
      row.forEach(node => {
        board.nodes[`${node.row}-${node.col}`] = {
          status: node.isWall ? 'wall' : 'unvisited',
          weight: 0
        };
      });
    });

    stairMazeNew(board);
    await this.animateMaze(board.wallsToAnimate);
    this.setState({ isVisualizing: false });
  };

  // Generates a random maze using a new algorithm.
  generateRandomMaze = async () => {
    if (this.state.isVisualizing) return;
    this.setState({ isVisualizing: true });

    const board = {
      nodes: {},
      wallsToAnimate: [],
      height: 32,
      width: 75,
      start: `${this.state.startNode.row}-${this.state.startNode.col}`,
      target: `${this.state.endNode.row}-${this.state.endNode.col}`,
      speed: this.state.speed
    };

    this.state.grid.forEach(row => {
      row.forEach(node => {
        board.nodes[`${node.row}-${node.col}`] = {
          status: node.isWall ? 'wall' : 'unvisited',
          weight: 0
        };
      });
    });

    randomMazeNew(board);
    await this.animateMaze(board.wallsToAnimate);
    this.setState({ isVisualizing: false });
  };

  // Generates a basic random maze using a simplified algorithm.
  generateBasicRandomMaze = async () => {
    if (this.state.isVisualizing) return;
    this.setState({ isVisualizing: true });

    const board = {
      nodes: {},
      wallsToAnimate: [],
      height: 32,
      width: 75,
      start: `${this.state.startNode.row}-${this.state.startNode.col}`,
      target: `${this.state.endNode.row}-${this.state.endNode.col}`,
      speed: this.state.speed
    };

    this.state.grid.forEach(row => {
      row.forEach(node => {
        board.nodes[`${node.row}-${node.col}`] = {
          status: node.isWall ? 'wall' : 'unvisited',
          weight: 0
        };
      });
    });

    basicRandomMazeNew(board);
    await this.animateMaze(board.wallsToAnimate);
    this.setState({ isVisualizing: false });
  };

  // ================= Maze Generation Functions (Old Algorithms) =================

  // Generates a maze using an older recursive algorithm.
  generateOldRecursiveMaze = () => {
    if (this.state.isVisualizing) return;
    this.clearWalls();

    const { grid, startNode, endNode, checkpoint } = this.state;
    const start = grid[startNode.row][startNode.col];
    const finish = grid[endNode.row][endNode.col];
    const checkpointNode = checkpoint ? grid[checkpoint.row][checkpoint.col] : null;

    // Generate walls using the old recursive maze algorithm.
    const walls = generateOldRecursiveMaze(grid, start, finish, checkpointNode);
    this.animateWalls(walls);
  };

  // Generates a maze using an older random maze algorithm.
  generateOldRandomMaze = () => {
    if (this.state.isVisualizing) return;
    this.clearWalls();

    const { grid, startNode, endNode, checkpoint } = this.state;
    const start = grid[startNode.row][startNode.col];
    const finish = grid[endNode.row][endNode.col];
    const checkpointNode = checkpoint ? grid[checkpoint.row][checkpoint.col] : null;

    // Generate walls using the old random maze algorithm.
    const walls = generateOldRandomMaze(grid, start, finish, checkpointNode);
    this.animateWalls(walls);
  };

  // Animates walls by updating the grid and corresponding DOM elements.
  animateWalls = (walls) => {
    if (this.state.speed === 'instant') {
      const newGrid = [...this.state.grid];
      const fragment = document.createDocumentFragment();

      // For instant speed, update all wall nodes immediately.
      walls.forEach(wall => {
        const [row, col] = wall;
        newGrid[row][col] = {
          ...newGrid[row][col],
          isWall: true,
        };
        const element = document.createElement('div');
        element.id = `node-${row}-${col}`;
        element.className = 'node node-wall';
        fragment.appendChild(element);
      });

      document.getElementById('grid-container').replaceChildren(fragment);
      this.setState({ grid: newGrid, isVisualizing: false });
      return;
    }

    let currentIndex = 0;

    // Define the animation loop using requestAnimationFrame.
    const animate = (timestamp) => {
      const maxUpdatesPerFrame = this.state.speed === 'slow' ? 1 : 10;
      let updates = 0;

      // Process a limited number of wall updates per animation frame.
      while (currentIndex < walls.length && updates < maxUpdatesPerFrame) {
        const [row, col] = walls[currentIndex];
        const newGrid = [...this.state.grid];
        newGrid[row][col] = {
          ...newGrid[row][col],
          isWall: true,
        };

        const element = document.getElementById(`node-${row}-${col}`);
        if (element) element.className = 'node node-wall';

        if (currentIndex === walls.length - 1) {
          this.setState({ grid: newGrid, isVisualizing: false });
          return;
        }

        currentIndex++;
        updates++;
      }

      if (currentIndex < walls.length) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  // Animates maze generation based on an array of wall objects.
  animateMaze = async (wallsToAnimate) => {
    const nodes = wallsToAnimate.slice(0);

    if (this.state.speed === 'instant') {
      const newGrid = [...this.state.grid];
      const fragment = document.createDocumentFragment();

      // Instant update for each wall node.
      nodes.forEach(wall => {
        if (wall?.id) {
          const [row, col] = wall.id.split('-').map(Number);
          newGrid[row][col].isWall = true;
          newGrid[row][col].weight = 0;

          const element = document.createElement('div');
          element.id = `node-${row}-${col}`;
          element.className = 'node node-wall';
          fragment.appendChild(element);
        }
      });

      document.getElementById('grid-container').replaceChildren(fragment);
      this.setState({ grid: newGrid, isVisualizing: false });
      return;
    }

    let currentIndex = 0;
    const speed = this.state.speed === 'slow' ? 16 : 0;

    // Animation loop for maze walls.
    const animate = (timestamp) => {
      const maxUpdatesPerFrame = this.state.speed === 'slow' ? 1 : 10;
      let updates = 0;

      while (currentIndex < nodes.length && updates < maxUpdatesPerFrame) {
        const wall = nodes[currentIndex];
        if (wall?.id) {
          const [row, col] = wall.id.split('-').map(Number);
          const newGrid = [...this.state.grid];
          const node = newGrid[row][col];
          node.isWall = true;
          node.weight = 0;
          this.setState({ grid: newGrid });

          const element = document.getElementById(`node-${row}-${col}`);
          if (element) {
            element.className = 'node node-wall-animated';
            requestAnimationFrame(() => {
              // Revert to standard wall style after animation if weight is not set.
              element.className = node.weight === 5 ? 'node node-weight' : 'node node-wall';
            });
          }
        }

        if (currentIndex === nodes.length - 1) {
          this.setState({ isVisualizing: false });
          return;
        }

        currentIndex++;
        updates++;
      }

      if (currentIndex < nodes.length) {
        setTimeout(() => requestAnimationFrame(animate), speed);
      }
    };

    requestAnimationFrame(animate);
  };

  // Clears the visual styling around special nodes (start, end, checkpoint) to ensure no artifacts remain.
  clearAroundSpecialNodes = (node) => {
    const { grid } = this.state;
    const specialNodeIds = [
      { row: node.row - 1, col: node.col },
      { row: node.row + 1, col: node.col },
      { row: node.row, col: node.col - 1 },
      { row: node.row, col: node.col + 1 },
    ];

    specialNodeIds.forEach(({ row, col }) => {
      const currentHTMLNode = document.getElementById(`node-${row}-${col}`);
      if (currentHTMLNode) {
        currentHTMLNode.className = 'node';
      } else {
        console.warn(`Node with ID node-${row}-${col} not found in the DOM.`);
      }
    });
  };

  // Toggles the boost wall mode on and off.
  toggleBoostWall = () => {
    this.setState(prevState => ({
      boostWallEnabled: !prevState.boostWallEnabled
    }));
  };

  // Handles the UI toggle for boost wall mode.
  handleBoostWallToggle = () => {
    this.toggleBoostWall();
  };

  // =====================================================
  // Render Function: Builds the UI for the Visualizer
  // =====================================================
  render() {
    const { grid, error, isRunning, checkpoint, isVisualizing, boostWallEnabled } = this.state;

    return (
      <div>
        {/* Top navigation bar with menus for Algorithms, Mazes, and Tools */}
        <div className="top-bar" role="navigation" aria-label="Main navigation">
          <ul className="hList">
            <li>
              <a href="#click" className="menu" role="button" aria-haspopup="true">
                <h2 className="menu-title">Algorithms</h2>
                <ul className="menu-dropdown" role="menu">
                  <li
                    role="menuitem"
                    onClick={() => {
                      console.log('Dijkstra button clicked');
                      this.visualizeDijkstra();
                    }}
                  >
                    Dijkstra
                  </li>
                  <li role="menuitem" onClick={this.visualizeAStar}>A Star</li>
                </ul>
              </a>
            </li>
            <li>
              <a href="#click" className="menu" role="button" aria-haspopup="true">
                <h2 className="menu-title menu-title_2nd">Mazes</h2>
                <ul className="menu-dropdown" role="menu">
                  <li role="menuitem" onClick={this.generateRecursiveMaze}>Recursive Division 1</li>
                  <li role="menuitem" onClick={this.generateOldRecursiveMaze}>Recursive Division 2</li>
                  <li role="menuitem" onClick={this.generateStairMaze}>Stair Pattern</li>
                  <li role="menuitem" onClick={this.generateOldRandomMaze}>Random Maze</li>
                  <li role="menuitem" onClick={this.generateBasicRandomMaze}>Basic Random</li>
                </ul>
              </a>
            </li>
            <li>
              <a href="#click" className="menu" role="button" aria-haspopup="true">
                <h2 className="menu-title menu-title_4th">Tools</h2>
                <ul className="menu-dropdown" role="menu">
                  <li role="menuitem" onClick={this.clearWalls}>Clear Walls</li>
                  <li role="menuitem" onClick={this.clearPath}>Clear Path</li>
                  <li role="menuitem" onClick={() => this.handleBoostWallToggle()}>
                    <div className="tool-checkbox-container">
                      <input
                        type="checkbox"
                        id="boostWallCheckbox"
                        className="tool-checkbox"
                        checked={boostWallEnabled}
                        onChange={() => this.handleBoostWallToggle()}
                      />
                      <label htmlFor="boostWallCheckbox">Boost Wall</label>
                    </div>
                  </li>
                </ul>
              </a>
            </li>
            <li>
              <button
                className="custom-button"
                onClick={() => this.state.checkpoint ? this.removeCheckpoint() : this.addCheckpoint()}
                disabled={this.state.isVisualizing}
              >
                {this.state.checkpoint ? 'Remove Checkpoint' : 'Add Checkpoint'}
              </button>
            </li>
            <li>
              <button
                className="custom-button"
                onClick={this.randomizeNodes}
                disabled={this.state.isVisualizing}
              >
                Randomize!
              </button>
            </li>
            <li>
              <button
                className="custom-button"
                onClick={() => this.resetGrid()}
                disabled={this.state.isVisualizing}
              >
                Reset Grid
              </button>
            </li>
          </ul>
        </div>

        {/* Display error messages if any */}
        {error && (
          <div
            className="error-message"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {/* Grid container where the pathfinding grid is rendered */}
        <div
          className="grid-container"
          role="region"
          aria-label="Pathfinding visualization grid"
        >
          <div className="grid">
            {/* Render each row of nodes */}
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="grid-row" role="row">
                {/* Render each node (cell) in the row using the Node component */}
                {row.map((node, nodeIdx) => (
                  <Node
                    key={`${rowIdx}-${nodeIdx}`}
                    row={node.row}
                    col={node.col}
                    isStart={node.isStart}
                    isEnd={node.isEnd}
                    isWall={node.isWall}
                    isCheckpoint={node.isCheckpoint}
                    onMouseDown={() => this.handleMouseDown(node.row, node.col)}
                    onMouseEnter={() => this.handleMouseEnter(node.row, node.col)}
                    onMouseUp={this.handleMouseUp}
                    draggable={node.isStart || node.isEnd || node.isCheckpoint}
                    onDragStart={(e) => this.handleDragStart(e, node)}
                    onDragOver={(e) => this.handleDragOver(e)}
                    onDragLeave={(e) => this.handleDragLeave(node.row, node.col)}
                    onDrop={(e) => this.handleDrop(e, node)}
                    role="gridcell"
                    ariaLabel={
                      node.isStart ? 'Start node' :
                        node.isEnd ? 'End node' :
                          node.isCheckpoint ? 'Checkpoint' :
                            node.isWall ? 'Wall' :
                              'Empty cell'
                    }
                    tabIndex={node.isStart || node.isEnd || node.isCheckpoint ? 0 : -1}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend button to show/hide the legend */}
        <button className="legend-button" aria-label="Show Legend">
          <span>?</span>
        </button>

        {/* Legend display explaining node symbols */}
        <div className="legend" role="region" aria-label="Grid legend">
          <div className="legend-item">
            <FontAwesomeIcon icon={faAngleRight} spin spinReverse size="xl" />
            <span>Start Node</span>
          </div>
          <div className="legend-item">
            <FontAwesomeIcon icon={faBullseye} size="xl" />
            <span>End Node</span>
          </div>
          <div className="legend-item">
            <FontAwesomeIcon icon={faLocationDot} size="xl" />
            <span>Checkpoint</span>
          </div>
          <div className="legend-item">
            <div className="node node-wall node-wall-animated" aria-hidden="true"></div>
            <span>Wall</span>
          </div>
          <div className="legend-item">
            <div style={{ display: 'flex', gap: '4px' }}>
              <div className="node node-visited node-visited-animated" aria-hidden="true"></div>
              <div className="node node-visited-second node-visited-second-animated" aria-hidden="true"></div>
            </div>
            <span>Visited</span>
          </div>
        </div>
      </div>
    );
  }
}
