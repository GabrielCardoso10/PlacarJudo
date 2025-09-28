document.addEventListener('DOMContentLoaded', () => {

    const timerDisplay = document.querySelector('.timer');
    const osaekomiTimerDisplay = document.querySelector('.osaekomi-timer');
    const goldenScoreIndicator = document.querySelector('.golden-score-indicator');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const body = document.body;
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveTimeBtn = document.getElementById('save-time-btn');
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const c1Name = document.getElementById('c1-name');
    const c2Name = document.getElementById('c2-name');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelpBtn = document.getElementById('close-help-btn');
    const osaekomiBtnWhite = document.getElementById('osaekomi-btn-white');
    const osaekomiBtnBlue = document.getElementById('osaekomi-btn-blue');
    const shidoBoxes = document.querySelectorAll('.shido');

    let mainTimeLeft = 240;
    let mainTimeElapsed = 0;
    let osaekomiTimeLeft = 0;
    let mainTimerInterval, osaekomiTimerInterval;
    let isMainTimerRunning = false;
    let isOsaekomiTimerRunning = false;
    let isMatchOver = false;
    let osaekomiCompetitor = null;
    let isGoldenScore = false;

    const getCompetitorPanel = (color) => document.querySelector(`.competitor-strip.${color}-strip`);

    function saveState() {
        const state = {
            c1: { name: c1Name.innerHTML, ippon: getCompetitorPanel('white').querySelector('.ippon').textContent, wazari: getCompetitorPanel('white').querySelector('.wazari').textContent, yuko: getCompetitorPanel('white').querySelector('.yuko').textContent, shidos: getCompetitorPanel('white').querySelectorAll('.shido.active').length },
            c2: { name: c2Name.innerHTML, ippon: getCompetitorPanel('blue').querySelector('.ippon').textContent, wazari: getCompetitorPanel('blue').querySelector('.wazari').textContent, yuko: getCompetitorPanel('blue').querySelector('.yuko').textContent, shidos: getCompetitorPanel('blue').querySelectorAll('.shido.active').length },
            timeSettings: { minutes: minutesInput.value, seconds: secondsInput.value },
            isGoldenScore: isGoldenScore
        };
        localStorage.setItem('judoScoreboardState', JSON.stringify(state));
    }

    function loadState() {
        try {
            const stateJSON = localStorage.getItem('judoScoreboardState');
            if (!stateJSON) return;
            const state = JSON.parse(stateJSON);

            if (state.timeSettings) {
                minutesInput.value = state.timeSettings.minutes;
                secondsInput.value = state.timeSettings.seconds;
            }
            mainTimeLeft = parseInt(minutesInput.value) * 60 + parseInt(secondsInput.value);
            updateMainTimerDisplay();

            ['white', 'blue'].forEach(color => {
                const competitorKey = color === 'white' ? 'c1' : 'c2';
                const data = state[competitorKey];
                if (data) {
                    const panel = getCompetitorPanel(color);
                    panel.querySelector('.name').innerHTML = data.name;
                    panel.querySelector('.ippon').textContent = data.ippon;
                    panel.querySelector('.wazari').textContent = data.wazari;
                    panel.querySelector('.yuko').textContent = data.yuko;
                    panel.querySelectorAll('.shido').forEach((shido, index) => { shido.classList.toggle('active', index < data.shidos); });
                }
            });
            
            isGoldenScore = state.isGoldenScore || false;
            if (isGoldenScore) {
                goldenScoreIndicator.classList.add('active');
                updateGSTimerDisplay();
            }
        } catch (error) {
            console.error("Erro", error);
            localStorage.removeItem('judoScoreboardState');
        }
    }

    function endMatch(winnerColor) {
        if (isMatchOver) return;
        isMatchOver = true;
        clearInterval(mainTimerInterval);
        clearInterval(osaekomiTimerInterval);
        isMainTimerRunning = false;
        if(isOsaekomiTimerRunning) resetOsaekomiVisuals();
        isOsaekomiTimerRunning = false;
        
        if (winnerColor) {
            const winnerPanel = getCompetitorPanel(winnerColor);
            winnerPanel.classList.add('winner-flash');
            setTimeout(() => winnerPanel.classList.remove('winner-flash'), 4000);
        }
        saveState();
    }
    
    const formatTime = (seconds) => `${Math.floor(seconds/60)}:${(seconds%60).toString().padStart(2,'0')}`;
    const updateMainTimerDisplay = () => timerDisplay.textContent = formatTime(mainTimeLeft);
    const updateGSTimerDisplay = () => timerDisplay.textContent = formatTime(mainTimeElapsed);
    const updateOsaekomiTimerDisplay = () => osaekomiTimerDisplay.textContent = osaekomiTimeLeft.toString().padStart(2, '0');

    function startStopMainTimer() {
        if (isMatchOver) return;
        
        isMainTimerRunning = !isMainTimerRunning;
        if (isMainTimerRunning) {
            const timerFunction = isGoldenScore ? () => {
                mainTimeElapsed++;
                updateGSTimerDisplay();
            } : () => {
                if (mainTimeLeft > 0) {
                    mainTimeLeft--;
                    updateMainTimerDisplay();
                } else {
                    clearInterval(mainTimerInterval);
                    isMainTimerRunning = false;
                }
            };
            mainTimerInterval = setInterval(timerFunction, 1000);
        } else {
            clearInterval(mainTimerInterval);
        }
    }

    function startGoldenScore() {
        if (isMatchOver || mainTimeLeft > 0) return; 
        isGoldenScore = true;
        goldenScoreIndicator.classList.add('active');
        mainTimeElapsed = 0;
        updateGSTimerDisplay();
        saveState();
    }

    function startOsaekomi(competitor) {
        if (isMatchOver || isOsaekomiTimerRunning) return;
        
        osaekomiCompetitor = competitor;
        isOsaekomiTimerRunning = true;
        osaekomiTimeLeft = 0;
        
        const progressBar = getCompetitorPanel(competitor).querySelector('.osaekomi-progress-bar');
        osaekomiTimerInterval = setInterval(() => {
            osaekomiTimeLeft++;
            
            const progressPercentage = Math.min((osaekomiTimeLeft / 20) * 100, 100);
            progressBar.style.width = `${progressPercentage}%`;

            if (osaekomiTimeLeft === 5) addScore(osaekomiCompetitor, 'yuko');
            if (osaekomiTimeLeft === 10) {
                isOsaekomiScoring = true;
                addScore(osaekomiCompetitor, 'wazari');
                removeScore(osaekomiCompetitor, 'yuko');
                isOsaekomiScoring = false;
            }
        }, 1000);
    }


    function resetOsaekomiVisuals() {
        document.querySelectorAll('.osaekomi-progress-bar').forEach(bar => {
            bar.style.transition = 'width 0s';
            bar.style.width = '0%';
            setTimeout(() => bar.style.transition = 'width 0.2s linear', 50);
        });
    }

    function resetOsaekomi() {
        if (!isOsaekomiTimerRunning) return;
        clearInterval(osaekomiTimerInterval);
        isOsaekomiTimerRunning = false;
        osaekomiCompetitor = null;
        resetOsaekomiVisuals();
    }

    function resetAll() {
        isMatchOver = false;
        clearInterval(mainTimerInterval);
        clearInterval(osaekomiTimerInterval);
        isMainTimerRunning = false;
        isOsaekomiTimerRunning = false;
        osaekomiCompetitor = null;
        isGoldenScore = false;
        
        document.querySelectorAll('.competitor-strip').forEach(p => p.classList.remove('winner-flash'));
        resetOsaekomiVisuals();
        goldenScoreIndicator.classList.remove('active');
        
        mainTimeLeft = parseInt(minutesInput.value) * 60 + parseInt(secondsInput.value);
        mainTimeElapsed = 0;
        updateMainTimerDisplay();
        document.querySelectorAll('.ippon, .wazari, .yuko').forEach(el => el.textContent = '0');
        document.querySelectorAll('.shido').forEach(el => el.classList.remove('active'));
        saveState();
    }
    
    function addScore(competitor, type) {
        if (isMatchOver) return;
        const panel = getCompetitorPanel(competitor);
        const scoreElement = panel.querySelector(`.${type}`);
        scoreElement.textContent = parseInt(scoreElement.textContent) + 1;

        if (type === 'ippon') {
            endMatch(competitor);
        }
        
        saveState();
    }
    
    function removeScore(competitor, type) {
        if (isMatchOver) return;
        const scoreElement = getCompetitorPanel(competitor).querySelector(`.${type}`);
        let currentScore = parseInt(scoreElement.textContent);
        if (currentScore > 0) {
            scoreElement.textContent = currentScore - 1;
            saveState();
        }
    }
    
    function addShido(competitor) {
        if (isMatchOver) return;
        const panel = getCompetitorPanel(competitor);
        const shido = panel.querySelector('.shido:not(.active)');
        if (shido) {
            shido.classList.add('active');
        }
        saveState();
    }

    function removeShido(competitor) {
        if (isMatchOver) return;
        const activeShidos = getCompetitorPanel(competitor).querySelectorAll('.shido.active');
        if (activeShidos.length > 0) {
            activeShidos[activeShidos.length - 1].classList.remove('active');
            saveState();
        }
    }

    timerDisplay.addEventListener('click', () => {
        startStopMainTimer();
    });

    osaekomiBtnWhite.addEventListener('click', () => {
        if (!isOsaekomiTimerRunning) {
            startOsaekomi('blue');
        } else if (osaekomiCompetitor === 'blue') {
            resetOsaekomi();
        }
    });
    osaekomiBtnBlue.addEventListener('click', () => {
        if (!isOsaekomiTimerRunning) {
            startOsaekomi('white');
        } else if (osaekomiCompetitor === 'white++++++++++++++++') {
            resetOsaekomi();
        }
    });


    shidoBoxes.forEach(box => {
        box.addEventListener('click', () => {
            const competitor = box.closest('.strip-content').parentElement.classList.contains('white-strip') ? 'white' : 'blue';
            if (box.classList.contains('active')) {
                removeShido(competitor);
            } else {
                addShido(competitor);
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.target.isContentEditable) return;
        const key = event.key.toLowerCase();
        
        if (key === 'o') { startOsaekomi('white'); return; }
        if (key === 'l') { startOsaekomi('blue'); return; }
        if (key === 'g' && !isMatchOver && mainTimeLeft === 0) {
            startGoldenScore();
            return;
        }

        if (!event.shiftKey) {
            switch (key) {
                case 'p': startStopMainTimer(); break;
                case 'r': resetAll(); break;
                case 'q': resetOsaekomi(); break;
                case 'a': addScore('white', 'ippon'); break;
                case 'w': addScore('white', 'wazari'); break;
                case 's': addScore('white', 'yuko'); break;
                case 'd': addShido('white'); break;
                case 'z': removeShido('white'); break;
                case 'arrowdown': addScore('blue', 'ippon'); break;
                case 'arrowup': addScore('blue', 'wazari'); break;
                case 'arrowleft': addScore('blue', 'yuko'); break;
                case 'arrowright': addShido('blue'); break;
                case 'm': removeShido('blue'); break;
            }
        } else {
            switch(key) {
                case 'a': removeScore('white', 'ippon'); break;
                case 'w': removeScore('white', 'wazari'); break;
                case 's': removeScore('white', 'yuko'); break;
                case 'arrowdown': removeScore('blue', 'ippon'); break;
                case 'arrowup': removeScore('blue', 'wazari'); break;
                case 'arrowleft': removeScore('blue', 'yuko'); break;
            }
        }
    });

    fullscreenBtn.addEventListener('click', () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); });
    document.addEventListener('fullscreenchange', () => body.classList.toggle('fullscreen', !!document.fullscreenElement));
    
    settingsBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
    closeSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.style.display = 'none'; });
    
    helpBtn.addEventListener('click', () => helpModal.style.display = 'flex');
    closeHelpBtn.addEventListener('click', () => helpModal.style.display = 'none');
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.style.display = 'none'; });

    saveTimeBtn.addEventListener('click', () => {
        minutesInput.value = Math.max(0, parseInt(minutesInput.value) || 0);
        secondsInput.value = Math.max(0, Math.min(59, parseInt(secondsInput.value) || 0));
        resetAll();
        settingsModal.style.display = 'none';
    });

    c1Name.addEventListener('blur', saveState);
    c2Name.addEventListener('blur', saveState);
    
    loadState();
});
