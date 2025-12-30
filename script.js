const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Configurações
let wheat = 0;
let seeds = 5;
let nightCount = 1;
let time = 60;
let tool = 'hoe';
let swordLevel = 0; // 0:Madeira, 1:Pedra, 2:Ferro, 3:Diamante, 4:Netherite
const swordNames = ["Madeira", "Pedra", "Ferro", "Diamante", "Netherite"];
let isNight = false;
let tiles = [];
let zombies = [];
let golems = [];

// Gerar Mapa Inicial (Grid Isométrico)
for(let r=0; r<5; r++) {
    for(let c=0; c<5; c++) {
        tiles.push({ x: c, y: r, tilled: false, crop: 0, type: 'grass' });
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isNight ? '#1a1a2e' : '#87CEEB';
    ctx.fillRect(0,0, canvas.width, canvas.height);

    // Desenhar Blocos
    tiles.forEach(t => {
        // Conversão para Isométrica
        let posX = (t.x - t.y) * 40 + canvas.width/2;
        let posY = (t.x + t.y) * 20 + 150;

        // Sombra/Lado do bloco
        ctx.fillStyle = '#3d3d3d';
        ctx.beginPath();
        ctx.moveTo(posX, posY + 20);
        ctx.lineTo(posX + 40, posY + 40);
        ctx.lineTo(posX - 40, posY + 40);
        ctx.fill();

        // Topo do bloco
        ctx.fillStyle = t.tilled ? '#5d3a1a' : (t.type === 'grass' ? '#2d5a27' : '#555');
        ctx.beginPath();
        ctx.moveTo(posX, posY);
        ctx.lineTo(posX + 40, posY + 20);
        ctx.lineTo(posX, posY + 40);
        ctx.lineTo(posX - 40, posY + 20);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.stroke();

        // Planta
        if(t.crop > 0) {
            ctx.fillStyle = t.crop >= 100 ? '#ffd700' : '#32cd32';
            ctx.fillRect(posX - 5, posY + 5 - (t.crop/5), 10, t.crop/5);
        }
        
        // Golem
        golems.forEach(g => {
            if(g.x === t.x && g.y === t.y) {
                ctx.fillStyle = '#eee';
                ctx.fillRect(posX - 10, posY - 20, 20, 30);
            }
        });
    });

    // Zumbis
    zombies.forEach((z, i) => {
        z.x += (canvas.width/2 - z.x) * 0.005;
        z.y += (250 - z.y) * 0.005;
        ctx.fillStyle = '#2e8b57';
        ctx.fillRect(z.x, z.y, 20, 30);
        if(z.hp <= 0) zombies.splice(i, 1);
    });

    requestAnimationFrame(draw);
}

// Lógica de Tempo e Crescimento
setInterval(() => {
    if(!isNight) {
        time--;
        if(time <= 0) {
            isNight = true;
            spawnZombies();
        }
        // Crescer plantação
        tiles.forEach(t => { if(t.crop > 0 && t.crop < 100) t.crop += 5; });
    } else {
        if(zombies.length === 0) {
            isNight = false;
            time = 60;
            nightCount++;
        }
        // Golems atacam
        golems.forEach(g => {
            zombies.forEach(z => {
                let dist = Math.hypot(z.x - (canvas.width/2), z.y - 250);
                if(dist < 200) z.hp -= 0.5;
            });
        });
    }
    updateUI();
}, 1000);

function spawnZombies() {
    for(let i=0; i < 3 + nightCount; i++) {
        zombies.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, hp: 5 + nightCount });
    }
}

// Cliques
canvas.addEventListener('touchstart', e => {
    let rect = canvas.getBoundingClientRect();
    let touchX = e.touches[0].clientX - rect.left;
    let touchY = e.touches[0].clientY - rect.top;

    if(tool === 'sword') {
        zombies.forEach(z => {
            if(Math.hypot(z.x - touchX, z.y - touchY) < 50) z.hp -= (swordLevel + 1) * 2;
        });
    }

    // Achar qual tile foi clicado (aproximado para facilitar no mobile)
    tiles.forEach(t => {
        let posX = (t.x - t.y) * 40 + canvas.width/2;
        let posY = (t.x + t.y) * 20 + 150;
        if(Math.hypot(posX - touchX, posY + 20 - touchY) < 35) {
            interact(t);
        }
    });
});

function interact(t) {
    if(tool === 'hoe' && !t.tilled && t.crop === 0) t.tilled = true;
    if(tool === 'seed' && t.tilled && t.crop === 0 && seeds > 0) { t.crop = 1; seeds--; }
    if(tool === 'shovel') {
        if(t.crop >= 100) { wheat += 3; t.crop = 0; t.tilled = false; }
        else if(t.crop === 0) t.tilled = false;
    }
}

// Loja e UI
function setTool(name, el) {
    tool = name;
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
}

function toggleShop() { document.getElementById('shop-modal').classList.toggle('hidden'); }

function buy(item) {
    if(item === 'seed' && wheat >= 1) { wheat--; seeds++; }
    if(item === 'dirt') {
        if(wheat >= 5) {
            wheat -= 5;
            let last = tiles[tiles.length-1];
            tiles.push({ x: last.x + 1, y: last.y, tilled: false, crop: 0, type: 'grass' });
        }
    }
    if(item === 'golem' && wheat >= 50) {
        wheat -= 50;
        golems.push({ x: Math.floor(Math.random()*5), y: Math.floor(Math.random()*5) });
    }
    updateUI();
}

function upgradeSword() {
    if(wheat >= 200 && swordLevel < 4) { wheat -= 200; swordLevel++; }
    updateUI();
}

function updateUI() {
    document.getElementById('night-txt').innerText = nightCount;
    document.getElementById('time-txt').innerText = time;
    document.getElementById('wheat-txt').innerText = wheat;
    document.getElementById('sword-txt').innerText = swordNames[swordLevel];
}

draw();
