/* =========================================================
   HANGOUT — APP.JS
   Multiplayer Server
   Node.js + Express + Socket.IO
   ========================================================= */

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const { Server } = require("socket.io");




/* =========================================================
   01. CONFIGURAÇÃO
   ========================================================= */

const PORT = process.env.PORT || 3001;

const HOST = process.env.HOST || "0.0.0.0";

const MAX_PLAYERS = 8;

const ROOM_CODE_LENGTH = 5;


/* =========================================================
   02. EXPRESS
   ========================================================= */

const app = express();

const server = http.createServer(app);


app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


/* =========================================================
   03. ARQUIVOS DO FRONTEND
   ========================================================= */

app.use(
    express.static(
        path.join(__dirname)
    )
);


/* =========================================================
   04. SOCKET.IO
   ========================================================= */

const io = new Server(server, {

    cors: {
        origin: "*",
        methods: [
            "GET",
            "POST"
        ]
    }

});


/* =========================================================
   05. MEMÓRIA DAS SALAS
   ========================================================= */

/*
    Estrutura:

    rooms = {

        ABCDE: {

            code: "ABCDE",

            hostId: "...",

            status: "waiting",

            rounds: 5,

            difficulty: "normal",

            currentRound: 0,

            players: [],

            game: {}

        }

    }
*/

const rooms = new Map();


/* =========================================================
   06. PALAVRAS
   ========================================================= */

const WORDS = {

    easy: [

        {
            word: "CASA",
            hint: "Lugar onde uma pessoa mora."
        },

        {
            word: "BOLA",
            hint: "Objeto muito usado em esportes."
        },

        {
            word: "GATO",
            hint: "Animal doméstico."
        },

        {
            word: "CARRO",
            hint: "Veículo usado para transporte."
        },

        {
            word: "LIVRO",
            hint: "Objeto usado para leitura."
        },

        {
            word: "ESCOLA",
            hint: "Lugar onde estudamos."
        }

    ],


    normal: [

        {
            word: "COMPUTADOR",
            hint: "Máquina utilizada para diversas tarefas."
        },

        {
            word: "AVENTURA",
            hint: "Experiência emocionante ou inesperada."
        },

        {
            word: "MONTANHA",
            hint: "Grande elevação natural do terreno."
        },

        {
            word: "FUTEBOL",
            hint: "Esporte jogado com uma bola."
        },

        {
            word: "DESENVOLVEDOR",
            hint: "Pessoa que cria software."
        }

    ],


    hard: [

        {
            word: "PROGRAMACAO",
            hint: "Processo de criação de software."
        },

        {
            word: "CRIPTOGRAFIA",
            hint: "Técnica usada para proteger informações."
        },

        {
            word: "INTELIGENCIA",
            hint: "Capacidade relacionada ao aprendizado e raciocínio."
        },

        {
            word: "INFRAESTRUTURA",
            hint: "Base necessária para funcionamento de um sistema."
        },

        {
            word: "DESENVOLVIMENTO",
            hint: "Processo de criação e evolução de algo."
        }

    ]

};


/* =========================================================
   07. UTILIDADES
   ========================================================= */

function generateId() {

    return crypto.randomUUID();

}


function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let code = "";


    for (
        let i = 0;
        i < ROOM_CODE_LENGTH;
        i++
    ) {

        code += characters[
            Math.floor(
                Math.random() *
                characters.length
            )
        ];

    }


    return code;

}


function createUniqueRoomCode() {

    let code;


    do {

        code =
            generateRoomCode();

    } while (
        rooms.has(code)
    );


    return code;

}


function normalizeText(text) {

    return String(text || "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase();

}


function sanitizeUsername(username) {

    return String(username || "")
        .replace(/[<>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 16);

}


function getRandomWord(difficulty) {

    const list =
        WORDS[difficulty] ||
        WORDS.normal;


    return list[
        Math.floor(
            Math.random() *
            list.length
        )
    ];

}


function getPublicPlayer(player) {

    return {

        id: player.id,

        socketId: player.socketId,

        username: player.username,

        avatar: player.avatar,

        score: player.score,

        connected: player.connected

    };

}


function getPublicRoom(room) {

    return {

        code: room.code,

        hostId: room.hostId,

        status: room.status,

        rounds: room.rounds,

        difficulty: room.difficulty,

        currentRound: room.currentRound,

        maxPlayers: MAX_PLAYERS,

        players:
            room.players.map(
                getPublicPlayer
            )

    };

}


function broadcastRoom(room) {

    io.to(room.code).emit(
        "room-update",
        getPublicRoom(room)
    );

}


/* =========================================================
   08. GAME STATE
   ========================================================= */

function createGameState(room) {

    room.game = {

        word: "",

        hint: "",

        guessedLetters: [],

        wrongLetters: [],

        maxErrors: 6,

        errors: 0,

        startedAt: null,

        roundFinished: false,

        winnerId: null

    };

}


function getMaskedWord(room) {

    if (
        !room.game ||
        !room.game.word
    ) {

        return "";

    }


    return room.game.word
        .split("")
        .map(letter => {

            if (
                room.game.guessedLetters
                    .includes(letter)
            ) {

                return letter;

            }


            return "_";

        })
        .join(" ");

}


function getGameState(room) {

    return {

        word: getMaskedWord(room),

        hint: room.game?.hint || "",

        guessedLetters:
            room.game?.guessedLetters || [],

        wrongLetters:
            room.game?.wrongLetters || [],

        errors:
            room.game?.errors || 0,

        maxErrors:
            room.game?.maxErrors || 6,

        currentRound:
            room.currentRound,

        rounds:
            room.rounds,

        status:
            room.status,

        winnerId:
            room.game?.winnerId || null

    };

}


function broadcastGame(room) {

    io.to(room.code).emit(
        "game-state",
        getGameState(room)
    );

}


/* =========================================================
   09. INICIAR RODADA
   ========================================================= */

function startRound(room) {

    const selected =
        getRandomWord(
            room.difficulty
        );


    room.game = {

        word:
            normalizeText(
                selected.word
            ),

        hint:
            selected.hint,

        guessedLetters: [],

        wrongLetters: [],

        maxErrors: 6,

        errors: 0,

        startedAt: Date.now(),

        roundFinished: false,

        winnerId: null

    };


    room.status = "playing";


    room.currentRound++;


    broadcastRoom(room);

    broadcastGame(room);


    io.to(room.code).emit(
        "round-started",
        {
            round:
                room.currentRound,

            totalRounds:
                room.rounds
        }
    );

}


/* =========================================================
   10. FINALIZAR RODADA
   ========================================================= */

function finishRound(
    room,
    winnerId = null
) {

    if (
        !room.game ||
        room.game.roundFinished
    ) {

        return;

    }


    room.game.roundFinished = true;

    room.game.winnerId =
        winnerId;


    if (winnerId) {

        const winner =
            room.players.find(
                player =>
                    player.id === winnerId
            );


        if (winner) {

            winner.score += 100;

        }

    }


    room.status = "round-end";


    broadcastRoom(room);

    broadcastGame(room);


    io.to(room.code).emit(
        "round-finished",
        {

            winnerId,

            word:
                room.game.word,

            scores:
                room.players.map(
                    getPublicPlayer
                )

        }
    );


    setTimeout(() => {

        if (
            !rooms.has(room.code)
        ) {

            return;

        }


        if (
            room.currentRound >=
            Number(room.rounds)
        ) {

            finishGame(room);

            return;

        }


        startRound(room);

    }, 4000);

}


/* =========================================================
   11. FINALIZAR PARTIDA
   ========================================================= */

function finishGame(room) {

    room.status = "finished";


    const ranking =
        [...room.players]
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .map(
                getPublicPlayer
            );


    io.to(room.code).emit(
        "game-finished",
        {
            ranking
        }
    );


    broadcastRoom(room);

}


/* =========================================================
   12. SOCKET CONNECTION
   ========================================================= */

io.on(
    "connection",
    socket => {

        console.log(
            `🔌 Jogador conectado: ${socket.id}`
        );


        /* =================================================
           CRIAR SALA
        ================================================== */

        socket.on(
            "create-room",
            data => {

                try {

                    const username =
                        sanitizeUsername(
                            data?.username
                        );


                    if (!username) {

                        socket.emit(
                            "error-message",
                            "Digite um nome válido."
                        );

                        return;

                    }


                    const roomCode =
                        createUniqueRoomCode();


                    const player = {

                        id:
                            generateId(),

                        socketId:
                            socket.id,

                        username,

                        avatar:
                            data?.avatar ||
                            "fa-solid fa-user",

                        score: 0,

                        connected: true

                    };


                    const room = {

                        code:
                            roomCode,

                        hostId:
                            player.id,

                        status:
                            "waiting",

                        rounds:
                            Number(
                                data?.rounds || 3
                            ),

                        difficulty:
                            data?.difficulty ||
                            "normal",

                        currentRound: 0,

                        players: [
                            player
                        ],

                        game: null,

                        createdAt:
                            Date.now()

                    };


                    rooms.set(
                        roomCode,
                        room
                    );


                    socket.join(
                        roomCode
                    );


                    socket.data.roomCode =
                        roomCode;

                    socket.data.playerId =
                        player.id;


                    socket.emit(
                        "room-created",
                        {
                            room:
                                getPublicRoom(
                                    room
                                ),

                            player:
                                getPublicPlayer(
                                    player
                                )
                        }
                    );


                    broadcastRoom(room);


                    console.log(
                        `🏠 Sala criada: ${roomCode}`
                    );

                } catch (error) {

                    console.error(
                        "Erro ao criar sala:",
                        error
                    );

                    socket.emit(
                        "error-message",
                        "Não foi possível criar a sala."
                    );

                }

            }
        );


        /* =================================================
           ENTRAR NA SALA
        ================================================== */

        socket.on(
            "join-room",
            data => {

                try {

                    const roomCode =
                        String(
                            data?.code || ""
                        )
                            .trim()
                            .toUpperCase();


                    const username =
                        sanitizeUsername(
                            data?.username
                        );


                    if (!username) {

                        socket.emit(
                            "error-message",
                            "Digite um nome válido."
                        );

                        return;

                    }


                    if (!rooms.has(roomCode)) {

                        socket.emit(
                            "error-message",
                            "Sala não encontrada."
                        );

                        return;

                    }


                    const room =
                        rooms.get(
                            roomCode
                        );


                    if (
                        room.players.length >=
                        MAX_PLAYERS
                    ) {

                        socket.emit(
                            "error-message",
                            "A sala está cheia."
                        );

                        return;

                    }


                    if (
                        room.status !==
                        "waiting"
                    ) {

                        socket.emit(
                            "error-message",
                            "A partida já começou."
                        );

                        return;

                    }


                    const duplicated =
                        room.players.some(
                            player =>
                                player.username
                                    .toLowerCase() ===
                                username.toLowerCase()
                        );


                    if (duplicated) {

                        socket.emit(
                            "error-message",
                            "Esse nome já está sendo usado."
                        );

                        return;

                    }


                    const player = {

                        id:
                            generateId(),

                        socketId:
                            socket.id,

                        username,

                        avatar:
                            data?.avatar ||
                            "fa-solid fa-user",

                        score: 0,

                        connected: true

                    };


                    room.players.push(
                        player
                    );


                    socket.join(
                        roomCode
                    );


                    socket.data.roomCode =
                        roomCode;

                    socket.data.playerId =
                        player.id;


                    socket.emit(
                        "room-joined",
                        {
                            room:
                                getPublicRoom(
                                    room
                                ),

                            player:
                                getPublicPlayer(
                                    player
                                )
                        }
                    );


                    broadcastRoom(room);


                    console.log(
                        `👤 ${username} entrou em ${roomCode}`
                    );

                } catch (error) {

                    console.error(
                        "Erro ao entrar:",
                        error
                    );

                    socket.emit(
                        "error-message",
                        "Não foi possível entrar na sala."
                    );

                }

            }
        );


        /* =================================================
           INICIAR PARTIDA
        ================================================== */

        socket.on(
            "start-game",
            () => {

                const roomCode =
                    socket.data.roomCode;


                const playerId =
                    socket.data.playerId;


                if (!roomCode) return;


                const room =
                    rooms.get(
                        roomCode
                    );


                if (!room) return;


                if (
                    room.hostId !==
                    playerId
                ) {

                    socket.emit(
                        "error-message",
                        "Somente o host pode iniciar."
                    );

                    return;

                }


                if (
                    room.players.length < 2
                ) {

                    socket.emit(
                        "error-message",
                        "É necessário ter pelo menos 2 jogadores."
                    );

                    return;

                }


                if (
                    room.status !==
                    "waiting"
                ) {

                    return;

                }


                room.players.forEach(
                    player => {

                        player.score = 0;

                    }
                );


                room.currentRound = 0;


                startRound(room);

            }
        );


        /* =================================================
           CHUTAR LETRA
        ================================================== */

        socket.on(
            "guess-letter",
            data => {

                const roomCode =
                    socket.data.roomCode;


                const playerId =
                    socket.data.playerId;


                const room =
                    rooms.get(
                        roomCode
                    );


                if (!room) return;


                if (
                    room.status !==
                    "playing"
                ) {

                    return;

                }


                if (
                    room.game?.roundFinished
                ) {

                    return;

                }


                let letter =
                    normalizeText(
                        data?.letter
                    );


                if (
                    letter.length !== 1 ||
                    !/[A-Z]/.test(letter)
                ) {

                    return;

                }


                if (
                    room.game.guessedLetters
                        .includes(letter) ||

                    room.game.wrongLetters
                        .includes(letter)
                ) {

                    return;

                }


                if (
                    room.game.word
                        .includes(letter)
                ) {

                    room.game.guessedLetters
                        .push(letter);


                    const complete =
                        room.game.word
                            .split("")
                            .every(
                                char =>
                                    room.game
                                        .guessedLetters
                                        .includes(char)
                            );


                    if (complete) {

                        finishRound(
                            room,
                            playerId
                        );

                        return;

                    }

                } else {

                    room.game.wrongLetters
                        .push(letter);

                    room.game.errors++;


                    if (
                        room.game.errors >=
                        room.game.maxErrors
                    ) {

                        finishRound(
                            room,
                            null
                        );

                        return;

                    }

                }


                broadcastGame(room);

            }
        );


        /* =================================================
           CHAT
        ================================================== */

        socket.on(
            "send-message",
            data => {

                const roomCode =
                    socket.data.roomCode;


                const playerId =
                    socket.data.playerId;


                const room =
                    rooms.get(
                        roomCode
                    );


                if (!room) return;


                const player =
                    room.players.find(
                        item =>
                            item.id ===
                            playerId
                    );


                if (!player) return;


                let message =
                    String(
                        data?.message || ""
                    )
                        .trim()
                        .substring(
                            0,
                            250
                        );


                if (!message) return;


                io.to(roomCode).emit(
                    "chat-message",
                    {

                        id:
                            generateId(),

                        playerId:
                            player.id,

                        username:
                            player.username,

                        message,

                        timestamp:
                            Date.now()

                    }
                );

            }
        );


        /* =================================================
           SAIR DA SALA
        ================================================== */

        socket.on(
            "leave-room",
            () => {

                removePlayerFromRoom(
                    socket
                );

            }
        );


        /* =================================================
           DISCONNECT
        ================================================== */

        socket.on(
            "disconnect",
            () => {

                console.log(
                    `🔴 Jogador desconectado: ${socket.id}`
                );


                removePlayerFromRoom(
                    socket
                );

            }
        );

    }
);


/* =========================================================
   13. REMOVER JOGADOR
   ========================================================= */

function removePlayerFromRoom(socket) {

    const roomCode =
        socket.data.roomCode;


    const playerId =
        socket.data.playerId;


    if (!roomCode || !playerId) {

        return;

    }


    const room =
        rooms.get(
            roomCode
        );


    if (!room) return;


    const playerIndex =
        room.players.findIndex(
            player =>
                player.id ===
                playerId
        );


    if (playerIndex === -1) {

        return;

    }


    const player =
        room.players[playerIndex];


    room.players.splice(
        playerIndex,
        1
    );


    socket.leave(
        roomCode
    );


    io.to(roomCode).emit(
        "player-left",
        {
            playerId,

            username:
                player.username
        }
    );


    /*
        Se o host saiu,
        passa o host para outro jogador.
    */

    if (
        room.hostId ===
        playerId
    ) {

        if (room.players.length > 0) {

            room.hostId =
                room.players[0].id;


            io.to(roomCode).emit(
                "new-host",
                {
                    hostId:
                        room.hostId
                }
            );

        }

    }


    /*
        Se não sobrou ninguém,
        apaga a sala.
    */

    if (
        room.players.length === 0
    ) {

        rooms.delete(
            roomCode
        );


        console.log(
            `🗑️ Sala removida: ${roomCode}`
        );


        return;

    }


    broadcastRoom(room);

}


/* =========================================================
   14. API — STATUS
   ========================================================= */

app.get(
    "/api/status",
    (req, res) => {

        res.json({

            online: true,

            server:
                "HANGOUT",

            rooms:
                rooms.size,

            players:
                [...rooms.values()]
                    .reduce(
                        (
                            total,
                            room
                        ) =>
                            total +
                            room.players.length,
                        0
                    ),

            uptime:
                process.uptime(),

            timestamp:
                Date.now()

        });

    }
);


/* =========================================================
   15. API — SALA
   ========================================================= */

app.get(
    "/api/rooms/:code",
    (req, res) => {

        const code =
            String(
                req.params.code || ""
            )
                .trim()
                .toUpperCase();


        const room =
            rooms.get(code);


        if (!room) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Sala não encontrada."

                });

        }


        return res.json({

            success: true,

            room:
                getPublicRoom(room)

        });

    }
);


/* =========================================================
   16. API — HOME
   ========================================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );

    }
);


/* =========================================================
   17. ERROR HANDLER
   ========================================================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "SERVER ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Erro interno do servidor."

        });

    }
);


/* =========================================================
   18. START SERVER
   ========================================================= */

server.listen(
    PORT,
    HOST,
    () => {

        console.clear();


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "          HANGOUT SERVER"
        );

        console.log(
            "========================================"
        );

        console.log("");

        console.log(
            `🚀 Porta: ${PORT}`
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            `🎮 Máximo por sala: ${MAX_PLAYERS}`
        );

        console.log(
            "🔌 Socket.IO: ONLINE"
        );

        console.log("");

        console.log(
            "========================================"
        );

        console.log("");

    }
);


/* =========================================================
   19. PROCESS
   ========================================================= */

process.on(
    "SIGINT",
    () => {

        console.log(
            "\n🛑 Encerrando HANGOUT..."
        );


        server.close(
            () => {

                console.log(
                    "Servidor encerrado."
                );

                process.exit(0);

            }
        );

    }
);


/* =========================================================
   20. EXPORT
   ========================================================= */

module.exports = {

    app,

    server,

    io,

    rooms

};