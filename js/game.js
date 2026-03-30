const API_URL = 'php/api.php';
const gameData = JSON.parse(localStorage.getItem('sudoku_game') || '{}');

if (!gameData.mode) {
    window.location.href = 'index.html';
}

const isMultiplayer = gameData.mode === 'multi';
const playerId = gameData.playerId;
const roomCode = gameData.roomCode;

let board = gameData.board;
let solution = gameData.solution;
let myProgress = gameData.myProgress || []; 
let opponentProgress = []; 
let totalEmptyCells = (gameData.initialBoard || board).filter(val => val === 0).length;
let mistakes = gameData.mistakes || 0;
const MAX_MISTAKES = 3;

// Keep original empty cell count safe
if (!gameData.initialBoard) {
    gameData.initialBoard = [...board];
    localStorage.setItem('sudoku_game', JSON.stringify(gameData));
}

function saveLocalState() {
    gameData.board = board;
    gameData.myProgress = myProgress;
    gameData.mistakes = mistakes;
    localStorage.setItem('sudoku_game', JSON.stringify(gameData));
}

const boardEl = document.getElementById('board');
const diffLabel = document.getElementById('diff-label');
let selectedIndex = null;
let pollInterval = null;
let gameFinished = false;

function initTitle() {
    let diffText = 'Kolay';
    if(gameData.difficulty === 'medium') diffText = 'Orta';
    if(gameData.difficulty === 'hard') diffText = 'Zor';
    diffLabel.innerText = `Zorluk: ${diffText}`;

    if (isMultiplayer) {
        document.getElementById('room-info').classList.remove('hidden');
        document.getElementById('game-room-code').innerText = roomCode;
        document.getElementById('op-score-box').classList.remove('hidden');
        startPolling();
    }
    
    // Restore mistake text
    document.getElementById('mistake-count').innerText = mistakes;
    updateScores();
}

function renderBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < 81; i++) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.index = i;
        
        if (board[i] !== 0) {
            cell.innerText = board[i];
            cell.classList.add('fixed');
            cell.addEventListener('click', () => selectCell(i));
        } else {
            cell.addEventListener('click', () => selectCell(i));
        }
        boardEl.appendChild(cell);
    }
    updateBoardVisually();
    updateCompletedButtons();
}

function selectCell(index) {
    if (gameFinished) return;
    const cells = document.querySelectorAll('.sudoku-cell');
    
    // Clear previous selections/highlights
    cells.forEach(c => c.classList.remove('selected', 'highlighted'));
    
    // Highlight matching numbers if cell is already filled by us or fixed
    if (board[index] !== 0) {
        const targetValue = board[index];
        cells.forEach((c, idx) => {
            if (board[idx] === targetValue) {
                c.classList.add('highlighted');
            }
        });
        selectedIndex = null;
        return;
    }

    // Select empty cell (including opponent-solved green cells since their answer is hidden)
    cells[index].classList.add('selected');
    selectedIndex = index;
}

function applyNumpadVal(val) {
    if (selectedIndex === null || gameFinished) return;
    const cell = document.querySelectorAll('.sudoku-cell')[selectedIndex];
    
    // Clear
    if (val === 'clear') {
        if (!cell.classList.contains('fixed') && !cell.classList.contains('opponent-solved')) {
            cell.innerText = '';
        }
        return;
    }

    const num = parseInt(val);
    
    // Validate Against Solution directly
    if (num === solution[selectedIndex]) {
        // Correct
        cell.innerText = num;
        cell.classList.remove('selected');
        board[selectedIndex] = num; // Mark as filled locally so we don't click it again
        if (!myProgress.includes(selectedIndex)) {
            myProgress.push(selectedIndex);
            updateScores();
        }
        cell.classList.add('fixed'); // make it unclickable
        selectedIndex = null;
        
        saveLocalState();
        checkWinCondition();
        updateCompletedButtons();
        if (isMultiplayer && !gameFinished) {
            sendUpdate();
        }
    } else {
        // Wrong
        cell.classList.add('error');
        mistakes++;
        document.getElementById('mistake-count').innerText = mistakes;
        saveLocalState();
        
        if (mistakes >= MAX_MISTAKES) {
            gameFinished = true;
            showEndScreen(false); // Lost
            if (isMultiplayer) sendUpdate(false, true); // send isFinished=false, isLost=true
        } else {
            setTimeout(() => cell.classList.remove('error'), 500);
        }
    }
}

function checkWinCondition() {
    if (myProgress.length === totalEmptyCells) {
        gameFinished = true;
        showEndScreen(true);
        if (isMultiplayer) sendUpdate(true);
    }
}

function updateScores() {
    const myPct = Math.round((myProgress.length / totalEmptyCells) * 100);
    document.getElementById('my-progress').innerText = myPct;
    
    if (isMultiplayer) {
        const opPct = Math.round((opponentProgress.length / totalEmptyCells) * 100);
        document.getElementById('op-progress').innerText = opPct;
    }
}

function updateBoardVisually() {
    const cells = document.querySelectorAll('.sudoku-cell');
    opponentProgress.forEach(idx => {
        if (!cells[idx].classList.contains('opponent-solved')) {
            cells[idx].classList.add('opponent-solved');
            
            // if we had it selected and we haven't solved it yet, unselect it
            if (selectedIndex === idx && board[idx] === 0) {
                cells[idx].classList.remove('selected');
                selectedIndex = null;
            }
        }
    });
    updateCompletedButtons();
}

function updateCompletedButtons() {
    const counts = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
    
    for (let i = 0; i < 81; i++) {
        if (board[i] !== 0) {
            counts[board[i]]++;
        }
    }
    
    document.querySelectorAll('.numpad-btn').forEach(btn => {
        const val = btn.dataset.val;
        if (val >= '1' && val <= '9') {
            if (counts[val] === 9) {
                btn.disabled = true;
            } else {
                btn.disabled = false;
            }
        }
    });
}

function showEndScreen(isWin, winReason = null) {
    clearInterval(pollInterval);
    const modal = document.getElementById('end-modal');
    const content = document.getElementById('end-content');
    const title = document.getElementById('end-title');
    const msg = document.getElementById('end-message');
    
    modal.classList.remove('hidden');
    if (isWin) {
        content.classList.add('win');
        title.innerText = "Kazandın!";
        if (winReason === 'abandon') {
            msg.innerText = "Rakip oyundan ayrıldı (Bağlantısı koptu). Hükmen galipsin!";
        } else {
            msg.innerText = "Harika oynadın.";
        }
    } else {
        content.classList.add('lose');
        title.innerText = "Kaybettin!";
        if (mistakes >= MAX_MISTAKES) {
            msg.innerText = "3 Hata yaptın ve elendin.";
        } else {
            msg.innerText = "Rakip senden önce bitirdi.";
        }
    }

    // Winner cleans up the room file from the server after a short delay
    if (isWin && isMultiplayer) {
        setTimeout(() => {
            const fd = new URLSearchParams();
            fd.append('action', 'delete_room');
            fd.append('code', roomCode);
            fetch(API_URL, {
                method: 'POST',
                body: fd.toString(),
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).catch(console.error);
        }, 5000); // 5 seconds guarantees the loser's device fetches the final game over screen first
    }
}

// Attach numpad events
document.querySelectorAll('.numpad-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        applyNumpadVal(e.target.dataset.val);
    });
});
// Attach keyboard events
document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') {
        applyNumpadVal(e.key);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        applyNumpadVal('clear');
    }
});

function quitGame() {
    if(confirm("Çıkmak istediğinize emin misiniz?")) {
        window.location.href = 'index.html';
    }
}


// --- Multiplayer Sync ---
function sendUpdate(isFinished = false, isLost = false) {
    const formData = new URLSearchParams();
    formData.append('action', 'update');
    formData.append('code', roomCode);
    formData.append('player_id', playerId);
    formData.append('progress', JSON.stringify(myProgress));
    formData.append('finished', isFinished);
    formData.append('lost', isLost);

    fetch(API_URL, {
        method: 'POST',
        body: formData.toString(),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    }).catch(console.error);
}

function startPolling() {
    pollInterval = setInterval(() => {
        if (gameFinished) return;

        const formData = new URLSearchParams();
        formData.append('action', 'poll');
        formData.append('code', roomCode);
        formData.append('player_id', playerId);

        fetch(API_URL, {
            method: 'POST',
            body: formData.toString(),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.state) {
                const state = data.state;
                
                // Find opponent progress
                for (const pid in state.players) {
                    if (pid !== playerId) {
                        opponentProgress = state.players[pid].progress || [];
                    }
                }
                
                updateScores();
                updateBoardVisually();

                // Check overall winner
                if (state.winner) {
                    if (state.winner !== playerId) {
                        gameFinished = true;
                        showEndScreen(false, state.win_reason); // We lost
                    } else {
                        gameFinished = true;
                        showEndScreen(true, state.win_reason); // We won
                    }
                }
            }
        }).catch(err => console.error(err));
    }, 2000); // Poll every 2 seconds
}

// initialization
initTitle();
renderBoard();
