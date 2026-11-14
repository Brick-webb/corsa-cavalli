// Configurazione dei 6 cavalli
const horsesData = [
    { id: 1, name: "Fulmine Nero", colorHex: "#2c3e50", colorInt: 0x2c3e50, odds: 2.5 },
    { id: 2, name: "Freccia Rossa", colorHex: "#e74c3c", colorInt: 0xe74c3c, odds: 3.0 },
    { id: 3, name: "Lampo Blu", colorHex: "#3498db", colorInt: 0x3498db, odds: 4.0 },
    { id: 4, name: "Stella d'Oro", colorHex: "#f1c40f", colorInt: 0xf1c40f, odds: 5.0 },
    { id: 5, name: "Vento Verde", colorHex: "#2ecc71", colorInt: 0x2ecc71, odds: 6.5 },
    { id: 6, name: "Ombra Viola", colorHex: "#9b59b6", colorInt: 0x9b59b6, odds: 8.0 }
];

let balance = 1000;
let isRacing = false;
let cameraMode = 0; // 0: Inseguimento laterale, 1: Dall'alto, 2: Frontale/Traguardo
const cameraModesNames = ["Inseguimento", "Dall'Alto", "Traguardo"];

// Variabili tracciato 3D
const TRACK_LENGTH = 160;
const START_X = -75;
const FINISH_X = 75;
const LANE_WIDTH = 2.6;

// Elementi DOM
const balanceEl = document.getElementById("balance");
const refillBtn = document.getElementById("refill-btn");
const cameraBtn = document.getElementById("camera-btn");
const horseSelectEl = document.getElementById("horse-select");
const betAmountEl = document.getElementById("bet-amount");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const statusBanner = document.getElementById("status-banner");
const horsesInfoEl = document.getElementById("horses-info");
const canvasContainer = document.getElementById("canvas-container");

// --- SETUP SCENA THREE.JS ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Cielo azzurro
scene.fog = new THREE.Fog(0x87ceeb, 80, 220);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
canvasContainer.appendChild(renderer.domElement);

// Luci
const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
dirLight.position.set(40, 80, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// --- COSTRUZIONE AMBIENTE 3D ---
function buildStadium() {
    // Prato verde circostante
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2ecc71 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // Pista principale (terra battuta/erba rasata)
    const trackWidth = horsesData.length * LANE_WIDTH + 2;
    const trackGeo = new THREE.BoxGeometry(TRACK_LENGTH + 30, 0.1, trackWidth);
    const trackMat = new THREE.MeshLambertMaterial({ color: 0xc29b61 }); // Terra battuta
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

    // Linee bianche delle corsie
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i <= horsesData.length; i++) {
        const zPos = -trackWidth / 2 + 1 + i * LANE_WIDTH;
        const lineGeo = new THREE.BoxGeometry(TRACK_LENGTH + 20, 0.12, 0.12);
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(0, 0.01, zPos);
        scene.add(line);
    }

    // Linea di partenza
    const startLineGeo = new THREE.BoxGeometry(0.4, 0.14, trackWidth);
    const startLine = new THREE.Mesh(startLineGeo, lineMat);
    startLine.position.set(START_X, 0.02, 0);
    scene.add(startLine);

    // Linea del traguardo a scacchi
    const finishGroup = new THREE.Group();
    const numChecks = 16;
    const checkSize = trackWidth / numChecks;
    for (let i = 0; i < numChecks; i++) {
        const isWhite = i % 2 === 0;
        const checkGeo = new THREE.BoxGeometry(0.8, 0.15, checkSize);
        const checkMat = new THREE.MeshBasicMaterial({ color: isWhite ? 0xffffff : 0x111111 });
        const check = new THREE.Mesh(checkGeo, checkMat);
        check.position.set(FINISH_X, 0.02, -trackWidth / 2 + checkSize / 2 + i * checkSize);
        finishGroup.add(check);
    }
    scene.add(finishGroup);

    // Archi del traguardo
    const poleGeo = new THREE.CylinderGeometry(0.25, 0.25, 8);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
    const leftPole = new THREE.Mesh(poleGeo, poleMat);
    leftPole.position.set(FINISH_X, 4, -trackWidth / 2 - 0.5);
    const rightPole = new THREE.Mesh(poleGeo, poleMat);
    rightPole.position.set(FINISH_X, 4, trackWidth / 2 + 0.5);
    scene.add(leftPole, rightPole);

    const bannerGeo = new THREE.BoxGeometry(0.6, 1.4, trackWidth + 2);
    const bannerMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(FINISH_X, 7.5, 0);
    scene.add(banner);

    // Staccionate laterali
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let x = -85; x <= 85; x += 5) {
        [-trackWidth / 2 - 0.4, trackWidth / 2 + 0.4].forEach(z => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), fenceMat);
            post.position.set(x, 0.6, z);
            scene.add(post);
        });
    }
    [-trackWidth / 2 - 0.4, trackWidth / 2 + 0.4].forEach(z => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(175, 0.15, 0.15), fenceMat);
        rail.position.set(0, 1.0, z);
        scene.add(rail);
    });

    // Tribune e Pubblico 3D (lato nord)
    buildStands(-trackWidth / 2 - 4);
}

const spectators = [];
function buildStands(baseZ) {
    const standMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    const crowdColors = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0x9b59b6, 0xffffff, 0xe67e22];

    for (let step = 0; step < 4; step++) {
        const stepGeo = new THREE.BoxGeometry(170, 1, 2);
        const stepMesh = new THREE.Mesh(stepGeo, standMat);
        stepMesh.position.set(0, 0.5 + step * 1, baseZ - step * 1.8);
        stepMesh.receiveShadow = true;
        scene.add(stepMesh);

        // Aggiungi spettatori sulle gradinate
        for (let x = -80; x <= 80; x += 2.2) {
            if (Math.random() > 0.25) {
                const color = crowdColors[Math.floor(Math.random() * crowdColors.length)];
                const personGroup = new THREE.Group();

                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(0.6, 0.9, 0.4),
                    new THREE.MeshLambertMaterial({ color })
                );
                body.position.y = 0.45;

                const head = new THREE.Mesh(
                    new THREE.SphereGeometry(0.25, 8, 8),
                    new THREE.MeshLambertMaterial({ color: 0xffdbac })
                );
                head.position.y = 1.05;

                personGroup.add(body, head);
                const baseY = 1 + step * 1;
                personGroup.position.set(x + (Math.random() - 0.5), baseY, baseZ - step * 1.8);
                scene.add(personGroup);

                spectators.push({
                    mesh: personGroup,
                    baseY: baseY,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
    }
}

// --- CREAZIONE CAVALLI 3D ---
const horseMeshes = [];

function createHorse3D(horseData, laneIndex) {
    const group = new THREE.Group();
    const trackWidth = horsesData.length * LANE_WIDTH + 2;
    const zPos = -trackWidth / 2 + 1 + LANE_WIDTH / 2 + laneIndex * LANE_WIDTH;

    // Colori manto cavallo naturali variati
    const coatColors = [0x3d2314, 0x8b4513, 0xa0522d, 0xd2691e, 0x2c1e16, 0x5c3317];
    const coatMat = new THREE.MeshLambertMaterial({ color: coatColors[laneIndex % coatColors.length] });
    const jockeyMat = new THREE.MeshLambertMaterial({ color: horseData.colorInt });

    // Corpo del cavallo
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.7), coatMat);
    body.position.y = 1.1;
    body.castShadow = true;
    group.add(body);

    // Sella / Copertina colorata con il colore del cavallo
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.76), jockeyMat);
    saddle.position.set(-0.1, 1.12, 0);
    group.add(saddle);

    // Collo e Testa
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.45), coatMat);
    neck.position.set(1.0, 1.6, 0);
    neck.rotation.z = -0.4;
    neck.castShadow = true;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.4), coatMat);
    head.position.set(1.4, 1.9, 0);
    head.rotation.z = -0.2;
    head.castShadow = true;
    group.add(head);

    // Coda
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    tail.position.set(-1.3, 1.2, 0);
    tail.rotation.z = 0.5;
    group.add(tail);

    // 4 Zampe animate
    const legGeo = new THREE.BoxGeometry(0.22, 0.85, 0.22);
    const legs = [];
    const legPositions = [
        [0.8, 0.45, 0.22],   // Anteriore dx
        [0.8, 0.45, -0.22],  // Anteriore sx
        [-0.8, 0.45, 0.22],  // Posteriore dx
        [-0.8, 0.45, -0.22]  // Posteriore sx
    ];

    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, coatMat);
        leg.position.set(pos[0], pos[1], pos[2]);
        leg.castShadow = true;
        group.add(leg);
        legs.push(leg);
    });

    // Fantino 3D
    const jockeyBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.45), jockeyMat);
    jockeyBody.position.set(-0.05, 1.85, 0);
    jockeyBody.rotation.z = -0.3;
    jockeyBody.castShadow = true;
    group.add(jockeyBody);

    const jockeyHelmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), jockeyMat);
    jockeyHelmet.position.set(0.1, 2.3, 0);
    group.add(jockeyHelmet);

    group.position.set(START_X, 0, zPos);
    scene.add(group);

    return {
        data: horseData,
        group: group,
        legs: legs,
        x: START_X,
        z: zPos,
        gallopPhase: Math.random() * Math.PI * 2
    };
}

// --- INIZIALIZZAZIONE INTERFACCIA E SCENA ---
function initGame() {
    buildStadium();
    horseSelectEl.innerHTML = "";
    horsesInfoEl.innerHTML = "";

    horsesData.forEach((horse, index) => {
        const horseObj = createHorse3D(horse, index);
        horseMeshes.push(horseObj);

        // Popola select
        const option = document.createElement("option");
        option.value = horse.id;
        option.textContent = `#${horse.id} ${horse.name} (${horse.odds}x)`;
        horseSelectEl.appendChild(option);

        // Popola card quote
        const card = document.createElement("div");
        card.className = "horse-card";
        card.style.borderLeftColor = horse.colorHex;
        card.innerHTML = `
            <span><strong>#${horse.id}</strong> ${horse.name}</span>
            <span><strong>${horse.odds}x</strong></span>
        `;
        horsesInfoEl.appendChild(card);
    });

    updateCameraPosition();
}

// Gestione crediti
refillBtn.addEventListener("click", () => {
    balance += 1000;
    balanceEl.textContent = balance;
    statusBanner.textContent = "Hai aggiunto 1000 € al tuo saldo!";
    statusBanner.style.borderColor = "#00a8ff";
});

// Cambio visuale telecamera
cameraBtn.addEventListener("click", () => {
    cameraMode = (cameraMode + 1) % cameraModesNames.length;
    cameraBtn.textContent = `🎥 Visuale: ${cameraModesNames[cameraMode]}`;
});

// Avvio Gara
let activeBet = null;

startBtn.addEventListener("click", () => {
    if (isRacing) return;

    const selectedHorseId = parseInt(horseSelectEl.value);
    const betAmount = parseInt(betAmountEl.value);

    if (isNaN(betAmount) || betAmount <= 0) {
        alert("Inserisci un importo valido!");
        return;
    }
    if (betAmount > balance) {
        alert("Saldo insufficiente! Clicca su '+1000 € Gratis' in alto.");
        return;
    }

    balance -= betAmount;
    balanceEl.textContent = balance;
    activeBet = { horseId: selectedHorseId, amount: betAmount };

    isRacing = true;
    startBtn.disabled = true;
    horseSelectEl.disabled = true;
    betAmountEl.disabled = true;
    refillBtn.disabled = true;

    const chosenHorse = horsesData.find(h => h.id === selectedHorseId);
    statusBanner.textContent = `Gara in corso! Puntati ${betAmount} € su #${chosenHorse.id} ${chosenHorse.name}...`;
    statusBanner.style.borderColor = "#fbc531";
});

function endRace(winner) {
    isRacing = false;
    resetBtn.disabled = false;
    refillBtn.disabled = false;

    if (winner.id === activeBet.horseId) {
        const winnings = Math.round(activeBet.amount * winner.odds);
        balance += winnings;
        balanceEl.textContent = balance;
        statusBanner.textContent = `🏆 HA VINTO #${winner.id} ${winner.name}! Hai vinto ${winnings} €!`;
        statusBanner.style.borderColor = "#4cd137";
    } else {
        statusBanner.textContent = `❌ Ha vinto #${winner.id} ${winner.name}. Hai perso ${activeBet.amount} €.`;
        statusBanner.style.borderColor = "#e84118";
    }
}

// Reset Gara
resetBtn.addEventListener("click", () => {
    horseMeshes.forEach(h => {
        h.x = START_X;
        h.group.position.x = START_X;
        h.group.position.y = 0;
        h.legs.forEach(leg => leg.rotation.z = 0);
    });

    startBtn.disabled = false;
    horseSelectEl.disabled = false;
    betAmountEl.disabled = false;
    resetBtn.disabled = true;

    statusBanner.textContent = "Piazza la tua scommessa e clicca su 'Via alla Gara!'";
    statusBanner.style.borderColor = "#fbc531";
});

// --- AGGIORNAMENTO CAMERA E LOOP DI ANIMAZIONE 3D ---
function updateCameraPosition() {
    // Trova la posizione media o del cavallo in testa
    let leadX = START_X;
    horseMeshes.forEach(h => {
        if (h.x > leadX) leadX = h.x;
    });

    if (cameraMode === 0) {
        // Visuale laterale inseguimento
        camera.position.lerp(new THREE.Vector3(leadX - 6, 11, 24), 0.08);
        camera.lookAt(leadX + 4, 1.5, 0);
    } else if (cameraMode === 1) {
        // Visuale dall'alto
        camera.position.lerp(new THREE.Vector3(leadX, 28, 12), 0.08);
        camera.lookAt(leadX + 2, 0, 0);
    } else {
        // Visuale dal traguardo
        camera.position.lerp(new THREE.Vector3(FINISH_X + 16, 8, 14), 0.08);
        camera.lookAt(leadX, 1.5, 0);
    }
}

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Animazione pubblico sugli spalti (saltella di più durante la gara)
    const crowdSpeed = isRacing ? 10 : 2.5;
    const crowdAmp = isRacing ? 0.25 : 0.06;
    spectators.forEach(spec => {
        spec.mesh.position.y = spec.baseY + Math.abs(Math.sin(elapsed * crowdSpeed + spec.phase)) * crowdAmp;
    });

    // Logica movimento e animazione galoppo cavalli
    if (isRacing) {
        let winner = null;

        for (let i = 0; i < horseMeshes.length; i++) {
            const h = horseMeshes[i];
            const baseSpeed = (Math.random() * 14 + 8) * delta;
            const oddsBonus = (10 - h.data.odds) * 0.45 * delta;
            h.x += baseSpeed + oddsBonus;
            h.group.position.x = h.x;

            // Animazione salto e movimento zampe al galoppo
            h.gallopPhase += delta * 22;
            h.group.position.y = Math.abs(Math.sin(h.gallopPhase)) * 0.35;
            h.group.rotation.z = Math.cos(h.gallopPhase) * 0.06;

            h.legs[0].rotation.z = Math.sin(h.gallopPhase) * 0.7;
            h.legs[1].rotation.z = Math.sin(h.gallopPhase + 0.4) * 0.7;
            h.legs[2].rotation.z = -Math.sin(h.gallopPhase) * 0.7;
            h.legs[3].rotation.z = -Math.sin(h.gallopPhase + 0.4) * 0.7;

            if (h.x >= FINISH_X && !winner) {
                winner = h.data;
            }
        }

        if (winner) {
            endRace(winner);
        }
    }

    updateCameraPosition();
    renderer.render(scene, camera);
}

// Adatta la finestra se ridimensionata
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

initGame();
animate();
