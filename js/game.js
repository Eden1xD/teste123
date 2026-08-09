/* =========================================================
   HANGOUT — FORCA MULTIPLAYER
   public/js/game.js
========================================================= */

(() => {

    'use strict';


    /* =====================================================
       SOCKET
    ===================================================== */

    const socket = io("https://teste123-vrgm.onrender.com" );


    /* =====================================================
       ESTADO DO JOGO
    ===================================================== */

    const state = {

        roomCode: null,

        username: null,

        room: null,

        soundEnabled: true,

        connected: false,

        gameStarted: false

    };


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const $ = (selector) =>
        document.querySelector(selector);


    const $$ = (selector) =>
        document.querySelectorAll(selector);


    const elements = {

        roomCode:
            $('#roomCode'),

        copyRoomCode:
            $('#copyRoomCode'),

        connectionStatus:
            $('#connectionStatus'),

        soundButton:
            $('#soundButton'),

        leaveGameButton:
            $('#leaveGameButton'),


        roundNumber:
            $('#roundNumber'),

        category:
            $('#category'),

        timer:
            $('#timer'),


        difficulty:
            $('#difficulty'),


        hangman:
            $('#hangman'),

        mistakes:
            $('#mistakes'),

        maxMistakes:
            $('#maxMistakes'),

        mistakesBar:
            $('#mistakesBar'),


        word:
            $('#word'),

        wordHint:
            $('#wordHint'),


        playersList:
            $('#playersList'),

        playersCount:
            $('#playersCount'),

        currentTurn:
            $('#currentTurn'),


        keyboard:
            $('#keyboard'),

        keyboardStatus:
            $('#keyboardStatus'),


        chatMessages:
            $('#chatMessages'),

        chatForm:
            $('#chatForm'),

        chatInput:
            $('#chatInput'),


        gameResultModal:
            $('#gameResultModal'),

        closeResultModal:
            $('#closeResultModal'),

        resultIcon:
            $('#resultIcon'),

        resultTitle:
            $('#resultTitle'),

        resultMessage:
            $('#resultMessage'),

        resultWord:
            $('#resultWord'),

        resultPoints:
            $('#resultPoints'),

        resultXP:
            $('#resultXP'),

        nextRoundButton:
            $('#nextRoundButton'),

        resultLeaveButton:
            $('#resultLeaveButton'),


        toastContainer:
            $('#toastContainer')

    };


    /* =====================================================
       INICIALIZAÇÃO
    ===================================================== */

    function init() {

        state.username =
            getUsername();

        state.roomCode =
            getRoomFromURL();


        setupKeyboard();

        setupChat();

        setupButtons();

        setupSocket();


        if (state.roomCode) {

            updateRoomCode(
                state.roomCode
            );

        }


        setKeyboardEnabled(false);

    }


    /* =====================================================
       PEGAR NOME DO JOGADOR
    ===================================================== */

    function getUsername() {

        const saved =
            localStorage.getItem(
                'hangout_username'
            );


        if (saved) {

            return saved;

        }


        const name =
            prompt(
                'Digite seu nome para entrar na partida:'
            );


        const username =
            (
                name ||
                'Jogador'
            )
            .trim()
            .substring(0, 20);


        localStorage.setItem(
            'hangout_username',
            username
        );


        return username;

    }


    /* =====================================================
       PEGAR SALA DA URL
    ===================================================== */

    function getRoomFromURL() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        return (
            params.get('room') ||
            params.get('sala') ||
            ''
        )
        .trim()
        .toUpperCase();

    }


    /* =====================================================
       SOCKET EVENTS
    ===================================================== */

    function setupSocket() {


        /* -------------------------------------------------
           CONECTADO
        ------------------------------------------------- */

        socket.on(
            'connect',
            () => {

                state.connected =
                    true;


                updateConnection(
                    true
                );


                /*
                 * Se existe ?room=XXXXX,
                 * entra automaticamente.
                 */

                if (state.roomCode) {

                    socket.emit(
                        'join-room',
                        {

                            code:
                                state.roomCode,

                            username:
                                state.username

                        }
                    );

                }

            }
        );


        /* -------------------------------------------------
           DESCONECTADO
        ------------------------------------------------- */

        socket.on(
            'disconnect',
            () => {

                state.connected =
                    false;


                updateConnection(
                    false
                );


                setKeyboardEnabled(
                    false
                );

            }
        );


        /* -------------------------------------------------
           SALA CRIADA
        ------------------------------------------------- */

        socket.on(
            'roomCreated',
            room => {

                state.room =
                    room;

                state.roomCode =
                    room.code;


                updateRoomCode(
                    room.code
                );


                updateGame(
                    room
                );


                updateURL(
                    room.code
                );


                showToast(
                    'Sala criada com sucesso!',
                    'success'
                );

            }
        );


        /* -------------------------------------------------
           ENTROU NA SALA
        ------------------------------------------------- */

        socket.on(
            'roomJoined',
            room => {

                state.room =
                    room;

                state.roomCode =
                    room.code;


                updateRoomCode(
                    room.code
                );


                updateGame(
                    room
                );


                updateURL(
                    room.code
                );


                showToast(
                    `Você entrou na sala ${room.code}`,
                    'success'
                );

            }
        );


        /* -------------------------------------------------
           ERRO DA SALA
        ------------------------------------------------- */

        socket.on(
            'roomError',
            message => {

                showToast(
                    message ||
                    'Não foi possível entrar na sala.',
                    'error'
                );


                setKeyboardEnabled(
                    false
                );

            }
        );


        /* -------------------------------------------------
           ATUALIZAÇÃO DA SALA
        ------------------------------------------------- */

        socket.on(
            'roomUpdate',
            room => {

                state.room =
                    room;


                updateGame(
                    room
                );

            }
        );


        /* -------------------------------------------------
           JOGO INICIADO
        ------------------------------------------------- */

        socket.on(
            'gameStarted',
            room => {

                state.room =
                    room;

                state.gameStarted =
                    true;


                closeResultModal();

                updateGame(
                    room
                );


                showToast(
                    'A rodada começou!',
                    'success'
                );


                playSound(
                    'start'
                );

            }
        );


        /* -------------------------------------------------
           ATUALIZAÇÃO DO JOGO
        ------------------------------------------------- */

        socket.on(
            'gameUpdate',
            room => {

                state.room =
                    room;


                state.gameStarted =
                    room.started;


                updateGame(
                    room
                );

            }
        );


        /* -------------------------------------------------
           TIMER
        ------------------------------------------------- */

        socket.on(
            'timerUpdate',
            time => {

                updateTimer(
                    time
                );

            }
        );


        /* -------------------------------------------------
           MUDANÇA DE TURNO
        ------------------------------------------------- */

        socket.on(
            'turnChanged',
            room => {

                state.room =
                    room;


                updateGame(
                    room
                );


                showToast(
                    'O turno mudou!',
                    'info'
                );

            }
        );


        /* -------------------------------------------------
           RESULTADO
        ------------------------------------------------- */

        socket.on(
            'gameResult',
            result => {

                state.room =
                    result.room;

                state.gameStarted =
                    false;


                if (
                    result.room
                ) {

                    updateGame(
                        result.room
                    );

                }


                showResult(
                    result
                );


                playSound(
                    result.winner
                        ? 'win'
                        : 'lose'
                );

            }
        );


        /* -------------------------------------------------
           PRÓXIMA RODADA
        ------------------------------------------------- */

        socket.on(
            'nextRound',
            room => {

                state.room =
                    room;

                state.gameStarted =
                    true;


                closeResultModal();


                updateGame(
                    room
                );


                resetKeyboard();

                showToast(
                    `Rodada ${formatRound(room.round)} iniciada!`,
                    'success'
                );


                playSound(
                    'start'
                );

            }
        );


        /* -------------------------------------------------
           CHAT
        ------------------------------------------------- */

        socket.on(
            'chatMessage',
            message => {

                addChatMessage(
                    message
                );

            }
        );


        /* -------------------------------------------------
           MENSAGEM DO SISTEMA
        ------------------------------------------------- */

        socket.on(
            'systemMessage',
            message => {

                addSystemMessage(
                    message
                );

            }
        );

    }


    /* =====================================================
       BOTÕES
    ===================================================== */

    function setupButtons() {


        /* -------------------------------------------------
           COPIAR SALA
        ------------------------------------------------- */

        if (
            elements.copyRoomCode
        ) {

            elements.copyRoomCode
                .addEventListener(
                    'click',
                    copyRoom
                );

        }


        /* -------------------------------------------------
           SAIR
        ------------------------------------------------- */

        if (
            elements.leaveGameButton
        ) {

            elements.leaveGameButton
                .addEventListener(
                    'click',
                    leaveGame
                );

        }


        if (
            elements.resultLeaveButton
        ) {

            elements.resultLeaveButton
                .addEventListener(
                    'click',
                    leaveGame
                );

        }


        /* -------------------------------------------------
           SOM
        ------------------------------------------------- */

        if (
            elements.soundButton
        ) {

            elements.soundButton
                .addEventListener(
                    'click',
                    toggleSound
                );

        }


        /* -------------------------------------------------
           FECHAR RESULTADO
        ------------------------------------------------- */

        if (
            elements.closeResultModal
        ) {

            elements.closeResultModal
                .addEventListener(
                    'click',
                    closeResultModal
                );

        }


        /* -------------------------------------------------
           PRÓXIMA RODADA
        ------------------------------------------------- */

        if (
            elements.nextRoundButton
        ) {

            elements.nextRoundButton
                .addEventListener(
                    'click',
                    () => {

                        if (
                            !state.roomCode
                        ) {

                            return;

                        }


                        socket.emit(
                            'nextRound'
                        );

                    }
                );

        }


        /* -------------------------------------------------
           FECHAR CLICANDO NO OVERLAY
        ------------------------------------------------- */

        const overlay =
            document.querySelector(
                '.modal-overlay'
            );


        if (overlay) {

            overlay.addEventListener(
                'click',
                closeResultModal
            );

        }

    }


    /* =====================================================
       TECLADO
    ===================================================== */

    function setupKeyboard() {

        if (
            !elements.keyboard
        ) {

            return;

        }


        const buttons =
            elements.keyboard
                .querySelectorAll(
                    'button[data-letter]'
                );


        buttons.forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        const letter =
                            button.dataset.letter;


                        sendLetter(
                            letter
                        );

                    }
                );

            }
        );


        /* -------------------------------------------------
           TECLADO FÍSICO
        ------------------------------------------------- */

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
                    document.activeElement ===
                    elements.chatInput
                ) {

                    return;

                }


                const key =
                    event.key.toUpperCase();


                if (
                    /^[A-ZÀ-Ú]$/.test(key)
                ) {

                    sendLetter(
                        key
                    );

                }

            }
        );

    }


    /* =====================================================
       ENVIAR LETRA
    ===================================================== */

    function sendLetter(
        letter
    ) {

        if (
            !state.connected
        ) {

            showToast(
                'Você está desconectado.',
                'error'
            );

            return;

        }


        if (
            !state.room
        ) {

            return;

        }


        if (
            !state.room.started
        ) {

            showToast(
                'A rodada ainda não começou.',
                'info'
            );

            return;

        }


        const normalized =
            String(letter)
                .toUpperCase();


        if (
            state.room.guessedLetters &&
            state.room.guessedLetters
                .includes(
                    normalized
                )
        ) {

            return;

        }


        const button =
            elements.keyboard?.querySelector(
                `[data-letter="${CSS.escape(normalized)}"]`
            );


        if (
            button
        ) {

            button.classList.add(
                'is-selected'
            );


            setTimeout(
                () => {

                    button.classList.remove(
                        'is-selected'
                    );

                },
                250
            );

        }


        socket.emit(
            'guess-letter',
            normalized
        );

    }


    /* =====================================================
       ATUALIZAR JOGO
    ===================================================== */

    function updateGame(
        room
    ) {

        if (
            !room
        ) {

            return;

        }


        state.room =
            room;


        state.gameStarted =
            room.started;


        updateRoomCode(
            room.code
        );


        updateRound(
            room.round
        );


        updateCategory(
            room.category
        );


        updateTimer(
            room.timer
        );


        updateMistakes(
            room.mistakes,
            room.maxMistakes
        );


        updateWord(
            room.word
        );


        updatePlayers(
            room.players
        );


        updateTurn(
            room
        );


        updateKeyboard(
            room
        );


        updateGameStatus(
            room
        );

    }


    /* =====================================================
       SALA
    ===================================================== */

    function updateRoomCode(
        code
    ) {

        if (
            elements.roomCode
        ) {

            elements.roomCode.textContent =
                code || '-----';

        }

    }


    function updateURL(
        code
    ) {

        if (
            !code
        ) {

            return;

        }


        const url =
            `${window.location.pathname}?room=${encodeURIComponent(code)}`;


        window.history.replaceState(
            {},
            '',
            url
        );

    }


    /* =====================================================
       RODADA
    ===================================================== */

    function updateRound(
        round
    ) {

        if (
            !elements.roundNumber
        ) {

            return;

        }


        elements.roundNumber.textContent =
            formatRound(
                round
            );

    }


    function formatRound(
        round
    ) {

        return String(
            round || 1
        )
        .padStart(
            2,
            '0'
        );

    }


    /* =====================================================
       CATEGORIA
    ===================================================== */

    function updateCategory(
        category
    ) {

        if (
            elements.category
        ) {

            elements.category.textContent =
                category ||
                'AGUARDANDO...';

        }

    }


    /* =====================================================
       TIMER
    ===================================================== */

    function updateTimer(
        time
    ) {

        if (
            !elements.timer
        ) {

            return;

        }


        const value =
            Math.max(
                0,
                Number(time) || 0
            );


        elements.timer.textContent =
            value;


        elements.timer.classList.toggle(
            'is-danger',
            value <= 10
        );


        elements.timer.classList.toggle(
            'is-warning',
            value > 10 &&
            value <= 20
        );

    }


    /* =====================================================
       ERROS
    ===================================================== */

    function updateMistakes(
        mistakes,
        maxMistakes
    ) {

        const current =
            Number(mistakes) || 0;


        const max =
            Number(maxMistakes) || 6;


        if (
            elements.mistakes
        ) {

            elements.mistakes.textContent =
                current;

        }


        if (
            elements.maxMistakes
        ) {

            elements.maxMistakes.textContent =
                max;

        }


        if (
            elements.mistakesBar
        ) {

            const bars =
                elements.mistakesBar
                    .querySelectorAll(
                        'span'
                    );


            bars.forEach(
                (bar, index) => {

                    bar.classList.toggle(
                        'active',
                        index < current
                    );

                    bar.classList.toggle(
                        'is-error',
                        index < current
                    );

                }
            );

        }


        updateHangman(
            current
        );

    }


    /* =====================================================
       FORCA
    ===================================================== */

    function updateHangman(
        mistakes
    ) {

        if (
            !elements.hangman
        ) {

            return;

        }


        const parts =
            elements.hangman
                .querySelectorAll(
                    '[data-part]'
                );


        parts.forEach(
            part => {

                part.classList.remove(
                    'is-visible'
                );

            }
        );


        const order = [

            'head',

            'body',

            'left-arm',

            'right-arm',

            'left-leg',

            'right-leg'

        ];


        for (
            let i = 0;
            i < mistakes;
            i++
        ) {

            const part =
                elements.hangman
                    .querySelector(
                        `[data-part="${order[i]}"]`
                    );


            if (
                part
            ) {

                part.classList.add(
                    'is-visible'
                );

            }

        }

    }


    /* =====================================================
       PALAVRA
    ===================================================== */

    function updateWord(
        word
    ) {

        if (
            !elements.word
        ) {

            return;

        }


        elements.word.innerHTML = '';


        if (
            !Array.isArray(word)
        ) {

            word = [];

        }


        word.forEach(
            letter => {

                const span =
                    document.createElement(
                        'span'
                    );


                span.textContent =
                    letter === '_'
                        ? '_'
                        : letter;


                if (
                    letter !== '_'
                ) {

                    span.classList.add(
                        'revealed'
                    );

                }


                elements.word.appendChild(
                    span
                );

            }
        );


        if (
            elements.wordHint
        ) {

            if (
                state.room?.started
            ) {

                elements.wordHint.textContent =
                    'Escolha uma letra para descobrir a palavra.';

            } else {

                elements.wordHint.textContent =
                    'Aguarde o início da rodada...';

            }

        }

    }


    /* =====================================================
       JOGADORES
    ===================================================== */

    function updatePlayers(
        players
    ) {

        if (
            !elements.playersList
        ) {

            return;

        }


        players =
            Array.isArray(players)
                ? players
                : [];


        if (
            elements.playersCount
        ) {

            elements.playersCount.textContent =
                players.length;

        }


        elements.playersList.innerHTML =
            '';


        players.forEach(
            player => {

                const article =
                    document.createElement(
                        'article'
                    );


                article.className =
                    'game-player';


                if (
                    player.id ===
                    socket.id
                ) {

                    article.classList.add(
                        'is-me'
                    );

                }


                if (
                    !player.connected
                ) {

                    article.classList.add(
                        'is-offline'
                    );

                }


                const avatar =
                    document.createElement(
                        'div'
                    );


                avatar.className =
                    'player-avatar';


                avatar.innerHTML =
                    '<i class="fa-solid fa-user"></i>';


                const info =
                    document.createElement(
                        'div'
                    );


                info.className =
                    'player-info';


                const name =
                    document.createElement(
                        'strong'
                    );


                name.textContent =
                    player.username ||
                    'Jogador';


                const level =
                    document.createElement(
                        'span'
                    );


                level.textContent =
                    `Nível ${player.level || 1}`;


                info.appendChild(
                    name
                );

                info.appendChild(
                    level
                );


                const score =
                    document.createElement(
                        'div'
                    );


                score.className =
                    'player-score';


                const points =
                    document.createElement(
                        'strong'
                    );


                points.textContent =
                    player.score || 0;


                const label =
                    document.createElement(
                        'span'
                    );


                label.textContent =
                    'PTS';


                score.appendChild(
                    points
                );

                score.appendChild(
                    label
                );


                article.appendChild(
                    avatar
                );

                article.appendChild(
                    info
                );

                article.appendChild(
                    score
                );


                elements.playersList.appendChild(
                    article
                );

            }
        );

    }


    /* =====================================================
       TURNO
    ===================================================== */

    function updateTurn(
        room
    ) {

        if (
            !elements.currentTurn
        ) {

            return;

        }


        const player =
            room.players?.find(
                p =>
                    p.id ===
                    room.currentTurn
            );


        elements.currentTurn.textContent =
            player
                ? player.username
                : '—';


        if (
            elements.keyboardStatus
        ) {

            if (
                !room.started
            ) {

                elements.keyboardStatus.textContent =
                    'Aguardando rodada';

            } else {

                elements.keyboardStatus.textContent =
                    'Sua vez';

            }

        }

    }


    /* =====================================================
       TECLADO
    ===================================================== */

    function updateKeyboard(
        room
    ) {

        if (
            !elements.keyboard
        ) {

            return;

        }


        const guessed =
            room.guessedLetters || [];


        const buttons =
            elements.keyboard
                .querySelectorAll(
                    'button[data-letter]'
                );


        buttons.forEach(
            button => {

                const letter =
                    button.dataset.letter;


                const used =
                    guessed.includes(
                        letter
                    );


                button.classList.toggle(
                    'used',
                    used
                );


                button.disabled =
                    used ||
                    !room.started;

            }
        );


        setKeyboardEnabled(
            room.started
        );

    }


    function resetKeyboard() {

        const buttons =
            elements.keyboard?.querySelectorAll(
                'button[data-letter]'
            );


        buttons?.forEach(
            button => {

                button.disabled =
                    false;

                button.classList.remove(
                    'used'
                );

            }
        );

    }


    function setKeyboardEnabled(
        enabled
    ) {

        const buttons =
            elements.keyboard?.querySelectorAll(
                'button[data-letter]'
            );


        buttons?.forEach(
            button => {

                /*
                 * Não removemos "used" aqui.
                 */

                if (
                    !button.classList.contains(
                        'used'
                    )
                ) {

                    button.disabled =
                        !enabled;

                }

            }
        );

    }


    /* =====================================================
       STATUS DO JOGO
    ===================================================== */

    function updateGameStatus(
        room
    ) {

        if (
            !elements.keyboardStatus
        ) {

            return;

        }


        if (
            !room.started
        ) {

            elements.keyboardStatus.textContent =
                'Aguardando rodada';

            return;

        }


        const currentPlayer =
            room.players?.find(
                player =>
                    player.id ===
                    room.currentTurn
            );


        if (
            currentPlayer?.id ===
            socket.id
        ) {

            elements.keyboardStatus.textContent =
                'Sua vez';

        } else {

            elements.keyboardStatus.textContent =
                currentPlayer
                    ? `Vez de ${currentPlayer.username}`
                    : 'Aguardando';

        }

    }


    /* =====================================================
       STATUS DA CONEXÃO
    ===================================================== */

    function updateConnection(
        connected
    ) {

        if (
            !elements.connectionStatus
        ) {

            return;

        }


        const text =
            elements.connectionStatus
                .querySelector(
                    'strong'
                );


        elements.connectionStatus
            .classList.toggle(
                'online',
                connected
            );


        elements.connectionStatus
            .classList.toggle(
                'offline',
                !connected
            );


        if (
            text
        ) {

            text.textContent =
                connected
                    ? 'Online'
                    : 'Desconectado';

        }

    }


    /* =====================================================
       COPIAR CÓDIGO
    ===================================================== */

    async function copyRoom() {

        if (
            !state.roomCode
        ) {

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
                `Código: ${state.roomCode}`,
                'info'
            );

        }

    }


    /* =====================================================
       CHAT
    ===================================================== */

    function setupChat() {

        if (
            !elements.chatForm
        ) {

            return;

        }


        elements.chatForm
            .addEventListener(
                'submit',
                event => {

                    event.preventDefault();


                    const message =
                        elements.chatInput
                            ?.value
                            .trim();


                    if (
                        !message
                    ) {

                        return;

                    }


                    if (
                        message.length > 250
                    ) {

                        return;

                    }


                    socket.emit(
                        'chatMessage',
                        message
                    );


                    elements.chatInput.value =
                        '';

                }
            );

    }


    /* =====================================================
       ADICIONAR CHAT
    ===================================================== */

    function addChatMessage(
        message
    ) {

        if (
            !elements.chatMessages
        ) {

            return;

        }


        const container =
            document.createElement(
                'div'
            );


        container.className =
            'chat-message';


        const avatar =
            document.createElement(
                'div'
            );


        avatar.className =
            'chat-avatar';


        avatar.innerHTML =
            '<i class="fa-solid fa-user"></i>';


        const content =
            document.createElement(
                'div'
            );


        content.className =
            'chat-content';


        const username =
            document.createElement(
                'strong'
            );


        username.textContent =
            message.username ||
            'Jogador';


        const text =
            document.createElement(
                'p'
            );


        text.textContent =
            message.message ||
            '';


        content.appendChild(
            username
        );

        content.appendChild(
            text
        );


        container.appendChild(
            avatar
        );

        container.appendChild(
            content
        );


        elements.chatMessages.appendChild(
            container
        );


        scrollChat();

    }


    /* =====================================================
       MENSAGEM DO SISTEMA
    ===================================================== */

    function addSystemMessage(
        message
    ) {

        if (
            !elements.chatMessages
        ) {

            return;

        }


        const container =
            document.createElement(
                'div'
            );


        container.className =
            'chat-message system';


        const avatar =
            document.createElement(
                'div'
            );


        avatar.className =
            'chat-avatar';


        avatar.innerHTML =
            '<i class="fa-solid fa-robot"></i>';


        const content =
            document.createElement(
                'div'
            );


        content.className =
            'chat-content';


        const username =
            document.createElement(
                'strong'
            );


        username.textContent =
            'HANGOUT';


        const text =
            document.createElement(
                'p'
            );


        text.textContent =
            message;


        content.appendChild(
            username
        );

        content.appendChild(
            text
        );


        container.appendChild(
            avatar
        );

        container.appendChild(
            content
        );


        elements.chatMessages.appendChild(
            container
        );


        scrollChat();

    }


    function scrollChat() {

        elements.chatMessages.scrollTop =
            elements.chatMessages.scrollHeight;

    }


    /* =====================================================
       RESULTADO
    ===================================================== */

    function showResult(
        result
    ) {

        if (
            !elements.gameResultModal
        ) {

            return;

        }


        const won =
            Boolean(
                result.winner
            );


        if (
            elements.resultIcon
        ) {

            elements.resultIcon.className =
                won
                    ? 'fa-solid fa-trophy'
                    : 'fa-solid fa-skull-crossbones';

        }


        if (
            elements.resultTitle
        ) {

            elements.resultTitle.textContent =
                won
                    ? 'Você venceu!'
                    : 'Fim de jogo!';

        }


        if (
            elements.resultMessage
        ) {

            elements.resultMessage.textContent =
                won
                    ? `${result.player || 'Jogador'} descobriu a palavra!`
                    : `A palavra era ${result.word || '—'}.`;

        }


        if (
            elements.resultWord
        ) {

            elements.resultWord.textContent =
                result.word ||
                '—';

        }


        if (
            elements.resultPoints
        ) {

            elements.resultPoints.textContent =
                `+${result.points || 0}`;

        }


        if (
            elements.resultXP
        ) {

            elements.resultXP.textContent =
                `+${result.xp || 0}`;

        }


        elements.gameResultModal
            .classList.add(
                'show'
            );


        elements.gameResultModal
            .setAttribute(
                'aria-hidden',
                'false'
            );

    }


    /* =====================================================
       FECHAR RESULTADO
    ===================================================== */

    function closeResultModal() {

        if (
            !elements.gameResultModal
        ) {

            return;

        }


        elements.gameResultModal
            .classList.remove(
                'show'
            );


        elements.gameResultModal
            .setAttribute(
                'aria-hidden',
                'true'
            );

    }


    /* =====================================================
       SAIR DO JOGO
    ===================================================== */

    function leaveGame() {

        socket.emit(
            'leave-room'
        );


        window.location.href =
            '/';

    }


    /* =====================================================
       SOM
    ===================================================== */

    function toggleSound() {

        state.soundEnabled =
            !state.soundEnabled;


        if (
            elements.soundButton
        ) {

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


    function playSound(
        type
    ) {

        if (
            !state.soundEnabled
        ) {

            return;

        }


        /*
         * Não dependemos de arquivos MP3.
         * O navegador gera um pequeno beep
         * usando Web Audio API.
         */

        try {

            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;


            if (
                !AudioContext
            ) {

                return;

            }


            const context =
                new AudioContext();


            const oscillator =
                context.createOscillator();


            const gain =
                context.createGain();


            oscillator.connect(
                gain
            );

            gain.connect(
                context.destination
            );


            let frequency =
                500;


            if (
                type === 'win'
            ) {

                frequency =
                    800;

            }


            if (
                type === 'lose'
            ) {

                frequency =
                    180;

            }


            if (
                type === 'start'
            ) {

                frequency =
                    600;

            }


            oscillator.frequency.value =
                frequency;


            oscillator.type =
                'sine';


            gain.gain.setValueAtTime(
                0.0001,
                context.currentTime
            );


            gain.gain.exponentialRampToValueAtTime(
                0.08,
                context.currentTime + 0.01
            );


            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                context.currentTime + 0.18
            );


            oscillator.start();


            oscillator.stop(
                context.currentTime + 0.2
            );

        } catch {

            // Som opcional.

        }

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message,
        type = 'info'
    ) {

        if (
            !elements.toastContainer
        ) {

            return;

        }


        const toast =
            document.createElement(
                'div'
            );


        toast.className =
            `toast ${type}`;


        let icon =
            'fa-circle-info';


        if (
            type === 'success'
        ) {

            icon =
                'fa-circle-check';

        }


        if (
            type === 'error'
        ) {

            icon =
                'fa-circle-exclamation';

        }


        if (
            type === 'warning'
        ) {

            icon =
                'fa-triangle-exclamation';

        }


        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span></span>
        `;


        toast
            .querySelector('span')
            .textContent =
                message;


        elements.toastContainer.appendChild(
            toast
        );


        requestAnimationFrame(
            () => {

                toast.classList.add(
                    'show'
                );

            }
        );


        setTimeout(
            () => {

                toast.classList.remove(
                    'show'
                );


                setTimeout(
                    () => {

                        toast.remove();

                    },
                    300
                );

            },
            3000
        );

    }


    /* =====================================================
       START
    ===================================================== */

    init();


})();