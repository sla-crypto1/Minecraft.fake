const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIGURAÇÕES GERAIS ---
let tileSize = 40; // Tamanho do bloco
let cols, rows;
let offsetX = 0, offsetY = 0;

// --- ESTADO DO JOGO (Dados para salvar) ---
let gameData = {
    wheat: 0,
    nightCount: 1,
    seeds: 5,
    swordLevel: 0, // 0: Madeira, 1: Pedra, 2: Ferro, 3: Diamante, 4: Netherite
    map: [], // Grid do mapa
    golems: []
};

// --- VARIÁVEIS DE CONTROLE ---
let isNight = false;
let dayTime = 60; // Duração do dia em segundos
let timer = dayTime;
let lastTime = Date.now();
let zombies = [];
let selectedTool = 'hoe';
const swordNames = ["Madeira", "Pedra", "Ferro", "Diamante", "Netherite"];
const swordDmgs = [1, 2, 4, 8, 20];

// --- INICIALIZAÇÃO ---
function init() {
    resizeCanvas();
    loadGame();
    if (gameData.map.length === 0) createInitialMap();
    window.requestAnimationFrame(loop);
    setInterval(gameLogicPerSecond, 1000);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Centraliza o mapa inicial
    cols = Math.ceil(canvas.width / tileSize);
    rows = Math.ceil(canvas.height / tileSize);
}

function createInitialMap() {
    // Cria um grid 20x20, mas só o centro tem terra (5x5)
    let mapSize = 20;
    for (let y = 0; y < mapSize; y++) {
        let row = [];
        for (let x = 0; x < mapSize; x++) {
            // Se estiver no centro, é terra (tipo 1), senão é vazio (tipo 0)
            let isCenter = x > 7 && x < 13 && y > 7 && y < 13;
            row.push({
                type: isCenter ? 1 : 0, 
                tilled: false,
                crop: 0, // 0: nada, 1-99: crescendo, 100: maduro
                hasGolem: false
            });
        }
        gameData.map.push(row);
    }
    // Centraliza a visão
    offsetX = (canvas.width - mapSize * tileSize) / 2;
    offsetY = (canvas.height - mapSize * tileSize) / 2;
}

// --- LÓGICA DO JOGO ---
function loop() {
    update();
    draw();
    window.requestAnimationFrame(loop);
}

function update() {
    // Crescimento das plantas (rápido)
    if (!isNight) {
        gameData.map.forEach(row => {
            row.forEach(tile => {
                if (tile.crop > 0 && tile.crop < 100) {
                    tile.crop += 0.2; // Velocidade de crescimento
                }
            });
        });
    }

    // Lógica dos Zumbis
    zombies.forEach((z, index) => {
        // Move em direção ao centro do mapa (aprox)
        let centerX = (gameData.map[0].length * tileSize) / 2 + offsetX;
        let centerY = (gameData.map.length * tileSize) / 2 + offsetY;
        
        let dx = centerX - z.x;
        let dy = centerY - z.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        z.x += (dx / dist) * z.speed;
        z.y += (dy / dist) * z.speed;

        // Dano do Golem
        gameData.golems.forEach(g => {
            let gx = g.c * tileSize + offsetX;
            let gy = g.r * tileSize + offsetY;
            let distToGolem = Math.sqrt((z.x - gx)**2 + (z.y - gy)**2);
            if (distToGolem < 60) {
                z.hp -= 0.5; // Golem bate
            }
        });

        if (z.hp <= 0) zombies.splice(index, 1);
    });
}

function gameLogicPerSecond() {
    if (!isNight) {
        timer--;
        if (timer <= 0) startNight();
    } else {
        // Checar se acabou a noite (todos zumbis mortos)
        if (zombies.length === 0) endNight();
    }
    
    updateUI();
    saveGame(); // Salva auto a cada segundo
}

function startNight() {
    isNight = true;
    timer = 0;
    // Spawnar zumbis baseado no nº da noite
    let amount = 3 + Math.floor(gameData.nightCount * 1.5);
    for(let i=0; i<amount; i++) {
        spawnZombie();
    }
    alert(`🌑 A NOITE ${gameData.nightCount} COMEÇOU! Proteja a vila!`);
}

function endNight() {
    isNight = false;
    timer = dayTime;
    gameData.nightCount++;
    alert("☀️ O sol nasceu! Cultive e prepare-se.");
}

function spawnZombie() {
    let side = Math.floor(Math.random() * 4);
    let x, y;
    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -50; break; // Top
        case 1: x = canvas.width + 50; y = Math.random() * canvas.height; break; // Right
        case 2: x = Math.random() * canvas.width; y = canvas.height + 50; break; // Bottom
        case 3: x = -50; y = Math.random() * canvas.height; break; // Left
    }
    // Zumbi HP escala com as noites
    zombies.push({ x: x, y: y, hp: 3 + gameData.nightCount, speed: 1 + (gameData.nightCount * 0.1) });
}

// --- DESENHO ---
function draw() {
    ctx.fillStyle = isNight ? '#1a1a2e' : '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha Mapa
    for (let r = 0; r < gameData.map.length; r++) {
        for (let c = 0; c < gameData.map[r].length; c++) {
            let tile = gameData.map[r][c];
            let x = c * tileSize + offsetX;
            let y = r * tileSize + offsetY;

            if (tile.type === 1) { // Terra
                ctx.fillStyle = tile.tilled ? '#6b4423' : '#2d5a27'; // Arado vs Grama
                ctx.fillRect(x, y, tileSize, tileSize);
                ctx.strokeStyle = '#1e3c1a';
                ctx.strokeRect(x, y, tileSize, tileSize);

                // Planta
                if (tile.crop > 0) {
                    let growthColor = tile.crop >= 100 ? '#d4af37' : '#32cd32'; // Dourado maduro / Verde crescendo
                    let size = (tile.crop / 100) * (tileSize - 10);
                    ctx.fillStyle = growthColor;
                    ctx.fillRect(x + 5, y + 5, size, size);
                }
            }
        }
    }

    // Desenha Golems
    gameData.golems.forEach(g => {
        let x = g.c * tileSize + offsetX;
        let y = g.r * tileSize + offsetY;
        ctx.fillStyle = '#b0c4de'; // Ferro
        ctx.beginPath();
        ctx.arc(x + tileSize/2, y + tileSize/2, 15, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'red'; // Olhos
        ctx.fillRect(x + 15, y + 10, 4, 4);
        ctx.fillRect(x + 21, y + 10, 4, 4);
    });

    // Desenha Zumbis
    zombies.forEach(z => {
        ctx.fillStyle = '#2e8b57'; // Verde zumbi
        ctx.fillRect(z.x - 10, z.y - 10, 20, 20);
        ctx.fillStyle = 'red'; // Barra vida
        ctx.fillRect(z.x - 10, z.y - 15, z.hp * 2, 3);
    });
}

// --- INTERAÇÃO ---
canvas.addEventListener('pointerdown', (e) => {
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;
    let c = Math.floor(x / tileSize);
    let r = Math.floor(y / tileSize);

    // Verifica se clicou num zumbi (Ataque)
    if (selectedTool === 'sword') {
        let hit = false;
        zombies.forEach((z, i) => {
            if (Math.abs(z.x - e.clientX) < 30 && Math.abs(z.y - e.clientY) < 30) {
                z.hp -= swordDmgs[gameData.swordLevel];
                // Efeito visual de hit poderia ser aqui
                hit = true;
            }
        });
        if(hit) return;
    }

    // Verifica limites do mapa
    if (r >= 0 && r < gameData.map.length && c >= 0 && c < gameData.map[0].length) {
        let tile = gameData.map[r][c];

        if (selectedTool === 'hoe') {
            if (tile.type === 1 && !tile.tilled && tile.crop === 0) {
                tile.tilled = true;
            }
        } else if (selectedTool === 'seed') {
            if (tile.tilled && tile.crop === 0 && gameData.seeds > 0) {
                tile.crop = 1;
                gameData.seeds--;
                updateUI();
            }
        } else if (selectedTool === 'shovel') {
            // Se tem planta madura, colhe
            if (tile.crop >= 100) {
                tile.crop = 0;
                tile.tilled = false; // Terra volta ao normal
                gameData.wheat += 3;
                updateUI();
            } else if (tile.type === 1 && tile.crop === 0) {
                // Remove bloco de terra se estiver vazio (recupera 2 trigos?)
                tile.type = 0; 
                tile.tilled = false;
            }
        } else if (selectedTool === 'place_dirt') {
             // Expansão: Coloca terra se for vazio
             if (tile.type === 0 && gameData.wheat >= 5) {
                 tile.type = 1;
                 gameData.wheat -= 5;
                 updateUI();
                 selectTool('hoe'); // Volta pra enxada
             }
        } else if (selectedTool === 'place_golem') {
            if (tile.type === 1 && !tile.hasGolem && gameData.wheat >= 50) {
                gameData.golems.push({r: r, c: c});
                tile.hasGolem = true;
                gameData.wheat -= 50;
                selectTool('hoe');
            }
        }
    }
});

// --- UI E LOJA ---
function selectTool(tool) {
    selectedTool = tool;
    document.querySelectorAll('.tool').forEach(el => el.classList.remove('active'));
    
    // Se for ferramenta especial (terra/golem), não tem botão fixo, ativa visualmente a lógica
    if(tool !== 'place_dirt' && tool !== 'place_golem') {
        document.getElementById('tool-' + tool).classList.add('active');
    }
}

function updateUI() {
    document.getElementById('wheat-count').innerText = Math.floor(gameData.wheat);
    document.getElementById('night-count').innerText = gameData.nightCount;
    document.getElementById('time-left').innerText = timer;
    document.getElementById('sword-name').innerText = swordNames[gameData.swordLevel];
    
    // Atualiza texto do botão plantar com qtd sementes
    document.getElementById('tool-seed').innerHTML = `🌱<br>${gameData.seeds}`;
}

function toggleShop() {
    let modal = document.getElementById('shop-modal');
    modal.classList.toggle('hidden');
}

function buyItem(item) {
    if (item === 'seed') {
        if (gameData.wheat >= 1) {
            gameData.wheat -= 1;
            gameData.seeds++;
        }
    } else if (item === 'dirt') {
        alert("Toque num espaço vazio preto para colocar a terra!");
        toggleShop();
        selectTool('place_dirt');
        return;
    } else if (item === 'golem') {
        if (gameData.wheat >= 50) {
            alert("Toque em um bloco de grama para colocar o Golem!");
            toggleShop();
            selectTool('place_golem');
            return;
        }
    }
    updateUI();
}

function upgradeSword() {
    if (gameData.swordLevel < 4) {
        if (gameData.wheat >= 200) {
            gameData.wheat -= 200;
            gameData.swordLevel++;
            updateUI();
        } else {
            alert("Trigo insuficiente (Precisa de 200)!");
        }
    } else {
        alert("Espada já está no nível máximo (Netherite)!");
    }
}

// --- SAVE SYSTEM ---
function saveGame() {
    localStorage.setItem('villagerTD_save', JSON.stringify(gameData));
}

function loadGame() {
    let saved = localStorage.getItem('villagerTD_save');
    if (saved) {
        gameData = JSON.parse(saved);
        // Recalcular Golems no mapa (opcional para consistência visual)
    }
    updateUI();
}

// Inicia
init();
