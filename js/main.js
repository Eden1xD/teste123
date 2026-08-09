/* =========================================================
   HANGOUT — MAIN.JS
   Página inicial / Salas / Modais / UI
   ========================================================= */


/* =========================================================
   01. CONFIGURAÇÃO
   ========================================================= */

const CONFIG = {

    roomCodeLength: 5,

    maxUsernameLength: 16,

    storageKeys: {
        player: "hangout_player",
        room: "hangout_room"
    }

};


/* =========================================================
   02. ELEMENTOS
   ========================================================= */

const DOM = {

    loadingScreen:
        document.getElementById("loadingScreen"),

    createModal:
        document.getElementById("createModal"),

    joinModal:
        document.getElementById("joinModal"),

    createForm:
        document.getElementById("createRoomForm"),

    joinForm:
        document.getElementById("joinRoomForm"),

    createUsername:
        document.getElementById("createUsername"),

    joinUsername:
        document.getElementById("joinUsername"),

    roomCode:
        document.getElementById("roomCode"),

    difficulty:
        document.getElementById("difficulty"),

    toastContainer:
        document.getElementById("toastContainer"),

    openCreateButton:
        document.getElementById("openCreateButton"),

    openJoinButton:
        document.getElementById("openJoinButton"),

    heroCreateButton:
        document.getElementById("heroCreateButton"),

    heroJoinButton:
        document.getElementById("heroJoinButton"),

    ctaCreateButton:
        document.getElementById("ctaCreateButton")

};


/* =========================================================
   03. INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initialize();

});


function initialize() {

    setupLoading();

    setupButtons();

    setupModals();

    setupForms();

    setupRoomCode();

    setupNavigation();

    restorePlayer();

}


/* =========================================================
   04. LOADING
   ========================================================= */

function setupLoading() {

    window.addEventListener("load", () => {

        setTimeout(() => {

            if (!DOM.loadingScreen) return;

            DOM.loadingScreen.classList.add("hidden");

        }, 450);

    });

}


/* =========================================================
   05. BOTÕES
   ========================================================= */

function setupButtons() {

    if (DOM.openCreateButton) {

        DOM.openCreateButton.addEventListener(
            "click",
            openCreateModal
        );

    }


    if (DOM.heroCreateButton) {

        DOM.heroCreateButton.addEventListener(
            "click",
            openCreateModal
        );

    }


    if (DOM.ctaCreateButton) {

        DOM.ctaCreateButton.addEventListener(
            "click",
            openCreateModal
        );

    }


    if (DOM.openJoinButton) {

        DOM.openJoinButton.addEventListener(
            "click",
            openJoinModal
        );

    }


    if (DOM.heroJoinButton) {

        DOM.heroJoinButton.addEventListener(
            "click",
            openJoinModal
        );

    }

}


/* =========================================================
   06. MODAIS
   ========================================================= */

function setupModals() {

    document
        .querySelectorAll("[data-close-modal]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const modalId =
                    button.dataset.closeModal;

                closeModal(modalId);

            });

        });


    document
        .querySelectorAll(".modal")
        .forEach(modal => {

            modal.addEventListener("click", event => {

                if (event.target === modal) {

                    closeModal(modal.id);

                }

            });

        });


    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            closeAllModals();

        }

    });

}


function openModal(modal) {

    if (!modal) return;

    modal.classList.add("active");

    document.body.style.overflow = "hidden";

}


function closeModal(modalId) {

    const modal =
        document.getElementById(modalId);

    if (!modal) return;

    modal.classList.remove("active");

    if (
        !document.querySelector(".modal.active")
    ) {

        document.body.style.overflow = "";

    }

}


function closeAllModals() {

    document
        .querySelectorAll(".modal.active")
        .forEach(modal => {

            modal.classList.remove("active");

        });

    document.body.style.overflow = "";

}


/* =========================================================
   07. ABRIR CRIAR SALA
   ========================================================= */

function openCreateModal() {

    closeAllModals();

    openModal(DOM.createModal);

    setTimeout(() => {

        if (DOM.createUsername) {

            DOM.createUsername.focus();

        }

    }, 250);

}


/* =========================================================
   08. ABRIR ENTRAR
   ========================================================= */

function openJoinModal() {

    closeAllModals();

    openModal(DOM.joinModal);

    setTimeout(() => {

        if (DOM.joinUsername) {

            DOM.joinUsername.focus();

        }

    }, 250);

}


/* =========================================================
   09. FORMULÁRIO — CRIAR SALA
   ========================================================= */

function setupForms() {

    if (DOM.createForm) {

        DOM.createForm.addEventListener(
            "submit",
            handleCreateRoom
        );

    }


    if (DOM.joinForm) {

        DOM.joinForm.addEventListener(
            "submit",
            handleJoinRoom
        );

    }

}


/* =========================================================
   10. CRIAR SALA
   ========================================================= */

function handleCreateRoom(event) {

    event.preventDefault();


    const username =
        sanitizeUsername(
            DOM.createUsername.value
        );


    const rounds =
        document.querySelector(
            'input[name="rounds"]:checked'
        )?.value || "3";


    const difficulty =
        DOM.difficulty.value;


    const validation =
        validateUsername(username);


    if (!validation.valid) {

        showToast(
            "error",
            "Nome inválido",
            validation.message
        );

        DOM.createUsername.focus();

        return;

    }


    const roomCode =
        generateRoomCode();


    const player = {

        id: generatePlayerId(),

        username,

        avatar: getDefaultAvatar(),

        createdAt: Date.now()

    };


    const room = {

        code: roomCode,

        hostId: player.id,

        rounds,

        difficulty,

        status: "waiting",

        players: [

            player

        ],

        createdAt: Date.now()

    };


    savePlayer(player);

    saveRoom(room);


    showToast(
        "success",
        "Sala criada!",
        `Código: ${roomCode}`
    );


    closeModal("createModal");


    /*
        POR ENQUANTO:

        Estamos salvando a sala no navegador.

        Depois vamos substituir isso por:

        Socket.IO / WebSocket

        e enviar:

        socket.emit("create-room", room);

    */


    setTimeout(() => {

        goToGame(roomCode);

    }, 700);

}


/* =========================================================
   11. ENTRAR NA SALA
   ========================================================= */

function handleJoinRoom(event) {

    event.preventDefault();


    const username =
        sanitizeUsername(
            DOM.joinUsername.value
        );


    const roomCode =
        DOM.roomCode.value
            .trim()
            .toUpperCase();


    const validation =
        validateUsername(username);


    if (!validation.valid) {

        showToast(
            "error",
            "Nome inválido",
            validation.message
        );

        DOM.joinUsername.focus();

        return;

    }


    if (!validateRoomCode(roomCode)) {

        showToast(
            "error",
            "Código inválido",
            "Digite um código de sala válido."
        );

        DOM.roomCode.focus();

        return;

    }


    const player = {

        id: generatePlayerId(),

        username,

        avatar: getDefaultAvatar(),

        createdAt: Date.now()

    };


    savePlayer(player);


    /*
        FUTURO:

        Aqui vamos consultar o servidor:

        socket.emit(
            "join-room",
            {
                code: roomCode,
                player
            }
        );

    */


    showToast(
        "info",
        "Entrando na sala...",
        `Conectando à sala ${roomCode}`
    );


    closeModal("joinModal");


    setTimeout(() => {

        goToGame(roomCode);

    }, 700);

}


/* =========================================================
   12. GERADOR DE CÓDIGO
   ========================================================= */

function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let code = "";


    for (
        let i = 0;
        i < CONFIG.roomCodeLength;
        i++
    ) {

        const random =
            Math.floor(
                Math.random() *
                characters.length
            );

        code += characters[random];

    }


    return code;

}


/* =========================================================
   13. ID DO JOGADOR
   ========================================================= */

function generatePlayerId() {

    if (
        typeof crypto !== "undefined" &&
        crypto.randomUUID
    ) {

        return crypto.randomUUID();

    }


    return (

        Date.now().toString(36) +

        Math.random()
            .toString(36)
            .substring(2, 10)

    );

}


/* =========================================================
   14. USERNAME
   ========================================================= */

function sanitizeUsername(username) {

    return username
        .replace(/[<>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(
            0,
            CONFIG.maxUsernameLength
        );

}


function validateUsername(username) {

    if (!username) {

        return {

            valid: false,

            message:
                "Digite um nome para continuar."

        };

    }


    if (username.length < 2) {

        return {

            valid: false,

            message:
                "O nome precisa ter pelo menos 2 caracteres."

        };

    }


    if (username.length >
        CONFIG.maxUsernameLength
    ) {

        return {

            valid: false,

            message:
                `O nome pode ter no máximo ${CONFIG.maxUsernameLength} caracteres.`

        };

    }


    return {

        valid: true

    };

}


/* =========================================================
   15. CÓDIGO DA SALA
   ========================================================= */

function validateRoomCode(code) {

    if (!code) {

        return false;

    }


    const regex =
        /^[A-Z0-9]{5}$/;


    return regex.test(code);

}


/* =========================================================
   16. AVATAR PADRÃO
   ========================================================= */

function getDefaultAvatar() {

    const avatars = [

        "fa-solid fa-user",

        "fa-solid fa-user-astronaut",

        "fa-solid fa-user-ninja",

        "fa-solid fa-user-secret",

        "fa-solid fa-ghost",

        "fa-solid fa-robot"

    ];


    return avatars[
        Math.floor(
            Math.random() *
            avatars.length
        )
    ];

}


/* =========================================================
   17. STORAGE — PLAYER
   ========================================================= */

function savePlayer(player) {

    try {

        localStorage.setItem(

            CONFIG.storageKeys.player,

            JSON.stringify(player)

        );

    } catch (error) {

        console.error(
            "Erro ao salvar jogador:",
            error
        );

    }

}


function getPlayer() {

    try {

        const data =
            localStorage.getItem(
                CONFIG.storageKeys.player
            );


        return data
            ? JSON.parse(data)
            : null;

    } catch (error) {

        console.error(
            "Erro ao carregar jogador:",
            error
        );

        return null;

    }

}


/* =========================================================
   18. STORAGE — ROOM
   ========================================================= */

function saveRoom(room) {

    try {

        localStorage.setItem(

            CONFIG.storageKeys.room,

            JSON.stringify(room)

        );

    } catch (error) {

        console.error(
            "Erro ao salvar sala:",
            error
        );

    }

}


function getRoom() {

    try {

        const data =
            localStorage.getItem(
                CONFIG.storageKeys.room
            );


        return data
            ? JSON.parse(data)
            : null;

    } catch (error) {

        console.error(
            "Erro ao carregar sala:",
            error
        );

        return null;

    }

}


/* =========================================================
   19. RESTAURAR JOGADOR
   ========================================================= */

function restorePlayer() {

    const player =
        getPlayer();


    if (!player) return;


    if (DOM.createUsername) {

        DOM.createUsername.value =
            player.username || "";

    }


    if (DOM.joinUsername) {

        DOM.joinUsername.value =
            player.username || "";

    }

}


/* =========================================================
   20. IR PARA O JOGO
   ========================================================= */

function goToGame(roomCode) {

    if (!roomCode) return;


    /*
        URL:

        game.html?room=ABCDE

    */


    window.location.href =
        `game.html?room=${encodeURIComponent(roomCode)}`;

}


/* =========================================================
   21. ROOM CODE INPUT
   ========================================================= */

function setupRoomCode() {

    if (!DOM.roomCode) return;


    DOM.roomCode.addEventListener(
        "input",
        event => {

            event.target.value =
                event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .substring(
                        0,
                        CONFIG.roomCodeLength
                    );

        }
    );


    DOM.roomCode.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                DOM.joinForm?.requestSubmit();

            }

        }
    );

}


/* =========================================================
   22. NAVEGAÇÃO
   ========================================================= */

function setupNavigation() {

    const navLinks =
        document.querySelectorAll(
            ".nav-link"
        );


    navLinks.forEach(link => {

        link.addEventListener(
            "click",
            () => {

                navLinks.forEach(item => {

                    item.classList.remove(
                        "active"
                    );

                });


                link.classList.add(
                    "active"
                );

            }
        );

    });


    const sections =
        document.querySelectorAll(
            "section[id]"
        );


    window.addEventListener(
        "scroll",
        () => {

            let current =
                "inicio";


            sections.forEach(section => {

                const sectionTop =
                    section.offsetTop - 150;


                if (
                    window.scrollY >=
                    sectionTop
                ) {

                    current =
                        section.id;

                }

            });


            navLinks.forEach(link => {

                link.classList.remove(
                    "active"
                );


                const target =
                    link.getAttribute(
                        "href"
                    );


                if (
                    target ===
                    `#${current}`
                ) {

                    link.classList.add(
                        "active"
                    );

                }

            });

        }
    );

}


/* =========================================================
   23. TOAST
   ========================================================= */

function showToast(
    type = "info",
    title = "Aviso",
    message = ""
) {

    if (!DOM.toastContainer) return;


    const toast =
        document.createElement("div");


    toast.className =
        `toast ${type}`;


    const icon =
        getToastIcon(type);


    toast.innerHTML = `

        <div class="toast-icon">

            <i class="${icon}"></i>

        </div>

        <div class="toast-content">

            <strong>
                ${escapeHTML(title)}
            </strong>

            <span>
                ${escapeHTML(message)}
            </span>

        </div>

    `;


    DOM.toastContainer.appendChild(
        toast
    );


    setTimeout(() => {

        toast.style.opacity = "0";

        toast.style.transform =
            "translateX(25px)";

        setTimeout(() => {

            toast.remove();

        }, 250);

    }, 3500);

}


function getToastIcon(type) {

    const icons = {

        success:
            "fa-solid fa-circle-check",

        error:
            "fa-solid fa-circle-exclamation",

        info:
            "fa-solid fa-circle-info"

    };


    return (
        icons[type] ||
        icons.info
    );

}


/* =========================================================
   24. ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");


    div.textContent =
        String(value);


    return div.innerHTML;

}


/* =========================================================
   25. TECLAS DE ATALHO
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
            ENTER

            Quando nenhum input estiver selecionado,
            abre criação de sala.
        */

        const tag =
            document.activeElement?.tagName;


        const typing =
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT";


        if (
            event.key === "Enter" &&
            !typing &&
            !document.querySelector(
                ".modal.active"
            )
        ) {

            openCreateModal();

        }


        /*
            ESC

            Fecha os modais.
        */

        if (event.key === "Escape") {

            closeAllModals();

        }

    }
);


/* =========================================================
   26. API FUTURA
   ========================================================= */

/*
    Quando criarmos o backend, podemos centralizar
    a comunicação aqui.

    Exemplo:

    async function apiRequest(endpoint, options = {}) {

        const response = await fetch(
            `/api/${endpoint}`,
            {
                ...options,

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Erro na requisição."
            );

        }


        return data;

    }

*/


/* =========================================================
   27. SOCKET.IO — FUTURO
   ========================================================= */

/*
    Depois podemos colocar:

    const socket = io();

    socket.on("connect", () => {

        console.log(
            "Conectado ao servidor:",
            socket.id
        );

    });


    socket.on("room-created", room => {

        console.log(
            "Sala criada:",
            room
        );

    });


    socket.on("room-joined", room => {

        console.log(
            "Entrou na sala:",
            room
        );

    });

*/


/* =========================================================
   28. DEBUG
   ========================================================= */

window.HANGOUT = {

    openCreateModal,

    openJoinModal,

    closeModal,

    closeAllModals,

    generateRoomCode,

    getPlayer,

    getRoom,

    savePlayer,

    saveRoom,

    showToast

};


console.log(
    "%c HANGOUT ",
    `
        background:#7c3aed;
        color:#fff;
        font-weight:900;
        padding:6px 12px;
        border-radius:6px;
    `
);

console.log(
    "Sistema inicializado com sucesso."
);