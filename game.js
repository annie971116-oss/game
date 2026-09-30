/* ==========================================================================
   蝴蝶結踩地雷 - 20x20 特效版 (庫洛米 Kuromi 主題) 遊戲核心邏輯
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 遊戲狀態全域變數
  let rows = 20;
  let cols = 20;
  let totalMines = 80;
  let currentLevelKey = 'hard';

  let board = [];
  let isFirstClick = true;
  let gameOver = false;
  let flaggedCount = 0;
  let revealedCount = 0;
  let timerInterval = null;
  let secondsElapsed = 0;

  // DOM 元素
  const homeScreen = document.getElementById('home-screen');
  const gameScreen = document.getElementById('game-screen');
  const minesweeperBoard = document.getElementById('minesweeper-board');

  const displayMode = document.getElementById('display-mode');
  const mineCountDisplay = document.getElementById('mine-count');
  const timerDisplay = document.getElementById('timer');

  const btnBackHome = document.getElementById('btn-back-home');
  const btnRestart = document.getElementById('btn-restart');
  const btnQuickSound = document.getElementById('btn-quick-sound');
  const quickSoundIcon = document.getElementById('quick-sound-icon');

  const btnSoundSettings = document.getElementById('btn-sound-settings');
  const btnInstructions = document.getElementById('btn-instructions');

  // Modals
  const soundModal = document.getElementById('sound-modal');
  const customModal = document.getElementById('custom-modal');
  const instructionsModal = document.getElementById('instructions-modal');
  const gameOverModal = document.getElementById('game-over-modal');

  const toggleBGM = document.getElementById('toggle-bgm');
  const toggleSFX = document.getElementById('toggle-sfx');
  const volumeRange = document.getElementById('volume-range');
  const btnTestSound = document.getElementById('btn-test-sound');

  const btnStartCustom = document.getElementById('btn-start-custom');
  const btnResultHome = document.getElementById('btn-result-home');
  const btnResultRestart = document.getElementById('btn-result-restart');

  // 初始化聲控介面狀態
  if (window.soundEngine) {
    toggleBGM.checked = window.soundEngine.bgmEnabled;
    toggleSFX.checked = window.soundEngine.sfxEnabled;
    volumeRange.value = window.soundEngine.masterVolume * 100;
    updateQuickSoundIcon();
  }

  // 背景飄落蝴蝶結與魔法星光動效
  initBackgroundParticles();

  // --------------------------------------------------------------------------
  // 事件監聽與畫面切換
  // --------------------------------------------------------------------------

  // 關卡選擇按鈕點擊
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = btn.dataset.level;
      if (level === 'custom') {
        openModal(customModal);
      } else {
        startLevel(level);
      }
    });
  });

  // 開始關卡函式
  function startLevel(levelKey, customR, customC, customM) {
    currentLevelKey = levelKey;

    if (levelKey === 'easy') {
      rows = 9; cols = 9; totalMines = 10;
      displayMode.textContent = '初級關卡 (9x9)';
    } else if (levelKey === 'medium') {
      rows = 16; cols = 16; totalMines = 40;
      displayMode.textContent = '中級關卡 (16x16)';
    } else if (levelKey === 'hard') {
      rows = 20; cols = 20; totalMines = 80;
      displayMode.textContent = '20×20 特效版';
    } else if (levelKey === 'custom') {
      rows = customR; cols = customC; totalMines = customM;
      displayMode.textContent = `自訂 (${rows}x${cols})`;
    }

    switchScreen(gameScreen);
    initGame();

    // 啟動 BGM (若已啟用)
    if (window.soundEngine && window.soundEngine.bgmEnabled) {
      window.soundEngine.startBGM();
    }
  }

  // 切換 Screen 函式
  function switchScreen(targetScreen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    targetScreen.classList.add('active');
  }

  // 回到主畫面
  btnBackHome.addEventListener('click', () => {
    stopTimer();
    switchScreen(homeScreen);
  });

  btnResultHome.addEventListener('click', () => {
    closeModal(gameOverModal);
    switchScreen(homeScreen);
  });

  // 重新開始
  btnRestart.addEventListener('click', () => {
    initGame();
  });

  btnResultRestart.addEventListener('click', () => {
    closeModal(gameOverModal);
    initGame();
  });

  // 快捷聲音按鈕
  btnQuickSound.addEventListener('click', () => {
    if (window.soundEngine) {
      const newState = !window.soundEngine.bgmEnabled;
      window.soundEngine.setBGM(newState);
      window.soundEngine.setSFX(newState);
      toggleBGM.checked = newState;
      toggleSFX.checked = newState;
      updateQuickSoundIcon();
    }
  });

  function updateQuickSoundIcon() {
    if (window.soundEngine) {
      quickSoundIcon.textContent = window.soundEngine.bgmEnabled ? '🔊' : '🔇';
    }
  }

  // 開啟 / 關閉 Modals
  btnSoundSettings.addEventListener('click', () => openModal(soundModal));
  btnInstructions.addEventListener('click', () => openModal(instructionsModal));

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      closeModal(document.getElementById(modalId));
    });
  });

  function openModal(modal) {
    modal.classList.add('active');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
  }

  // 聲音設定變更
  toggleBGM.addEventListener('change', (e) => {
    if (window.soundEngine) window.soundEngine.setBGM(e.target.checked);
    updateQuickSoundIcon();
  });

  toggleSFX.addEventListener('change', (e) => {
    if (window.soundEngine) window.soundEngine.setSFX(e.target.checked);
  });

  volumeRange.addEventListener('input', (e) => {
    if (window.soundEngine) window.soundEngine.setVolume(e.target.value / 100);
  });

  btnTestSound.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.playClick();
  });

  // 自訂關卡確認
  btnStartCustom.addEventListener('click', () => {
    const r = parseInt(document.getElementById('custom-rows').value) || 10;
    const c = parseInt(document.getElementById('custom-cols').value) || 10;
    const maxMines = Math.floor(r * c * 0.7);
    const m = Math.min(maxMines, Math.max(1, parseInt(document.getElementById('custom-mines').value) || 10));

    closeModal(customModal);
    startLevel('custom', r, c, m);
  });

  // --------------------------------------------------------------------------
  // 踩地雷核心邏輯
  // --------------------------------------------------------------------------

  function initGame() {
    board = [];
    isFirstClick = true;
    gameOver = false;
    flaggedCount = 0;
    revealedCount = 0;
    secondsElapsed = 0;

    stopTimer();
    updateTimerDisplay();
    updateMineDisplay();

    // 動態調整 Grid CSS 欄數
    minesweeperBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    minesweeperBoard.innerHTML = '';

    // 初始化二維陣列與 DOM
    for (let r = 0; r < rows; r++) {
      let rowArray = [];
      for (let c = 0; c < cols; c++) {
        const cellData = {
          r, c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
          element: null
        };

        const cellEl = document.createElement('div');
        cellEl.classList.add('cell', 'hidden');
        cellEl.dataset.row = r;
        cellEl.dataset.col = c;

        // 左鍵點擊翻開
        cellEl.addEventListener('click', () => handleCellClick(r, c));

        // 右鍵標記骷顱頭
        cellEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          handleCellRightClick(r, c);
        });

        // 手機長按支援標記
        let touchTimer = null;
        cellEl.addEventListener('touchstart', (e) => {
          touchTimer = setTimeout(() => {
            handleCellRightClick(r, c);
            touchTimer = null;
          }, 450);
        }, { passive: true });

        cellEl.addEventListener('touchend', () => {
          if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
          }
        });

        cellData.element = cellEl;
        minesweeperBoard.appendChild(cellEl);
        rowArray.push(cellData);
      }
      board.push(rowArray);
    }
  }

  // 首點安全佈雷
  function plantMines(safeR, safeC) {
    let planted = 0;
    while (planted < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);

      // 避開首點及其周圍方格
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;

      if (!board[r][c].isMine) {
        board[r][c].isMine = true;
        planted++;
      }
    }

    // 計算周圍地雷數
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!board[r][c].isMine) {
          let count = 0;
          getNeighbors(r, c).forEach(n => {
            if (n.isMine) count++;
          });
          board[r][c].neighborMines = count;
        }
      }
    }
  }

  function getNeighbors(r, c) {
    let neighbors = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          neighbors.push(board[nr][nc]);
        }
      }
    }
    return neighbors;
  }

  // 翻開方格處理
  function handleCellClick(r, c) {
    if (gameOver) return;

    const cell = board[r][c];
    if (cell.isFlagged || cell.isRevealed) return;

    // 首點處理
    if (isFirstClick) {
      isFirstClick = false;
      plantMines(r, c);
      startTimer();
    }

    // 播放點擊音效
    if (window.soundEngine) window.soundEngine.playClick();

    // 踩雷爆破
    if (cell.isMine) {
      triggerExplosion(cell);
      return;
    }

    // 翻開此方格
    revealCell(cell);

    // 若為 0，九宮格連鎖翻開
    if (cell.neighborMines === 0) {
      floodFillReveal(r, c);
    }

    // 檢查是否獲勝
    checkWinCondition();
  }

  function revealCell(cell) {
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    revealedCount++;

    const el = cell.element;
    el.classList.remove('hidden');
    el.classList.add('revealed');

    if (cell.neighborMines > 0) {
      el.textContent = cell.neighborMines;
      el.classList.add(`num-${cell.neighborMines}`);
    } else {
      el.classList.add('empty');
    }
  }

  function floodFillReveal(r, c) {
    const queue = [[r, c]];
    while (queue.length > 0) {
      const [cr, cc] = queue.shift();
      getNeighbors(cr, cc).forEach(n => {
        if (!n.isRevealed && !n.isFlagged && !n.isMine) {
          revealCell(n);
          if (n.neighborMines === 0) {
            queue.push([n.r, n.c]);
          }
        }
      });
    }
  }

  // 右鍵標記庫洛米骷顱頭
  function handleCellRightClick(r, c) {
    if (gameOver) return;

    const cell = board[r][c];
    if (cell.isRevealed) return;

    cell.isFlagged = !cell.isFlagged;
    if (cell.isFlagged) {
      cell.element.classList.add('flagged');
      flaggedCount++;
    } else {
      cell.element.classList.remove('flagged');
      flaggedCount--;
    }

    if (window.soundEngine) window.soundEngine.playFlag();
    updateMineDisplay();
    checkWinCondition();
  }

  // 失敗爆破處理
  function triggerExplosion(clickedCell) {
    gameOver = true;
    stopTimer();

    if (window.soundEngine) window.soundEngine.playExplosion();

    clickedCell.element.classList.add('exploded');

    // 揭曉所有地雷
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        if (cell.isMine) {
          cell.element.classList.remove('hidden');
          cell.element.classList.add('mine');
        }
      }
    }

    // 延遲跳出失敗 modal
    setTimeout(() => {
      showGameOverModal(false);
    }, 900);
  }

  // 獲勝判斷
  function checkWinCondition() {
    const totalCells = rows * cols;
    if (revealedCount === totalCells - totalMines) {
      gameOver = true;
      stopTimer();

      if (window.soundEngine) window.soundEngine.playVictory();

      // 剩餘地雷自動加上庫洛米骷顱頭標記
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = board[r][c];
          if (cell.isMine && !cell.isFlagged) {
            cell.isFlagged = true;
            cell.element.classList.add('flagged');
          }
        }
      }
      flaggedCount = totalMines;
      updateMineDisplay();

      // 20x20 特效彩帶與粉色蝴蝶結禮花
      createWinConfetti();

      setTimeout(() => {
        showGameOverModal(true);
      }, 700);
    }
  }

  // 顯示 Game Over 結算 Modal
  function showGameOverModal(isWin) {
    const title = document.getElementById('game-over-title');
    const desc = document.getElementById('game-over-desc');
    const icon = document.getElementById('game-over-icon');
    const resultTime = document.getElementById('result-time');
    const resultMode = document.getElementById('result-mode');

    resultTime.textContent = formatTime(secondsElapsed);
    resultMode.textContent = displayMode.textContent;

    if (isWin) {
      icon.textContent = '🎉';
      title.textContent = '成功過關！';
      title.style.color = '#ff80bc';
      desc.textContent = `恭喜你！在 ${formatTime(secondsElapsed)} 內完美掃除了所有地雷！`;
    } else {
      icon.textContent = '💥';
      title.textContent = '踩到地雷了！';
      title.style.color = '#ff4f70';
      desc.textContent = '沒關係～庫洛米為你加油，再挑戰一次吧！';
    }

    openModal(gameOverModal);
  }

  // --------------------------------------------------------------------------
  // 計時器與輔助工具
  // --------------------------------------------------------------------------

  function startTimer() {
    stopTimer();
    secondsElapsed = 0;
    timerInterval = setInterval(() => {
      secondsElapsed++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(secondsElapsed);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateMineDisplay() {
    const remaining = totalMines - flaggedCount;
    mineCountDisplay.textContent = remaining.toString().padStart(3, '0');
  }

  // 背景飄落蝴蝶結與魔法星光
  function initBackgroundParticles() {
    const container = document.getElementById('particle-container');
    const icons = ['🎀', '✨', '🌸', '💖', '☠️'];

    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      p.className = 'floating-particle';
      p.textContent = icons[Math.floor(Math.random() * icons.length)];
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${5 + Math.random() * 8}s`;
      p.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(p);
    }
  }

  // 獲勝滿版彩帶與蝴蝶結爆炸
  function createWinConfetti() {
    const container = document.getElementById('particle-container');
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      p.className = 'floating-particle';
      p.textContent = i % 2 === 0 ? '🎀' : '🎉';
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `-20px`;
      p.style.fontSize = `${1.5 + Math.random() * 1.5}rem`;
      p.style.animationDuration = `${2 + Math.random() * 3}s`;
      container.appendChild(p);

      setTimeout(() => p.remove(), 5000);
    }
  }
});
