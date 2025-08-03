const canvas = document.getElementById("game_board");
const ctx = canvas.getContext("2d");
canvas.width = 500;
canvas.height = 500;

const hexRadius = 6;
const colors = ["#FA8072", "#FFE4C4", "#7FFFD4", "#DDA0DD"];
const rules = { B: [3], S: [2, 3], D: [0, 1, 4, 5, 6, 7, 8] };

const rows = Math.floor(canvas.height / hexRadius);
const cols = Math.floor(canvas.width / hexRadius);
// const rows = Math.floor(canvas.height / (hexRadius * 1.5));
// const cols = Math.floor(canvas.width / (hexRadius * Math.sqrt(3)));

let grid = createHexGrid(rows, cols);
function createHexGrid(rows, cols) {
    const grid = [];
    for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
            const isAlive = Math.random() > 0.4;
            const color = isAlive ? colors[Math.floor(Math.random() * colors.length)] : null;
            row.push({ alive: isAlive, color });
        }
        grid.push(row);
    }
    return grid;
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
    ctx.strokeStyle = "#FFEBCD";
    ctx.stroke();
}

function getDominantColor(colorCount) {
    if (Object.keys(colorCount).length === 0) return null;
    const colorCalc = (hex) => {
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        return r + g + b;
    };

    const maxCount = Math.max(...Object.values(colorCount));
    const candidates = Object.keys(colorCount).filter(color => colorCount[color] === maxCount);

    if (candidates.length === 1) return candidates[0];
    return candidates.sort((a, b) => colorCalc(a) - colorCalc(b))[0];
}


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

    const offsets = ( r % 2 == 0) ? evenRow : oddRow;
    let count = 0;
    const colorCount = {};

    offsets.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighbor = grid[nr][nc];
            if (neighbor.alive) {
                count++;
                colorCount[neighbor.color] = (colorCount[neighbor.color] || 0) + 1;
            }
        }
    });

    const dominant = getDominantColor(colorCount);
    console.log(`Cell [${r},${c}] has ${count} alive neighbors.`);
    return { count, dominant };
}

function nextGeneration() {
    const newGrid = createHexGrid(rows, cols);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const { count, dominant } = countNeighbors(r, c);
            const cell = grid[r][c];
            console.log(`Cell [${r},${c}] - Current: ${cell.alive ? cell.color : 'Dead'}, Dominant: ${dominant}`);
            if (cell.alive) {
                newGrid[r][c].alive = rules.S.includes(count);
                newGrid[r][c].color = cell.color;
            } else {
                newGrid[r][c].alive = rules.B.includes(count);
                newGrid[r][c].color = dominant || null;
            }
        }
    }
    grid = newGrid;
    generationCount++;
    aliveRatioCalc();
    counters();
    drawHexGrid();
    updateChart();
}

let generationCount = 1;
let aliveRatio = 0;

function counters() {
    document.getElementById("generation_count").textContent = `Generation: ${generationCount}`;
    document.getElementById("alive_ratio_count").textContent = `Alive Ratio: ${aliveRatio.toFixed(0)}%`;
}

function aliveRatioCalc() {
    let aliveCells = 0;
    let totalCells = rows * cols;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c].alive) {
                aliveCells++;
            }
        }
    }
    aliveRatio = (aliveCells / totalCells) * 100;
}

let statsCtx = document.getElementById('statistics').getContext('2d');
let statistics = new Chart(statsCtx, {
    type: 'line',
    data: {
        labels: [generationCount],
        datasets: [{
            label: 'Alive Ratio Observation',
            data: [aliveRatio],
            borderColor: '#55B6B9',
            borderWidth: 2,
            fill: true,
            pointStyle: false,
            pointHoverRadius: 4
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: {title: {display: true, text: "Generation"}, min: 1, max: 1000},
            y: {title: {display: true, text: "Alive Ratio (%)"}, min: 0, max: 100}
        }
    }
});

function updateChart() {
    statistics.data.labels.push(generationCount);
    statistics.data.datasets[0].data.push(aliveRatio);
    statistics.update();
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
    aliveRatioCalc();
    counters();
    drawHexGrid();

    statistics.data.labels = [generationCount];
    statistics.data.datasets[0].data = [aliveRatio];
    statistics.update();

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