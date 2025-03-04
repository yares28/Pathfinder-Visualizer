// =====================================================
// Node.jsx
// This component represents a single cell (node) in the pathfinding grid.
// It is optimized with React.memo to avoid unnecessary re-renders.
// Depending on its state, it displays different icons for start, end, or checkpoint.
// =====================================================

import React, { memo } from 'react';
import './Node.css'; // Import node-specific styles
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faBullseye, faLocationDot } from '@fortawesome/free-solid-svg-icons';

/**
 * Node Component - Represents a single cell in the pathfinding grid.
 * The component accepts props for its row and column indices, status flags (isStart, isEnd, isWall, isCheckpoint),
 * event handlers for mouse and drag events, and accessibility attributes.
 */
const Node = ({
  row,
  col,
  isStart,
  isEnd,
  isWall,
  isCheckpoint,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  role,
  ariaLabel,
  tabIndex,
  onDragLeave,
}) => {
  // Determine additional CSS class based on node type.
  let extraClassName = '';
  if (isStart) extraClassName = ''; // Special styling for start node is handled by a dedicated class.
  else if (isEnd) extraClassName = ''; // Similarly for end node.
  else if (isCheckpoint) extraClassName = ''; // And for checkpoint.
  else if (isWall) extraClassName = 'node-wall'; // For wall nodes, append the 'node-wall' class.

  // Render the node element with all passed-in event handlers and attributes.
  return (
    <div
      id={`node-${row}-${col}`}
      className={`node ${extraClassName}`}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(e) => onDragOver(e, row, col)}
      onDrop={onDrop}
      onDragLeave={() => onDragLeave(row, col)}
      role={role}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
    >
      {/* Display an icon based on the node's type */}
      {isStart && <FontAwesomeIcon icon={faAngleRight} size="2xl" />}
      {isEnd && <FontAwesomeIcon icon={faBullseye} size="xl" />}
      {isCheckpoint && <FontAwesomeIcon icon={faLocationDot} size="xl" />}
    </div>
  );
};

// Export the memoized version of Node to optimize re-rendering.
export default memo(Node);
