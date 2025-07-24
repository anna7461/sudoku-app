let solutionBoard = [];
let notesMode = false;

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
    const {notes: savedNotes, inputs: savedInputs} = loadGameState();
    const originalPuzzle = JSON.parse(localStorage.getItem("originalPuzzle"));
    const table = document.getElementById("sudokuBoard");
    table.innerHTML = "";

    for (let row = 0; row < 9; row++) {
        let tr = document.createElement("tr");
        for (let col = 0; col < 9; col++) {
            const td = document.createElement("td");

            const inputData = savedInputs.find(i => i.row === row && i.col === col);
            const isFixed = originalPuzzle?.[row]?.[col] !== 0 && !inputData;

            if (!isFixed) {
                // Editable cell
                const wrapper = document.createElement("div");
                wrapper.classList.add("cell-wrapper");

                const input = document.createElement("input");
                input.type = "text";
                input.maxLength = 1;
                input.classList.add("normal-input");

                const notes = document.createElement("div");
                notes.classList.add("notes-grid");
                const key = `${row}-${col}`;
                notes.dataset.notes = savedNotes?.[key] || "";
                updateNotesDisplay(notes);

                const saved = savedInputs?.find(i => i.row === row && i.col === col);
                let isCorrect = false;

                if (saved) {
                    input.value = saved.value;

                    if (Number(saved.value) === solutionBoard[row][col]) {
                        isCorrect = true;
                        input.readOnly = true;
                        notes.readOnly = true;
                        input.classList.add("correct");
                        input.style.display = "block";
                        notes.style.display = "none";
                        notes.dataset.notes = "";
                    } else {
                        // ⚠️ Not correct, but maybe marked as invalid earlier
                        if (saved.invalid) {
                            input.classList.add("invalid");
                        }
                    }
                }

                input.addEventListener("focus", () => {
                    const val = input.value.trim();
                    if (/^[1-9]$/.test(val)) {
                        highlightMatching(val);
                    }
                });

                notes.addEventListener("focus", () => {
                    const keyNotes = notes.dataset.notes?.split(",").filter(Boolean);
                    if (keyNotes?.length === 1) {
                        highlightMatching(keyNotes[0]);
                    }
                });

                input.addEventListener("input", () => {
                    const val = input.value;
                    highlightMatching(val);

                    if (!/^[1-9]$/.test(val)) {
                        input.value = "";
                        input.classList.remove("invalid");
                        return;
                    }

                    const numVal = Number(val);

                    if (numVal === solutionBoard[row][col]) {
                        input.readOnly = true;
                        input.classList.remove("invalid");
                        input.classList.add("correct");
                        input.style.display = "block";
                        notes.style.display = "none";

                        // ✅ Clear notes from UI and state
                        notes.dataset.notes = "";
                        notes.innerHTML = "";
                        // notes.style.display = 'none';

                        const key = `${row}-${col}`;
                        savedNotes[key] = "";
                        // localStorage.setItem("savedNotes", JSON.stringify(savedNotes));

                        saveGameState();
                        renderBoard(puzzle);
                        applyCompletedClass();
                        updateDockBoard();

                        return;
                    }

                    if (notesMode) return;

                    const currentBoard = getCurrentBoard();
                    currentBoard[row][col] = 0;

                    const isValid = isSafe(currentBoard, row, col, numVal);
                    input.classList.toggle("invalid", !isValid);
                    saveGameState();
                });

                input.addEventListener("blur", () => {
                    setTimeout(() => {
                        document.querySelectorAll("#sudokuBoard td.highlighted").forEach(cell => {
                            cell.classList.remove("highlighted");
                        });
                    }, 100);
                });

                notes.addEventListener("blur", () => {
                    setTimeout(() => {
                        document.querySelectorAll("#sudokuBoard td.highlighted").forEach(cell => {
                            cell.classList.remove("highlighted");
                        });
                    }, 100);
                });


                td.addEventListener("keydown", (e) => {
                    if (!notesMode || Number(input.value) === solutionBoard[row][col]) return;

                    const pressedKey = e.key;
                    const cellKey = `${row}-${col}`;
                    let existing = notes.dataset.notes.split(",").filter(Boolean);

                    if (/^[1-9]$/.test(pressedKey)) {
                        e.preventDefault();
                        if (existing.includes(pressedKey)) {
                            existing = existing.filter((n) => n !== pressedKey);
                        } else {
                            existing.push(pressedKey);
                        }
                        existing.sort();
                        notes.dataset.notes = existing.join(",");
                        savedNotes[cellKey] = notes.dataset.notes;
                        saveGameState();
                        updateNotesDisplay(notes);
                        highlightMatching(pressedKey);
                    }

                    // ✅ Backspace handling in notes mode
                    if (pressedKey === "Backspace" && existing.length > 0) {
                        e.preventDefault();
                        existing = [];
                        notes.dataset.notes = "";
                        notes.innerHTML = "";
                        savedNotes[cellKey] = "";
                        updateNotesDisplay(notes);
                        saveGameState();
                    }
                });

                wrapper.appendChild(input);
                wrapper.appendChild(notes);
                td.appendChild(wrapper);
            } else {
                // In renderBoard(), inside the else block for fixed cells
                const fixedVal = originalPuzzle[row][col];
                td.textContent = fixedVal;
                td.classList.add("fixed");

                // Add click listener for highlighting
                td.addEventListener("click", () => {
                    highlightMatching(String(fixedVal));
                });
            }

            // Add highlight click handler to every cell (fixed or editable)
            td.addEventListener("click", () => {
                const input = td.querySelector("input");
                const val = input?.value?.trim() || td.textContent?.trim();
                if (/^[1-9]$/.test(val)) {
                    highlightMatching(val);
                }
            });

            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    // renderBoard(puzzle);
    applyCompletedClass();
    updateDockBoard();
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
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isSafe(board, row, col, num)) {
                        board[row][col] = num;
                        if (solveSudoku(board)) return true;
                        board[row][col] = 0;
                    }
                }
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
    const board = Array.from({length: 9}, () => Array(9).fill(0));
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
    const seen = new Set();
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const val = board[r][c];

            if (val === 0) return false;

            const row = `row-${r}-${val}`;
            const col = `col-${c}-${val}`;
            const box = `box-${Math.floor(r / 3)}-${Math.floor(c / 3)}-${val}`;

            if (seen.has(row) || seen.has(col) || seen.has(box)) return false;

            seen.add(row);
            seen.add(col);
            seen.add(box);
        }
    }
    return true;
}

newGameBtn.addEventListener("click", () => {
    const difficulty = difficultySelect.value;
    const puzzle = generateSudoku(difficulty);

    localStorage.setItem("originalPuzzle", JSON.stringify(puzzle));
    localStorage.removeItem("savedNotes");
    localStorage.removeItem("userInputs");
    localStorage.removeItem("notesMode");

    notesMode = false;
    toggleNotesBtn.textContent = "✏️ Notes: Off";

    renderBoard(puzzle);
    updateDockBoard();
    saveGameState();
});

hintBtn.addEventListener("click", () => {
    const table = document.getElementById("sudokuBoard");
    const rows = table.querySelectorAll("tr");

    for (let r = 0; r < 9; r++) {
        const cells = rows[r].querySelectorAll("td");
        for (let c = 0; c < 9; c++) {
            const cell = cells[c];
            const input = cell.querySelector("input");
            if (input && input.value === "") {
                const correct = solutionBoard[r][c];
                input.value = correct;

                const saved = JSON.parse(localStorage.getItem("userInputs")) || [];

                saved.push({row: r, col: c, value: String(correct), invalid: false});
                localStorage.setItem("userInputs", JSON.stringify(saved));

                saveGameState();
                renderBoard(getCurrentBoard());
                updateDockBoard();
                return;
            }
        }
    }
    alert("No more empty cells!");
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
    const board = getCurrentBoard();
    const notes = {};
    const inputs = [];

    const table = document.getElementById("sudokuBoard");
    const rows = table.querySelectorAll("tr");
    for (let r = 0; r < 9; r++) {
        const cells = rows[r].querySelectorAll("td");
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
            }
        }
    }

    // localStorage.setItem("savedBoard", JSON.stringify(board));
    localStorage.setItem("savedNotes", JSON.stringify(notes));
    localStorage.setItem("userInputs", JSON.stringify(inputs));
    localStorage.setItem("notesMode", JSON.stringify(notesMode));
}

function loadGameState() {
    const board = JSON.parse(localStorage.getItem("originalPuzzle"));
    const notes = JSON.parse(localStorage.getItem("savedNotes")) || {};
    const inputs = JSON.parse(localStorage.getItem("userInputs")) || [];
    const storedSolution = JSON.parse(localStorage.getItem("solutionBoard"));

    if (storedSolution) {
        solutionBoard = storedSolution;
    }

    notesMode = JSON.parse(localStorage.getItem("notesMode")) || false;

    const toggleNotesBtn = document.getElementById("toggleNotes");
    toggleNotesBtn.textContent = notesMode ? "✏️ Notes: On" : "✏️ Notes: Off";

    return {board, notes, inputs};
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
    if (e.target.tagName === "INPUT") return; // skip when typing in a cell

    const key = e.key;
    if (/^[1-9]$/.test(key)) {
        highlightMatching(key);
        highlightDockNumber(key);
    } else if (e.key === "Escape") {
        clearHighlights(); // Optional: clear highlight for non-digit keys
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
    dockBoard.innerHTML = "";

    const allCells = document.querySelectorAll("#sudokuBoard td");
    const countMap = {};

    // ✅ Step 1: Count existing digits
    allCells.forEach(cell => {
        const input = cell.querySelector("input");
        const isFixed = cell.classList.contains("fixed");
        const val = isFixed ? cell.textContent.trim() : input?.value?.trim();

        if (/^[1-9]$/.test(val)) {
            countMap[val] = (countMap[val] || 0) + 1;
        }
    });

    // ✅ Step 2: Then create dock cells based on actual counts
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
            highlightMatching(digit);
        });
    }
}