# Pathfinder Visualizer


Pathfinder Visualizer is an interactive web application designed to help developers, educators, and students understand and compare various pathfinding algorithms and maze generation techniques. With engaging real-time animations, you can watch how algorithms explore grids, find the shortest path, and generate mazes.


# Features

**Algorithm Visualization**
Dijkstra's Algorithm – Compute shortest paths in weighted grids.
A* Search – A heuristic-based, efficient pathfinding method.
Breadth-First Search (BFS) – Explore all neighbors level by level. (To be implemented)
Depth-First Search (DFS) – Traverse deeply before backtracking. (To be implemented)

**Maze Generation**
Generate mazes using techniques such as recursive division.
Interactive Grid
Easily set start and end points.
Draw walls/obstacles by clicking on grid cells.
Adjust grid dimensions and animation speeds.
Real-Time Animation
Step-by-step visual progression of the selected algorithm.
Customizable Settings
Modify configuration via a settings file (e.g., config.js) or environment variables.

**Live Demo**
Try it out live at: [Live Demo](https://pathfinder-visualizer-iota.vercel.app/)

# Getting Started

**Prerequisites**

        Node.js (v14 or later)
        npm or yarn

# Installation

**Clone the repository and install the dependencies:**

        git clone https://github.com/yares28/Pathfinder-Visualizer.git
        cd Pathfinder-Visualizer
        npm install

# Running the Application

**Start the development server:**

        npm start
        Then open your browser and navigate to http://localhost:3000 to use the visualizer.

**Usage**

Select an Algorithm: Choose from the available pathfinding options (e.g., Dijkstra, A*, BFS, DFS).
Configure the Grid: Click to set the starting (green) and ending (red) nodes.
Place Obstacles: Draw walls by clicking on grid cells.
Animate: Click the “Start” button to run the selected algorithm and watch the animated visualization.
Reset/Adjust: Use the control panel to reset the grid or change parameters such as animation speed and grid size.
Configuration
The visualizer supports configuration through a dedicated file (e.g., config.js). Here you can adjust:

Grid Dimensions: Number of rows and columns.
Animation Speed: Delay between algorithm steps.
Algorithm Options: Enable or disable certain algorithms as needed.
Integration with CI
For continuous integration, you can include tests to verify that:

The grid renders correctly.
Algorithms execute and complete as expected.
UI components respond correctly to user input.
A sample test script is provided in the project.

# Who Uses Pathfinder Visualizer

**Pathfinder Visualizer is ideal for:**

Developers: To debug or demonstrate algorithm performance.
Educators: As a teaching aid in computer science courses.
Students: To experiment with algorithm behavior and understand complexity.
Contributing
Contributions are welcome! Please see our Contributing Guidelines for details on how to help improve the project.

