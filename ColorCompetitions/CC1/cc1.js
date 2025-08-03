const canvas = document.getElementById("game_board");
const ctx = canvas.getContext("2d");
canvas.width = 500;
canvas.height = 500;

const hexRadius = 8;
const colors = ["#FA8072", "#FFE4C4", "#7FFFD4", "#DDA0DD"];

const rows = Math.floor(canvas.height / hexRadius);
const cols = Math.floor(canvas.width / hexRadius);

// const rows = Math.floor(canvas.height / (hexRadius * 1.5));
// const cols = Math.floor(canvas.width / (hexRadius * Math.sqrt(3)));

let grid = createHexGrid(rows, cols);

function createHexGrid(rows, cols) {
    const grid = [];
    const totalCells = rows * cols;
    const colorCount = Math.floor(totalCells / colors.length)

    const colorArray = [];
    colors.forEach(color => {
        for (let i = 0; i < colorCount; i++) {
            colorArray.push(color);
        }
    });

    shuffleArray(colorArray);

    let colorIndex = 0;
    for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
            row.push({ alive: true, color: colorArray[colorIndex++] });
        }
        grid.push(row);
    }

    return grid;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function drawHexGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const x = j * hexRadius * Math.sqrt(3) + (i % 2 == 1 ? hexRadius * Math.sqrt(3) / 2 : 0);
            const y = i * hexRadius * 1.5;
            drawHexagon(x, y, hexRadius, grid[i][j]);
        }
    }
}

function drawHexagon(x, y, radius, cell) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i  - Math.PI / 6;
        const xi = x + radius * Math.cos(angle);
        const yi = y + radius * Math.sin(angle);
        if (i == 0) ctx.moveTo(xi, yi);
        else ctx.lineTo(xi, yi);
    }
    ctx.closePath();
    ctx.fillStyle = cell.alive ? cell.color : "white";
    ctx.fill();

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "black";
    ctx.stroke();
}

const colorRules = {
    "#FA8072": "S",
    "#FFE4C4": "B",
    "#7FFFD4": "A",
    "#DDA0DD": "P"
};

const strength = {
    "S": { "S": "draw", "B": "lose", "A": "win", "P": "draw" },
    "B": { "S": "win", "B": "draw", "A": "draw", "P": "lose" },
    "A": { "S": "lose", "B": "draw", "A": "draw", "P": "win" },
    "P": { "S": "draw", "B": "win", "A": "lose", "P": "draw" }
};

function countNeighbors(r, c) {
    const evenRow = [
        [-1, -1], [-1, 0],
        [0, -1], [0, 1],
        [1, -1], [1, 0],
        [-2, 0], [2, 0]
    ];
    const oddRow = [
        [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, 0], [1, 1],
        [-2, 0], [2, 0]
    ];

    const offsets = (r % 2 == 0) ? evenRow : oddRow;
    const colorCount = {};

    offsets.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;

        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighbor = grid[nr][nc];
            if (neighbor.alive) {
                colorCount[neighbor.color] = (colorCount[neighbor.color] || 0) + 1;
            }
        }
    });
    console.log(`Color count for (${r}, ${c}):`, colorCount);

    const dominant = getDominantColor(colorCount);
    return { colorCount, dominant };
}

function getDominantColor(colorCount) {
    if (Object.keys(colorCount).length == 0) return null;
    const maxCount = Math.max(...Object.values(colorCount));
    const candidates = Object.keys(colorCount).filter(color => colorCount[color] === maxCount);
    return candidates[0];
}

let generationCount = 0;

function counters() {
    document.getElementById("generation_count").textContent = `Generation: ${generationCount}`;
}

function nextGeneration() {
    const newGrid = createHexGrid(rows, cols);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const { colorCount, dominant } = countNeighbors(r, c);
            const cell = grid[r][c];

            if (cell.alive) {
                let newColor = cell.color;
                const neighbors = Object.keys(colorCount);

                if (neighbors.length > 0) {
                    let currentType = colorRules[cell.color];
                    let foundStrongerNeighbor = false;

                    neighbors.forEach(neighbor => {
                        const neighborType = colorRules[neighbor];

                        if (currentType && neighborType) {
                            const currentStrength = strength[currentType][neighborType];

                            if (currentStrength === "lose") {
                                newColor = neighbor;
                                foundStrongerNeighbor = true;
                            }
                        }
                    });

                    if (!foundStrongerNeighbor) {
                        newColor = cell.color;
                    }
                }

                console.log(`Cell at (${r}, ${c}) color changed from ${cell.color} to ${newColor}`);
                newGrid[r][c].color = newColor;
            }
        }
    }

    grid = newGrid;
    generationCount++;
    counters();
    drawHexGrid();
}

function playGame() {
    const playButton = document.getElementById("play_btn");
    if (!window.transitionInterval) {
        startGame();
        playButton.textContent = "Pause";
    } else {
        stopGame();
        playButton.textContent = "Play";
    }
}

function startGame() {
    const transitionSpeed = document.getElementById("trans_speed").value;
    window.transitionInterval = setInterval(nextGeneration, transitionSpeed);
}

function stopGame() {
    clearInterval(window.transitionInterval);
    window.transitionInterval = null;
}

function init() {
    stopGame();
    generationCount = 1;
    grid = createHexGrid(rows, cols);
    counters();
    drawHexGrid();
    document.getElementById("play_btn").textContent = "Play";
}

init();

document.getElementById("play_btn").addEventListener("click", playGame);
document.getElementById("reset_btn").addEventListener("click", init);
document.getElementById("trans_speed").addEventListener("input", function() {
    if (window.transitionInterval) {
        clearInterval(window.transitionInterval);
        startGame();
    }
});