// =====================================================
// resolutionConfigs.js
// This utility file defines grid configurations for different screen resolutions.
// Each configuration includes the number of rows and columns, node size,
// and default positions for special nodes (start, end, checkpoint).
// The configurations are used to render appropriate grid sizes based on the user's screen.
// =====================================================

/**
 * Resolution configurations for pathfinding grid
 * Each config contains:
 * - resolution: The targeted resolution (width x height)
 * - rows: Number of grid rows
 * - cols: Number of grid columns
 * - nodeSize: Size of each node in pixels
 * - defaultPositions: Default positions for special nodes
 * - containerClass: CSS class for the grid container specific to this resolution
 * - topBarClass: CSS class for the top bar specific to this resolution
 */
const resolutionConfigs = [
  {
    resolution: '1920x1080',
    name: 'FHD (1920x1080)',
    rows: 30,
    cols: 74,
    nodeSize: 25,
    containerClass: 'grid-container', // Default container class
    topBarClass: 'top-bar', // Default top bar class
    defaultPositions: {
      startNode: { row: 15, col: 25 },
      endNode: { row: 15, col: 51 },
    }
  },
  {
    resolution: '2560x1440',
    name: 'QHD (2560x1440)',
    rows: 44,
    cols: 99,
    nodeSize: 25,
    containerClass: 'grid-container-qhd', // QHD container class
    topBarClass: 'top-bar-qhd', // QHD top bar class
    defaultPositions: {
      startNode: { row: 20, col: 30 },
      endNode: { row: 20, col: 65 }
    }
  },
  {
    resolution: '3840x2160',
    name: '4K UHD (3840x2160)',
    rows: 64,
    cols: 110,
    nodeSize: 25,
    containerClass: 'grid-container-4k', // 4K container class
    topBarClass: 'top-bar-4k', // 4K top bar class
    defaultPositions: {
      startNode: { row: 32, col: 45 },
      endNode: { row: 32, col: 95 },
    }
  },
  {
    resolution: '1680x1050',
    name: 'HD (1680x1050)',
    rows: 30,
    cols: 64,
    nodeSize: 25,
    containerClass: 'grid-container-hd', 
    topBarClass: 'top-bar-hd', 
    defaultPositions: {
      startNode: { row: 15, col: 20 },
      endNode: { row: 15, col: 41 },
    }
  },
  {
    resolution: '1440x900',
    name: 'HD2 (1440x900)',
    rows: 25,
    cols: 54,
    nodeSize: 25.2,
    containerClass: 'grid-container-hd', 
    topBarClass: 'top-bar-hd', 
    defaultPositions: {
      startNode: { row: 13, col: 15 },
      endNode: { row: 13, col: 35 },
    }
  },
  {
    resolution: '1280x768',
    name: 'ipad (1280x768)',
    rows: 24,
    cols: 39,
    nodeSize: 25,
    containerClass: 'grid-container-ipad', 
    topBarClass: 'top-bar-ipad', 
    defaultPositions: {
      startNode: { row: 12, col: 11 },
      endNode: { row: 12, col: 26 },
    }
  },
  
];

/**
 * Finds the most appropriate grid configuration based on screen dimensions
 * @param {number} screenWidth - Current screen width
 * @param {number} screenHeight - Current screen height
 * @returns {Object} The best matching resolution configuration
 */
export const getResolutionConfig = (screenWidth, screenHeight) => {
  // For mobile devices or small screens
  if (screenWidth < 768) {
    const mobileConfig = resolutionConfigs.find(config => config.resolution === 'mobile');
    if (mobileConfig) return mobileConfig;
  }
  
  // Try to find an exact match first
  const exactMatch = resolutionConfigs.find(
    config => {
      const [width, height] = config.resolution.split('x').map(Number);
      // Allow some flexibility in matching (±100px)
      return Math.abs(screenWidth - width) <= 100 && Math.abs(screenHeight - height) <= 100;
    }
  );
  
  if (exactMatch) return exactMatch;
  
  // If no exact match, find the closest one (excluding mobile)
  const desktopConfigs = resolutionConfigs.filter(config => config.resolution !== 'mobile');
  
  // Sort by how close the resolution is to the current screen
  const sortedConfigs = desktopConfigs.sort((a, b) => {
    const [aWidth, aHeight] = a.resolution.split('x').map(Number);
    const [bWidth, bHeight] = b.resolution.split('x').map(Number);
    
    const aDiff = Math.abs(screenWidth - aWidth) + Math.abs(screenHeight - aHeight);
    const bDiff = Math.abs(screenWidth - bWidth) + Math.abs(screenHeight - bHeight);
    
    return aDiff - bDiff;
  });
  
  // Return the closest match or default to the first configuration if no matches
  return sortedConfigs[0] || resolutionConfigs[0];
};

/**
 * Calculates a proportional position when switching between grid sizes
 * @param {Object} node - The node position to recalculate
 * @param {number} oldRows - Previous grid row count
 * @param {number} oldCols - Previous grid column count
 * @param {number} newRows - New grid row count
 * @param {number} newCols - New grid column count
 * @returns {Object} New proportional position
 */
export const calculateProportionalPosition = (node, oldRows, oldCols, newRows, newCols) => {
  // Calculate proportional positions
  const rowRatio = newRows / oldRows;
  const colRatio = newCols / oldCols;
  
  // Apply ratio to get new position
  const newRow = Math.floor(node.row * rowRatio);
  const newCol = Math.floor(node.col * colRatio);
  
  // Ensure the position is within the grid bounds
  return {
    ...node,
    row: Math.min(newRow, newRows - 1),
    col: Math.min(newCol, newCols - 1)
  };
};

/**
 * Gets the available resolution options to display in UI
 * @returns {Array} Array of resolution names
 */
export const getResolutionOptions = () => {
  return resolutionConfigs.map(config => ({
    value: config.resolution,
    label: config.name
  }));
};

export default resolutionConfigs; 