// --- CONFIGURAÇÃO THREE.JS ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Céu azul
scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// Posiciona a câmera em estilo "Isometrico/RTS"
camera.position.set(0, 15, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Luzes
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// Raycaster para interação (Toque/Clique)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- ESTADO DO JOGO ---
let gameData = {
    wheat: 0,
    seeds: 5,
    nightCount: 1,
    swordLevel: 0,
    mapData: {}, // Guardar estado dos blocos por coordenada "x,z"
    golems: []
};

let tiles = []; // Array de meshes dos blocos
let zombies = [];
let crops = []; // Array de meshes das plantas
let isNight = false;
let timer = 60;
let lastTime = Date.now();
let selectedTool = 'hoe';
const swordDmgs = [1, 3, 6, 10, 25];
const swordNames = ["Madeira", "Pedra", "Ferro", "Diamante", "Netherite"];

// --- MATERIAIS ---
const matGrass = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
const matDirt = new THREE.MeshStandardMaterial({ color: 0x5d3a1a });
const matTilled = new THREE.MeshStandardMaterial({ color: 0x3e2712 });
const matWheatGreen = new THREE.MeshStandardMaterial({ color: 0x32cd32 });
const matWheatGold = new THREE.MeshStandardMaterial({ color: 0xd4af37 });
const matZombie = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
const matGolem = new THREE.MeshStandardMaterial({ color: 0xb0c4de });

// --- INICIALIZAÇÃO DO MAPA ---
const mapSize = 9; // Tamanho inicial 9x9
const tileSize = 2; // Tamanho visual do bloco

function createBlock(x, z, type) {
    const geo = new THREE.BoxGeometry(tileSize, tileSize, tileSize);
    const mesh = new THREE.Mesh(geo, type === 'grass' ? matGrass : matDirt);
    mesh.position.set(x * tileSize, -tileSize/2, z * tileSize);
    mesh.receiveShadow = true;
    
    // Dados customizados no objeto 3D
    mesh.userData = {
        isTile: true,
        x: x, 
        z: z, 
        type: type, // 'grass', 'dirt'
        tilled: false,
        hasCrop: false,
        cropMesh: null,
        hasGolem: false
    };

    scene.add(mesh);
    tiles.push(mesh);
    
    // Salva no gameData se não existir
    let key = `${x},${z}`;
    if(!gameData.mapData[key]) {
        gameData.mapData[key] = { type: type, tilled: false };
    }
}

function initMap() {
    for(let x = -3; x <= 3; x++) {
        for(let z = -3; z <= 3; z++) {
            createBlock(x, z, 'grass');
        }
    }
}

// --- FUNÇÕES DE UPDATE E LÓGICA ---
function update() {
    const dt = (Date.now() - lastTime) / 1000;
    lastTime = Date.now();

    // Ciclo Dia/Noite Visual
    if(isNight) {
        scene.background.setHex(0x1a1a2e);
        scene.fog.color.setHex(0x1a1a2e);
        ambientLight.intensity = 0.2;
    } else {
        scene.background.setHex(0x87CEEB);
        scene.fog.color.setHex(0x87CEEB);
        ambientLight.intensity = 0.6;
        
        // Crescimento das plantas
        crops.forEach(crop => {
            if(crop.userData.growth < 100) {
                crop.userData.growth += 0.3; // Velocidade
                let scale = 0.2 + (crop.userData.growth / 100) * 0.8;
                crop.scale.set(1, scale, 1);
                crop.position.y = (scale * tileSize)/2 - tileSize/2; // Ajusta altura base
                
                if(crop.userData.growth >= 100) {
                    crop.material = matWheatGold;
                }
            }
        });
    }

    // Zumbis
    zombies.forEach((z, i) => {
        // Move para o centro (0,0,0)
        let dir = new THREE.Vector3(0 - z.position.x, 0, 0 - z.position.z).normalize();
        z.position.add(dir.multiplyScalar(z.userData.speed * dt));
        z.lookAt(0, z.position.y, 0);

        // Colisão com Golems (Raio de defesa)
        gameData.golems.forEach(g => {
            let dist = z.position.distanceTo(g.mesh.position);
            if(dist < 5) {
                z.userData.hp -= 0.1; // Dano do Golem
                // Efeito visual de ataque poderia ser adicionado aqui
            }
        });

        if(z.userData.hp <= 0) {
            scene.remove(z);
            zombies.splice(i, 1);
        }
    });
}

function oneSecondLogic() {
    if(!isNight) {
        timer--;
        if(timer <= 0) startNight();
    } else {
        if(zombies.length === 0 && timer <= 0) endNight(); // Fim da noite se matou tudo
    }
    updateUI();
}

function startNight() {
    isNight = true;
    timer = 0; // Timer para de contar dia
    alert(`🌑 A Noite ${gameData.nightCount} chegou!`);
    
    // Spawna Zumbis
    let amount = 3 + gameData.nightCount;
    for(let i=0; i<amount; i++) spawnZombie();
}

function endNight() {
    isNight = false;
    timer = 60;
    gameData.nightCount++;
    alert("☀️ Amanheceu!");
}

function spawnZombie() {
    const dist = 20;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const geo = new THREE.BoxGeometry(1, 2, 1);
    const mesh = new THREE.Mesh(geo, matZombie);
    mesh.position.set(x, 1, z);
    mesh.castShadow = true;
    mesh.userData = { hp: 3 + gameData.nightCount, speed: 2 + (gameData.nightCount * 0.1) };
    
    scene.add(mesh);
    zombies.push(mesh);
}

// --- INTERAÇÃO (RAYCAST) ---
function onTouch(event) {
    // Calcula posição do mouse/toque normalizada (-1 a +1)
    let clientX, clientY;
    if(event.changedTouches) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // 1. Checa Zumbis (Prioridade de ataque)
    const intersectsZombies = raycaster.intersectObjects(zombies);
    if(selectedTool === 'sword' && intersectsZombies.length > 0) {
        let z = intersectsZombies[0].object;
        z.userData.hp -= swordDmgs[gameData.swordLevel];
        // Particula ou flash vermelho seria legal aqui
        z.material = new THREE.MeshBasicMaterial({color: 0xff0000});
        setTimeout(() => z.material = matZombie, 100);
        return;
    }

    // 2. Checa Blocos
    const intersectsTiles = raycaster.intersectObjects(tiles);
    if(intersectsTiles.length > 0) {
        let hit = intersectsTiles[0];
        let tile = hit.object;

        if(selectedTool === 'hoe') {
            if(tile.userData.type === 'grass' && !tile.userData.tilled) {
                tile.material = matTilled;
                tile.userData.tilled = true;
            }
        } 
        else if(selectedTool === 'seed') {
            if(tile.userData.tilled && !tile.userData.hasCrop && gameData.seeds > 0) {
                plantCrop(tile);
                gameData.seeds--;
            }
        }
        else if(selectedTool === 'shovel') {
            if(tile.userData.hasCrop && tile.userData.cropMesh.userData.growth >= 100) {
                // Colher
                harvest(tile);
            } else if (!tile.userData.hasCrop) {
                // Remover bloco (exceto o centro 0,0 para não cair no limbo)
                if(tile.userData.x !== 0 || tile.userData.z !== 0) {
                   // Implementar remoção se quiser
                }
            }
        }
        else if(selectedTool === 'place_dirt') {
             // Lógica complexa de colocar bloco ao lado. 
             // Simplificado: Transforma bloco selecionado (se fosse um "grid vazio") 
             // Mas aqui vamos fazer expansão fixa ou spawnar novo bloco.
             // Para simplificar mobile: Compra "expande" o mapa automaticamente nas bordas no futuro
             // AQUI: Vamos permitir clicar fora do mapa? Não. 
             // Vamos fazer assim: Clicar num bloco existente com Terra cria um bloco em cima? Não, estilo Minecraft é lado.
             // Solução Simples: Expande o grid aleatoriamente ou em espiral quando compra.
        }
        else if(selectedTool === 'place_golem') {
            if(!tile.userData.hasGolem && !tile.userData.hasCrop && gameData.wheat >= 50) {
                spawnGolem(tile);
                gameData.wheat -= 50;
                selectTool('hoe');
            }
        }
    }
    updateUI();
}

function plantCrop(tile) {
    const geo = new THREE.BoxGeometry(1, 0.2, 1); // Começa pequeno
    const mesh = new THREE.Mesh(geo, matWheatGreen);
    mesh.position.set(tile.position.x, -0.8, tile.position.z); // Um pouco acima do chão
    mesh.userData = { growth: 0 };
    
    scene.add(mesh);
    crops.push(mesh);
    
    tile.userData.hasCrop = true;
    tile.userData.cropMesh = mesh;
}

function harvest(tile) {
    scene.remove(tile.userData.cropMesh);
    // Remove do array de crops
    crops = crops.filter(c => c !== tile.userData.cropMesh);
    
    tile.userData.hasCrop = false;
    tile.userData.cropMesh = null;
    tile.userData.tilled = false; // Volta a ser terra arada vazia (ou grama?)
    tile.material = matDirt; // Vira terra normal
    
    gameData.wheat += 3;
}

function spawnGolem(tile) {
    const geo = new THREE.CylinderGeometry(0.8, 0.8, 3, 8);
    const mesh = new THREE.Mesh(geo, matGolem);
    mesh.position.set(tile.position.x, 1.5, tile.position.z);
    mesh.castShadow = true;
    scene.add(mesh);
    
    tile.userData.hasGolem = true;
    gameData.golems.push({ mesh: mesh });
}

// --- UI E LOJA ---
function updateUI() {
    document.getElementById('wheat-count').innerText = Math.floor(gameData.wheat);
    document.getElementById('night-count').innerText = gameData.nightCount;
    document.getElementById('time-left').innerText = timer;
    document.getElementById('sword-name').innerText = swordNames[gameData.swordLevel];
    document.getElementById('tool-seed').innerHTML = `🌱<br>${gameData.seeds}`;
}

function selectTool(t) { 
    selectedTool = t; 
    document.querySelectorAll('.tool').forEach(e => e.classList.remove('active'));
    if(t !== 'place_dirt' && t !== 'place_golem') document.getElementById('tool-'+t).classList.add('active');
}

function toggleShop() { document.getElementById('shop-modal').classList.toggle('hidden'); }

function buyItem(item) {
    if(item === 'seed' && gameData.wheat >= 1) {
        gameData.wheat--; gameData.seeds++;
    }
    else if(item === 'golem') {
        if(gameData.wheat >= 50) {
            alert("Toque no chão para colocar o Golem!");
            toggleShop();
            selectTool('place_golem');
            return;
        }
    }
    else if(item === 'dirt') {
        if(gameData.wheat >= 5) {
            // Expansão Automática (Mais fácil pra mobile que mirar no vazio)
            expandMap();
            gameData.wheat -= 5;
        }
    }
    updateUI();
}

function expandMap() {
    // Simples expansão: Adiciona uma linha/coluna nova aleatória ou fixa
    // Para simplificar o código: Adiciona um bloco em uma posição vazia adjacente
    // Hack rápido: Sorteia uma posição x,z próxima
    let range = 4 + Math.floor(tiles.length / 10);
    let x = Math.floor(Math.random() * range * 2) - range;
    let z = Math.floor(Math.random() * range * 2) - range;
    
    // Verifica se já existe
    let exists = tiles.some(t => t.userData.x === x && t.userData.z === z);
    if(!exists) {
        createBlock(x, z, 'grass');
        alert("Mapa expandido!");
    } else {
        // Tenta de novo (recursão simples ou falha silenciosa pra economizar codigo)
        gameData.wheat += 5; // Devolve o dinheiro se falhar
    }
}

function upgradeSword() {
    if(gameData.wheat >= 200 && gameData.swordLevel < 4) {
        gameData.wheat -= 200;
        gameData.swordLevel++;
    }
    updateUI();
}

// --- EVENTOS E LOOP ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Suporte a Mouse e Touch
window.addEventListener('mousedown', onTouch);
window.addEventListener('touchstart', (e) => {
    // e.preventDefault(); // Opcional, cuidado ao bloquear UI
    onTouch(e);
}, {passive: false});

initMap();
setInterval(oneSecondLogic, 1000);

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}
animate();
