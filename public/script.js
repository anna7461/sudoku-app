let solutionBoard = [];
let notesMode = false;
let selectedCell = null;
let moveHistory = [];
let savedInputs = [];
let savedNotes = {};

try {
    savedInputs = JSON.parse(localStorage.getItem("userInputs")) || [];
    savedNotes = JSON.parse(localStorage.getItem("savedNotes")) || {};
} catch (e) {
    console.error("Global init: Failed to parse savedInputs or savedNotes from localStorage", { error: e.message });
}


const toggleNotesBtn = document.getElementById("toggleNotes");
const resetNotesBtn = document.getElementById("resetNotes");
const resetGameBtn = document.getElementById("resetGame");
const newGameBtn = document.getElementById("newGame");
const hintBtn = document.getElementById("hintBtn");
const checkBtn = document.getElementById("checkPuzzle");
const resultEl = document.getElementById("checkResult");

const difficultySelect = document.getElementById("difficulty");

toggleNotesBtn.addEventListener("click", () => {
    notesMode = !notesMode;
    toggleNotesBtn.textContent = notesMode ? "✏️ Notes: On" : "✏️ Notes: Off";
    saveGameState();
    renderBoard(getCurrentBoard());
    applyCompletedClass();
});

resetNotesBtn.addEventListener("click", () => {
    const table = document.getElementById("sudokuBoard");
    const rows = table.querySelectorAll("tr");
    const notes = {};

    for (let r = 0; r < 9; r++) {
        const cells = rows[r].querySelectorAll("td");
        for (let c = 0; c < 9; c++) {
            const notesEl = cells[c].querySelector(".notes-grid");
            if (notesEl) {
                notesEl.dataset.notes = "";
                notesEl.value = "";
                notes[`${r}-${c}`] = "";
            }
        }
    }

    localStorage.setItem("savedNotes", JSON.stringify(notes));
    saveGameState(); // Optional, to persist changes with the rest of the board
});

resetGameBtn.addEventListener("click", () => {
    const original = JSON.parse(localStorage.getItem("originalPuzzle"));
    if (!original) {
        alert("No original puzzle found.");
        return;
    }

    localStorage.removeItem("userInputs");
    localStorage.removeItem("savedNotes");
    localStorage.removeItem("notesMode");

    notesMode = false;
    toggleNotesBtn.textContent = "✏️ Notes: Off";

    renderBoard(original);
    updateDockBoard();
    saveGameState();
});

function highlightMatching(value) {
    value = String(value).trim(); // 🔧 Ensure it's a string and trimmed
    highlightDockNumber(value);
    clearHighlights();

    if (!value || !/^[1-9]$/.test(value)) return; // ❗ Ensure it's 1–9 only

    const allCells = document.querySelectorAll("#sudokuBoard td");
    let matchCount = 0;

    allCells.forEach(cell => {
        const input = cell.querySelector("input");
        const notes = cell.querySelector(".notes-grid");
        const isFixed = cell.classList.contains("fixed");

        const fixedVal = isFixed ? cell.textContent.trim() : null;
        const inputVal = input ? input.value.trim() : null;

        const hasMatch =
            (isFixed && fixedVal === value) ||
            (input && inputVal === value);

        // 🎯 Highlight notes
        if (notes) {
            notes.querySelectorAll(".note").forEach(div => {
                div.classList.toggle("highlighted-note", div.textContent === value);
            });
        }

        // Always clear previous
        cell.classList.remove("highlighted", "completed");

        // ✅ Add highlights
        if (hasMatch) {
            cell.classList.add(matchCount >= 9 ? "completed" : "highlighted");
            matchCount++;
        }
    });

    console.log("Highlighting value:", value, "Matched:", matchCount);
}

function clearHighlights() {
    document.querySelectorAll("#sudokuBoard td").forEach(cell => {
        cell.classList.remove("highlighted");

        const notes = cell.querySelector(".notes-grid");
        // if (notes) updateNotesDisplay(notes);
        if (notes) {
            notes.querySelectorAll(".note").forEach(note => {
                note.classList.remove("highlighted-note");
            });
        }
    });
}

document.addEventListener("click", (e) => {
    const board = document.getElementById("sudokuBoard");
    const dock = document.getElementById("dockBoard");
    if (!board.contains(e.target) && !dock.contains(e.target)) {
        clearHighlights();
    }
});

function updateNotesDisplay(notesEl) {
    if (notesEl.style.display === "none") return;

    const notesArr = notesEl.dataset.notes?.split(",").filter(Boolean) || [];
    notesEl.innerHTML = "";

    const td = notesEl.closest("td");
    if (!td) {
        for (let i = 1; i <= 9; i++) {
            const note = document.createElement("div");
            note.classList.add("note");
            if (notesArr.includes(String(i))) {
                note.textContent = i;
            }
            notesEl.appendChild(note);
        }
        return;
    }

    const tr = td.parentElement;
    const row = Array.from(tr.parentElement.children).indexOf(tr);
    const col = Array.from(tr.children).indexOf(td);

    const currentBoard = getCurrentBoard();

    function conflicts(row, col, val) {
        for (let c = 0; c < 9; c++) {
            if (c !== col) {
                const cellVal = Number(currentBoard[row][c]);
                if (cellVal && cellVal === val) return true;
            }
        }
        for (let r = 0; r < 9; r++) {
            if (r !== row) {
                const cellVal = Number(currentBoard[r][col]);
                if (cellVal && cellVal === val) return true;
            }
        }

        const boxStartRow = row - (row % 3);
        const boxStartCol = col - (col % 3);

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const rr = boxStartRow + r;
                const cc = boxStartCol + c;
                if (rr !== row || cc !== col) {
                    const cellVal = Number(currentBoard[rr][cc]);
                    if (cellVal && cellVal === val) return true;
                }
            }
        }
        return false;
    }

    for (let i = 1; i <= 9; i++) {
        const note = document.createElement("div");
        note.classList.add("note");
        if (notesArr.includes(String(i))) {
            note.textContent = i;
            if (conflicts(row, col, Number(i))) {
                note.classList.add("conflict-note");
            }
        }
        notesEl.appendChild(note);
    }
}

function renderBoard(puzzle) {
    if (!puzzle || !Array.isArray(puzzle) || puzzle.length !== 9) {
        console.error("renderBoard: Invalid puzzle input", { puzzle });
        return;
    }

    const { notes: savedNotes, inputs: savedInputs } = loadGameState();
    const originalPuzzle = JSON.parse(localStorage.getItem("originalPuzzle"));
    const table = document.getElementById("sudokuBoard");
    if (!table) {
        console.error("renderBoard: sudokuBoard table not found in DOM");
        return;
    }

    table.innerHTML = "";

    for (let row = 0; row < 9; row++) {
        if (!Array.isArray(puzzle[row]) || puzzle[row].length !== 9) {
            console.error("renderBoard: Invalid row in puzzle", { row, rowData: puzzle[row] });
            continue;
        }
        const tr = document.createElement("tr");

        for (let col = 0; col < 9; col++) {
            const td = document.createElement("td");
            td.dataset.row = row;
            td.dataset.col = col;

            const inputData = savedInputs.find(i => i.row === row && i.col === col);
            const isFixed = originalPuzzle?.[row]?.[col] !== 0 && !inputData;

            if (!isFixed) {
                const wrapper = document.createElement("div");
                wrapper.classList.add("cell-wrapper");

                const input = document.createElement("input");
                input.type = "text";
                input.readOnly = true;
                input.tabIndex = 0;
                input.maxLength = 1;
                input.inputMode = "none";
                input.classList.add("normal-input");

                const notes = document.createElement("div");
                notes.classList.add("notes-grid");
                const key = `${row}-${col}`;
                notes.dataset.notes = savedNotes?.[key] || "";
                updateNotesDisplay(notes);

                const saved = savedInputs?.find(i => i.row === row && i.col === col);

                if (saved) {
                    input.value = saved.value;
                    if (!solutionBoard[row]) {
                        console.error("renderBoard: solutionBoard row undefined", { row, col });
                    } else if (Number(saved.value) === solutionBoard[row][col]) {
                        input.classList.add("correct");
                        td.classList.add("correct");
                        notes.style.display = "none";
                        notes.dataset.notes = "";
                    } else if (saved.invalid) {
                        input.classList.add("invalid");
                    }
                } else if (input.value && !/^[1-9]$/.test(input.value)) {
                    console.warn("renderBoard: Invalid input value detected", { row, col, value: input.value });
                }

                wrapper.appendChild(input);
                wrapper.appendChild(notes);
                td.appendChild(wrapper);
            } else {
                const fixedVal = originalPuzzle[row][col];
                td.textContent = fixedVal;
                td.classList.add("fixed");

                td.addEventListener("click", () => {
                    highlightMatching(String(fixedVal));
                });
            }

            td.addEventListener("click", () => {
                const r = parseInt(td.dataset.row, 10);
                const c = parseInt(td.dataset.col, 10);

                if (isNaN(r) || isNaN(c)) {
                    console.error("renderBoard: Invalid cell dataset", { row: td.dataset.row, col: td.dataset.col });
                    return;
                }

                selectedCell = td;

                document.querySelectorAll("#sudokuBoard td.highlighted").forEach(cell => {
                    cell.classList.remove("highlighted");
                });
                document.querySelectorAll("#sudokuBoard td.highlight-ways").forEach(cell => {
                    cell.classList.remove("highlight-ways");
                });

                td.classList.add("highlighted");
                highlightWays(r, c);

                const input = td.querySelector("input");
                const val = input?.value?.trim() || td.textContent?.trim();

                if (val && !/^[1-9]$/.test(val)) {
                    console.warn("renderBoard: Invalid value for highlighting", { row: r, col: c, value: val });
                } else if (val) {
                    highlightMatching(val);
                }
            });

            tr.appendChild(td);
        }

        table.appendChild(tr);
    }

    applyCompletedClass();
    updateDockBoard();
}

function highlightWays(row, col) {
    const allCells = document.querySelectorAll("#sudokuBoard td");

    allCells.forEach(cell => {
        const r = parseInt(cell.dataset.row, 10);
        const c = parseInt(cell.dataset.col, 10);

        const inSameRow = r === row;
        const inSameCol = c === col;
        const inSameBox = Math.floor(r / 3) === Math.floor(row / 3) &&
            Math.floor(c / 3) === Math.floor(col / 3);

        if (inSameRow || inSameCol || inSameBox) {
            cell.classList.add("highlight-ways");
        }
    });
}

function isSafe(board, row, col, num) {
    for (let c = 0; c < 9; c++) if (board[row][c] === num) return false;
    for (let r = 0; r < 9; r++) if (board[r][col] === num) return false;
    const boxStartRow = row - (row % 3);
    const boxStartCol = col - (col % 3);
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (board[boxStartRow + r][boxStartCol + c] === num) return false;
        }
    }
    return true;
}

function solveSudoku(board) {
    if (!board || !Array.isArray(board) || board.length !== 9) {
        console.error("solveSudoku: Invalid board input", { board });
        return false;
    }

    for (let row = 0; row < 9; row++) {
        if (!Array.isArray(board[row]) || board[row].length !== 9) {
            console.error("solveSudoku: Invalid row in board", { row, rowData: board[row] });
            return false;
        }
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isSafe(board, row, col, num)) {
                        board[row][col] = num;
                        if (solveSudoku(board)) return true;
                        board[row][col] = 0;
                    }
                }
                console.warn("solveSudoku: No valid number found for cell", { row, col });
                return false;
            }
        }
    }
    return true;
}

function removeCells(board, difficulty = "easy") {
    let cellsToRemove = 35;
    if (difficulty === "medium") cellsToRemove = 45;
    if (difficulty === "hard") cellsToRemove = 55;
    while (cellsToRemove > 0) {
        const row = Math.floor(Math.random() * 9);
        const col = Math.floor(Math.random() * 9);
        if (board[row][col] !== 0) {
            board[row][col] = 0;
            cellsToRemove--;
        }
    }
}

function generateSudoku(difficulty) {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    solveSudoku(board);
    solutionBoard = JSON.parse(JSON.stringify(board));
    localStorage.setItem("solutionBoard", JSON.stringify(solutionBoard)); // ✅ Save it!
    removeCells(board, difficulty);
    return board;
}

function getCurrentBoard() {
    const table = document.getElementById("sudokuBoard");
    const rows = table.querySelectorAll("tr");
    const board = [];
    for (let r = 0; r < 9; r++) {
        const cells = rows[r].querySelectorAll("td");
        const row = [];
        for (let c = 0; c < 9; c++) {
            const cell = cells[c];
            const input = cell.querySelector("input");
            const value = input ? Number(input.value) : Number(cell.textContent);

            row.push(value || 0);
        }
        board.push(row);
    }
    return board;
}

function isValidSudoku(board) {
    if (!board || !Array.isArray(board) || board.length !== 9) {
        console.error("isValidSudoku: Invalid board input", { board });
        return false;
    }

    const seen = new Set();
    for (let r = 0; r < 9; r++) {
        if (!Array.isArray(board[r]) || board[r].length !== 9) {
            console.error("isValidSudoku: Invalid row in board", { row: r, rowData: board[r] });
            return false;
        }
        for (let c = 0; c < 9; c++) {
            const val = board[r][c];
            if (val === 0) continue;

            if (!/^[1-9]$/.test(String(val))) {
                console.warn("isValidSudoku: Invalid cell value", { row: r, col: c, value: val });
                return false;
            }

            const row = `row-${r}-${val}`;
            const col = `col-${c}-${val}`;
            const box = `box-${Math.floor(r / 3)}-${Math.floor(c / 3)}-${val}`;

            if (seen.has(row) || seen.has(col) || seen.has(box)) {
                console.warn("isValidSudoku: Conflict detected", { row: r, col: c, value: val });
                return false;
            }

            seen.add(row);
            seen.add(col);
            seen.add(box);
        }
    }
    return true;
}

newGameBtn.addEventListener("click", () => {
    if (!difficultySelect) {
        console.error("newGameBtn: difficultySelect element not found in DOM");
        return;
    }
    const difficulty = difficultySelect.value;
    if (!["easy", "medium", "hard"].includes(difficulty)) {
        console.warn("newGameBtn: Invalid difficulty selected", { difficulty });
        return;
    }

    const puzzle = generateSudoku(difficulty);
    if (!puzzle || !Array.isArray(puzzle)) {
        console.error("newGameBtn: Failed to generate new puzzle", { puzzle });
        return;
    }

    try {
        localStorage.setItem("originalPuzzle", JSON.stringify(puzzle));
        localStorage.removeItem("savedNotes");
        localStorage.removeItem("userInputs");
        localStorage.removeItem("notesMode");
    } catch (e) {
        console.error("newGameBtn: Failed to update localStorage", { error: e.message });
    }

    savedNotes = {};
    savedInputs = [];
    notesMode = false;
    if (toggleNotesBtn) {
        toggleNotesBtn.textContent = "✏️ Notes: Off";
    } else {
        console.error("newGameBtn: toggleNotes button not found in DOM");
    }

    renderBoard(puzzle);
    updateDockBoard();
    saveGameState();
});

document.getElementById("undoBtn").addEventListener("click", () => {
    if (!moveHistory.length) {
        console.warn("undoBtn: No moves in history to undo");
        return;
    }

    const lastMove = moveHistory.pop();
    if (!lastMove) {
        console.error("undoBtn: Invalid last move in history");
        return;
    }

    const { row, col, type, prevValue, prevInvalid, wasCorrect, prevNotes } = lastMove;

    const allCells = document.querySelectorAll("#sudokuBoard td");
    const td = [...allCells].find(cell =>
        Number(cell.dataset.row) === row && Number(cell.dataset.col) === col
    );

    if (!td) {
        console.error("undoBtn: Selected cell not found", { row, col });
        return;
    }

    const input = td.querySelector("input");
    const notes = td.querySelector(".notes-grid");

    if (type === "note") {
        if (!notes) {
            console.error("undoBtn: No notes-grid found for note undo", { row, col });
            return;
        }
        notes.dataset.notes = prevNotes || "";
        savedNotes[`${row}-${col}`] = prevNotes || "";
        updateNotesDisplay(notes);
    } else if (input) {
        input.value = prevValue || "";
        input.classList.toggle("correct", wasCorrect);
        input.classList.toggle("invalid", prevInvalid);
        input.readOnly = wasCorrect;

        if (wasCorrect) {
            notes.style.display = "none";
        } else if (notes) {
            notes.style.display = "";
        } else {
            console.warn("undoBtn: No notes-grid found for cell", { row, col });
        }

        const existingIndex = savedInputs.findIndex(i => i.row === row && i.col === col);
        if (existingIndex !== -1) {
            if (!prevValue) {
                savedInputs.splice(existingIndex, 1);
            } else {
                savedInputs[existingIndex].value = prevValue;
                savedInputs[existingIndex].invalid = prevInvalid;
            }
        } else if (prevValue) {
            savedInputs.push({ row, col, value: prevValue, invalid: prevInvalid });
        }
    } else {
        console.error("undoBtn: No input found for undo", { row, col });
    }

    saveGameState();
    applyCompletedClass();
    updateDockBoard();
});

hintBtn.addEventListener("click", () => {
    const table = document.getElementById("sudokuBoard");
    if (!table) {
        console.error("hintBtn: sudokuBoard table not found in DOM");
        return;
    }

    const rows = table.querySelectorAll("tr");
    if (rows.length !== 9) {
        console.error("hintBtn: Invalid number of rows in sudokuBoard", { rowCount: rows.length });
        return;
    }

    const currentBoard = getCurrentBoard();
    let hintApplied = false;

    for (let r = 0; r < 9; r++) {
        const cells = rows[r].querySelectorAll("td");
        if (cells.length !== 9) {
            console.error("hintBtn: Invalid number of cells in row", { row: r, cellCount: cells.length });
            continue;
        }
        for (let c = 0; c < 9; c++) {
            const cell = cells[c];
            const input = cell.querySelector("input");
            if (input && input.value === "") {
                if (!solutionBoard[r] || solutionBoard[r][c] === undefined) {
                    console.error("hintBtn: Invalid solutionBoard access", { row: r, col: c });
                    continue;
                }
                const correct = solutionBoard[r][c];
                if (isSafe(currentBoard, r, c, correct)) {
                    input.value = correct;
                    input.classList.add("correct");
                    input.readOnly = true;
                    const notes = cell.querySelector(".notes-grid");
                    if (notes) {
                        notes.style.display = "none";
                        savedNotes[`${r}-${c}`] = "";
                    } else {
                        console.warn("hintBtn: No notes-grid found for cell", { row: r, col: c });
                    }

                    savedInputs.push({ row: r, col: c, value: String(correct), invalid: false });
                    try {
                        localStorage.setItem("userInputs", JSON.stringify(savedInputs));
                    } catch (e) {
                        console.error("hintBtn: Failed to save userInputs to localStorage", { error: e.message });
                    }

                    moveHistory.push({
                        row: r,
                        col: c,
                        prevValue: "",
                        prevInvalid: false,
                        wasCorrect: false
                    });

                    saveGameState();
                    renderBoard(getCurrentBoard());
                    applyCompletedClass();
                    updateDockBoard();
                    hintApplied = true;
                    return;
                }
            }
        }
    }

    if (!hintApplied) {
        console.warn("hintBtn: No valid hints available");
        alert("No valid hints available!");
    }
});

checkBtn.addEventListener("click", () => {
    const board = getCurrentBoard();
    if (isValidSudoku(board)) {
        resultEl.textContent = "✅ Correct Sudoku!";
        resultEl.style.color = "green";
        updateDockBoard();
    } else {
        resultEl.textContent = "❌ Incorrect or incomplete.";
        resultEl.style.color = "red";
        updateDockBoard();
    }
});

function saveGameState() {
    const table = document.getElementById("sudokuBoard");
    if (!table) {
        console.error("saveGameState: sudokuBoard table not found in DOM");
        return;
    }

    const rows = table.querySelectorAll("tr");
    if (rows.length !== 9) {
        console.error("saveGameState: Invalid number of rows in sudokuBoard", { rowCount: rows.length });
        return;
    }

    const board = getCurrentBoard();
    const notes = {};
    const inputs = [];

    for (let r = 0; r < 9; r++) {
        const cells = rows[r].querySelectorAll("td");
        if (cells.length !== 9) {
            console.error("saveGameState: Invalid number of cells in row", { row: r, cellCount: cells.length });
            continue;
        }
        for (let c = 0; c < 9; c++) {
            const inputEl = cells[c].querySelector("input");
            const notesEl = cells[c].querySelector(".notes-grid");

            if (inputEl && inputEl.value) {
                inputs.push({
                    row: r,
                    col: c,
                    value: inputEl.value,
                    invalid: inputEl.classList.contains("invalid")
                });
            }

            if (notesEl) {
                const key = `${r}-${c}`;
                notes[key] = notesEl.dataset.notes || "";
            } else if (!cells[c].classList.contains("fixed")) {
                console.warn("saveGameState: Missing notes-grid for non-fixed cell", { row: r, col: c });
            }
        }
    }

    try {
        // localStorage.setItem("savedBoard", JSON.stringify(board));
        localStorage.setItem("savedNotes", JSON.stringify(notes));
        localStorage.setItem("userInputs", JSON.stringify(inputs));
        localStorage.setItem("notesMode", JSON.stringify(notesMode));
    } catch (e) {
        console.error("saveGameState: Failed to save to localStorage", { error: e.message });
    }

    savedInputs = inputs;
    savedNotes = notes;
}

function loadGameState() {
    let board, notes, inputs, storedSolution;
    try {
        board - JSON.parse(localStorage.getItem("originalPuzzle"));
        notes = JSON.parse(localStorage.getItem("savedNotes")) || {};   
        inputs = JSON.parse(localStorage.getItem("userInputs")) || [];
        storedSolution = JSON.parse(localStorage.getItem("solutionBoard"));
    } catch (e) {
        console.error("loadGameState: Failed to parse localStorage data", {
            error: e.message,
            keys: ["originalPuzzle", "savedNotes", "userInputs", "solutionBoard"]
        });
        board = null;
        notes = {};
        inputs = [];
        storedSolution = null;
    }

    if (!board) {
        console.warn("loadGameState: No original puzzle found in localStorage.");
    }

    if (storedSolution) {
        solutionBoard = storedSolution;
    } else {
        console.warn("loadGameState: No solution board found in localStorage.");
    }

    notesMode = JSON.parse(localStorage.getItem("notesMode")) || false;
    if (typeof notesMode !== "boolean") {
        console.error("loadGameState: Invalid notesMode value", {notesMode});
        notesMode = false; // Default to false if invalid
    }

    const toggleNotesBtn = document.getElementById("toggleNotes");
    if (!toggleNotesBtn) {
        console.error("loadGameState: toggleNotes button not found in DOM");
    } else {
        toggleNotesBtn.textContent = notesMode ? "✏️ Notes: On" : "✏️ Notes: Off";
    }

    return { board, notes, inputs };
}

const state = loadGameState();

if (state.board) {
    renderBoard(state.board);
    applyCompletedClass();
} else {
    const newBoard = generateSudoku("medium");
    localStorage.setItem("originalPuzzle", JSON.stringify(newBoard));
    renderBoard(newBoard);
    saveGameState();
}

document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;

    const key = e.key;
    if (/^[1-9]$/.test(key)) {
        highlightMatching(key);
        highlightDockNumber(key);

        if (!selectedCell) {
            console.warn("keydown: No cell selected for key input", { key });
            return;
        }

        const r = parseInt(selectedCell.dataset.row, 10);
        const c = parseInt(selectedCell.dataset.col, 10);
        if (isNaN(r) || isNaN(c)) {
            console.error("keydown: Invalid selected cell dataset", {
                row: selectedCell.dataset.row,
                col: selectedCell.dataset.col
            });
            return;
        }

        const input = selectedCell.querySelector("input");
        const notes = selectedCell.querySelector(".notes-grid");

        if (!input) {
            console.error("keydown: No input found in selected cell", { row: r, col: c });
            return;
        }
        if (input.classList.contains("correct")) {
            console.warn("keydown: Attempted to modify correct cell", { row: r, col: c, key });
            return;
        }

        if (notesMode) {
            if (!notes) {
                console.error("keydown: No notes-grid found in selected cell", { row: r, col: c });
                return;
            }
            const notesArr = notes.dataset.notes.split(",").filter(Boolean);
            const prevNotes = notes.dataset.notes;
            const index = notesArr.indexOf(key);
            if (index === -1) {
                notesArr.push(key);
            } else {
                notesArr.splice(index, 1);
            }
            moveHistory.push({
                row: r,
                col: c,
                type: "note",
                prevNotes
            });
            notes.dataset.notes = notesArr.join(",");
            savedNotes[`${r}-${c}`] = notes.dataset.notes;
            updateNotesDisplay(notes);
            saveGameState();
        } else {
            moveHistory.push({
                row: r,
                col: c,
                prevValue: input.value,
                prevInvalid: input.classList.contains("invalid"),
                wasCorrect: input.classList.contains("correct")
            });

            input.value = key;
            highlightMatching(key);

            const numVal = Number(key);
            const keyStr = `${r}-${c}`;
            savedNotes[keyStr] = "";
            if (notes) {
                notes.innerHTML = "";
                notes.dataset.notes = "";
            } else {
                console.warn("keydown: No notes-grid for clearing notes", { row: r, col: c });
            }

            const currentBoard = getCurrentBoard();
            currentBoard[r][c] = 0;

            const isValid = isSafe(currentBoard, r, c, numVal);
            input.classList.remove("invalid", "correct");

            if (!solutionBoard[r] || solutionBoard[r][c] === undefined) {
                console.error("keydown: Invalid solutionBoard access", { row: r, col: c });
            } else if (numVal === solutionBoard[r][c]) {
                input.classList.add("correct");
                input.readOnly = true;
                if (notes) notes.style.display = "none";
                savedNotes[keyStr] = "";
            } else if (!isValid) {
                input.classList.add("invalid");
            }

            const existingIndex = savedInputs.findIndex(i => i.row === r && i.col === c);
            if (existingIndex !== -1) {
                savedInputs[existingIndex].value = key;
                savedInputs[existingIndex].invalid = !isValid;
            } else {
                savedInputs.push({ row: r, col: c, value: key, invalid: !isValid });
            }

            saveGameState();
            renderBoard(getCurrentBoard());
            applyCompletedClass();
            updateDockBoard();
        }
    } else if (e.key === "Escape") {
        clearHighlights();
    } else {
        console.warn("keydown: Unhandled key pressed", { key });
    }
});
function applyCompletedClass() {
    const counts = {};
    const allCells = document.querySelectorAll("#sudokuBoard td");

    // Reset completed class
    allCells.forEach(cell => cell.classList.remove("completed"));

    // Count number appearances
    allCells.forEach(cell => {
        const input = cell.querySelector("input");
        const isFixed = cell.classList.contains("fixed");

        const val = isFixed
            ? cell.textContent.trim()
            : input?.value?.trim();

        if (/^[1-9]$/.test(val)) {
            counts[val] = (counts[val] || 0) + 1;
        }
    });

    // Apply completed class if count is 9
    allCells.forEach(cell => {
        const input = cell.querySelector("input");
        const isFixed = cell.classList.contains("fixed");

        const val = isFixed
            ? cell.textContent.trim()
            : input?.value?.trim();

        if (/^[1-9]$/.test(val) && counts[val] === 9) {
            cell.classList.add("completed");
        }
    });
}

function highlightDockNumber(val) {
    document.querySelectorAll('.dock-cell').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === String(val));
    });
}

function updateDockBoard() {
    const dockBoard = document.getElementById("dockBoard");
    if (!dockBoard) {
        console.error("updateDockBoard: dockBoard element not found in DOM");
        return;
    }

    dockBoard.innerHTML = "";

    const allCells = document.querySelectorAll("#sudokuBoard td");
    if (!allCells.length) {
        console.error("updateDockBoard: No cells found in sudokuBoard");
        return;
    }

    const countMap = {};

    allCells.forEach(cell => {
        const input = cell.querySelector("input");
        const isFixed = cell.classList.contains("fixed");
        const val = isFixed ? cell.textContent.trim() : input?.value?.trim();

        if (val && !/^[1-9]$/.test(val)) {
            console.warn("updateDockBoard: Invalid cell value detected", { value: val });
        } else if (val) {
            countMap[val] = (countMap[val] || 0) + 1;
        }
    });

    for (let i = 1; i <= 9; i++) {
        const digit = String(i);
        const filledCount = countMap[digit] || 0;
        const remaining = Math.max(0, 9 - filledCount);

        const dockCell = document.createElement("div");
        dockCell.classList.add("dock-cell");
        if (remaining === 0) dockCell.classList.add("completed");

        dockCell.innerHTML = `
            <div>${digit}</div>
            <div class="dock-count">${remaining}</div>
        `;
        dockCell.setAttribute("data-value", digit);
        dockBoard.appendChild(dockCell);

        dockCell.addEventListener("click", () => {
            if (!selectedCell) {
                console.warn("updateDockBoard: No cell selected for dock input", { digit });
                return;
            }

            const r = parseInt(selectedCell.dataset.row, 10);
            const c = parseInt(selectedCell.dataset.col, 10);
            if (isNaN(r) || isNaN(c)) {
                console.error("updateDockBoard: Invalid selected cell dataset", {
                    row: selectedCell.dataset.row,
                    col: selectedCell.dataset.col
                });
                return;
            }

            const wrapper = selectedCell.querySelector(".cell-wrapper");
            const input = wrapper?.querySelector("input");
            const notes = wrapper?.querySelector(".notes-grid");

            if (!input) {
                console.error("updateDockBoard: No input found in selected cell", { row: r, col: c });
                return;
            }
            if (input.classList.contains("correct")) {
                console.warn("updateDockBoard: Attempted to modify correct cell", { row: r, col: c });
                return;
            }

            const value = digit;

            if (notesMode) {
                if (!notes) {
                    console.error("updateDockBoard: No notes-grid found in selected cell", { row: r, col: c });
                    return;
                }
                const notesArr = notes.dataset.notes.split(",").filter(Boolean);
                const prevNotes = notes.dataset.notes;
                const index = notesArr.indexOf(value);
                if (index === -1) {
                    notesArr.push(value);
                } else {
                    notesArr.splice(index, 1);
                }
                moveHistory.push({
                    row: r,
                    col: c,
                    type: "note",
                    prevNotes
                });
                notes.dataset.notes = notesArr.join(",");
                savedNotes[`${r}-${c}`] = notes.dataset.notes;
                updateNotesDisplay(notes);
                saveGameState();
                return;
            }

            if (input.value !== value) {
                moveHistory.push({
                    row: r,
                    col: c,
                    prevValue: input.value,
                    prevInvalid: input.classList.contains("invalid"),
                    wasCorrect: input.classList.contains("correct")
                });
            }

            input.value = value;
            highlightMatching(value);

            const numVal = Number(value);
            const key = `${r}-${c}`;
            savedNotes[key] = "";
            if (notes) {
                notes.innerHTML = "";
                notes.dataset.notes = "";
            } else {
                console.warn("updateDockBoard: No notes-grid for clearing notes", { row: r, col: c });
            }

            const currentBoard = getCurrentBoard();
            currentBoard[r][c] = 0;

            const isValid = isSafe(currentBoard, r, c, numVal);
            input.classList.remove("invalid", "correct");

            if (!solutionBoard[r] || solutionBoard[r][c] === undefined) {
                console.error("updateDockBoard: Invalid solutionBoard access", { row: r, col: c });
            } else if (numVal === solutionBoard[r][c]) {
                input.classList.add("correct");
                input.readOnly = true;
                if (notes) notes.style.display = "none";
                savedNotes[key] = "";
                saveGameState();
                renderBoard(getCurrentBoard());
                applyCompletedClass();
                updateDockBoard();
                return;
            }

            if (!isValid) {
                input.classList.add("invalid");
            }

            const existingIndex = savedInputs.findIndex(i => i.row === r && i.col === c);
            if (existingIndex !== -1) {
                savedInputs[existingIndex].value = value;
                savedInputs[existingIndex].invalid = !isValid;
            } else {
                savedInputs.push({ row: r, col: c, value, invalid: !isValid });
            }

            saveGameState();
            applyCompletedClass();
            updateDockBoard();
        });
    }
}