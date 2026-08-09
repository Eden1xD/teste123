/* =========================================================
   HANGOUT — PROFILE.JS
   Perfil do jogador
   ========================================================= */


/* =========================================================
   01. CONFIGURAÇÃO
========================================================= */

const PROFILE_CONFIG = {

    storageKey:
        "hangout_player",

    statsKey:
        "hangout_stats",

    maxUsernameLength:
        20,

    minUsernameLength:
        3

};


/* =========================================================
   02. ESTADO
========================================================= */

const PROFILE = {

    player: null,

    stats: {

        games:
            0,

        wins:
            0,

        losses:
            0,

        draws:
            0,

        xp:
            0,

        level:
            1,

        bestStreak:
            0,

        currentStreak:
            0

    },

    initialized:
        false

};


/* =========================================================
   03. DOM
========================================================= */

const PROFILE_DOM = {

    avatar:
        document.getElementById(
            "profileAvatar"
        ),

    avatarIcon:
        document.getElementById(
            "profileAvatarIcon"
        ),

    username:
        document.getElementById(
            "profileUsername"
        ),

    usernameInput:
        document.getElementById(
            "usernameInput"
        ),

    editUsername:
        document.getElementById(
            "editUsername"
        ),

    saveProfile:
        document.getElementById(
            "saveProfile"
        ),

    cancelEdit:
        document.getElementById(
            "cancelEdit"
        ),

    editPanel:
        document.getElementById(
            "profileEdit"
        ),

    level:
        document.getElementById(
            "profileLevel"
        ),

    xp:
        document.getElementById(
            "profileXP"
        ),

    xpCurrent:
        document.getElementById(
            "xpCurrent"
        ),

    xpNext:
        document.getElementById(
            "xpNext"
        ),

    xpBar:
        document.getElementById(
            "xpProgress"
        ),

    games:
        document.getElementById(
            "gamesPlayed"
        ),

    wins:
        document.getElementById(
            "gamesWon"
        ),

    losses:
        document.getElementById(
            "gamesLost"
        ),

    draws:
        document.getElementById(
            "gamesDraw"
        ),

    winRate:
        document.getElementById(
            "winRate"
        ),

    streak:
        document.getElementById(
            "currentStreak"
        ),

    bestStreak:
        document.getElementById(
            "bestStreak"
        ),

    avatarGrid:
        document.getElementById(
            "avatarGrid"
        ),

    logout:
        document.getElementById(
            "logoutButton"
        ),

    back:
        document.getElementById(
            "backButton"
        ),

    toast:
        document.getElementById(
            "toastContainer"
        )

};


/* =========================================================
   04. AVATARES
========================================================= */

const AVATARS = [

    "fa-solid fa-user",

    "fa-solid fa-user-astronaut",

    "fa-solid fa-user-ninja",

    "fa-solid fa-user-secret",

    "fa-solid fa-user-tie",

    "fa-solid fa-ghost",

    "fa-solid fa-skull",

    "fa-solid fa-dragon",

    "fa-solid fa-gamepad",

    "fa-solid fa-robot",

    "fa-solid fa-crown",

    "fa-solid fa-bolt"

];


/* =========================================================
   05. INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeProfile();

    }
);


function initializeProfile() {

    if (
        PROFILE.initialized
    ) {

        return;

    }


    PROFILE.initialized =
        true;


    console.log(
        "%c HANGOUT PROFILE ",
        `
            background:#7c3aed;
            color:white;
            padding:6px 12px;
            border-radius:6px;
            font-weight:900;
        `
    );


    loadPlayer();

    loadStats();

    setupEvents();

    renderProfile();

    renderStats();

    renderAvatars();

}


/* =========================================================
   06. CARREGAR PLAYER
========================================================= */

function loadPlayer() {

    try {

        const saved =
            localStorage.getItem(
                PROFILE_CONFIG.storageKey
            );


        if (!saved) {

            PROFILE.player = {

                username:
                    "Jogador",

                avatar:
                    AVATARS[0],

                id:
                    generatePlayerId()

            };


            savePlayer();

            return;

        }


        PROFILE.player =
            JSON.parse(
                saved
            );


        if (
            !PROFILE.player.id
        ) {

            PROFILE.player.id =
                generatePlayerId();

        }


        if (
            !PROFILE.player.username
        ) {

            PROFILE.player.username =
                "Jogador";

        }


        if (
            !PROFILE.player.avatar
        ) {

            PROFILE.player.avatar =
                AVATARS[0];

        }


        savePlayer();

    } catch (error) {

        console.error(
            "Erro ao carregar perfil:",
            error
        );


        PROFILE.player = {

            username:
                "Jogador",

            avatar:
                AVATARS[0],

            id:
                generatePlayerId()

        };


        savePlayer();

    }

}


/* =========================================================
   07. CARREGAR ESTATÍSTICAS
========================================================= */

function loadStats() {

    try {

        const saved =
            localStorage.getItem(
                PROFILE_CONFIG.statsKey
            );


        if (!saved) {

            saveStats();

            return;

        }


        const stats =
            JSON.parse(
                saved
            );


        PROFILE.stats = {

            ...PROFILE.stats,

            ...stats

        };


        PROFILE.stats.level =
            calculateLevel(
                PROFILE.stats.xp
            );

    } catch (error) {

        console.error(
            "Erro ao carregar estatísticas:",
            error
        );

    }

}


/* =========================================================
   08. SALVAR PLAYER
========================================================= */

function savePlayer() {

    try {

        localStorage.setItem(

            PROFILE_CONFIG.storageKey,

            JSON.stringify(
                PROFILE.player
            )

        );

    } catch (error) {

        console.error(
            "Erro ao salvar jogador:",
            error
        );

    }

}


/* =========================================================
   09. SALVAR STATS
========================================================= */

function saveStats() {

    try {

        localStorage.setItem(

            PROFILE_CONFIG.statsKey,

            JSON.stringify(
                PROFILE.stats
            )

        );

    } catch (error) {

        console.error(
            "Erro ao salvar estatísticas:",
            error
        );

    }

}


/* =========================================================
   10. EVENTOS
========================================================= */

function setupEvents() {


    /* =====================================================
       EDITAR
    ====================================================== */

    if (
        PROFILE_DOM.editUsername
    ) {

        PROFILE_DOM.editUsername.addEventListener(
            "click",
            openEditProfile
        );

    }


    /* =====================================================
       SALVAR
    ====================================================== */

    if (
        PROFILE_DOM.saveProfile
    ) {

        PROFILE_DOM.saveProfile.addEventListener(
            "click",
            saveProfile
        );

    }


    /* =====================================================
       CANCELAR
    ====================================================== */

    if (
        PROFILE_DOM.cancelEdit
    ) {

        PROFILE_DOM.cancelEdit.addEventListener(
            "click",
            closeEditProfile
        );

    }


    /* =====================================================
       ENTER
    ====================================================== */

    if (
        PROFILE_DOM.usernameInput
    ) {

        PROFILE_DOM.usernameInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    saveProfile();

                }


                if (
                    event.key ===
                    "Escape"
                ) {

                    closeEditProfile();

                }

            }
        );

    }


    /* =====================================================
       LOGOUT
    ====================================================== */

    if (
        PROFILE_DOM.logout
    ) {

        PROFILE_DOM.logout.addEventListener(
            "click",
            logout
        );

    }


    /* =====================================================
       BACK
    ====================================================== */

    if (
        PROFILE_DOM.back
    ) {

        PROFILE_DOM.back.addEventListener(
            "click",
            () => {

                window.history.back();

            }
        );

    }


    /* =====================================================
       AVATARES
    ====================================================== */

    if (
        PROFILE_DOM.avatarGrid
    ) {

        PROFILE_DOM.avatarGrid.addEventListener(
            "click",
            handleAvatarSelection
        );

    }

}


/* =========================================================
   11. RENDER PERFIL
========================================================= */

function renderProfile() {

    if (
        !PROFILE.player
    ) {

        return;

    }


    setText(
        PROFILE_DOM.username,
        PROFILE.player.username
    );


    setText(
        PROFILE_DOM.usernameInput,
        PROFILE.player.username
    );


    renderAvatar(
        PROFILE.player.avatar
    );

}


/* =========================================================
   12. AVATAR
========================================================= */

function renderAvatar(
    avatar
) {

    if (
        PROFILE_DOM.avatarIcon
    ) {

        PROFILE_DOM.avatarIcon.className =
            avatar ||
            AVATARS[0];

    }


    if (
        PROFILE_DOM.avatar
    ) {

        PROFILE_DOM.avatar.dataset.avatar =
            avatar ||
            AVATARS[0];

    }

}


/* =========================================================
   13. RENDER AVATARES
========================================================= */

function renderAvatars() {

    if (
        !PROFILE_DOM.avatarGrid
    ) {

        return;

    }


    PROFILE_DOM.avatarGrid.innerHTML =
        "";


    AVATARS.forEach(
        avatar => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "avatar-option";


            button.dataset.avatar =
                avatar;


            if (
                PROFILE.player.avatar ===
                avatar
            ) {

                button.classList.add(
                    "selected"
                );

            }


            button.innerHTML = `

                <i class="${avatar}"></i>

            `;


            PROFILE_DOM.avatarGrid.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   14. ESCOLHER AVATAR
========================================================= */

function handleAvatarSelection(
    event
) {

    const button =
        event.target.closest(
            ".avatar-option"
        );


    if (!button) {

        return;

    }


    const avatar =
        button.dataset.avatar;


    if (!avatar) {

        return;

    }


    PROFILE.player.avatar =
        avatar;


    renderAvatar(
        avatar
    );


    PROFILE_DOM.avatarGrid
        .querySelectorAll(
            ".avatar-option"
        )
        .forEach(
            option => {

                option.classList.toggle(
                    "selected",
                    option === button
                );

            }
        );


    savePlayer();


    notify(
        "success",
        "Avatar atualizado",
        "Seu novo avatar foi selecionado."
    );

}


/* =========================================================
   15. ABRIR EDIÇÃO
========================================================= */

function openEditProfile() {

    if (
        !PROFILE_DOM.editPanel
    ) {

        return;

    }


    if (
        PROFILE_DOM.usernameInput
    ) {

        PROFILE_DOM.usernameInput.value =
            PROFILE.player.username;

        PROFILE_DOM.usernameInput.focus();

        PROFILE_DOM.usernameInput.select();

    }


    PROFILE_DOM.editPanel.classList.add(
        "active"
    );

}


/* =========================================================
   16. FECHAR EDIÇÃO
========================================================= */

function closeEditProfile() {

    if (
        !PROFILE_DOM.editPanel
    ) {

        return;

    }


    PROFILE_DOM.editPanel.classList.remove(
        "active"
    );

}


/* =========================================================
   17. SALVAR PERFIL
========================================================= */

function saveProfile() {

    if (
        !PROFILE_DOM.usernameInput
    ) {

        return;

    }


    const username =
        PROFILE_DOM.usernameInput.value
            .trim();


    /* =====================================================
       VALIDAÇÃO
    ====================================================== */

    if (
        username.length <
        PROFILE_CONFIG.minUsernameLength
    ) {

        notify(
            "error",
            "Nome muito curto",
            `Use pelo menos ${PROFILE_CONFIG.minUsernameLength} caracteres.`
        );

        return;

    }


    if (
        username.length >
        PROFILE_CONFIG.maxUsernameLength
    ) {

        notify(
            "error",
            "Nome muito longo",
            `Use no máximo ${PROFILE_CONFIG.maxUsernameLength} caracteres.`
        );

        return;

    }


    if (
        !/^[a-zA-ZÀ-ÿ0-9 _-]+$/.test(
            username
        )
    ) {

        notify(
            "error",
            "Nome inválido",
            "Use apenas letras, números, espaço, _ ou -."
        );

        return;

    }


    PROFILE.player.username =
        username;


    savePlayer();

    renderProfile();

    closeEditProfile();


    notify(
        "success",
        "Perfil atualizado",
        "Seu nome foi alterado com sucesso."
    );

}


/* =========================================================
   18. ESTATÍSTICAS
========================================================= */

function renderStats() {

    const stats =
        PROFILE.stats;


    setText(
        PROFILE_DOM.games,
        stats.games
    );


    setText(
        PROFILE_DOM.wins,
        stats.wins
    );


    setText(
        PROFILE_DOM.losses,
        stats.losses
    );


    setText(
        PROFILE_DOM.draws,
        stats.draws
    );


    setText(
        PROFILE_DOM.xp,
        `${stats.xp} XP`
    );


    setText(
        PROFILE_DOM.level,
        `Nível ${stats.level}`
    );


    setText(
        PROFILE_DOM.streak,
        stats.currentStreak
    );


    setText(
        PROFILE_DOM.bestStreak,
        stats.bestStreak
    );


    const rate =
        calculateWinRate(
            stats
        );


    setText(
        PROFILE_DOM.winRate,
        `${rate}%`
    );


    updateXPBar();

}


/* =========================================================
   19. WIN RATE
========================================================= */

function calculateWinRate(
    stats
) {

    if (
        !stats.games ||
        stats.games <= 0
    ) {

        return 0;

    }


    return Math.round(

        (
            stats.wins /
            stats.games
        ) * 100

    );

}


/* =========================================================
   20. LEVEL
========================================================= */

function calculateLevel(
    xp
) {

    const safeXP =
        Math.max(
            0,
            Number(xp) || 0
        );


    return Math.floor(
        safeXP / 1000
    ) + 1;

}


/* =========================================================
   21. XP
========================================================= */

function getLevelXP(
    level
) {

    return (
        (level - 1) *
        1000
    );

}


function getNextLevelXP(
    level
) {

    return (
        level *
        1000
    );

}


/* =========================================================
   22. XP BAR
========================================================= */

function updateXPBar() {

    const level =
        PROFILE.stats.level;


    const xp =
        PROFILE.stats.xp;


    const currentLevelXP =
        getLevelXP(
            level
        );


    const nextLevelXP =
        getNextLevelXP(
            level
        );


    const currentXP =
        Math.max(
            0,
            xp -
            currentLevelXP
        );


    const requiredXP =
        nextLevelXP -
        currentLevelXP;


    const percentage =
        Math.min(
            100,
            Math.max(
                0,
                (
                    currentXP /
                    requiredXP
                ) * 100
            )
        );


    setText(
        PROFILE_DOM.xpCurrent,
        `${currentXP} XP`
    );


    setText(
        PROFILE_DOM.xpNext,
        `${requiredXP} XP`
    );


    if (
        PROFILE_DOM.xpBar
    ) {

        PROFILE_DOM.xpBar.style.width =
            `${percentage}%`;

    }

}


/* =========================================================
   23. ADICIONAR XP
========================================================= */

function addXP(
    amount
) {

    amount =
        Number(amount) || 0;


    if (
        amount <= 0
    ) {

        return;

    }


    const oldLevel =
        PROFILE.stats.level;


    PROFILE.stats.xp +=
        amount;


    PROFILE.stats.level =
        calculateLevel(
            PROFILE.stats.xp
        );


    saveStats();

    renderStats();


    if (
        PROFILE.stats.level >
        oldLevel
    ) {

        notify(
            "success",
            "LEVEL UP!",
            `Você chegou ao nível ${PROFILE.stats.level}.`
        );

    } else {

        notify(
            "success",
            `+${amount} XP`,
            "Experiência adicionada ao seu perfil."
        );

    }

}


/* =========================================================
   24. REGISTRAR PARTIDA
========================================================= */

function registerGame(
    result
) {

    if (
        ![
            "win",
            "loss",
            "draw"
        ].includes(
            result
        )
    ) {

        return;

    }


    PROFILE.stats.games++;


    if (
        result ===
        "win"
    ) {

        PROFILE.stats.wins++;

        PROFILE.stats.currentStreak++;

        if (
            PROFILE.stats.currentStreak >
            PROFILE.stats.bestStreak
        ) {

            PROFILE.stats.bestStreak =
                PROFILE.stats.currentStreak;

        }


        addXP(
            250
        );

    }


    if (
        result ===
        "loss"
    ) {

        PROFILE.stats.losses++;

        PROFILE.stats.currentStreak =
            0;


        addXP(
            50
        );

    }


    if (
        result ===
        "draw"
    ) {

        PROFILE.stats.draws++;

        addXP(
            100
        );

    }


    saveStats();

    renderStats();

}


/* =========================================================
   25. LOGOUT
========================================================= */

function logout() {

    const confirmLogout =
        window.confirm(
            "Deseja realmente sair da sua conta?"
        );


    if (!confirmLogout) {

        return;

    }


    localStorage.removeItem(
        PROFILE_CONFIG.storageKey
    );


    localStorage.removeItem(
        PROFILE_CONFIG.statsKey
    );


    notify(
        "success",
        "Até mais!",
        "Seu perfil foi desconectado."
    );


    setTimeout(
        () => {

            window.location.href =
                "index.html";

        },
        700
    );

}


/* =========================================================
   26. GERAR ID
========================================================= */

function generatePlayerId() {

    return (

        "player_" +

        Date.now().toString(36) +

        "_" +

        Math.random()
            .toString(36)
            .substring(
                2,
                9
            )

    );

}


/* =========================================================
   27. TOAST
========================================================= */

function notify(
    type = "info",
    title = "Aviso",
    message = ""
) {

    if (
        !PROFILE_DOM.toast
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


    PROFILE_DOM.toast.appendChild(
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


/* =========================================================
   28. REMOVER TOAST
========================================================= */

function removeToast(
    toast
) {

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
   29. SET TEXT
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


/* =========================================================
   30. ESCAPE HTML
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
   31. API GLOBAL
========================================================= */

window.HANGOUT_PROFILE = {

    state:
        PROFILE,

    addXP,

    registerGame,

    savePlayer,

    saveStats,

    renderProfile,

    renderStats,

    notify

};


/* =========================================================
   32. FINAL
========================================================= */

console.log(
    "👤 HANGOUT Profile.js carregado."
);