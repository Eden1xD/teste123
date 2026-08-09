// ============================================================
// HANGOUT — ROOMS
// rooms.js
// ============================================================

'use strict';


// ============================================================
// CONFIGURAÇÕES
// ============================================================

const DEFAULT_MAX_PLAYERS = 2;

const MAX_ROOMS = 100;

const ROOM_CODE_LENGTH = 6;


// ============================================================
// ARMAZENAMENTO
// ============================================================

const rooms = new Map();


// ============================================================
// UTILIDADES
// ============================================================

function generateRoomCode() {

    const characters =
        'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    let code = '';

    do {

        code = '';

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

    } while (rooms.has(code));


    return code;

}


function normalizeRoomCode(code) {

    return String(code || '')
        .trim()
        .toUpperCase();

}


function normalizeUsername(username) {

    return String(
        username ||
        'Jogador'
    )
        .trim()
        .slice(0, 20);

}


function getRoom(code) {

    const roomCode =
        normalizeRoomCode(code);

    return rooms.get(roomCode) || null;

}


// ============================================================
// CRIAR SALA
// ============================================================

function createRoom(options = {}) {

    if (rooms.size >= MAX_ROOMS) {

        throw new Error(
            'Limite de salas atingido.'
        );

    }


    const code =
        generateRoomCode();


    const room = {

        code,

        hostId:
            options.hostId ||
            null,

        hostName:
            normalizeUsername(
                options.hostName
            ),

        maxPlayers:
            Number(
                options.maxPlayers ||
                DEFAULT_MAX_PLAYERS
            ),

        category:
            options.category ||
            'Geral',

        status:
            'waiting',

        players: new Map(),

        spectators: new Map(),

        game: {

            round: 0,

            word: null,

            maskedWord: [],

            guessedLetters: [],

            wrongLetters: [],

            mistakes: 0,

            maxMistakes: 6,

            currentTurn: null,

            startedAt: null,

            endsAt: null

        },

        createdAt:
            Date.now(),

        updatedAt:
            Date.now()

    };


    rooms.set(
        code,
        room
    );


    return room;

}


// ============================================================
// REMOVER SALA
// ============================================================

function deleteRoom(code) {

    const roomCode =
        normalizeRoomCode(code);


    const room =
        rooms.get(roomCode);


    if (!room) {

        return false;

    }


    rooms.delete(roomCode);

    return true;

}


// ============================================================
// ADICIONAR JOGADOR
// ============================================================

function addPlayer(
    roomCode,
    player
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        throw new Error(
            'Sala não encontrada.'
        );

    }


    if (
        room.status !==
        'waiting'
    ) {

        throw new Error(
            'A partida já começou.'
        );

    }


    if (
        room.players.size >=
        room.maxPlayers
    ) {

        throw new Error(
            'A sala está cheia.'
        );

    }


    const playerId =
        String(
            player.id ||
            player.userId ||
            ''
        );


    if (!playerId) {

        throw new Error(
            'Jogador inválido.'
        );

    }


    if (
        room.players.has(
            playerId
        )
    ) {

        return room.players.get(
            playerId
        );

    }


    const roomPlayer = {

        id:
            playerId,

        username:
            normalizeUsername(
                player.username
            ),

        avatar:
            player.avatar ||
            'user',

        level:
            Number(
                player.level ||
                1
            ),

        xp:
            Number(
                player.xp ||
                0
            ),

        score: 0,

        correctLetters: 0,

        wrongLetters: 0,

        connected: true,

        joinedAt:
            Date.now()

    };


    room.players.set(
        playerId,
        roomPlayer
    );


    room.updatedAt =
        Date.now();


    if (!room.hostId) {

        room.hostId =
            playerId;

        room.hostName =
            roomPlayer.username;

    }


    return roomPlayer;

}


// ============================================================
// REMOVER JOGADOR
// ============================================================

function removePlayer(
    roomCode,
    playerId
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return null;

    }


    const id =
        String(playerId);


    const player =
        room.players.get(id);


    if (!player) {

        return null;

    }


    room.players.delete(id);


    room.updatedAt =
        Date.now();


    // --------------------------------------------------------
    // SE ERA O HOST
    // --------------------------------------------------------

    if (
        String(room.hostId) ===
        id
    ) {

        const nextPlayer =
            room.players.values().next().value;


        if (nextPlayer) {

            room.hostId =
                nextPlayer.id;

            room.hostName =
                nextPlayer.username;

        } else {

            deleteRoom(
                room.code
            );

        }

    }


    return player;

}


// ============================================================
// ENTRAR COMO ESPECTADOR
// ============================================================

function addSpectator(
    roomCode,
    player
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        throw new Error(
            'Sala não encontrada.'
        );

    }


    const id =
        String(
            player.id ||
            player.userId
        );


    const spectator = {

        id,

        username:
            normalizeUsername(
                player.username
            ),

        avatar:
            player.avatar ||
            'user',

        joinedAt:
            Date.now()

    };


    room.spectators.set(
        id,
        spectator
    );


    room.updatedAt =
        Date.now();


    return spectator;

}


// ============================================================
// REMOVER ESPECTADOR
// ============================================================

function removeSpectator(
    roomCode,
    playerId
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return false;

    }


    return room.spectators.delete(
        String(playerId)
    );

}


// ============================================================
// BUSCAR JOGADOR
// ============================================================

function getPlayer(
    roomCode,
    playerId
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return null;

    }


    return room.players.get(
        String(playerId)
    ) || null;

}


// ============================================================
// LISTAR JOGADORES
// ============================================================

function getPlayers(
    roomCode
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return [];

    }


    return Array.from(
        room.players.values()
    );

}


// ============================================================
// CONTAGEM
// ============================================================

function getPlayerCount(
    roomCode
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return 0;

    }


    return room.players.size;

}


// ============================================================
// SALA CHEIA
// ============================================================

function isRoomFull(
    roomCode
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return false;

    }


    return (
        room.players.size >=
        room.maxPlayers
    );

}


// ============================================================
// ALTERAR STATUS
// ============================================================

function setRoomStatus(
    roomCode,
    status
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return false;

    }


    const allowedStatuses = [

        'waiting',

        'starting',

        'playing',

        'finished'

    ];


    if (
        !allowedStatuses.includes(
            status
        )
    ) {

        throw new Error(
            'Status inválido.'
        );

    }


    room.status =
        status;


    room.updatedAt =
        Date.now();


    return true;

}


// ============================================================
// CONFIGURAR CATEGORIA
// ============================================================

function setRoomCategory(
    roomCode,
    category
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return false;

    }


    room.category =
        String(
            category ||
            'Geral'
        )
            .trim()
            .slice(0, 40);


    room.updatedAt =
        Date.now();


    return true;

}


// ============================================================
// CONFIGURAR LIMITE
// ============================================================

function setMaxPlayers(
    roomCode,
    maxPlayers
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return false;

    }


    const value =
        Number(maxPlayers);


    if (
        !Number.isInteger(value) ||
        value < 2 ||
        value > 10
    ) {

        throw new Error(
            'Quantidade de jogadores inválida.'
        );

    }


    if (
        value <
        room.players.size
    ) {

        throw new Error(
            'O limite não pode ser menor que os jogadores atuais.'
        );

    }


    room.maxPlayers =
        value;


    room.updatedAt =
        Date.now();


    return true;

}


// ============================================================
// GAME DATA
// ============================================================

function updateGame(
    roomCode,
    data = {}
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return null;

    }


    room.game = {

        ...room.game,

        ...data

    };


    room.updatedAt =
        Date.now();


    return room.game;

}


// ============================================================
// LIMPAR GAME
// ============================================================

function resetGame(
    roomCode
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return null;

    }


    room.game = {

        round: 0,

        word: null,

        maskedWord: [],

        guessedLetters: [],

        wrongLetters: [],

        mistakes: 0,

        maxMistakes: 6,

        currentTurn: null,

        startedAt: null,

        endsAt: null

    };


    room.status =
        'waiting';


    room.updatedAt =
        Date.now();


    room.players.forEach(
        player => {

            player.score = 0;

            player.correctLetters = 0;

            player.wrongLetters = 0;

        }
    );


    return room.game;

}


// ============================================================
// PRÓXIMO TURNO
// ============================================================

function getNextPlayer(
    roomCode,
    currentPlayerId
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return null;

    }


    const players =
        Array.from(
            room.players.values()
        );


    if (!players.length) {

        return null;

    }


    const currentIndex =
        players.findIndex(
            player =>
                String(player.id) ===
                String(currentPlayerId)
        );


    if (
        currentIndex === -1
    ) {

        return players[0];

    }


    const nextIndex =
        (
            currentIndex + 1
        ) %
        players.length;


    return players[nextIndex];

}


// ============================================================
// SALAS PÚBLICAS
// ============================================================

function listRooms() {

    return Array.from(
        rooms.values()
    )
        .filter(
            room =>
                room.status ===
                'waiting'
        )
        .map(
            room => ({
                code:
                    room.code,

                hostName:
                    room.hostName,

                players:
                    room.players.size,

                maxPlayers:
                    room.maxPlayers,

                category:
                    room.category,

                status:
                    room.status,

                createdAt:
                    room.createdAt

            })
        );

}


// ============================================================
// SALAS PARA API
// ============================================================

function getRoomInfo(
    roomCode
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return null;

    }


    return {

        code:
            room.code,

        hostId:
            room.hostId,

        hostName:
            room.hostName,

        maxPlayers:
            room.maxPlayers,

        players:
            room.players.size,

        spectators:
            room.spectators.size,

        category:
            room.category,

        status:
            room.status,

        game: {

            round:
                room.game.round,

            currentTurn:
                room.game.currentTurn,

            mistakes:
                room.game.mistakes,

            maxMistakes:
                room.game.maxMistakes,

            startedAt:
                room.game.startedAt,

            endsAt:
                room.game.endsAt

        },

        createdAt:
            room.createdAt,

        updatedAt:
            room.updatedAt

    };

}


// ============================================================
// SERIALIZAR SALA
// ============================================================

function serializeRoom(
    roomCode
) {

    const room =
        getRoom(roomCode);


    if (!room) {

        return null;

    }


    return {

        code:
            room.code,

        hostId:
            room.hostId,

        hostName:
            room.hostName,

        maxPlayers:
            room.maxPlayers,

        category:
            room.category,

        status:
            room.status,

        players:
            Array.from(
                room.players.values()
            ),

        spectators:
            Array.from(
                room.spectators.values()
            ),

        game:
            room.game,

        createdAt:
            room.createdAt,

        updatedAt:
            room.updatedAt

    };

}


// ============================================================
// LIMPEZA AUTOMÁTICA
// ============================================================

function cleanEmptyRooms() {

    const now =
        Date.now();


    const EMPTY_ROOM_TIME =
        1000 * 60 * 30;


    for (
        const [code, room]
        of rooms
    ) {

        if (
            room.players.size === 0 &&
            now - room.updatedAt >
            EMPTY_ROOM_TIME
        ) {

            rooms.delete(code);

        }

    }

}


setInterval(
    cleanEmptyRooms,
    1000 * 60 * 5
);


// ============================================================
// ESTATÍSTICAS
// ============================================================

function getRoomStats() {

    let waiting = 0;

    let playing = 0;

    let finished = 0;

    let totalPlayers = 0;


    rooms.forEach(
        room => {

            totalPlayers +=
                room.players.size;


            if (
                room.status ===
                'waiting'
            ) {

                waiting++;

            }


            if (
                room.status ===
                'playing'
            ) {

                playing++;

            }


            if (
                room.status ===
                'finished'
            ) {

                finished++;

            }

        }
    );


    return {

        totalRooms:
            rooms.size,

        waiting,

        playing,

        finished,

        totalPlayers

    };

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    rooms,

    createRoom,

    deleteRoom,

    getRoom,

    getRoomInfo,

    serializeRoom,

    addPlayer,

    removePlayer,

    getPlayer,

    getPlayers,

    getPlayerCount,

    isRoomFull,

    addSpectator,

    removeSpectator,

    setRoomStatus,

    setRoomCategory,

    setMaxPlayers,

    updateGame,

    resetGame,

    getNextPlayer,

    listRooms,

    getRoomStats,

    generateRoomCode,

    normalizeRoomCode

};