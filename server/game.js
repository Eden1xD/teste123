// ============================================================
// HANGOUT — FORCA MULTIPLAYER
// game.js
// ============================================================

(() => {

    'use strict';


    // ========================================================
    // SOCKET
    // ========================================================

    const socket = typeof io === 'function'
        ? io()
        : null;


    // ========================================================
    // ESTADO DA PARTIDA
    // ========================================================

    const state = {

        roomCode: null,

        userId: null,

        username: 'Jogador',

        category: 'Aguardando...',

        word: '',

        maskedWord: [],

        guessedLetters: [],

        wrongLetters: [],

        mistakes: 0,

        maxMistakes: 6,

        timer: 60,

        timerInterval: null,

        round: 1,

        currentTurn: null,

        isMyTurn: true,

        gameStarted: false,

        soundEnabled: true,

        players: [],

        gameFinished: false

    };


    // ========================================================
    // ELEMENTOS
    // ========================================================

    const elements = {

        roomCode:
            document.getElementById('roomCode'),

        copyRoomCode:
            document.getElementById('copyRoomCode'),

        roundNumber:
            document.getElementById('roundNumber'),

        category:
            document.getElementById('category'),

        timer:
            document.getElementById('timer'),

        mistakes:
            document.getElementById('mistakes'),

        maxMistakes:
            document.getElementById('maxMistakes'),

        mistakesBar:
            document.getElementById('mistakesBar'),

        word:
            document.getElementById('word'),

        wordHint:
            document.getElementById('wordHint'),

        keyboard:
            document.getElementById('keyboard'),

        keyboardStatus:
            document.getElementById('keyboardStatus'),

        playersList:
            document.getElementById('playersList'),

        playersCount:
            document.getElementById('playersCount'),

        currentTurn:
            document.getElementById('currentTurn'),

        connectionStatus:
            document.getElementById('connectionStatus'),

        soundButton:
            document.getElementById('soundButton'),

        leaveGameButton:
            document.getElementById('leaveGameButton'),

        chatForm:
            document.getElementById('chatForm'),

        chatInput:
            document.getElementById('chatInput'),

        chatMessages:
            document.getElementById('chatMessages'),

        gameResultModal:
            document.getElementById('gameResultModal'),

        resultTitle:
            document.getElementById('resultTitle'),

        resultMessage:
            document.getElementById('resultMessage'),

        resultWord:
            document.getElementById('resultWord'),

        resultPoints:
            document.getElementById('resultPoints'),

        resultXP:
            document.getElementById('resultXP'),

        resultIcon:
            document.getElementById('resultIcon'),

        nextRoundButton:
            document.getElementById('nextRoundButton'),

        closeResultModal:
            document.getElementById('closeResultModal'),

        resultLeaveButton:
            document.getElementById('resultLeaveButton'),

        toastContainer:
            document.getElementById('toastContainer'),

        hangman:
            document.getElementById('hangman')

    };


    // ========================================================
    // UTILIDADES
    // ========================================================

    function $(selector) {

        return document.querySelector(selector);

    }


    function escapeHTML(value) {

        return String(value ?? '')

            .replaceAll('&', '&amp;')

            .replaceAll('<', '&lt;')

            .replaceAll('>', '&gt;')

            .replaceAll('"', '&quot;')

            .replaceAll("'", '&#039;');

    }


    function getRoomFromURL() {

        const params =
            new URLSearchParams(window.location.search);

        return (
            params.get('room') ||
            localStorage.getItem('hangout_room') ||
            null
        );

    }


    function getUser() {

        try {

            const saved =
                localStorage.getItem('hangout_user');

            if (!saved) {

                return null;

            }

            return JSON.parse(saved);

        } catch {

            return null;

        }

    }


    // ========================================================
    // TOAST
    // ========================================================

    function showToast(
        message,
        type = 'info'
    ) {

        if (!elements.toastContainer) {

            return;

        }


        const toast =
            document.createElement('div');

        toast.className =
            `toast toast-${type}`;


        const icons = {

            success: 'fa-circle-check',

            error: 'fa-circle-exclamation',

            warning: 'fa-triangle-exclamation',

            info: 'fa-circle-info'

        };


        toast.innerHTML = `

            <i class="fa-solid ${icons[type] || icons.info}"></i>

            <span>
                ${escapeHTML(message)}
            </span>

        `;


        elements.toastContainer.appendChild(toast);


        requestAnimationFrame(() => {

            toast.classList.add('show');

        });


        setTimeout(() => {

            toast.classList.remove('show');

            setTimeout(() => {

                toast.remove();

            }, 300);

        }, 3000);

    }


    // ========================================================
    // SOM
    // ========================================================

    function playSound(type) {

        if (!state.soundEnabled) {

            return;

        }


        /*
         * O sistema fica preparado para receber
         * seus arquivos de áudio depois.
         */

        const sounds = {

            correct: 'assets/sounds/correct.mp3',

            wrong: 'assets/sounds/wrong.mp3',

            win: 'assets/sounds/win.mp3',

            lose: 'assets/sounds/lose.mp3',

            click: 'assets/sounds/click.mp3'

        };


        const source = sounds[type];

        if (!source) {

            return;

        }


        const audio =
            new Audio(source);

        audio.volume = 0.45;

        audio.play().catch(() => {});

    }


    // ========================================================
    // ESTADO DA CONEXÃO
    // ========================================================

    function updateConnectionStatus(
        connected
    ) {

        if (!elements.connectionStatus) {

            return;

        }


        const dot =
            elements.connectionStatus.querySelector('span');

        const text =
            elements.connectionStatus.querySelector('strong');


        if (connected) {

            elements.connectionStatus.classList.add(
                'connected'
            );

            if (dot) {

                dot.className = '';

            }

            if (text) {

                text.textContent = 'Conectado';

            }

        } else {

            elements.connectionStatus.classList.remove(
                'connected'
            );

            if (text) {

                text.textContent = 'Desconectado';

            }

        }

    }


    // ========================================================
    // PALAVRA
    // ========================================================

    function createMaskedWord(word) {

        return [...word].map(character => {

            if (
                character === ' ' ||
                character === '-' ||
                character === "'"
            ) {

                return character;

            }

            return '_';

        });

    }


    function renderWord() {

        if (!elements.word) {

            return;

        }


        elements.word.innerHTML = '';


        state.maskedWord.forEach(
            (character, index) => {

                const span =
                    document.createElement('span');

                span.className =
                    'word-letter';


                if (character === ' ') {

                    span.classList.add(
                        'word-space'
                    );

                    span.textContent = '';

                } else {

                    span.textContent =
                        character;

                }


                elements.word.appendChild(span);

            }
        );

    }


    function revealLetter(letter) {

        if (!state.word) {

            return false;

        }


        let found = false;


        [...state.word].forEach(
            (character, index) => {

                if (
                    normalizeLetter(character) ===
                    normalizeLetter(letter)
                ) {

                    state.maskedWord[index] =
                        character;

                    found = true;

                }

            }
        );


        return found;

    }


    function normalizeLetter(letter) {

        return String(letter)

            .normalize('NFD')

            .replace(/[\u0300-\u036f]/g, '')

            .toUpperCase();

    }


    function isWordComplete() {

        return state.maskedWord.every(
            character =>
                character !== '_'
        );

    }


    // ========================================================
    // TECLADO
    // ========================================================

    function createKeyboard() {

        if (!elements.keyboard) {

            return;

        }


        const buttons =
            elements.keyboard.querySelectorAll(
                'button[data-letter]'
            );


        buttons.forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    const letter =
                        button.dataset.letter;

                    handleLetter(letter);

                }
            );

        });

    }


    function resetKeyboard() {

        if (!elements.keyboard) {

            return;

        }


        const buttons =
            elements.keyboard.querySelectorAll(
                'button[data-letter]'
            );


        buttons.forEach(button => {

            button.disabled = false;

            button.classList.remove(
                'correct',
                'wrong',
                'used'
            );

        });

    }


    function updateKeyboard(
        letter,
        correct
    ) {

        if (!elements.keyboard) {

            return;

        }


        const button =
            elements.keyboard.querySelector(
                `[data-letter="${letter}"]`
            );


        if (!button) {

            return;

        }


        button.disabled = true;

        button.classList.add(
            correct ? 'correct' : 'wrong'
        );

    }


    function setKeyboardEnabled(
        enabled
    ) {

        if (!elements.keyboard) {

            return;

        }


        const buttons =
            elements.keyboard.querySelectorAll(
                'button[data-letter]'
            );


        buttons.forEach(button => {

            if (
                !button.classList.contains('correct') &&
                !button.classList.contains('wrong')
            ) {

                button.disabled = !enabled;

            }

        });


        if (elements.keyboardStatus) {

            elements.keyboardStatus.textContent =
                enabled
                    ? 'Sua vez'
                    : 'Aguarde sua vez';

        }

    }


    // ========================================================
    // JOGAR LETRA
    // ========================================================

    function handleLetter(letter) {

        if (!state.gameStarted) {

            showToast(
                'A partida ainda não começou.',
                'warning'
            );

            return;

        }


        if (state.gameFinished) {

            return;

        }


        if (!state.isMyTurn) {

            showToast(
                'Aguarde sua vez.',
                'warning'
            );

            return;

        }


        letter =
            normalizeLetter(letter);


        if (
            state.guessedLetters.includes(letter)
        ) {

            return;

        }


        state.guessedLetters.push(letter);


        const correct =
            revealLetter(letter);


        updateKeyboard(
            letter,
            correct
        );


        if (correct) {

            playSound('correct');

            renderWord();

            sendLetter(letter);


            if (isWordComplete()) {

                finishGame(
                    true,
                    'Você descobriu a palavra!'
                );

            }

            return;

        }


        state.wrongLetters.push(letter);

        state.mistakes++;

        playSound('wrong');

        updateMistakes();

        sendLetter(letter);


        if (
            state.mistakes >=
            state.maxMistakes
        ) {

            finishGame(
                false,
                'Você perdeu a rodada.'
            );

        }

    }


    // ========================================================
    // SOCKET — ENVIAR LETRA
    // ========================================================

    function sendLetter(letter) {

        if (!socket) {

            return;

        }


        socket.emit(
            'game:letter',
            {

                roomCode:
                    state.roomCode,

                letter,

                userId:
                    state.userId

            }
        );

    }


    // ========================================================
    // ERROS / FORCA
    // ========================================================

    function updateMistakes() {

        if (elements.mistakes) {

            elements.mistakes.textContent =
                state.mistakes;

        }


        if (elements.maxMistakes) {

            elements.maxMistakes.textContent =
                state.maxMistakes;

        }


        if (elements.mistakesBar) {

            const items =
                elements.mistakesBar.children;


            [...items].forEach(
                (item, index) => {

                    item.classList.toggle(
                        'active',
                        index < state.mistakes
                    );

                }
            );

        }


        updateHangman();

    }


    function updateHangman() {

        if (!elements.hangman) {

            return;

        }


        const parts = {

            1: '[data-part="head"]',

            2: '[data-part="body"]',

            3: '[data-part="left-arm"]',

            4: '[data-part="right-arm"]',

            5: '[data-part="left-leg"]',

            6: '[data-part="right-leg"]'

        };


        Object.entries(parts).forEach(
            ([number, selector]) => {

                const part =
                    elements.hangman.querySelector(
                        selector
                    );


                if (!part) {

                    return;

                }


                part.classList.toggle(
                    'visible',
                    state.mistakes >=
                    Number(number)
                );

            }
        );

    }


    // ========================================================
    // TIMER
    // ========================================================

    function startTimer(seconds = 60) {

        stopTimer();


        state.timer =
            Number(seconds);


        renderTimer();


        state.timerInterval =
            setInterval(() => {

                state.timer--;

                renderTimer();


                if (state.timer <= 0) {

                    stopTimer();

                    handleTimeOut();

                }

            }, 1000);

    }


    function stopTimer() {

        if (state.timerInterval) {

            clearInterval(
                state.timerInterval
            );

            state.timerInterval = null;

        }

    }


    function renderTimer() {

        if (!elements.timer) {

            return;

        }


        elements.timer.textContent =
            String(
                Math.max(0, state.timer)
            );


        elements.timer.classList.toggle(
            'warning',
            state.timer <= 10
        );

    }


    function handleTimeOut() {

        if (state.gameFinished) {

            return;

        }


        finishGame(
            false,
            'O tempo acabou!'
        );


        if (socket) {

            socket.emit(
                'game:timeout',
                {

                    roomCode:
                        state.roomCode,

                    userId:
                        state.userId

                }
            );

        }

    }


    // ========================================================
    // JOGADORES
    // ========================================================

    function renderPlayers() {

        if (!elements.playersList) {

            return;

        }


        elements.playersList.innerHTML = '';


        if (!state.players.length) {

            elements.playersList.innerHTML = `

                <div class="empty-players">

                    <i class="fa-solid fa-users"></i>

                    <span>
                        Aguardando jogadores...
                    </span>

                </div>

            `;

            return;

        }


        state.players.forEach(
            (player, index) => {

                const article =
                    document.createElement('article');

                article.className =
                    'game-player';


                if (
                    String(player.id) ===
                    String(state.userId)
                ) {

                    article.classList.add(
                        'is-me'
                    );

                }


                if (
                    String(player.id) ===
                    String(state.currentTurn)
                ) {

                    article.classList.add(
                        'is-turn'
                    );

                }


                const avatar =
                    player.avatar || 'user';


                article.innerHTML = `

                    <div class="player-avatar">

                        <i class="fa-solid fa-${escapeHTML(avatar)}"></i>

                    </div>


                    <div class="player-info">

                        <strong>

                            ${escapeHTML(
                                player.username ||
                                'Jogador'
                            )}

                            ${
                                String(player.id) ===
                                String(state.userId)
                                    ? '<small>Você</small>'
                                    : ''
                            }

                        </strong>

                        <span>
                            Nível ${Number(
                                player.level || 1
                            )}
                        </span>

                    </div>


                    <div class="player-score">

                        <strong>
                            ${Number(
                                player.score || 0
                            )}
                        </strong>

                        <span>
                            PTS
                        </span>

                    </div>

                `;


                elements.playersList.appendChild(
                    article
                );

            }
        );


        if (elements.playersCount) {

            elements.playersCount.textContent =
                state.players.length;

        }

    }


    function updateTurn(player) {

        state.currentTurn =
            player?.id ?? player;


        state.isMyTurn =
            String(state.currentTurn) ===
            String(state.userId);


        if (elements.currentTurn) {

            const currentPlayer =
                state.players.find(
                    item =>
                        String(item.id) ===
                        String(state.currentTurn)
                );


            elements.currentTurn.textContent =
                currentPlayer?.username ||
                (
                    state.isMyTurn
                        ? 'Você'
                        : 'Aguardando...'
                );

        }


        setKeyboardEnabled(
            state.isMyTurn
        );


        renderPlayers();

    }


    // ========================================================
    // INICIAR RODADA
    // ========================================================

    function startRound(data = {}) {

        state.gameStarted = true;

        state.gameFinished = false;

        state.category =
            data.category ||
            'Geral';

        state.word =
            data.word ||
            '';

        state.maxMistakes =
            Number(
                data.maxMistakes ||
                6
            );

        state.round =
            Number(
                data.round ||
                state.round ||
                1
            );


        state.guessedLetters = [];

        state.wrongLetters = [];

        state.mistakes = 0;


        state.maskedWord =
            createMaskedWord(
                state.word
            );


        if (elements.category) {

            elements.category.textContent =
                state.category;

        }


        if (elements.roundNumber) {

            elements.roundNumber.textContent =
                String(
                    state.round
                ).padStart(2, '0');

        }


        if (elements.wordHint) {

            elements.wordHint.textContent =
                data.hint ||
                'Descubra a palavra antes que a forca seja completada.';

        }


        resetKeyboard();

        updateMistakes();

        renderWord();


        updateTurn(
            data.currentTurn ??
            state.currentTurn
        );


        startTimer(
            data.time ||
            60
        );


        showToast(
            'A rodada começou!',
            'success'
        );

    }


    // ========================================================
    // FINALIZAR PARTIDA
    // ========================================================

    function finishGame(
        won,
        message
    ) {

        if (state.gameFinished) {

            return;

        }


        state.gameFinished = true;

        state.gameStarted = false;


        stopTimer();

        setKeyboardEnabled(false);


        if (won) {

            playSound('win');

        } else {

            playSound('lose');

        }


        const points =
            won ? 100 : 0;

        const xp =
            won ? 250 : 50;


        showResultModal({

            won,

            title:
                won
                    ? 'Você venceu!'
                    : 'Fim de jogo',

            message:
                message ||
                (
                    won
                        ? 'Parabéns!'
                        : 'Boa sorte na próxima.'
                ),

            word:
                state.word,

            points,

            xp

        });

    }


    // ========================================================
    // RESULTADO
    // ========================================================

    function showResultModal(data) {

        if (!elements.gameResultModal) {

            return;

        }


        if (elements.resultTitle) {

            elements.resultTitle.textContent =
                data.title;

        }


        if (elements.resultMessage) {

            elements.resultMessage.textContent =
                data.message;

        }


        if (elements.resultWord) {

            elements.resultWord.textContent =
                data.word ||
                '—';

        }


        if (elements.resultPoints) {

            elements.resultPoints.textContent =
                `+${Number(
                    data.points || 0
                )}`;

        }


        if (elements.resultXP) {

            elements.resultXP.textContent =
                `+${Number(
                    data.xp || 0
                )}`;

        }


        if (elements.resultIcon) {

            elements.resultIcon.className =
                data.won
                    ? 'fa-solid fa-trophy'
                    : 'fa-solid fa-face-sad-tear';

        }


        elements.gameResultModal.classList.add(
            'active'
        );

        elements.gameResultModal.setAttribute(
            'aria-hidden',
            'false'
        );

    }


    function hideResultModal() {

        if (!elements.gameResultModal) {

            return;

        }


        elements.gameResultModal.classList.remove(
            'active'
        );

        elements.gameResultModal.setAttribute(
            'aria-hidden',
            'true'
        );

    }


    // ========================================================
    // PRÓXIMA RODADA
    // ========================================================

    function requestNextRound() {

        hideResultModal();


        state.round++;


        if (socket) {

            socket.emit(
                'game:next-round',
                {

                    roomCode:
                        state.roomCode,

                    userId:
                        state.userId

                }
            );

            return;

        }


        showToast(
            'Aguardando próxima rodada...',
            'info'
        );

    }


    // ========================================================
    // CHAT
    // ========================================================

    function addChatMessage(data) {

        if (!elements.chatMessages) {

            return;

        }


        const message =
            document.createElement('div');


        message.className =
            `chat-message ${
                data.system
                    ? 'system'
                    : ''
            }`;


        const username =
            data.username ||
            'Jogador';


        message.innerHTML = `

            <div class="chat-avatar">

                <i class="fa-solid fa-user"></i>

            </div>


            <div class="chat-content">

                <strong>
                    ${escapeHTML(username)}
                </strong>

                <p>
                    ${escapeHTML(
                        data.message || ''
                    )}
                </p>

            </div>

        `;


        elements.chatMessages.appendChild(
            message
        );


        elements.chatMessages.scrollTop =
            elements.chatMessages.scrollHeight;

    }


    function sendChatMessage(message) {

        if (!message.trim()) {

            return;

        }


        if (!socket) {

            addChatMessage({

                username:
                    state.username,

                message

            });

            return;

        }


        socket.emit(
            'game:chat',
            {

                roomCode:
                    state.roomCode,

                userId:
                    state.userId,

                username:
                    state.username,

                message:
                    message.trim()

            }
        );

    }


    // ========================================================
    // SOCKET.IO
    // ========================================================

    function setupSocket() {

        if (!socket) {

            updateConnectionStatus(false);

            return;

        }


        socket.on(
            'connect',
            () => {

                updateConnectionStatus(true);


                socket.emit(
                    'game:join',
                    {

                        roomCode:
                            state.roomCode,

                        userId:
                            state.userId,

                        username:
                            state.username

                    }
                );

            }
        );


        socket.on(
            'disconnect',
            () => {

                updateConnectionStatus(false);

                showToast(
                    'Conexão perdida.',
                    'error'
                );

            }
        );


        socket.on(
            'game:state',
            data => {

                if (!data) {

                    return;

                }


                if (data.players) {

                    state.players =
                        data.players;

                    renderPlayers();

                }


                if (data.currentTurn) {

                    updateTurn(
                        data.currentTurn
                    );

                }


                if (data.round) {

                    state.round =
                        data.round;

                }

            }
        );


        socket.on(
            'game:start',
            data => {

                startRound(data);

            }
        );


        socket.on(
            'game:letter',
            data => {

                if (!data) {

                    return;

                }


                const letter =
                    normalizeLetter(
                        data.letter
                    );


                if (
                    !state.guessedLetters.includes(
                        letter
                    )
                ) {

                    state.guessedLetters.push(
                        letter
                    );

                }


                if (data.correct) {

                    revealLetter(letter);

                    updateKeyboard(
                        letter,
                        true
                    );

                    renderWord();

                } else {

                    if (
                        !state.wrongLetters.includes(
                            letter
                        )
                    ) {

                        state.wrongLetters.push(
                            letter
                        );

                        state.mistakes++;

                    }


                    updateKeyboard(
                        letter,
                        false
                    );

                    updateMistakes();

                }

            }
        );


        socket.on(
            'game:turn',
            data => {

                updateTurn(
                    data?.player ||
                    data?.playerId
                );

            }
        );


        socket.on(
            'game:players',
            players => {

                state.players =
                    Array.isArray(players)
                        ? players
                        : [];

                renderPlayers();

            }
        );


        socket.on(
            'game:chat',
            data => {

                addChatMessage(data);

            }
        );


        socket.on(
            'game:result',
            data => {

                state.gameFinished =
                    true;

                state.gameStarted =
                    false;

                stopTimer();

                showResultModal({

                    won:
                        String(data.winnerId) ===
                        String(state.userId),

                    title:
                        data.title ||
                        'Fim da rodada',

                    message:
                        data.message ||
                        'A rodada terminou.',

                    word:
                        data.word ||
                        state.word,

                    points:
                        data.points || 0,

                    xp:
                        data.xp || 0

                });

            }
        );


        socket.on(
            'game:next-round',
            data => {

                startRound(data);

            }
        );

    }


    // ========================================================
    // COPIAR SALA
    // ========================================================

    async function copyRoomCode() {

        if (!state.roomCode) {

            return;

        }


        try {

            await navigator.clipboard.writeText(
                state.roomCode
            );


            showToast(
                'Código da sala copiado!',
                'success'
            );

        } catch {

            showToast(
                'Não foi possível copiar.',
                'error'
            );

        }

    }


    // ========================================================
    // SOM
    // ========================================================

    function toggleSound() {

        state.soundEnabled =
            !state.soundEnabled;


        localStorage.setItem(
            'hangout_sound',
            state.soundEnabled
                ? 'on'
                : 'off'
        );


        if (elements.soundButton) {

            elements.soundButton.innerHTML =
                state.soundEnabled

                    ? '<i class="fa-solid fa-volume-high"></i>'

                    : '<i class="fa-solid fa-volume-xmark"></i>';

        }


        showToast(

            state.soundEnabled
                ? 'Som ativado.'
                : 'Som desativado.',

            'info'

        );

    }


    // ========================================================
    // SAIR
    // ========================================================

    function leaveGame() {

        if (socket) {

            socket.emit(
                'game:leave',
                {

                    roomCode:
                        state.roomCode,

                    userId:
                        state.userId

                }
            );

        }


        stopTimer();


        localStorage.removeItem(
            'hangout_room'
        );


        window.location.href =
            'lobby.html';

    }


    // ========================================================
    // EVENTOS
    // ========================================================

    function setupEvents() {


        // --------------------------------------------
        // COPIAR
        // --------------------------------------------

        elements.copyRoomCode?.addEventListener(
            'click',
            copyRoomCode
        );


        // --------------------------------------------
        // SOM
        // --------------------------------------------

        elements.soundButton?.addEventListener(
            'click',
            toggleSound
        );


        // --------------------------------------------
        // SAIR
        // --------------------------------------------

        elements.leaveGameButton?.addEventListener(
            'click',
            leaveGame
        );


        elements.resultLeaveButton?.addEventListener(
            'click',
            leaveGame
        );


        // --------------------------------------------
        // RESULTADO
        // --------------------------------------------

        elements.closeResultModal?.addEventListener(
            'click',
            hideResultModal
        );


        elements.nextRoundButton?.addEventListener(
            'click',
            requestNextRound
        );


        // --------------------------------------------
        // CHAT
        // --------------------------------------------

        elements.chatForm?.addEventListener(
            'submit',
            event => {

                event.preventDefault();


                const message =
                    elements.chatInput?.value
                    .trim();


                if (!message) {

                    return;

                }


                sendChatMessage(message);


                if (elements.chatInput) {

                    elements.chatInput.value = '';

                    elements.chatInput.focus();

                }

            }
        );


        // --------------------------------------------
        // TECLADO FÍSICO
        // --------------------------------------------

        document.addEventListener(
            'keydown',
            event => {

                if (
                    event.ctrlKey ||
                    event.altKey ||
                    event.metaKey
                ) {

                    return;

                }


                if (
                    document.activeElement?.tagName ===
                    'INPUT'
                ) {

                    return;

                }


                const key =
                    normalizeLetter(
                        event.key
                    );


                if (
                    /^[A-Z]$/.test(key)
                ) {

                    handleLetter(key);

                }

            }
        );


        // --------------------------------------------
        // ESC
        // --------------------------------------------

        document.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Escape'
                ) {

                    hideResultModal();

                }

            }
        );

    }


    // ========================================================
    // INICIALIZAÇÃO
    // ========================================================

    function init() {

        const user =
            getUser();


        if (user) {

            state.userId =
                user.id ||
                user.userId ||
                null;

            state.username =
                user.username ||
                user.name ||
                'Jogador';

        }


        state.roomCode =
            getRoomFromURL();


        if (!state.roomCode) {

            showToast(
                'Sala não encontrada.',
                'error'
            );

            setTimeout(() => {

                window.location.href =
                    'lobby.html';

            }, 1200);

            return;

        }


        if (elements.roomCode) {

            elements.roomCode.textContent =
                state.roomCode;

        }


        state.soundEnabled =
            localStorage.getItem(
                'hangout_sound'
            ) !== 'off';


        if (elements.soundButton) {

            elements.soundButton.innerHTML =
                state.soundEnabled

                    ? '<i class="fa-solid fa-volume-high"></i>'

                    : '<i class="fa-solid fa-volume-xmark"></i>';

        }


        createKeyboard();

        setupEvents();

        setupSocket();

        renderPlayers();

        updateMistakes();

        renderWord();


        console.log(
            '[HANGOUT] Game iniciado.'
        );

    }


    // ========================================================
    // API GLOBAL
    // ========================================================

    window.HangoutGame = {

        state,

        startRound,

        finishGame,

        handleLetter,

        addChatMessage,

        showToast,

        startTimer,

        stopTimer,

        leaveGame

    };


    // ========================================================
    // START
    // ========================================================

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            init
        );

    } else {

        init();

    }

})();