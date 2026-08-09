// ============================================================
// HANGOUT — FORCA MULTIPLAYER
// SERVER.JS
// ============================================================

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// ============================================================
// ARQUIVOS DO FRONTEND
// ============================================================

app.use(express.static(__dirname));


// ============================================================
// ROTA PRINCIPAL
// ============================================================

app.get('/', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'index.html')
    );

});


// ============================================================
// ROTA GAME
// ============================================================

app.get('/game', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'game.html')
    );

});


// ============================================================
// ROTA PROFILE
// ============================================================

app.get('/profile', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'profile.html')
    );

});


// ============================================================
// ROTA RANKING
// ============================================================

app.get('/ranking', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'ranking.html')
    );

});


// ============================================================
// STATUS DA API
// ============================================================

app.get('/api/status', (req, res) => {

    res.json({
        online: true,
        server: 'Hangout',
        game: 'Forca Multiplayer',
        players: io.engine.clientsCount,
        uptime: process.uptime()
    });

});


// ============================================================
// SALAS
// ============================================================

const rooms = new Map();


// ============================================================
// PALAVRAS
// ============================================================

const words = [

    {
        word: 'COMPUTADOR',
        category: 'TECNOLOGIA'
    },

    {
        word: 'JAVASCRIPT',
        category: 'PROGRAMAÇÃO'
    },

    {
        word: 'INTERNET',
        category: 'TECNOLOGIA'
    },

    {
        word: 'FUTEBOL',
        category: 'ESPORTES'
    },

    {
        word: 'CAMPEONATO',
        category: 'ESPORTES'
    },

    {
        word: 'PIZZA',
        category: 'COMIDA'
    },

    {
        word: 'HAMBURGUER',
        category: 'COMIDA'
    },

    {
        word: 'BRASIL',
        category: 'PAÍSES'
    },

    {
        word: 'MONTANHA',
        category: 'NATUREZA'
    },

    {
        word: 'ELEFANTE',
        category: 'ANIMAIS'
    },

    {
        word: 'CACHORRO',
        category: 'ANIMAIS'
    },

    {
        word: 'GUITARRA',
        category: 'MÚSICA'
    },

    {
        word: 'TECLADO',
        category: 'TECNOLOGIA'
    },

    {
        word: 'CELULAR',
        category: 'TECNOLOGIA'
    },

    {
        word: 'ESCOLA',
        category: 'LUGARES'
    }

];


// ============================================================
// GERAR CÓDIGO DA SALA
// ============================================================

function generateRoomCode() {

    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    let code = '';

    do {

        code = '';

        for (let i = 0; i < 5; i++) {

            code += characters[
                Math.floor(
                    Math.random() * characters.length
                )
            ];

        }

    } while (rooms.has(code));

    return code;

}


// ============================================================
// NOVA PALAVRA
// ============================================================

function getRandomWord() {

    return words[
        Math.floor(
            Math.random() * words.length
        )
    ];

}


// ============================================================
// CRIAR SALA
// ============================================================

function createRoom(socket, username) {

    const code = generateRoomCode();

    const selectedWord = getRandomWord();

    const room = {

        code,

        host: socket.id,

        players: [],

        word: selectedWord.word,

        category: selectedWord.category,

        guessedLetters: [],

        mistakes: 0,

        maxMistakes: 6,

        round: 1,

        currentTurn: 0,

        started: false,

        timer: 60,

        chat: []

    };


    const player = {

        id: socket.id,

        username: username || 'Jogador',

        score: 0,

        level: 1,

        connected: true

    };


    room.players.push(player);

    rooms.set(code, room);

    socket.join(code);

    socket.roomCode = code;

    socket.username = player.username;


    return room;

}


// ============================================================
// ENTRAR NA SALA
// ============================================================

function joinRoom(socket, code, username) {

    const room = rooms.get(
        String(code).toUpperCase()
    );

    if (!room) {

        return {
            success: false,
            message: 'Sala não encontrada.'
        };

    }


    if (room.players.length >= 8) {

        return {
            success: false,
            message: 'A sala está cheia.'
        };

    }


    const player = {

        id: socket.id,

        username: username || 'Jogador',

        score: 0,

        level: 1,

        connected: true

    };


    room.players.push(player);

    socket.join(room.code);

    socket.roomCode = room.code;

    socket.username = player.username;


    return {
        success: true,
        room
    };

}


// ============================================================
// ESTADO DA PALAVRA
// ============================================================

function getWordDisplay(room) {

    return room.word
        .split('')
        .map(letter => {

            if (
                room.guessedLetters.includes(
                    letter.toUpperCase()
                )
            ) {

                return letter;

            }

            return '_';

        });

}


// ============================================================
// VERIFICAR VITÓRIA
// ============================================================

function hasWon(room) {

    return room.word
        .toUpperCase()
        .split('')
        .every(letter =>
            room.guessedLetters.includes(letter)
        );

}


// ============================================================
// DADOS PÚBLICOS DA SALA
// ============================================================

function getPublicRoom(room) {

    return {

        code: room.code,

        players: room.players.map(player => ({

            id: player.id,

            username: player.username,

            score: player.score,

            level: player.level,

            connected: player.connected

        })),

        word: getWordDisplay(room),

        category: room.category,

        mistakes: room.mistakes,

        maxMistakes: room.maxMistakes,

        guessedLetters: room.guessedLetters,

        round: room.round,

        currentTurn:
            room.players[room.currentTurn]?.id || null,

        timer: room.timer,

        started: room.started

    };

}


// ============================================================
// SOCKET.IO
// ============================================================

io.on('connection', socket => {

    console.log(
        `🟢 Jogador conectado: ${socket.id}`
    );


    // ========================================================
    // CRIAR SALA
    // ========================================================

    socket.on('createRoom', data => {

        const username =
            data?.username || 'Jogador';


        const room = createRoom(
            socket,
            username
        );


        socket.emit(
            'roomCreated',
            getPublicRoom(room)
        );


        io.to(room.code).emit(
            'roomUpdate',
            getPublicRoom(room)
        );


        console.log(
            `🏠 Sala criada: ${room.code}`
        );

    });


    // ========================================================
    // ENTRAR NA SALA
    // ========================================================

    socket.on('joinRoom', data => {

        const username =
            data?.username || 'Jogador';

        const code =
            data?.code || '';


        const result = joinRoom(
            socket,
            code,
            username
        );


        if (!result.success) {

            socket.emit(
                'roomError',
                result.message
            );

            return;

        }


        const room = result.room;


        socket.emit(
            'roomJoined',
            getPublicRoom(room)
        );


        io.to(room.code).emit(
            'roomUpdate',
            getPublicRoom(room)
        );


        io.to(room.code).emit(
            'systemMessage',
            `${username} entrou na sala.`
        );


        console.log(
            `👤 ${username} entrou em ${room.code}`
        );

    });


    // ========================================================
    // INICIAR JOGO
    // ========================================================

    socket.on('startGame', () => {

        const room = rooms.get(
            socket.roomCode
        );

        if (!room) return;

        if (room.host !== socket.id) {

            socket.emit(
                'roomError',
                'Somente o dono da sala pode iniciar.'
            );

            return;

        }


        room.started = true;

        room.timer = 60;

        room.currentTurn = 0;


        io.to(room.code).emit(
            'gameStarted',
            getPublicRoom(room)
        );

    });


    // ========================================================
    // ESCOLHER LETRA
    // ========================================================

    socket.on('guessLetter', letter => {

        const room = rooms.get(
            socket.roomCode
        );

        if (!room) return;

        if (!room.started) return;


        letter = String(letter)
            .trim()
            .toUpperCase();


        if (!/^[A-ZÀ-Ú]$/i.test(letter)) {

            return;

        }


        if (
            room.guessedLetters.includes(letter)
        ) {

            return;

        }


        room.guessedLetters.push(letter);


        // ====================================================
        // LETRA ERRADA
        // ====================================================

        if (
            !room.word
                .toUpperCase()
                .includes(letter)
        ) {

            room.mistakes++;

        }


        // ====================================================
        // JOGADOR
        // ====================================================

        const player = room.players.find(
            p => p.id === socket.id
        );


        if (player) {

            if (
                room.word
                    .toUpperCase()
                    .includes(letter)
            ) {

                player.score += 10;

            } else {

                player.score = Math.max(
                    0,
                    player.score - 2
                );

            }

        }


        // ====================================================
        // VITÓRIA
        // ====================================================

        if (hasWon(room)) {

            room.started = false;


            if (player) {

                player.score += 50;

            }


            io.to(room.code).emit(
                'gameResult',
                {

                    winner: true,

                    word: room.word,

                    player:
                        player?.username || 'Jogador',

                    points: 50,

                    xp: 25,

                    room: getPublicRoom(room)

                }
            );


            return;

        }


        // ====================================================
        // DERROTA
        // ====================================================

        if (
            room.mistakes >= room.maxMistakes
        ) {

            room.started = false;


            io.to(room.code).emit(
                'gameResult',
                {

                    winner: false,

                    word: room.word,

                    player:
                        player?.username || 'Jogador',

                    points: 0,

                    xp: 5,

                    room: getPublicRoom(room)

                }
            );


            return;

        }


        // ====================================================
        // ATUALIZAR JOGO
        // ====================================================

        io.to(room.code).emit(
            'gameUpdate',
            getPublicRoom(room)
        );

    });


    // ========================================================
    // PRÓXIMA RODADA
    // ========================================================

    socket.on('nextRound', () => {

        const room = rooms.get(
            socket.roomCode
        );

        if (!room) return;


        const selectedWord =
            getRandomWord();


        room.word =
            selectedWord.word;

        room.category =
            selectedWord.category;

        room.guessedLetters = [];

        room.mistakes = 0;

        room.timer = 60;

        room.round++;

        room.started = true;


        room.currentTurn = 0;


        io.to(room.code).emit(
            'nextRound',
            getPublicRoom(room)
        );

    });


    // ========================================================
    // CHAT
    // ========================================================

    socket.on('chatMessage', message => {

        const room = rooms.get(
            socket.roomCode
        );

        if (!room) return;


        message = String(message || '')
            .trim();


        if (!message) return;


        if (message.length > 250) {

            message =
                message.substring(0, 250);

        }


        const player = room.players.find(
            p => p.id === socket.id
        );


        const chatMessage = {

            id: Date.now(),

            username:
                player?.username || 'Jogador',

            message,

            system: false,

            timestamp: Date.now()

        };


        room.chat.push(
            chatMessage
        );


        io.to(room.code).emit(
            'chatMessage',
            chatMessage
        );

    });


    // ========================================================
    // SAIR DA SALA
    // ========================================================

    socket.on('leaveRoom', () => {

        leaveRoom(socket);

    });


    // ========================================================
    // DESCONECTAR
    // ========================================================

    socket.on('disconnect', () => {

        console.log(
            `🔴 Jogador desconectado: ${socket.id}`
        );


        leaveRoom(socket);

    });

});


// ============================================================
// SAIR DA SALA
// ============================================================

function leaveRoom(socket) {

    const code = socket.roomCode;

    if (!code) return;


    const room = rooms.get(code);

    if (!room) return;


    const player =
        room.players.find(
            p => p.id === socket.id
        );


    room.players =
        room.players.filter(
            p => p.id !== socket.id
        );


    socket.leave(code);


    if (room.players.length === 0) {

        rooms.delete(code);

        console.log(
            `🗑️ Sala removida: ${code}`
        );

        return;

    }


    // ========================================================
    // TROCAR HOST
    // ========================================================

    if (room.host === socket.id) {

        room.host =
            room.players[0].id;

    }


    // ========================================================
    // CORRIGIR TURNO
    // ========================================================

    if (
        room.currentTurn >=
        room.players.length
    ) {

        room.currentTurn = 0;

    }


    io.to(code).emit(
        'roomUpdate',
        getPublicRoom(room)
    );


    if (player) {

        io.to(code).emit(
            'systemMessage',
            `${player.username} saiu da sala.`
        );

    }


    socket.roomCode = null;

}


// ============================================================
// TIMER GLOBAL
// ============================================================

setInterval(() => {

    rooms.forEach(room => {

        if (!room.started) return;


        room.timer--;


        if (room.timer <= 0) {

            room.timer = 60;

            room.currentTurn++;


            if (
                room.currentTurn >=
                room.players.length
            ) {

                room.currentTurn = 0;

            }


            io.to(room.code).emit(
                'turnChanged',
                getPublicRoom(room)
            );

        } else {

            io.to(room.code).emit(
                'timerUpdate',
                room.timer
            );

        }

    });

}, 1000);


// ============================================================
// ERROS
// ============================================================

process.on('uncaughtException', error => {

    console.error(
        '❌ Erro não tratado:',
        error
    );

});


process.on('unhandledRejection', error => {

    console.error(
        '❌ Promise rejeitada:',
        error
    );

});


// ============================================================
// INICIAR SERVIDOR
// ============================================================

server.listen(PORT, () => {

    console.clear();

    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║          HANGOUT — FORCA             ║');
    console.log('║          MULTIPLAYER SERVER           ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║ 🌐 http://localhost:${PORT}             ║`);
    console.log('║ 🟢 STATUS: ONLINE                    ║');
    console.log('║ 🎮 SOCKET.IO: ATIVO                  ║');
    console.log('║ 🏠 SALAS: ATIVAS                     ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');

});