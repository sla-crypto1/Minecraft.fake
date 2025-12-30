// ===== SAVE / LOAD =====
let wheat = Number(localStorage.getItem("wheat")) || 0;
let nights = Number(localStorage.getItem("nights")) || 0;
let swordLevel = Number(localStorage.getItem("sword")) || 0;

function saveGame(){
  localStorage.setItem("wheat", wheat);
  localStorage.setItem("nights", nights);
  localStorage.setItem("sword", swordLevel);
}

// ===== CENA =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 12, 12);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// ===== LUZ =====
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10,20,10);
scene.add(sun);

// ===== HUD =====
const wheatUI = document.getElementById("wheat");
const nightsUI = document.getElementById("nights");
const timerUI = document.getElementById("timer");

// ===== VAR =====
let tool = "hoe";
let seeds = 0;
let isNight = false;
let time = Number(localStorage.getItem("time")) || 0;

// ===== GRID =====
const tiles = [];
const tileSize = 2;

function createTile(x,z){
  const tile = new THREE.Mesh(
    new THREE.BoxGeometry(tileSize,0.5,tileSize),
    new THREE.MeshStandardMaterial({color:0x8B4513})
  );
  tile.position.set(x,0,z);
  tile.tilled = false;
  tile.crop = null;
  scene.add(tile);
  tiles.push(tile);
}

for(let x=-2;x<=2;x++){
  for(let z=-2;z<=2;z++){
    createTile(x*2,z*2);
  }
}

// ===== FERRAMENTAS =====
function setTool(t){ tool = t; }

// ===== PLANTAÇÃO =====
function plant(tile){
  if(!tile.tilled || seeds<=0 || tile.crop) return;
  seeds--;

  const crop = new THREE.Mesh(
    new THREE.BoxGeometry(0.8,1,0.8),
    new THREE.MeshStandardMaterial({color:0xffff00})
  );
  crop.position.set(tile.position.x,1,tile.position.z);
  crop.grow = 0;
  scene.add(crop);
  tile.crop = crop;
}

// ===== LOJA =====
function buySeed(){
  if(wheat < 1) return;
  wheat -= 1;
  seeds++;
  saveGame();
}

function buyLand(){
  if(wheat < 5) return;
  wheat -= 5;
  createTile(Math.random()*10-5, Math.random()*10-5);
  saveGame();
}

const golems = [];
function buyGolem(){
  if(wheat < 50) return;
  wheat -= 50;

  const g = new THREE.Mesh(
    new THREE.BoxGeometry(1.5,2,1.5),
    new THREE.MeshStandardMaterial({color:0xcccccc})
  );
  g.position.set(0,1,0);
  scene.add(g);
  golems.push(g);
  saveGame();
}

// ===== ESPADA =====
function upgradeSword(){
  if(wheat < 200 || swordLevel >= 4) return;
  wheat -= 200;
  swordLevel++;
  saveGame();
}

// ===== INIMIGOS =====
const enemies = [];
function spawnEnemy(){
  const e = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0x006600})
  );
  e.position.set((Math.random()-0.5)*20,0.5,-15);
  e.hp = 20 + nights * 5;
  scene.add(e);
  enemies.push(e);
}

setInterval(()=>{ if(isNight) spawnEnemy(); },3000);

// ===== CLICK =====
window.addEventListener("click",()=>{
  const ray = new THREE.Raycaster();
  ray.setFromCamera({x:0,y:0}, camera);

  const hits = ray.intersectObjects(tiles);
  if(hits.length){
    const tile = hits[0].object;
    if(tool==="hoe") tile.tilled=true;
    if(tool==="shovel") tile.tilled=false;
    if(tool==="hoe") plant(tile);
  }

  if(tool==="sword"){
    enemies.forEach(e=>{
      if(e.position.distanceTo(camera.position)<6){
        e.hp -= 10 + swordLevel*10;
      }
    });
  }
});

// ===== DIA / NOITE =====
function updateTime(){
  time += 0.0015;
  if(time >= 1){
    time = 0;
    nights++;
    saveGame();
  }

  isNight = time > 0.5;
  scene.background.set(isNight ? 0x0b0b2e : 0x87ceeb);
  sun.intensity = isNight ? 0.3 : 1;
}

// ===== LOOP =====
function animate(){
  requestAnimationFrame(animate);

  updateTime();

  tiles.forEach(t=>{
    if(t.crop){
      t.crop.grow += 0.02; // cresce mais rápido
      t.crop.scale.y = 1 + t.crop.grow;

      if(t.crop.grow > 1.5){
        wheat += 3;
        scene.remove(t.crop);
        t.crop = null;
        saveGame();
      }
    }
  });

  enemies.forEach((e,i)=>{
    e.position.z += 0.02;
    if(e.hp <= 0){
      wheat += 2;
      scene.remove(e);
      enemies.splice(i,1);
      saveGame();
    }
  });

  golems.forEach(g=>{
    enemies.forEach(e=>{
      if(g.position.distanceTo(e.position) < 4){
        e.hp -= 1;
      }
    });
  });

  wheatUI.innerText = wheat;
  nightsUI.innerText = nights;
  timerUI.innerText = Math.floor((0.5 - time) * 100);

  renderer.render(scene, camera);
}

animate();
