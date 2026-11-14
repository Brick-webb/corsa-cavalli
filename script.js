// Configurazione dei 6 cavalli
const horsesData = [
    { id: 1, name: "Fulmine Nero", color: "#2c3e50", odds: 2.5 },
    { id: 2, name: "Freccia Rossa", color: "#e74c3c", odds: 3.0 },
    { id: 3, name: "Lampo Blu", color: "#3498db", odds: 4.0 },
    { id: 4, name: "Stella d'Oro", color: "#f1c40f", odds: 5.0 },
    { id: 5, name: "Vento Verde", color: "#2ecc71", odds: 6.5 },
    { id: 6, name: "Ombra Viola", color: "#9b59b6", odds: 8.0 }
];

let balance = 1000;
let isRacing = false;
let raceInterval = null;
let horsePositions = [];

// Elementi DOM
const balanceEl = document.getElementById("balance");
const refillBtn = document.getElementById("refill-btn");
const trackEl = document.getElementById("track");
const horseSelectEl = document.getElementById("horse-select");
const betAmountEl = document.getElementById("bet-amount");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const statusBanner = document.getElementById("status-banner");
const horsesInfoEl = document.getElementById("horses-info");
const crowdTopEl = document.getElementById("crowd-top");
const crowdBottomEl = document.getElementById("crowd-bottom");

// Funzione per generare il pubblico casuale sugli spalti
function generateCrowd() {
    const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#ffffff', '#e67e22', '#34495e'];
    
    [crowdTopEl, crowdBottomEl].forEach(container => {
        container.innerHTML = "";
        for (let i = 0; i < 90; i++) {
            const person = document.createElement("span");
            person.className = "person";
            person.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            person.style.transform = `scale(${0.7 + Math.random() * 0.4})`;
            container.appendChild(person);
        }
    });
}

// Inizializzazione del gioco
function initGame() {
    trackEl.innerHTML = '<div class="finish-line">TRAGUARDO</div>';
    horseSelectEl.innerHTML = "";
    horsesInfoEl.innerHTML = "";
    horsePositions = [];
    generateCrowd();

    horsesData.forEach((horse, index) => {
        // 1. Crea corsia e cavallo sulla pista
        const lane = document.createElement("div");
        lane.className = "lane";

        const laneNum = document.createElement("span");
        laneNum.className = "lane-number";
        laneNum.textContent = horse.id;

        const horseEl = document.createElement("div");
        horseEl.className = "horse";
        horseEl.id = `horse-${horse.id}`;
        horseEl.style.backgroundColor = horse.color;
        horseEl.textContent = horse.id;

        lane.appendChild(laneNum);
        lane.appendChild(horseEl);
        trackEl.appendChild(lane);

        horsePositions[index] = 10;

        // 2. Popola menu a tendina scommesse
        const option = document.createElement("option");
        option.value = horse.id;
        option.textContent = `#${horse.id} ${horse.name} (Quota: ${horse.odds}x)`;
        horseSelectEl.appendChild(option);

        // 3. Popola schede informative
        const card = document.createElement("div");
        card.className = "horse-card";
        card.style.borderLeftColor = horse.color;
        card.innerHTML = `
            <span><strong>#${horse.id}</strong> ${horse.name}</span>
            <span>Quota: <strong>${horse.odds}x</strong></span>
        `;
        horsesInfoEl.appendChild(card);
    });
}

// Ricarica crediti infiniti
refillBtn.addEventListener("click", () => {
    balance += 1000;
    updateBalance();
    statusBanner.textContent = "Hai aggiunto 1000 € al tuo saldo!";
    statusBanner.style.borderLeftColor = "#00a8ff";
});

function updateBalance() {
    balanceEl.textContent = balance;
}

// Avvio della corsa
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
    updateBalance();
    isRacing = true;
    startBtn.disabled = true;
    horseSelectEl.disabled = true;
    betAmountEl.disabled = true;
    refillBtn.disabled = true;

    const chosenHorse = horsesData.find(h => h.id === selectedHorseId);
    statusBanner.textContent = `Gara in corso! Hai puntato ${betAmount} € su ${chosenHorse.name}...`;
    statusBanner.style.borderLeftColor = "#fbc531";

    const finishLinePos = trackEl.clientWidth - 90;

    raceInterval = setInterval(() => {
        for (let i = 0; i < horsesData.length; i++) {
            const baseSpeed = Math.random() * 11;
            const oddsBonus = (10 - horsesData[i].odds) * 0.22;
            horsePositions[i] += baseSpeed + oddsBonus;

            const horseEl = document.getElementById(`horse-${horsesData[i].id}`);
            horseEl.style.left = `${horsePositions[i]}px`;

            if (horsePositions[i] >= finishLinePos) {
                endRace(horsesData[i], selectedHorseId, betAmount);
                break;
            }
        }
    }, 50);
});

// Fine della corsa e calcolo vincite
function endRace(winner, selectedHorseId, betAmount) {
    clearInterval(raceInterval);
    isRacing = false;
    resetBtn.disabled = false;
    refillBtn.disabled = false;

    if (winner.id === selectedHorseId) {
        const winnings = Math.round(betAmount * winner.odds);
        balance += winnings;
        updateBalance();
        statusBanner.textContent = `🏆 HA VINTO #${winner.id} ${winner.name}! Hai vinto ${winnings} €!`;
        statusBanner.style.borderLeftColor = "#4cd137";
    } else {
        statusBanner.textContent = `❌ Ha vinto #${winner.id} ${winner.name}. Peccato, hai perso ${betAmount} €.`;
        statusBanner.style.borderLeftColor = "#e84118";
    }
}

// Reset per una nuova gara
resetBtn.addEventListener("click", () => {
    horsePositions = horsePositions.map(() => 10);
    horsesData.forEach(horse => {
        const horseEl = document.getElementById(`horse-${horse.id}`);
        horseEl.style.left = "10px";
    });

    startBtn.disabled = false;
    horseSelectEl.disabled = false;
    betAmountEl.disabled = false;
    resetBtn.disabled = true;

    statusBanner.textContent = "Piazza la tua scommessa e clicca su 'Via alla Gara!'";
    statusBanner.style.borderLeftColor = "#fbc531";
});

// Avvia al caricamento della pagina
initGame();
