const API_URL = 'php/api.php';

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Check and set player ID
let playerId = localStorage.getItem('sudoku_player_id');
if (!playerId) {
    playerId = uuidv4();
    localStorage.setItem('sudoku_player_id', playerId);
}

// UI Navigation
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

// Single Player
document.getElementById('btn-start-single').addEventListener('click', () => {
    const diff = document.getElementById('single-difficulty').value;
    const generator = new SudokuGenerator();
    const gameData = generator.generate(diff);
    
    localStorage.setItem('sudoku_game', JSON.stringify({
        mode: 'single',
        difficulty: diff,
        board: gameData.board,
        solution: gameData.solution
    }));
    
    window.location.href = 'game.html';
});

// Multiplayer: Create Room
let pollInterval = null;

document.getElementById('btn-create-room').addEventListener('click', () => {
    const diff = document.getElementById('multi-difficulty').value;
    const generator = new SudokuGenerator();
    const gameData = generator.generate(diff);
    
    const formData = new URLSearchParams();
    formData.append('action', 'create_room');
    formData.append('difficulty', diff);
    formData.append('board', JSON.stringify(gameData.board));
    formData.append('solution', JSON.stringify(gameData.solution));
    formData.append('player_id', playerId);

    document.getElementById('btn-create-room').disabled = true;
    document.getElementById('btn-create-room').innerText = "Oluşturuluyor...";

    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('btn-create-room').classList.add('hidden');
            document.getElementById('room-code-display').classList.remove('hidden');
            document.getElementById('generated-code').innerText = data.code;
            
            // Start polling waiting for player 2
            startLobbyPolling(data.code);
        } else {
            alert("Hata: " + data.error);
            document.getElementById('btn-create-room').disabled = false;
        }
    })
    .catch(err => {
        console.error(err);
        alert("Bağlantı hatası.");
        document.getElementById('btn-create-room').disabled = false;
    });
});

function startLobbyPolling(roomCode) {
    pollInterval = setInterval(() => {
        const formData = new URLSearchParams();
        formData.append('action', 'poll');
        formData.append('code', roomCode);

        fetch(API_URL, {
            method: 'POST',
            body: formData.toString(),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.state.status === 'playing') {
                clearInterval(pollInterval);
                startGameObj(data.state);
            }
        });
    }, 2000);
}

// Multiplayer: Join Room
document.getElementById('btn-join-room').addEventListener('click', () => {
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code.length === 0) return;

    const formData = new URLSearchParams();
    formData.append('action', 'join_room');
    formData.append('code', code);
    formData.append('player_id', playerId);

    const btn = document.getElementById('btn-join-room');
    btn.disabled = true;
    btn.innerText = "Bağlanıyor...";
    const errObj = document.getElementById('join-error');
    errObj.classList.add('hidden');

    fetch(API_URL, {
        method: 'POST',
        body: formData.toString(),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            startGameObj(data.state);
        } else {
            errObj.innerText = data.error;
            errObj.classList.remove('hidden');
            btn.disabled = false;
            btn.innerText = "Katıl";
        }
    })
    .catch(err => {
        errObj.innerText = "Bağlantı hatası!";
        errObj.classList.remove('hidden');
        btn.disabled = false;
        btn.innerText = "Katıl";
    });
});

function startGameObj(state) {
    localStorage.setItem('sudoku_game', JSON.stringify({
        mode: 'multi',
        difficulty: state.difficulty,
        board: state.board,
        solution: state.solution,
        roomCode: state.code,
        playerId: playerId
    }));
    window.location.href = 'game.html';
}

function initPWAPrompt() {
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) return;

    const lastPromptDate = localStorage.getItem('pwa_prompt_date');
    const now = new Date().getTime();
    if (lastPromptDate && now - parseInt(lastPromptDate) < 86400000) return;

    const ua = navigator.userAgent.toLowerCase();
    const isIos = /ipad|iphone|ipod/.test(ua) && !window.MSStream;
    const isAndroid = /android/.test(ua);
    
    let instructions = "";
    if (isIos) {
        instructions = "Ana ekrana eklemek için <br>menüden paylaş simgesine <svg style='width:14px;height:14px;vertical-align:-2px;' fill='currentColor' viewBox='0 0 24 24'><rect width='10' height='12' x='7' y='10' fill='none' stroke='currentColor' stroke-width='2' rx='2'/><path stroke='currentColor' stroke-width='2' stroke-linecap='round' d='M12 12V3m0 0l-3 3m3-3l3 3'/></svg> dokunun.";
    } else if (isAndroid) {
        instructions = "Hızlı oynamak için tarayıcı <br>menüsünden ⋮ 'Ana Ekrana Ekle' seçin.";
    } else {
        return; 
    }

    const pwaPrompt = document.getElementById('pwa-prompt');
    const pwaInst = document.getElementById('pwa-instructions');
    if (pwaPrompt && pwaInst) {
        pwaInst.innerHTML = instructions;
        pwaPrompt.classList.remove('hidden');
    }
}

window.dismissPWA = function() {
    const promptEl = document.getElementById('pwa-prompt');
    if (promptEl) promptEl.classList.add('hidden');
    localStorage.setItem('pwa_prompt_date', new Date().getTime().toString());
}

document.addEventListener('DOMContentLoaded', () => {
    initPWAPrompt();
});
