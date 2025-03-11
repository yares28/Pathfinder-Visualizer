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
// Import the new maze generation functions directly
import { generateRecursiveMaze } from '../Mazes/RecursiveMazeAlgorithm';
import { generateStairMaze } from '../Mazes/StairMaze';
import { generateRandomMaze } from '../Mazes/RandomMaze';
import { generateBasicRandomMaze } from '../Mazes/BasicRandomMaze';
// Import lodash throttle for limiting function calls
import { throttle } from 'lodash';
// Import FontAwesome icons for UI elements
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faBullseye, faLocationDot } from '@fortawesome/free-solid-svg-icons';
// Import resolution configuration utilities
import resolutionConfigs, { getResolutionConfig, calculateProportionalPosition, getResolutionOptions } from '../utils/resolutionConfigs';

// Define animation speed constants
const ANIMATION_SPEEDS = {
  instant: 0,
  fast: 2,  // Fast animation speed (near-instant visual updates)
  slow: 100, // Slow animation speed (delayed visual updates)
};

export default class PathfindingVisualizer extends Component {
  constructor(props) {
    super(props);
    
    // Get resolution configuration based on screen size
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const resConfig = getResolutionConfig(screenWidth, screenHeight);
    
    // Set dimensions and default positions from resolution config
    const { rows, cols, nodeSize, defaultPositions, containerClass, topBarClass } = resConfig;
    
    // Set checkpoint exists to false by default
    const checkpointPos = { ...defaultPositions.checkpoint, exists: false };
    
    // Store original values for reference
    this.defaultRows = rows;
    this.defaultCols = cols;
    this.defaultStartNode = defaultPositions.startNode;
    this.defaultEndNode = defaultPositions.endNode;
    this.defaultCheckpoint = checkpointPos;
    this.nodeSize = nodeSize;
    this.containerClass = containerClass;
    this.topBarClass = topBarClass;
    
    // Check if user is on a mobile device with specific resolutions
    const isMobileDevice = this.checkIfMobileDevice(screenWidth, screenHeight);
    
    this.state = {
      grid: [],
      mouseIsPressed: false,
      message: null,
      dragging: {
        isDragging: false,
        draggedNodeType: null,
        sourceRow: null,
        sourceCol: null,
      },
      isRunning: false,
      isVisualizing: false,
      visitedNodesInOrder: [],
      nodesInShortestPathOrder: [],
      speed: 'fast', // Set default speed to fast
      animationSpeed: 'fast', // Set default animation speed to fast
      startNode: defaultPositions.startNode,
      endNode: defaultPositions.endNode,
      checkpoint: checkpointPos, // Checkpoint with exists=false
      height: rows,
      width: cols,
      error: null,
      boostWallEnabled: false,
      currentResolution: resConfig.resolution,
      availableResolutions: getResolutionOptions(),
      containerClass: containerClass,
      topBarClass: topBarClass,
      isMobileDevice: isMobileDevice, // Add mobile device detection state
    };

    // Create a throttled version of grid update to optimize performance during rapid mouse movements
    this.throttledGridUpdate = throttle((newGrid) => {
      this.setState({ grid: newGrid });
    }, 16); // Throttled to roughly 60fps (16ms)
  }

  // Check if the user is on a mobile device with specific resolutions
  checkIfMobileDevice = (width, height) => {
    // Target mobile resolutions (iPhone 6/7/8, iPhone 5/SE, and similar)
    const mobileResolutions = [
      { width: 375, height: 667 }, // iPhone 6/7/8
      { width: 320, height: 568 }, // iPhone 5/SE
      { width: 414, height: 736 }, // iPhone 6/7/8 Plus
      { width: 390, height: 844 }, // iPhone 12/13
      { width: 428, height: 926 }, // iPhone 12/13 Pro Max
      { width: 360, height: 640 }, // Common Android
      { width: 412, height: 915 }, // Pixel 6
      { width: 360, height: 800 }, // Samsung Galaxy
    ];
    
    // Check if current resolution is close to any of the target mobile resolutions
    // We use a threshold to account for slight variations in reported resolutions
    const threshold = 50; // pixels
    
    // First check if we have a direct match with common mobile resolutions
    for (const res of mobileResolutions) {
      if (
        Math.abs(width - res.width) <= threshold && 
        Math.abs(height - res.height) <= threshold
      ) {
        console.log(`Mobile device detected: ${width}x${height} matches ${res.width}x${res.height}`);
        return true;
      }
    }
    
    // Also check if the width is in the typical mobile range (under 480px)
    if (width <= 480) {
      console.log(`Mobile device detected: width ${width} is under 480px`);
      return true;
    }
    
    // Check for portrait orientation with narrow width (typical for mobile)
    if (width < height && width < 768) {
      console.log(`Mobile device detected: portrait orientation with width ${width} < ${height}`);
      return true;
    }
    
    console.log(`Not a mobile device: ${width}x${height}`);
    return false;
  }

  // Lifecycle method: componentDidMount is called once the component is mounted.
  // It initializes the grid.
  componentDidMount() {
    // Check for mobile device on mount
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isMobileDevice = this.checkIfMobileDevice(screenWidth, screenHeight);
    
    // Update mobile device state if needed
    if (isMobileDevice !== this.state.isMobileDevice) {
      this.setState({ isMobileDevice });
    }
    
    // Set initial node size CSS variable
    document.documentElement.style.setProperty('--node-size', `${this.nodeSize}px`);
    
    // Apply the initial container class
    setTimeout(() => {
      this.updateGridContainerClass(this.containerClass);
      this.updateTopBarClass(this.topBarClass);
    }, 100);
    
    this.initializeGrid();
    
    // Add resize event listener
    window.addEventListener('resize', this.handleResize);
    
    // Store initial state as a backup
    this.initialGrid = this.state.grid.slice();
    this.initialStartNode = { ...this.state.startNode };
    this.initialEndNode = { ...this.state.endNode };
    
    // Log grid dimensions for debugging
    console.log(`Grid initialized with dimensions: ${this.state.height}x${this.state.width}`);
  }

  componentWillUnmount() {
    // Remove event listener when component unmounts
    window.removeEventListener('resize', this.handleResize);
  }

  // Calculate grid dimensions based on screen size
  calculateGridDimensions = () => {
    // Get the current screen dimensions
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Get the appropriate resolution configuration
    const resConfig = getResolutionConfig(screenWidth, screenHeight);
    
    return { 
      rows: resConfig.rows, 
      cols: resConfig.cols,
      nodeSize: resConfig.nodeSize,
      defaultPositions: resConfig.defaultPositions
    };
  };

  // Handle window resize and check for mobile device
  handleResize = () => {
    // Only recalculate if not in the middle of visualization
    if (!this.state.isVisualizing && !this.state.isRunning) {
      // Get the current screen dimensions
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Check if user is on a mobile device with the new dimensions
      const isMobileDevice = this.checkIfMobileDevice(screenWidth, screenHeight);
      
      // Get the appropriate resolution configuration
      const resConfig = getResolutionConfig(screenWidth, screenHeight);
      const { rows: newHeight, cols: newWidth, containerClass, topBarClass } = resConfig;
      
      // Store current dimensions for recalculation
      const oldHeight = this.state.height;
      const oldWidth = this.state.width;
      
      // Update the container class
      this.updateGridContainerClass(containerClass);
      this.updateTopBarClass(topBarClass);
      
      // Update state with new dimensions and mobile device status
      this.setState({
        height: newHeight,
        width: newWidth,
        containerClass: containerClass,
        topBarClass: topBarClass,
        isMobileDevice: isMobileDevice
      }, () => {
        this.recalculateSpecialNodePositions(oldHeight, oldWidth, newHeight, newWidth);
        this.initializeGrid();
      });
    }
  };

  // =====================================================
  // Grid Initialization and Node Creation Functions
  // =====================================================

  // Creates a 2D grid of nodes.
  initializeGrid = () => {
    const grid = [];
    const { height, width, startNode, endNode, checkpoint } = this.state;
    
    // Loop over rows
    for (let row = 0; row < height; row++) {
      const currentRow = [];
      // Loop over columns
      for (let col = 0; col < width; col++) {
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
    
    // Calculate relative positions based on grid dimensions for special nodes
    // This ensures the nodes maintain their relative positions regardless of grid size
    const isStart = row === startNode.row && col === startNode.col;
    const isEnd = row === endNode.row && col === endNode.col;
    const isCheckpoint = checkpoint && checkpoint.exists && 
                        row === checkpoint.row && col === checkpoint.col;
    
    // Create and return the node object with its properties
    return {
      row,
      col,
      isStart,
      isEnd,
      isWall: false,
      isCheckpoint,
      isVisited: false,
      isPath: false,
      distance: Infinity,
      fScore: Infinity,
      gScore: Infinity,
      hScore: Infinity,
      previousNode: null,
      weight: 0,
    };
  };

  // Recalculates special node positions when grid dimensions change
  recalculateSpecialNodePositions = (oldHeight, oldWidth, newHeight, newWidth) => {
    // Only recalculate if dimensions have changed
    if (oldHeight === newHeight && oldWidth === newWidth) return;
    
    const { startNode, endNode, checkpoint } = this.state;
    
    // Calculate new positions based on relative percentages
    const newStartRow = Math.floor((startNode.row / oldHeight) * newHeight);
    const newStartCol = Math.floor((startNode.col / oldWidth) * newWidth);
    
    const newEndRow = Math.floor((endNode.row / oldHeight) * newHeight);
    const newEndCol = Math.floor((endNode.col / oldWidth) * newWidth);
    
    // Update state with new positions
    const newState = {
      startNode: { row: newStartRow, col: newStartCol },
      endNode: { row: newEndRow, col: newEndCol },
    };
    
    // Update checkpoint if it exists
    if (checkpoint && checkpoint.exists) {
      const newCheckpointRow = Math.floor((checkpoint.row / oldHeight) * newHeight);
      const newCheckpointCol = Math.floor((checkpoint.col / oldWidth) * newWidth);
      newState.checkpoint = { 
        row: newCheckpointRow, 
        col: newCheckpointCol,
        exists: true 
      };
    }
    
    return newState;
  };

  // =====================================================
  // Mouse and Drag Event Handlers for User Interaction
  // =====================================================

  // Handles mouse down events on a grid cell.
  handleMouseDown = (row, col) => {
    // Do not process if an algorithm is running or if a special node is being dragged.
    if (this.state.isRunning || this.state.dragging.isDragging) return;

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
        mouseIsPressed: true,
        wallMode,
        grid: newGrid,
        message: null,
      });
    }

    // Set the flag for mouse pressed and update the wall mode.
    this.setState({ mouseIsPressed: true, wallMode });
  };

  // Handles mouse entering a grid cell (for dragging to draw walls).
  handleMouseEnter = (row, col) => {
    // Only process if mouse is pressed and not dragging a special node.
    if (!this.state.mouseIsPressed || this.state.dragging.isDragging) return;

    const { wallMode, grid } = this.state;
    const currentCell = `${row}-${col}`;

    // Prevent processing the same cell multiple times
    if (this.state.message === currentCell) return;

    const node = grid[row][col];
    // Skip if the node is a special node (start, end, or checkpoint)
    if (node.isStart || node.isEnd || node.isCheckpoint) return;

    // If boost wall mode is enabled, apply boost wall logic.
    if (this.state.boostWallEnabled && wallMode === 'add') {
      this.createBoostWalls(row, col, wallMode);
    } else {
      // Update visual and grid state for the node.
      this.updateNodeVisual(row, col, wallMode);
      const newGrid = this.getNewGridWithWallMode(grid, row, col, wallMode);
      // Use throttling to avoid performance issues during rapid mouse movement.
      this.throttledGridUpdate(newGrid);
      this.setState({ message: currentCell });
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
      mouseIsPressed: false,
      wallMode: null,
      message: null,
      // Preserve visited nodes if already in first phase of visualization
      visitedNodesInOrder: this.state.visitedNodesInOrder,
      nodesInShortestPathOrder: this.state.nodesInShortestPathOrder,
    });
  };

  // Returns a new grid with an updated wall state for the targeted cell.
  getNewGridWithWallMode = (grid, row, col, wallMode) => {
    const newGrid = grid.slice(); // Shallow copy of grid
    const node = newGrid[row][col];

    // Do not update special nodes
    if (node.isStart || node.isEnd || node.isCheckpoint) return newGrid;

    // Update the node's wall status based on the wall mode.
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
        message: `${centerRow}-${centerCol}`,
        mouseIsPressed: true,
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

  // Visualizes Dijkstra's algorithm.
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
    const { grid, visitedNodesInOrder } = this.state;
    for (const row of grid) {
      for (const node of row) {
        node.isVisited = false;
        node.distance = Infinity;
        node.previousNode = null;
        // Update the node's CSS class based on its type.
        const element = document.getElementById(`node-${node.row}-${node.col}`);
        if (node.isStart) element.className = 'node node-start';
        else if (node.isEnd) element.className = 'node node-end';
        else if (node.isCheckpoint) element.className = 'node node-checkpoint';
        else if (node.isWall) element.className = 'node node-wall';
        else element.className = 'node';
      }
    }
    // Preserve visited nodes from the first phase if needed.
    this.setState({ visitedNodesInOrder });
  };

  // Clears only the visited nodes' styles (useful for re-running the algorithm without removing walls).
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

  // Animates the shortest path after visualizing the algorithm.
  animatePath = async (pathNodes, speed) => {
    // Map speed strings to numeric values
    let speedValue;
    switch (this.state.speed) {
      case 'fast':
        speedValue = 80;
        break;
      case 'medium':
        speedValue = 50;
        break;
      case 'slow':
        speedValue = 20;
        break;
      default:
        speedValue = 80; // Default to fast
    }
    
    // Calculate delay based on speed value
    const delay = Math.max(1, (100 - speedValue) / 16);
  
    // Animate each node sequentially with the determined delay.
    for (let i = 0; i < pathNodes.length; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const node = pathNodes[i];
      if (!node.isStart && !node.isEnd && !node.isCheckpoint) {
        document.getElementById(`node-${node.row}-${node.col}`).className = 'node node-path';
      }
    }
  };
  
  // Animates visited nodes during the algorithm's run.
  animateVisitedNodes = async (visitedNodes, isSecondPhase = false) => {
    // Map speed strings to numeric values
    let speedValue;
    switch (this.state.speed) {
      case 'fast':
        speedValue = 80;
        break;
      case 'medium':
        speedValue = 50;
        break;
      case 'slow':
        speedValue = 20;
        break;
      default:
        speedValue = 80; // Default to fast
    }
    
    // Calculate delay based on speed value
    const delay = Math.max(1, (100 - speedValue) / 16);
  
    for (let i = 0; i < visitedNodes.length; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const node = visitedNodes[i];
      if (!node.isStart && !node.isEnd && !node.isCheckpoint) {
        const element = document.getElementById(`node-${node.row}-${node.col}`);
        if (element) {
          element.className = `node ${isSecondPhase ? 'node-visited-second' : 'node-visited'}`;
        }
      }
    }
  };

  // Handles speed change for algorithm animations.
  handleSpeedChange = (speed) => {
    this.setState({ 
      speed: speed,
      animationSpeed: speed
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
      this.setState({ dragging: { isDragging: true, draggedNodeType: 'start', sourceRow: node.row, sourceCol: node.col } });
    } else if (node.isEnd) {
      this.setState({ dragging: { isDragging: true, draggedNodeType: 'end', sourceRow: node.row, sourceCol: node.col } });
    } else if (node.isCheckpoint) {
      this.setState({ dragging: { isDragging: true, draggedNodeType: 'checkpoint', sourceRow: node.row, sourceCol: node.col } });
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
    if (!dragging.isDragging || targetNode.isWall) return;

    // Create a new grid copy.
    const newGrid = grid.map(row => [...row]);

    // Remove the special designation from any node that currently holds it.
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[0].length; col++) {
        if ((dragging.draggedNodeType === 'start' && grid[row][col].isStart) ||
          (dragging.draggedNodeType === 'end' && grid[row][col].isEnd) ||
          (dragging.draggedNodeType === 'checkpoint' && grid[row][col].isCheckpoint)) {
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
      isStart: dragging.draggedNodeType === 'start',
      isEnd: dragging.draggedNodeType === 'end',
      isCheckpoint: dragging.draggedNodeType === 'checkpoint'
    };

    // Update state with the new grid and reset dragging.
    this.setState({
      grid: newGrid,
      dragging: { isDragging: false, draggedNodeType: null, sourceRow: null, sourceCol: null }
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

  // Resets the grid to its initial state with no walls or visualizations.
  resetGrid = () => {
    // Calculate proper positions for special nodes based on current grid dimensions
    const { height, width } = this.state;
    
    // Calculate proper positions based on current grid size
    const startNode = calculateProportionalPosition(
      this.defaultStartNode, 
      this.defaultRows, 
      this.defaultCols, 
      height, 
      width
    );
    
    const endNode = calculateProportionalPosition(
      this.defaultEndNode, 
      this.defaultRows, 
      this.defaultCols, 
      height, 
      width
    );
    
    const checkpointPos = calculateProportionalPosition(
      this.defaultCheckpoint,
      this.defaultRows,
      this.defaultCols,
      height,
      width
    );
    
    // Create a new grid with the calculated dimensions and node positions
    this.setState({
      grid: [],
      startNode,
      endNode,
      checkpoint: { ...checkpointPos, exists: false }, // Reset checkpoint with correct position but not active
      isVisualizing: false,
      isRunning: false,
      mouseIsPressed: false,
      visitedNodesInOrder: [],
      nodesInShortestPathOrder: [],
    }, () => {
      // After state update, initialize the grid
      this.initializeGrid();
    });
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
      this.setState({ 
        grid: newGrid, 
        checkpoint: { ...position, exists: true }
      });
    }
  };

  // Removes the checkpoint from the grid.
  removeCheckpoint = () => {
    const { grid, checkpoint } = this.state;
    if (!checkpoint || !checkpoint.exists) return;
    
    const newGrid = grid.slice();
    // Find the checkpoint node in the grid and update it
    const node = newGrid[checkpoint.row][checkpoint.col];
    newGrid[checkpoint.row][checkpoint.col] = { ...node, isCheckpoint: false };
    
    // Update state with the updated grid and checkpoint
    this.setState({ 
      grid: newGrid, 
      checkpoint: { ...checkpoint, exists: false } 
    });
  };

  // Randomizes the positions of the start, end, and (optionally) checkpoint nodes.
  randomizeNodes = () => {
    const { grid, startNode, endNode, checkpoint } = this.state;
    // First, clear current special node flags from all nodes.
    const newGrid = grid.map(row => row.map(node => ({
      ...node,
      isStart: false,
      isEnd: false,
      isCheckpoint: false, // Clear checkpoint status to reassign it if needed
    })));

    // Get random empty positions for start and end.
    const newStart = this.getRandomEmptyPosition(newGrid);
    const newEnd = this.getRandomEmptyPosition(newGrid);

    // If a checkpoint exists, also assign a random empty position.
    let newCheckpoint = null;
    if (checkpoint && checkpoint.exists) {
      newCheckpoint = this.getRandomEmptyPosition(newGrid);
      if (newCheckpoint) {
        newGrid[newCheckpoint.row][newCheckpoint.col].isCheckpoint = true;
      }
    }

    if (newStart) newGrid[newStart.row][newStart.col].isStart = true;
    if (newEnd) newGrid[newEnd.row][newEnd.col].isEnd = true;

    // Update state with new positions
    if (checkpoint && checkpoint.exists && newCheckpoint) {
      this.setState({ 
        grid: newGrid, 
        startNode: newStart, 
        endNode: newEnd,
        checkpoint: { ...newCheckpoint, exists: true }
      });
    } else {
      this.setState({ 
        grid: newGrid, 
        startNode: newStart, 
        endNode: newEnd 
      });
    }
  };

  // ================= Maze Generation Functions (New Algorithms) =================

  // Generates a maze using the recursive division algorithm.
  generateRecursiveMaze = async () => {
    if (this.state.isVisualizing) return;
    this.clearWalls();
    this.clearPath();

    const { grid } = this.state;
    this.setState({ isVisualizing: true });

    // Set board dimensions using state values instead of hardcoded ones
    const board = {
      height: this.state.height,
      width: this.state.width,
      grid: grid,
      walls: []
    };

    // Adjust recursion parameters based on the grid dimensions
    const recursiveBoard = generateRecursiveMaze(
      board,
      2,
      this.state.height - 3,
      2,
      this.state.width - 3,
      'horizontal',
      true
    );

    this.animateMaze(recursiveBoard.walls);
  };

  // Generates a stair-pattern maze.
  generateStairMaze = async () => {
    if (this.state.isVisualizing) return;
    this.clearWalls();
    this.clearPath();

    const { grid } = this.state;
    this.setState({ isVisualizing: true });

    // Set board dimensions using state values instead of hardcoded ones
    const board = {
      height: this.state.height,
      width: this.state.width,
      grid: grid,
      walls: []
    };

    // Generate the stair maze using the dynamic dimensions
    const stairMazeBoard = generateStairMaze(board);
    this.animateMaze(stairMazeBoard.walls);
  };

  // Generates a random maze using a new algorithm.
  generateRandomMaze = async () => {
    if (this.state.isVisualizing) return;
    this.clearWalls();
    this.clearPath();

    const { grid } = this.state;
    this.setState({ isVisualizing: true });

    // Set board dimensions using state values instead of hardcoded ones
    const board = {
      height: this.state.height,
      width: this.state.width,
      grid: grid,
      walls: []
    };

    // Generate the random maze using the dynamic dimensions
    const randomBoard = generateRandomMaze(board);
    this.animateMaze(randomBoard.walls);
  };

  // Generates a basic random maze using a simplified algorithm.
  generateBasicRandomMaze = async () => {
    if (this.state.isVisualizing) return;
    this.clearWalls();
    this.clearPath();

    const { grid } = this.state;
    this.setState({ isVisualizing: true });

    // Set board dimensions using state values instead of hardcoded ones
    const board = {
      height: this.state.height,
      width: this.state.width,
      grid: grid,
      walls: []
    };

    // Generate the basic random maze using the dynamic dimensions
    const randomBoard = generateBasicRandomMaze(board);
    this.animateMaze(randomBoard.walls);
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

  // Animates maze generation based on walls array
  animateMaze = async (wallsToAnimate) => {
    // Make a copy of the walls
    const nodes = wallsToAnimate.slice(0);
    const newGrid = [...this.state.grid];

    if (this.state.speed === 'instant') {
      // For instant speed, update all wall nodes immediately
      nodes.forEach(wall => {
        let row, col;
        
        // Handle both wall formats: [row, col] array or object with id property
        if (Array.isArray(wall)) {
          [row, col] = wall;
        } else if (wall?.id) {
          [row, col] = wall.id.split('-').map(Number);
        } else {
          return; // Skip invalid wall data
        }

        // Check that the coordinates are valid
        if (row >= 0 && row < newGrid.length && 
            col >= 0 && col < newGrid[0].length) {
          newGrid[row][col] = {
            ...newGrid[row][col],
            isWall: true,
            weight: 0
          };

          // Update the DOM node if it exists
          const node = document.getElementById(`node-${row}-${col}`);
          if (node) node.className = 'node node-wall';
        }
      });

      this.setState({ grid: newGrid, isVisualizing: false });
      return;
    }

    // For animated speed, animate the walls appearing one by one
    let currentIndex = 0;
    
    // Define the animation loop using requestAnimationFrame
    const animate = (timestamp) => {
      const maxUpdatesPerFrame = this.state.speed === 'slow' ? 1 : 10;
      let updates = 0;

      // Process a limited number of wall updates per animation frame
      while (currentIndex < nodes.length && updates < maxUpdatesPerFrame) {
        const wall = nodes[currentIndex];
        let row, col;
        
        // Handle both wall formats: [row, col] array or object with id property
        if (Array.isArray(wall)) {
          [row, col] = wall;
        } else if (wall?.id) {
          [row, col] = wall.id.split('-').map(Number);
        } else {
          currentIndex++;
          continue; // Skip invalid wall data
        }

        // Check that the coordinates are valid
        if (row >= 0 && row < newGrid.length && 
            col >= 0 && col < newGrid[0].length) {
          newGrid[row][col] = {
            ...newGrid[row][col],
            isWall: true,
            weight: 0
          };

          // Update the DOM node if it exists
          const node = document.getElementById(`node-${row}-${col}`);
          if (node) node.className = 'node node-wall';
        }

        currentIndex++;
        updates++;
      }

      // Continue animation if there are more walls to process
      if (currentIndex < nodes.length) {
        requestAnimationFrame(animate);
      } else {
        this.setState({ grid: newGrid, isVisualizing: false });
      }
    };

    // Start the animation
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

  // Change resolution configuration
  changeResolution = (resolutionValue) => {
    // Only allow resolution change when not visualizing/running
    if (this.state.isVisualizing || this.state.isRunning) {
      this.setState({ message: "Cannot change resolution during visualization" });
      return;
    }
    
    // Find the selected resolution configuration
    const selectedConfig = resolutionConfigs.find(config => config.resolution === resolutionValue);
    if (!selectedConfig) return;
    
    const { rows, cols, nodeSize, defaultPositions, containerClass, topBarClass } = selectedConfig;
    
    // Calculate proper positions for special nodes based on new dimensions
    const oldRows = this.state.height;
    const oldCols = this.state.width;
    
    const startNode = calculateProportionalPosition(
      this.state.startNode, 
      oldRows, 
      oldCols, 
      rows, 
      cols
    );
    
    const endNode = calculateProportionalPosition(
      this.state.endNode, 
      oldRows, 
      oldCols, 
      rows, 
      cols
    );
    
    const checkpoint = calculateProportionalPosition(
      this.state.checkpoint, 
      oldRows, 
      oldCols, 
      rows, 
      cols
    );
    
    // Update state with new dimensions and positions
    this.setState({
      height: rows,
      width: cols,
      startNode,
      endNode,
      checkpoint,
      currentResolution: resolutionValue,
      containerClass: containerClass,
      topBarClass: topBarClass
    }, () => {
      // Reinitialize the grid with new dimensions
      this.initializeGrid();
      
      // Update the grid container class
      this.updateGridContainerClass(containerClass);
      this.updateTopBarClass(topBarClass);
    });
    
    // Update node size (CSS variable)
    document.documentElement.style.setProperty('--node-size', `${nodeSize}px`);
  };
  
  // Update the grid container class based on resolution
  updateGridContainerClass = (newContainerClass) => {
    const gridContainer = document.querySelector('.grid-container, .grid-container-qhd, .grid-container-4k, .grid-container-hd, .grid-container-hd-small, .grid-container-mobile');
    
    if (gridContainer) {
      // Remove all potential container classes
      gridContainer.classList.remove(
        'grid-container', 
        'grid-container-qhd', 
        'grid-container-4k', 
        'grid-container-hd', 
        'grid-container-hd-small', 
        'grid-container-mobile'
      );
      
      // Add the new container class
      gridContainer.classList.add(newContainerClass);
    }
  }

  // Update the top bar class based on resolution
  updateTopBarClass = (newTopBarClass) => {
    const topBar = document.querySelector('.top-bar, .top-bar-qhd, .top-bar-4k, .top-bar-hd, .top-bar-hd-small, .top-bar-mobile');
    
    if (topBar) {
      // Remove all potential top bar classes
      topBar.classList.remove(
        'top-bar', 
        'top-bar-qhd', 
        'top-bar-4k', 
        'top-bar-hd', 
        'top-bar-hd-small', 
        'top-bar-mobile'
      );
      
      // Add the new top bar class
      topBar.classList.add(newTopBarClass);
    }
  }

  // Helper function to calculate margin adjustment based on resolution
calculateMarginAdjustment = (resolutionValue) => {
  switch (resolutionValue) {
    case 'mobile':
      return '-30px'; // Adjust for mobile
    case '1366x768':
      return '-60px'; // Adjust for HD
    case '1920x1080':
      return '0px'; // Default for FHD
    case '2560x1440':
      return '-90px'; // Adjust for QHD
    case '3840x2160':
      return '-90px'; // Adjust for 4K
    default:
      return '0px'; // Fallback
  }
};

  // =====================================================
  // Render Function: Builds the UI for the Visualizer
  // =====================================================
  render() {
    const {
      grid,
      mouseIsPressed,
      isRunning,
      isVisualizing,
      startNode,
      endNode,
      checkpoint,
      message,
      boostWallEnabled,
      currentResolution,
      availableResolutions,
      containerClass,
      topBarClass,
      isMobileDevice
    } = this.state;

    // If user is on a mobile device with specific resolutions, show error message
    if (isMobileDevice) {
      return (
        <div className="mobile-error-container">
          <div className="mobile-error-message">
            <h2>Desktop App Only</h2>
            <p>This pathfinding visualizer is designed for desktop use only.</p>
            <p>The interactive grid and controls require a larger screen for optimal experience.</p>
            <p>Please access this application from a desktop or laptop computer.</p>
            <div className="mobile-error-icon">
              <FontAwesomeIcon icon={faLocationDot} size="3x" />
            </div>
          </div>
        </div>
      );
    }

    // Dynamic styling for grid rows based on calculated dimensions
    const gridRowStyle = {
      gridTemplateColumns: `repeat(${this.state.width}, var(--node-size))`
    };

    // Calculate dynamic left margin based on screen width
    let leftMargin = 0;
    if (this.state.width <= 1366) {
        leftMargin = -30; // Adjust this value as needed
    } else if (this.state.width <= 1024) {
        leftMargin = -60; // Adjust this value as needed
    } else if (this.state.width >= 2560) {
        leftMargin = -90; // Adjust this value as needed
    }

    return (
      <div className="pathfinding-visualizer">
        {/* Top navigation bar with menus for Algorithms, Mazes, and Tools */}
        <div className={topBarClass} role="navigation" aria-label="Main navigation">
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
                onClick={() => this.state.checkpoint && this.state.checkpoint.exists ? this.removeCheckpoint() : this.addCheckpoint()}
                disabled={this.state.isVisualizing}
              >
                {this.state.checkpoint && this.state.checkpoint.exists ? 'Remove Checkpoint' : 'Add Checkpoint'}
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
          <div href="#click" className="speed-dropdown" role="button" aria-haspopup="true">
            <button className="speed-dropdown-button" >
              Speed: {this.state.speed.charAt(0).toUpperCase() + this.state.speed.slice(1)}
              <span className="dropdown-arrow">▼</span>
            </button>
            <div className="speed-dropdown-content">
              <button
                className={`speed-option ${this.state.speed === 'slow' ? 'active' : ''} ${this.state.isHovering ? 'hover' : ''}`}
                onClick={() => this.handleSpeedChange('slow')}
                disabled={this.state.isVisualizing}
              >
                Slow
              </button>
              <button
                className={`speed-option ${this.state.speed === 'fast' ? 'active' : ''} ${this.state.isHovering ? 'hover' : ''}`}
                onClick={() => this.handleSpeedChange('fast')}
                disabled={this.state.isVisualizing}
              >
                Fast
              </button>
              <button
                className={`speed-option ${this.state.speed === 'instant' ? 'active' : ''} ${this.state.isHovering ? 'hover' : ''}`}
                onClick={() => this.handleSpeedChange('instant')}
                disabled={this.state.isVisualizing}
              >
                Instant
              </button>
            </div>
          </div>

          
        </div>
        
        {/* Display error messages if any */}
        {this.state.error && (
          <div
            className="error-message"
            role="alert"
            aria-live="polite"
          >
            {this.state.error}
          </div>
        )}

        {/* Grid container where the pathfinding grid is rendered */}
        <div className={containerClass} id="grid-container">
          <div className="grid">
            {/* Render each row of nodes */}
            {grid.map((row, rowIdx) => (
              <div 
                key={rowIdx} 
                className="grid-row" 
                style={gridRowStyle}
                role="row"
              >
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
            <FontAwesomeIcon icon={faAngleRight} size="xl" />
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
