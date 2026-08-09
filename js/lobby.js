/* =========================================================
   HANGOUT — LOBBY.JS
   Lobby Multiplayer
   Socket.IO + UI + Players + Host
   ========================================================= */


/* =========================================================
   01. CONFIGURAÇÃO
========================================================= */

const LOBBY_CONFIG = {

    maxPlayers: 8,

    minPlayers: 2,

    roomCodeLength: 5,

    redirectDelay: 500,

    copyResetDelay: 1800

};


/* =========================================================
   02. ESTADO
========================================================= */

const LOBBY = {

    socket: null,

    connected: false,

    room: null,

    player: null,

    initialized: false,

    starting: false

};


/* =========================================================
   03. ELEMENTOS
========================================================= */

const LOBBY_DOM = {

    connection:
        document.getElementById(
            "connectionStatus"
        ),

    roomCode:
        document.getElementById(
            "roomCode"
        ),

    copyButton:
        document.getElementById(
            "copyRoomCode"
        ),

    playerList:
        document.getElementById(
            "playerList"
        ),

    playerCount:
        document.getElementById(
            "playerCount"
        ),

    startButton:
        document.getElementById(
            "startGameButton"
        ),

    leaveButton:
        document.getElementById(
            "leaveRoomButton"
        ),

    roomStatus:
        document.getElementById(
            "roomStatus"
        ),

    hostBadge:
        document.getElementById(
            "hostBadge"
        ),

    chatMessages:
        document.getElementById(
            "chatMessages"
        ),

    chatForm:
        document.getElementById(
            "chatForm"
        ),

    chatInput:
        document.getElementById(
            "chatInput"
        ),

    toastContainer:
        document.getElementById(
            "toastContainer"
        )

};


/* =========================================================
   04. INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initLobby();

    }
);


function initLobby() {

    if (LOBBY.initialized) {

        return;

    }


    LOBBY.initialized =
        true;


    console.log(
        "%c HANGOUT LOBBY ",
        `
            background:#7c3aed;
            color:#fff;
            padding:6px 12px;
            border-radius:6px;
            font-weight:900;
        `
    );


    loadPlayer();

    loadRoom();

    setupLobbyEvents();

    connectLobbySocket();

}


/* =========================================================
   05. PLAYER
========================================================= */

function loadPlayer() {

    try {

        const saved =
            localStorage.getItem(
                "hangout_player"
            );


        if (!saved) {

            notify(
                "error",
                "Jogador não encontrado",
                "Volte para o início."
            );


            redirectHome();

            return;

        }


        LOBBY.player =
            JSON.parse(
                saved
            );

    } catch (error) {

        console.error(
            "Erro ao carregar jogador:",
            error
        );


        redirectHome();

    }

}


/* =========================================================
   06. ROOM
========================================================= */

function loadRoom() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const code =
        params
            .get("room")
            ?.trim()
            .toUpperCase();


    if (
        !code ||
        !isValidRoomCode(code)
    ) {

        notify(
            "error",
            "Sala inválida",
            "O código da sala não é válido."
        );


        redirectHome();

        return;

    }


    LOBBY.room = {

        code

    };


    setText(
        LOBBY_DOM.roomCode,
        code
    );

}


/* =========================================================
   07. SOCKET
========================================================= */

function connectLobbySocket() {

    if (
        typeof io !== "function"
    ) {

        notify(
            "error",
            "Socket.IO não carregado",
            "Verifique o game.html."
        );


        return;

    }


    LOBBY.socket =
        io({

            reconnection: true,

            reconnectionAttempts: 10,

            reconnectionDelay: 1500

        });


    setupSocketEvents();

}


/* =========================================================
   08. SOCKET EVENTS
========================================================= */

function setupSocketEvents() {

    const socket =
        LOBBY.socket;


    /* =====================================================
       CONNECT
    ====================================================== */

    socket.on(
        "connect",
        () => {

            LOBBY.connected =
                true;


            updateConnection(
                true
            );


            console.log(
                "🟢 Lobby conectado:",
                socket.id
            );


            joinLobby();

        }
    );


    /* =====================================================
       DISCONNECT
    ====================================================== */

    socket.on(
        "disconnect",
        reason => {

            LOBBY.connected =
                false;


            updateConnection(
                false
            );


            console.warn(
                "🔴 Lobby desconectado:",
                reason
            );

        }
    );


    /* =====================================================
       CONNECT ERROR
    ====================================================== */

    socket.on(
        "connect_error",
        error => {

            console.error(
                "Socket error:",
                error
            );


            updateConnection(
                false
            );

        }
    );


    /* =====================================================
       ROOM CREATED
    ====================================================== */

    socket.on(
        "room-created",
        data => {

            if (!data) {

                return;

            }


            LOBBY.room =
                data.room;


            LOBBY.player =
                data.player;


            updateLobby(
                data.room
            );


            notify(
                "success",
                "Sala criada",
                `Código: ${data.room.code}`
            );

        }
    );


    /* =====================================================
       ROOM JOINED
    ====================================================== */

    socket.on(
        "room-joined",
        data => {

            if (!data) {

                return;

            }


            LOBBY.room =
                data.room;


            LOBBY.player =
                data.player;


            updateLobby(
                data.room
            );


            notify(
                "success",
                "Você entrou!",
                `Sala ${data.room.code}`
            );

        }
    );


    /* =====================================================
       ROOM UPDATE
    ====================================================== */

    socket.on(
        "room-update",
        room => {

            if (!room) {

                return;

            }


            updateLobby(
                room
            );

        }
    );


    /* =====================================================
       PLAYER LEFT
    ====================================================== */

    socket.on(
        "player-left",
        data => {

            if (!data) {

                return;

            }


            notify(
                "info",
                "Jogador saiu",
                `${data.username} saiu da sala.`
            );

        }
    );


    /* =====================================================
       NEW HOST
    ====================================================== */

    socket.on(
        "new-host",
        data => {

            if (!data) {

                return;

            }


            updateHost();


            if (
                LOBBY.player &&
                data.hostId ===
                LOBBY.player.id
            ) {

                notify(
                    "success",
                    "Você é o novo host",
                    "Agora você controla a partida."
                );

            }

        }
    );


    /* =====================================================
       GAME START
    ====================================================== */

    socket.on(
        "round-started",
        data => {

            redirectToGame();

        }
    );


    /* =====================================================
       GAME STATE
    ====================================================== */

    socket.on(
        "game-state",
        game => {

            if (
                game &&
                game.status ===
                "playing"
            ) {

                redirectToGame();

            }

        }
    );


    /* =====================================================
       ERROR
    ====================================================== */

    socket.on(
        "error-message",
        message => {

            LOBBY.starting =
                false;


            setStartButtonLoading(
                false
            );


            notify(
                "error",
                "Erro",
                message
            );

        }
    );


    /* =====================================================
       CHAT
    ====================================================== */

    socket.on(
        "chat-message",
        message => {

            renderChatMessage(
                message
            );

        }
    );

}


/* =========================================================
   09. ENTRAR NO LOBBY
========================================================= */

function joinLobby() {

    if (
        !LOBBY.socket ||
        !LOBBY.connected
    ) {

        return;

    }


    if (
        !LOBBY.player ||
        !LOBBY.room
    ) {

        return;

    }


    LOBBY.socket.emit(
        "join-room",
        {

            code:
                LOBBY.room.code,

            username:
                LOBBY.player.username,

            avatar:
                LOBBY.player.avatar

        }
    );

}


/* =========================================================
   10. EVENTOS DA INTERFACE
========================================================= */

function setupLobbyEvents() {


    /* =====================================================
       START
    ====================================================== */

    if (
        LOBBY_DOM.startButton
    ) {

        LOBBY_DOM.startButton.addEventListener(
            "click",
            requestStartGame
        );

    }


    /* =====================================================
       LEAVE
    ====================================================== */

    if (
        LOBBY_DOM.leaveButton
    ) {

        LOBBY_DOM.leaveButton.addEventListener(
            "click",
            leaveLobby
        );

    }


    /* =====================================================
       COPY
    ====================================================== */

    if (
        LOBBY_DOM.copyButton
    ) {

        LOBBY_DOM.copyButton.addEventListener(
            "click",
            copyRoomCode
        );

    }


    /* =====================================================
       CHAT
    ====================================================== */

    if (
        LOBBY_DOM.chatForm
    ) {

        LOBBY_DOM.chatForm.addEventListener(
            "submit",
            sendChatMessage
        );

    }


    /* =====================================================
       ENTER CHAT
    ====================================================== */

    if (
        LOBBY_DOM.chatInput
    ) {

        LOBBY_DOM.chatInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    LOBBY_DOM.chatForm
                        ?.requestSubmit();

                }

            }
        );

    }


    /* =====================================================
       ESC
    ====================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                leaveLobby();

            }

        }
    );

}


/* =========================================================
   11. ATUALIZAR LOBBY
========================================================= */

function updateLobby(room) {

    if (!room) {

        return;

    }


    LOBBY.room =
        room;


    /* =====================================================
       ROOM CODE
    ====================================================== */

    setText(
        LOBBY_DOM.roomCode,
        room.code
    );


    /* =====================================================
       PLAYER COUNT
    ====================================================== */

    setText(
        LOBBY_DOM.playerCount,
        `${room.players.length}/${room.maxPlayers}`
    );


    /* =====================================================
       PLAYERS
    ====================================================== */

    renderPlayers(
        room.players
    );


    /* =====================================================
       STATUS
    ====================================================== */

    updateRoomStatus(
        room
    );


    /* =====================================================
       HOST
    ====================================================== */

    updateHost();


    /* =====================================================
       START BUTTON
    ====================================================== */

    updateStartButton();

}


/* =========================================================
   12. RENDER PLAYERS
========================================================= */

function renderPlayers(players) {

    if (
        !LOBBY_DOM.playerList
    ) {

        return;

    }


    LOBBY_DOM.playerList.innerHTML =
        "";


    players.forEach(
        (player, index) => {

            const element =
                document.createElement(
                    "article"
                );


            element.className =
                "lobby-player";


            const isMe =
                LOBBY.player &&
                player.id ===
                LOBBY.player.id;


            const isHost =
                LOBBY.room &&
                player.id ===
                LOBBY.room.hostId;


            if (isMe) {

                element.classList.add(
                    "is-me"
                );

            }


            if (isHost) {

                element.classList.add(
                    "is-host"
                );

            }


            /* =================================================
               AVATAR
            ================================================== */

            const avatar =
                document.createElement(
                    "div"
                );


            avatar.className =
                "lobby-player-avatar";


            avatar.innerHTML = `

                <i class="${
                    escapeHTML(
                        player.avatar ||
                        "fa-solid fa-user"
                    )
                }"></i>

            `;


            /* =================================================
               INFO
            ================================================== */

            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "lobby-player-info";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                player.username;


            const status =
                document.createElement(
                    "span"
                );


            if (isHost) {

                status.innerHTML = `

                    <i class="fa-solid fa-crown"></i>

                    HOST

                `;

            } else {

                status.innerHTML = `

                    <i class="fa-solid fa-circle"></i>

                    JOGADOR

                `;

            }


            info.appendChild(
                name
            );


            info.appendChild(
                status
            );


            /* =================================================
               SCORE
            ================================================== */

            const score =
                document.createElement(
                    "div"
                );


            score.className =
                "lobby-player-score";


            score.textContent =
                `${player.score || 0} XP`;


            /* =================================================
               ELEMENT
            ================================================== */

            element.appendChild(
                avatar
            );


            element.appendChild(
                info
            );


            element.appendChild(
                score
            );


            LOBBY_DOM.playerList.appendChild(
                element
            );

        }
    );

}


/* =========================================================
   13. HOST
========================================================= */

function updateHost() {

    if (
        !LOBBY.player ||
        !LOBBY.room
    ) {

        return;

    }


    const isHost =
        LOBBY.room.hostId ===
        LOBBY.player.id;


    if (
        LOBBY_DOM.hostBadge
    ) {

        LOBBY_DOM.hostBadge.classList.toggle(
            "visible",
            isHost
        );

    }


    if (
        LOBBY_DOM.startButton
    ) {

        LOBBY_DOM.startButton.style.display =
            isHost
                ? ""
                : "none";

    }

}


/* =========================================================
   14. BOTÃO START
========================================================= */

function updateStartButton() {

    if (
        !LOBBY_DOM.startButton ||
        !LOBBY.room
    ) {

        return;

    }


    const isHost =
        LOBBY.player &&
        LOBBY.room.hostId ===
        LOBBY.player.id;


    const players =
        LOBBY.room.players?.length ||
        0;


    const enoughPlayers =
        players >=
        LOBBY_CONFIG.minPlayers;


    const canStart =
        isHost &&
        enoughPlayers &&
        !LOBBY.starting;


    LOBBY_DOM.startButton.disabled =
        !canStart;


    if (!isHost) {

        setButtonText(
            LOBBY_DOM.startButton,
            "Aguardando host"
        );

        return;

    }


    if (!enoughPlayers) {

        setButtonText(
            LOBBY_DOM.startButton,
            `Aguardando jogadores (${players}/${LOBBY_CONFIG.minPlayers})`
        );

        return;

    }


    if (!LOBBY.starting) {

        setButtonText(
            LOBBY_DOM.startButton,
            "Começar partida"
        );

    }

}


/* =========================================================
   15. COMEÇAR PARTIDA
========================================================= */

function requestStartGame() {

    if (
        LOBBY.starting
    ) {

        return;

    }


    if (
        !LOBBY.socket ||
        !LOBBY.connected
    ) {

        notify(
            "error",
            "Sem conexão",
            "Aguarde o servidor conectar."
        );

        return;

    }


    if (!LOBBY.room) {

        return;

    }


    if (
        LOBBY.room.hostId !==
        LOBBY.player?.id
    ) {

        notify(
            "error",
            "Sem permissão",
            "Somente o host pode iniciar."
        );

        return;

    }


    const players =
        LOBBY.room.players?.length ||
        0;


    if (
        players <
        LOBBY_CONFIG.minPlayers
    ) {

        notify(
            "error",
            "Poucos jogadores",
            "É necessário pelo menos 2 jogadores."
        );

        return;

    }


    LOBBY.starting =
        true;


    setStartButtonLoading(
        true
    );


    LOBBY.socket.emit(
        "start-game"
    );

}


function setStartButtonLoading(
    loading
) {

    if (
        !LOBBY_DOM.startButton
    ) {

        return;

    }


    if (loading) {

        LOBBY_DOM.startButton.disabled =
            true;


        LOBBY_DOM.startButton.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Iniciando...

        `;

        return;

    }


    LOBBY.starting =
        false;


    updateStartButton();

}


/* =========================================================
   16. STATUS DA SALA
========================================================= */

function updateRoomStatus(room) {

    if (
        !LOBBY_DOM.roomStatus
    ) {

        return;

    }


    const statusMap = {

        waiting: {

            text:
                "Aguardando jogadores",

            icon:
                "fa-solid fa-users"

        },

        playing: {

            text:
                "Partida em andamento",

            icon:
                "fa-solid fa-gamepad"

        },

        "round-end": {

            text:
                "Rodada finalizada",

            icon:
                "fa-solid fa-flag-checkered"

        },

        finished: {

            text:
                "Partida finalizada",

            icon:
                "fa-solid fa-trophy"

        }

    };


    const current =
        statusMap[
            room.status
        ] ||
        statusMap.waiting;


    LOBBY_DOM.roomStatus.innerHTML = `

        <i class="${current.icon}"></i>

        <span>
            ${current.text}
        </span>

    `;


    LOBBY_DOM.roomStatus.dataset.status =
        room.status;

}


/* =========================================================
   17. COPIAR CÓDIGO
========================================================= */

async function copyRoomCode() {

    const code =
        LOBBY.room?.code;


    if (!code) {

        return;

    }


    try {

        await navigator.clipboard.writeText(
            code
        );


        notify(
            "success",
            "Código copiado!",
            `Envie ${code} para seus amigos.`
        );


        if (
            LOBBY_DOM.copyButton
        ) {

            const original =
                LOBBY_DOM.copyButton.innerHTML;


            LOBBY_DOM.copyButton.innerHTML = `

                <i class="fa-solid fa-check"></i>

                Copiado

            `;


            setTimeout(
                () => {

                    LOBBY_DOM.copyButton.innerHTML =
                        original;

                },
                LOBBY_CONFIG.copyResetDelay
            );

        }

    } catch (error) {

        console.error(
            error
        );


        notify(
            "error",
            "Não foi possível copiar",
            "Copie o código manualmente."
        );

    }

}


/* =========================================================
   18. CHAT
========================================================= */

function sendChatMessage(event) {

    event.preventDefault();


    if (
        !LOBBY.socket ||
        !LOBBY.connected
    ) {

        return;

    }


    if (
        !LOBBY_DOM.chatInput
    ) {

        return;

    }


    const message =
        LOBBY_DOM.chatInput.value
            .trim()
            .substring(
                0,
                250
            );


    if (!message) {

        return;

    }


    LOBBY.socket.emit(
        "send-message",
        {
            message
        }
    );


    LOBBY_DOM.chatInput.value =
        "";


    LOBBY_DOM.chatInput.focus();

}


/* =========================================================
   19. RENDER CHAT
========================================================= */

function renderChatMessage(
    message
) {

    if (
        !LOBBY_DOM.chatMessages
    ) {

        return;

    }


    const element =
        document.createElement(
            "div"
        );


    element.className =
        "chat-message";


    const isMe =
        LOBBY.player &&
        message.playerId ===
        LOBBY.player.id;


    if (isMe) {

        element.classList.add(
            "is-me"
        );

    }


    const time =
        new Date(
            message.timestamp
        );


    const formattedTime =
        time.toLocaleTimeString(
            "pt-BR",
            {

                hour:
                    "2-digit",

                minute:
                    "2-digit"

            }
        );


    element.innerHTML = `

        <div class="chat-message-header">

            <strong>
                ${escapeHTML(
                    message.username
                )}
            </strong>

            <time>
                ${formattedTime}
            </time>

        </div>

        <p>
            ${escapeHTML(
                message.message
            )}
        </p>

    `;


    LOBBY_DOM.chatMessages.appendChild(
        element
    );


    LOBBY_DOM.chatMessages.scrollTop =
        LOBBY_DOM.chatMessages.scrollHeight;

}


/* =========================================================
   20. SAIR DO LOBBY
========================================================= */

function leaveLobby() {

    if (
        !confirm(
            "Deseja realmente sair da sala?"
        )
    ) {

        return;

    }


    if (
        LOBBY.socket &&
        LOBBY.connected
    ) {

        LOBBY.socket.emit(
            "leave-room"
        );

    }


    redirectHome();

}


/* =========================================================
   21. REDIRECIONAR PARA GAME
========================================================= */

function redirectToGame() {

    if (
        !LOBBY.room?.code
    ) {

        return;

    }


    setTimeout(
        () => {

            window.location.href =
                `game.html?room=${encodeURIComponent(
                    LOBBY.room.code
                )}`;

        },
        LOBBY_CONFIG.redirectDelay
    );

}


/* =========================================================
   22. HOME
========================================================= */

function redirectHome() {

    setTimeout(
        () => {

            window.location.href =
                "index.html";

        },
        150
    );

}


/* =========================================================
   23. CONNECTION STATUS
========================================================= */

function updateConnection(
    connected
) {

    if (
        !LOBBY_DOM.connection
    ) {

        return;

    }


    LOBBY_DOM.connection.classList.toggle(
        "online",
        connected
    );


    LOBBY_DOM.connection.classList.toggle(
        "offline",
        !connected
    );


    const text =
        LOBBY_DOM.connection.querySelector(
            "span"
        );


    if (text) {

        text.textContent =
            connected
                ? "Online"
                : "Conectando...";

    }

}


/* =========================================================
   24. TOAST
========================================================= */

function notify(
    type = "info",
    title = "Aviso",
    message = ""
) {

    if (
        !LOBBY_DOM.toastContainer
    ) {

        console.log(
            `[${type}] ${title}: ${message}`
        );

        return;

    }


    const icons = {

        success:
            "fa-solid fa-circle-check",

        error:
            "fa-solid fa-circle-exclamation",

        info:
            "fa-solid fa-circle-info"

    };


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast ${type}`;


    toast.innerHTML = `

        <div class="toast-icon">

            <i class="${
                icons[type] ||
                icons.info
            }"></i>

        </div>

        <div class="toast-content">

            <strong>
                ${escapeHTML(title)}
            </strong>

            <span>
                ${escapeHTML(message)}
            </span>

        </div>

        <button
            type="button"
            class="toast-close"
        >

            <i class="fa-solid fa-xmark"></i>

        </button>

    `;


    const close =
        toast.querySelector(
            ".toast-close"
        );


    close.addEventListener(
        "click",
        () => {

            removeToast(
                toast
            );

        }
    );


    LOBBY_DOM.toastContainer.appendChild(
        toast
    );


    setTimeout(
        () => {

            removeToast(
                toast
            );

        },
        4000
    );

}


function removeToast(toast) {

    if (!toast) {

        return;

    }


    toast.classList.add(
        "removing"
    );


    setTimeout(
        () => {

            toast.remove();

        },
        250
    );

}


/* =========================================================
   25. VALIDAÇÃO
========================================================= */

function isValidRoomCode(code) {

    return /^[A-Z0-9]{5}$/.test(
        code
    );

}


/* =========================================================
   26. TEXT
========================================================= */

function setText(
    element,
    value
) {

    if (!element) {

        return;

    }


    element.textContent =
        value ?? "";

}


function setButtonText(
    button,
    text
) {

    if (!button) {

        return;

    }


    button.innerHTML = `

        <i class="fa-solid fa-play"></i>

        ${escapeHTML(text)}

    `;

}


/* =========================================================
   27. ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    const element =
        document.createElement(
            "div"
        );


    element.textContent =
        String(
            value ?? ""
        );


    return element.innerHTML;

}


/* =========================================================
   28. DEBUG
========================================================= */

window.HANGOUT_LOBBY = {

    state:
        LOBBY,

    start:
        requestStartGame,

    leave:
        leaveLobby,

    copy:
        copyRoomCode,

    notify,

    reconnect:
        connectLobbySocket

};


/* =========================================================
   29. FINAL
========================================================= */

console.log(
    "🏠 HANGOUT Lobby.js carregado."
);