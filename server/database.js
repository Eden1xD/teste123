// ============================================================
// HANGOUT — DATABASE
// database.js
// ============================================================

const path = require('path');
const sqlite3 = require('sqlite3').verbose();


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const databasePath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(databasePath, (error) => {

    if (error) {

        console.error(
            '[DATABASE] Erro ao conectar:',
            error.message
        );

        return;
    }

    console.log(
        '[DATABASE] SQLite conectado com sucesso.'
    );

});


// ============================================================
// PROMISE HELPERS
// ============================================================

function run(sql, params = []) {

    return new Promise((resolve, reject) => {

        db.run(sql, params, function (error) {

            if (error) {

                reject(error);

                return;
            }

            resolve({
                id: this.lastID,
                changes: this.changes
            });

        });

    });

}


function get(sql, params = []) {

    return new Promise((resolve, reject) => {

        db.get(sql, params, (error, row) => {

            if (error) {

                reject(error);

                return;
            }

            resolve(row);

        });

    });

}


function all(sql, params = []) {

    return new Promise((resolve, reject) => {

        db.all(sql, params, (error, rows) => {

            if (error) {

                reject(error);

                return;
            }

            resolve(rows);

        });

    });

}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function initDatabase() {

    try {

        // ----------------------------------------------------
        // USERS
        // ----------------------------------------------------

        await run(`

            CREATE TABLE IF NOT EXISTS users (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                username TEXT NOT NULL UNIQUE,

                avatar TEXT DEFAULT 'user',

                level INTEGER DEFAULT 1,

                xp INTEGER DEFAULT 0,

                games_played INTEGER DEFAULT 0,

                games_won INTEGER DEFAULT 0,

                games_lost INTEGER DEFAULT 0,

                games_draw INTEGER DEFAULT 0,

                current_streak INTEGER DEFAULT 0,

                best_streak INTEGER DEFAULT 0,

                total_points INTEGER DEFAULT 0,

                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

            )

        `);


        // ----------------------------------------------------
        // GAMES
        // ----------------------------------------------------

        await run(`

            CREATE TABLE IF NOT EXISTS games (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                room_code TEXT NOT NULL,

                category TEXT,

                word TEXT,

                winner_id INTEGER,

                status TEXT DEFAULT 'waiting',

                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                finished_at DATETIME,

                FOREIGN KEY (winner_id)
                    REFERENCES users(id)

            )

        `);


        // ----------------------------------------------------
        // GAME PLAYERS
        // ----------------------------------------------------

        await run(`

            CREATE TABLE IF NOT EXISTS game_players (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                game_id INTEGER NOT NULL,

                user_id INTEGER NOT NULL,

                score INTEGER DEFAULT 0,

                correct_letters INTEGER DEFAULT 0,

                wrong_letters INTEGER DEFAULT 0,

                position INTEGER,

                result TEXT,

                FOREIGN KEY (game_id)
                    REFERENCES games(id),

                FOREIGN KEY (user_id)
                    REFERENCES users(id)

            )

        `);


        // ----------------------------------------------------
        // GAME HISTORY
        // ----------------------------------------------------

        await run(`

            CREATE TABLE IF NOT EXISTS game_history (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                user_id INTEGER NOT NULL,

                game_id INTEGER NOT NULL,

                points INTEGER DEFAULT 0,

                xp INTEGER DEFAULT 0,

                result TEXT,

                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (user_id)
                    REFERENCES users(id),

                FOREIGN KEY (game_id)
                    REFERENCES games(id)

            )

        `);


        // ----------------------------------------------------
        // INDEXES
        // ----------------------------------------------------

        await run(`

            CREATE INDEX IF NOT EXISTS
            idx_users_xp

            ON users(xp DESC)

        `);


        await run(`

            CREATE INDEX IF NOT EXISTS
            idx_users_username

            ON users(username)

        `);


        await run(`

            CREATE INDEX IF NOT EXISTS
            idx_games_room

            ON games(room_code)

        `);


        console.log(
            '[DATABASE] Tabelas verificadas com sucesso.'
        );

    } catch (error) {

        console.error(
            '[DATABASE] Erro ao inicializar:',
            error
        );

        throw error;

    }

}


// ============================================================
// USERS
// ============================================================

async function createUser(username, avatar = 'user') {

    const result = await run(`

        INSERT INTO users (
            username,
            avatar
        )

        VALUES (?, ?)

    `, [
        username,
        avatar
    ]);

    return getUserById(result.id);

}


async function getUserById(id) {

    return get(`

        SELECT *

        FROM users

        WHERE id = ?

    `, [id]);

}


async function getUserByUsername(username) {

    return get(`

        SELECT *

        FROM users

        WHERE username = ?

    `, [username]);

}


async function updateUsername(id, username) {

    await run(`

        UPDATE users

        SET
            username = ?,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = ?

    `, [
        username,
        id
    ]);

    return getUserById(id);

}


async function updateAvatar(id, avatar) {

    await run(`

        UPDATE users

        SET
            avatar = ?,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = ?

    `, [
        avatar,
        id
    ]);

    return getUserById(id);

}


// ============================================================
// XP / LEVEL
// ============================================================

function calculateLevel(xp) {

    return Math.floor(xp / 1000) + 1;

}


async function addXP(userId, amount) {

    const user = await getUserById(userId);

    if (!user) {

        throw new Error(
            'Usuário não encontrado.'
        );

    }


    const newXP = Math.max(
        0,
        user.xp + amount
    );


    const newLevel = calculateLevel(newXP);


    await run(`

        UPDATE users

        SET
            xp = ?,
            level = ?,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = ?

    `, [
        newXP,
        newLevel,
        userId
    ]);


    return getUserById(userId);

}


// ============================================================
// SCORE
// ============================================================

async function addPoints(userId, points) {

    await run(`

        UPDATE users

        SET
            total_points = total_points + ?,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = ?

    `, [
        points,
        userId
    ]);


    return getUserById(userId);

}


// ============================================================
// PARTIDA INICIADA
// ============================================================

async function registerGamePlayed(userId) {

    await run(`

        UPDATE users

        SET
            games_played = games_played + 1,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = ?

    `, [
        userId
    ]);

}


// ============================================================
// VITÓRIA
// ============================================================

async function registerWin(userId) {

    const user = await getUserById(userId);

    if (!user) {

        throw new Error(
            'Usuário não encontrado.'
        );

    }


    const currentStreak =
        user.current_streak + 1;


    const bestStreak = Math.max(
        currentStreak,
        user.best_streak
    );


    await run(`

        UPDATE users

        SET

            games_won = games_won + 1,

            current_streak = ?,

            best_streak = ?,

            updated_at = CURRENT_TIMESTAMP

        WHERE id = ?

    `, [
        currentStreak,
        bestStreak,
        userId
    ]);


    return getUserById(userId);

}


// ============================================================
// DERROTA
// ============================================================

async function registerLoss(userId) {

    await run(`

        UPDATE users

        SET

            games_lost = games_lost + 1,

            current_streak = 0,

            updated_at = CURRENT_TIMESTAMP

        WHERE id = ?

    `, [
        userId
    ]);


    return getUserById(userId);

}


// ============================================================
// EMPATE
// ============================================================

async function registerDraw(userId) {

    await run(`

        UPDATE users

        SET

            games_draw = games_draw + 1,

            current_streak = 0,

            updated_at = CURRENT_TIMESTAMP

        WHERE id = ?

    `, [
        userId
    ]);


    return getUserById(userId);

}


// ============================================================
// CRIAR PARTIDA
// ============================================================

async function createGame(
    roomCode,
    category,
    word
) {

    const result = await run(`

        INSERT INTO games (

            room_code,
            category,
            word,
            status

        )

        VALUES (?, ?, ?, 'waiting')

    `, [
        roomCode,
        category,
        word
    ]);


    return getGameById(result.id);

}


// ============================================================
// BUSCAR PARTIDA
// ============================================================

async function getGameById(id) {

    return get(`

        SELECT *

        FROM games

        WHERE id = ?

    `, [id]);

}


async function getGameByRoom(roomCode) {

    return get(`

        SELECT *

        FROM games

        WHERE room_code = ?

        ORDER BY id DESC

        LIMIT 1

    `, [
        roomCode
    ]);

}


// ============================================================
// ATUALIZAR STATUS DA PARTIDA
// ============================================================

async function updateGameStatus(
    gameId,
    status
) {

    await run(`

        UPDATE games

        SET status = ?

        WHERE id = ?

    `, [
        status,
        gameId
    ]);

}


// ============================================================
// FINALIZAR PARTIDA
// ============================================================

async function finishGame(
    gameId,
    winnerId
) {

    await run(`

        UPDATE games

        SET

            winner_id = ?,

            status = 'finished',

            finished_at = CURRENT_TIMESTAMP

        WHERE id = ?

    `, [
        winnerId,
        gameId
    ]);

}


// ============================================================
// ADICIONAR JOGADOR À PARTIDA
// ============================================================

async function addPlayerToGame(
    gameId,
    userId
) {

    const existing = await get(`

        SELECT *

        FROM game_players

        WHERE game_id = ?

        AND user_id = ?

    `, [
        gameId,
        userId
    ]);


    if (existing) {

        return existing;

    }


    const result = await run(`

        INSERT INTO game_players (

            game_id,
            user_id

        )

        VALUES (?, ?)

    `, [
        gameId,
        userId
    ]);


    return get(`

        SELECT *

        FROM game_players

        WHERE id = ?

    `, [
        result.id
    ]);

}


// ============================================================
// RANKING
// ============================================================

async function getRanking(
    limit = 100,
    offset = 0
) {

    return all(`

        SELECT

            id,

            username,

            avatar,

            level,

            xp,

            games_played,

            games_won,

            games_lost,

            games_draw,

            current_streak,

            best_streak,

            total_points,

            CASE

                WHEN games_played > 0

                THEN ROUND(
                    games_won * 100.0 /
                    games_played,
                    1
                )

                ELSE 0

            END AS win_rate

        FROM users

        ORDER BY

            xp DESC,

            total_points DESC,

            games_won DESC

        LIMIT ?

        OFFSET ?

    `, [
        limit,
        offset
    ]);

}


// ============================================================
// POSIÇÃO DO JOGADOR
// ============================================================

async function getUserRank(userId) {

    const user = await getUserById(userId);

    if (!user) {

        return null;

    }


    const result = await get(`

        SELECT COUNT(*) + 1 AS position

        FROM users

        WHERE

            xp > ?

            OR (

                xp = ?

                AND total_points > ?

            )

    `, [
        user.xp,
        user.xp,
        user.total_points
    ]);


    return result.position;

}


// ============================================================
// HISTÓRICO
// ============================================================

async function addGameHistory({

    userId,
    gameId,
    points = 0,
    xp = 0,
    result

}) {

    await run(`

        INSERT INTO game_history (

            user_id,
            game_id,
            points,
            xp,
            result

        )

        VALUES (?, ?, ?, ?, ?)

    `, [
        userId,
        gameId,
        points,
        xp,
        result
    ]);

}


// ============================================================
// FECHAR DATABASE
// ============================================================

function closeDatabase() {

    db.close((error) => {

        if (error) {

            console.error(
                '[DATABASE] Erro ao fechar:',
                error.message
            );

            return;
        }

        console.log(
            '[DATABASE] Conexão encerrada.'
        );

    });

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    db,

    initDatabase,

    run,
    get,
    all,

    createUser,

    getUserById,
    getUserByUsername,

    updateUsername,
    updateAvatar,

    calculateLevel,
    addXP,
    addPoints,

    registerGamePlayed,
    registerWin,
    registerLoss,
    registerDraw,

    createGame,
    getGameById,
    getGameByRoom,

    updateGameStatus,
    finishGame,

    addPlayerToGame,

    getRanking,
    getUserRank,

    addGameHistory,

    closeDatabase

};