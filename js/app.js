/**
 * My Gym Tracker - App principale v2.0
 * Versione completamente corretta e ottimizzata
 */

class GymTracker {
    constructor() {
        this.currentWorkout = null;
        this.currentWorkoutData = {};
        this.isOnline = navigator.onLine;
        this.pendingSync = [];
        this.autoSaveTimer = null;
        this.charts = {};

        // Init quando DOM è pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Inizializzazione app
     */
    init() {
        console.log('🚀 GymTracker v2.0 inizializzato');
        this.setupEventListeners();
        this.updateCurrentDate();
        this.loadPendingSync();
        this.checkConnection();
        this.showMainMenu();
    }

    /* ============================
       NAVIGAZIONE PRINCIPALE
    ============================ */
    
    /**
     * Mostra il menu principale
     */
    showMainMenu() {
        console.log('📱 Mostrando menu principale');
        this.hideAllSections();
        document.getElementById('main-menu').style.display = 'block';
    }

    /**
     * Mostra il sottomenu sessioni
     */
    showSubmenu() {
        console.log('📋 Mostrando sottomenu sessioni');
        this.hideAllSections();
        document.getElementById('submenu').style.display = 'block';
        this.updateCurrentDate();
    }

    /**
 * MODIFICA PER app.js - Sezione Statistiche Migliorata
 * Sostituisci la funzione showStats() con questa versione
 */

/**
 * Mostra sezione statistiche con grafici per esercizio
 */
async showStats() {
    console.log('📊 Caricando statistiche per esercizio...');
    this.hideAllSections();
    document.getElementById('stats-section').style.display = 'block';
    
    this.showLoading(true);
    
    try {
        // Recupera lo storico allenamenti
        const url = `${CONFIG.webAppUrl}?action=getHistory&limit=100`;
        console.log('Chiamando:', url);
        
        const res = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-store'
        });
        
        const json = await res.json();
        console.log('Risposta statistiche:', json);
        
        if (!json?.success) {
            this.showMessage('⚠️ Impossibile caricare le statistiche', 'error');
            return;
        }
        
        const workouts = json.workouts || [];
        
        if (workouts.length === 0) {
            this.showMessage('ℹ️ Nessun dato disponibile', 'info');
            this.renderEmptyStats();
            return;
        }
        
        // Elabora i dati per esercizio
        const exerciseData = this.processExerciseData(workouts);
        
        // Renderizza i grafici per ogni esercizio
        this.renderExerciseCharts(exerciseData);
        
    } catch (err) {
        console.error('Errore caricamento statistiche:', err);
        this.showMessage('❌ Errore nel caricamento', 'error');
    } finally {
        this.showLoading(false);
    }
}

/**
 * Elabora i dati raggruppandoli per esercizio
 */
processExerciseData(workouts) {
    const exerciseMap = {};
    
    // Itera su tutti gli allenamenti
    workouts.forEach(workout => {
        const date = new Date(workout.date || workout.timestamp);
        const dateStr = date.toLocaleDateString('it-IT', { 
            day: '2-digit', 
            month: '2-digit',
            year: '2-digit'
        });
        
        // Itera su tutti gli esercizi dell'allenamento
        (workout.exercises || []).forEach(exercise => {
            const name = exercise.name;
            
            if (!exerciseMap[name]) {
                exerciseMap[name] = {
                    name: name,
                    dates: [],
                    maxWeights: [],
                    volumes: [],
                    avgWeights: [],
                    totalSessions: 0,
                    personalRecord: 0,
                    lastSession: null,
                    trend: 'stable' // 'up', 'down', 'stable'
                };
            }
            
            // Aggiungi dati
            exerciseMap[name].dates.push(dateStr);
            exerciseMap[name].maxWeights.push(exercise.maxWeight || 0);
            exerciseMap[name].volumes.push(exercise.volume || 0);
            
            // Calcola peso medio delle serie
            const validSets = (exercise.sets || []).filter(s => s > 0);
            const avgWeight = validSets.length > 0 
                ? validSets.reduce((a, b) => a + b, 0) / validSets.length 
                : 0;
            exerciseMap[name].avgWeights.push(avgWeight);
            
            // Aggiorna statistiche
            exerciseMap[name].totalSessions++;
            exerciseMap[name].personalRecord = Math.max(
                exerciseMap[name].personalRecord, 
                exercise.maxWeight || 0
            );
            exerciseMap[name].lastSession = dateStr;
        });
    });
    
    // Calcola trend per ogni esercizio
    Object.values(exerciseMap).forEach(exercise => {
        if (exercise.maxWeights.length >= 3) {
            const recent = exercise.maxWeights.slice(-3);
            const older = exercise.maxWeights.slice(-6, -3);
            
            if (older.length > 0) {
                const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
                const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
                
                if (recentAvg > olderAvg * 1.05) {
                    exercise.trend = 'up';
                } else if (recentAvg < olderAvg * 0.95) {
                    exercise.trend = 'down';
                } else {
                    exercise.trend = 'stable';
                }
            }
        }
    });
    
    return exerciseMap;
}

/**
 * Renderizza i grafici per ogni esercizio
 */
renderExerciseCharts(exerciseData) {
    const container = document.getElementById('stats-section');
    
    // Pulisci contenuto esistente mantenendo il bottone back
    const backButton = container.querySelector('.back-button');
    container.innerHTML = '';
    if (backButton) container.appendChild(backButton);
    
    // Titolo sezione
    const title = document.createElement('h2');
    title.style.cssText = 'text-align:center; margin: 20px 0; color: var(--neon-green); text-transform: uppercase; letter-spacing: 2px;';
    title.textContent = '📊 Progressione per Esercizio';
    container.appendChild(title);
    
    // Crea select per filtrare esercizi
    const filterContainer = document.createElement('div');
    filterContainer.style.cssText = 'margin: 20px 0; padding: 15px; background: rgba(0,255,255,0.05); border: 1px solid rgba(0,255,255,0.3);';
    filterContainer.innerHTML = `
        <label style="color: var(--neon-cyan); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
            Filtra Esercizio:
        </label>
        <select id="exercise-filter" style="
            width: 100%;
            margin-top: 10px;
            padding: 10px;
            background: rgba(0,0,0,0.5);
            border: 1px solid var(--neon-green);
            color: var(--neon-green);
            font-family: var(--font-mono);
            font-size: 12px;
            text-transform: uppercase;
        ">
            <option value="all">[ TUTTI GLI ESERCIZI ]</option>
            ${Object.keys(exerciseData).map(name => 
                `<option value="${name}">> ${name}</option>`
            ).join('')}
        </select>
    `;
    container.appendChild(filterContainer);
    
    // Ordina esercizi per numero di sessioni (più frequenti prima)
    const sortedExercises = Object.entries(exerciseData)
        .sort((a, b) => b[1].totalSessions - a[1].totalSessions);
    
    // Crea una card con grafico per ogni esercizio
    sortedExercises.forEach(([name, data], index) => {
        const card = document.createElement('div');
        card.className = 'exercise-card exercise-stats-card';
        card.dataset.exerciseName = name;
        card.style.cssText = 'margin: 20px 0; padding: 20px;';
        
        // Header della card con statistiche
        const trendIcon = data.trend === 'up' ? '📈' : 
                         data.trend === 'down' ? '📉' : '';
        const trendColor = data.trend === 'up' ? 'var(--neon-green)' : 
                          data.trend === 'down' ? '#ff0040' : 'var(--neon-yellow)';
        
        card.innerHTML = `
            <div class="exercise-name" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span>${name}</span>
                ${trendIcon ? `<span style="color: ${trendColor}; font-size: 20px;">${trendIcon}</span>` : ''}
            </div>
            <div class="exercise-details" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                <div style="padding: 10px; background: rgba(0,255,65,0.05); border: 1px solid rgba(0,255,65,0.2);">
                    <div style="color: var(--text-muted); font-size: 10px; text-transform: uppercase;">Record</div>
                    <div style="color: var(--neon-green); font-size: 18px; font-weight: bold;">${data.personalRecord.toFixed(1)} kg</div>
                </div>
                <div style="padding: 10px; background: rgba(0,255,255,0.05); border: 1px solid rgba(0,255,255,0.2);">
                    <div style="color: var(--text-muted); font-size: 10px; text-transform: uppercase;">Sessioni</div>
                    <div style="color: var(--neon-cyan); font-size: 18px; font-weight: bold;">${data.totalSessions}</div>
                </div>
            </div>
            
            <!-- Tab per scegliere tipo di grafico -->
            <div class="chart-tabs" style="display: flex; gap: 5px; margin-bottom: 15px;">
                <button class="chart-tab active" data-chart="weight" style="
                    flex: 1;
                    padding: 8px;
                    background: rgba(0,255,65,0.1);
                    border: 1px solid var(--neon-green);
                    color: var(--neon-green);
                    font-size: 11px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: all 0.3s;
                ">Peso Max</button>
                <button class="chart-tab" data-chart="volume" style="
                    flex: 1;
                    padding: 8px;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid var(--text-muted);
                    color: var(--text-muted);
                    font-size: 11px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: all 0.3s;
                ">Volume</button>
                <button class="chart-tab" data-chart="average" style="
                    flex: 1;
                    padding: 8px;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid var(--text-muted);
                    color: var(--text-muted);
                    font-size: 11px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: all 0.3s;
                ">Media</button>
            </div>
            
            <!-- Canvas per il grafico -->
            <div class="chart-container" style="position: relative; height: 200px;">
                <canvas id="chart-${index}" height="200"></canvas>
            </div>
            
            <!-- Info ultima sessione -->
            <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
                <span style="color: var(--text-muted); font-size: 11px;">
                    Ultima sessione: ${data.lastSession}
                </span>
            </div>
        `;
        
        container.appendChild(card);
        
        // Crea il grafico iniziale (peso max)
        this.createExerciseChart(`chart-${index}`, data, 'weight');
        
        // Aggiungi event listeners per i tab
        card.querySelectorAll('.chart-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Rimuovi active da tutti i tab
                card.querySelectorAll('.chart-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'rgba(0,0,0,0.3)';
                    t.style.borderColor = 'var(--text-muted)';
                    t.style.color = 'var(--text-muted)';
                });
                
                // Aggiungi active al tab cliccato
                e.target.classList.add('active');
                e.target.style.background = 'rgba(0,255,65,0.1)';
                e.target.style.borderColor = 'var(--neon-green)';
                e.target.style.color = 'var(--neon-green)';
                
                // Ricrea il grafico con il nuovo tipo
                const chartType = e.target.dataset.chart;
                this.createExerciseChart(`chart-${index}`, data, chartType);
            });
        });
    });
    
    // Aggiungi event listener per il filtro
    document.getElementById('exercise-filter').addEventListener('change', (e) => {
        const value = e.target.value;
        document.querySelectorAll('.exercise-stats-card').forEach(card => {
            if (value === 'all') {
                card.style.display = 'block';
            } else {
                card.style.display = card.dataset.exerciseName === value ? 'block' : 'none';
            }
        });
    });
}

/**
 * Crea un grafico per un singolo esercizio
 */
createExerciseChart(canvasId, data, type = 'weight') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Distruggi grafico esistente se presente
    if (canvas.chart) {
        canvas.chart.destroy();
    }
    
    // Prepara i dati in base al tipo
    let dataset, label, color, bgColor;
    
    switch(type) {
        case 'volume':
            dataset = data.volumes;
            label = 'Volume Totale';
            color = '#00ffff'; // Cyan neon
            bgColor = 'rgba(0, 255, 255, 0.1)';
            break;
        case 'average':
            dataset = data.avgWeights;
            label = 'Peso Medio';
            color = '#ffff00'; // Yellow neon
            bgColor = 'rgba(255, 255, 0, 0.1)';
            break;
        default: // weight
            dataset = data.maxWeights;
            label = 'Peso Massimo (kg)';
            color = '#00ff41'; // Green neon
            bgColor = 'rgba(0, 255, 65, 0.1)';
    }
    
    // Limita a ultimi 10 allenamenti per leggibilità
    const limit = 10;
    const labels = data.dates.slice(-limit);
    const values = dataset.slice(-limit);
    
    // Se c'è un solo punto, aggiungi un punto fittizio per mostrare meglio
    const displayLabels = labels.length === 1 ? ['', ...labels, ''] : labels;
    const displayValues = values.length === 1 ? [null, ...values, null] : values;
    
    // Crea il grafico
    canvas.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayLabels,
            datasets: [{
                label: label,
                data: displayValues,
                borderColor: color,
                backgroundColor: bgColor,
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 6,
                pointBackgroundColor: color,
                pointBorderColor: '#0a0e1b', // Colore sfondo per contrasto
                pointBorderWidth: 2,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#00ffff',
                    bodyColor: '#00ff41',
                    borderColor: color,
                    borderWidth: 1,
                    displayColors: false,
                    padding: 12,
                    cornerRadius: 0,
                    titleFont: {
                        family: 'JetBrains Mono',
                        size: 11
                    },
                    bodyFont: {
                        family: 'JetBrains Mono',
                        size: 13,
                        weight: 'bold'
                    },
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            if (value === null) return '';
                            if (type === 'volume') {
                                return `Volume: ${value.toFixed(0)} kg`;
                            }
                            return `${label}: ${value.toFixed(1)} kg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 255, 255, 0.1)',
                        borderColor: 'rgba(0, 255, 255, 0.3)'
                    },
                    ticks: {
                        color: '#8892b0',
                        font: {
                            family: 'JetBrains Mono',
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 255, 65, 0.1)',
                        borderColor: 'rgba(0, 255, 65, 0.3)'
                    },
                    ticks: {
                        color: '#8892b0',
                        font: {
                            family: 'JetBrains Mono',
                            size: 10
                        },
                        callback: function(value) {
                            if (value === null) return '';
                            return value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

/**
 * Renderizza stato vuoto per le statistiche
 */
renderEmptyStats() {
    const container = document.getElementById('stats-section');
    
    const backButton = container.querySelector('.back-button');
    container.innerHTML = '';
    if (backButton) container.appendChild(backButton);
    
    const emptyState = document.createElement('div');
    emptyState.style.cssText = `
        text-align: center;
        padding: 50px 20px;
        color: var(--text-muted);
    `;
    emptyState.innerHTML = `
        <h2 style="color: var(--neon-cyan); margin-bottom: 20px;">📊 Nessun Dato Disponibile</h2>
        <p style="margin-bottom: 30px;">Completa almeno un allenamento per vedere le statistiche</p>
        <button class="menu-button success" onclick="showSubmenu()">
            Inizia Allenamento
        </button>
    `;
    
    container.appendChild(emptyState);
}

    /**
     * Mostra record personali
     */
    async showMaxRecords() {
        console.log('🏆 Caricando record personali...');
        this.hideAllSections();
        document.getElementById('records-section').style.display = 'block';
        
        this.showLoading(true);
        
        try {
            const url = `${CONFIG.webAppUrl}?action=getRecords`;
            console.log('Chiamando:', url);
            
            const res = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-store'
            });
            
            const json = await res.json();
            console.log('Risposta record:', json);
            
            if (!json?.success) {
                this.showMessage('⚠️ Impossibile caricare i record', 'error');
                return;
            }
            
            this.renderRecordsTable(json.records || []);
            
        } catch (err) {
            console.error('Errore caricamento record:', err);
            this.showMessage('❌ Errore nel caricamento', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Mostra gestione schede
     */
    async showSchede() {
        console.log('📝 Caricando schede...');
        this.hideAllSections();
        document.getElementById('schede-section').style.display = 'block';
        
        this.showLoading(true);
        
        try {
            const url = `${CONFIG.webAppUrl}?action=getHistory&limit=30`;
            console.log('Chiamando:', url);
            
            const res = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-store'
            });
            
            const json = await res.json();
            console.log('Risposta schede:', json);
            
            if (!json?.success) {
                this.showMessage('⚠️ Impossibile caricare lo storico', 'error');
                return;
            }
            
            this.renderSchede(json.workouts || []);
            
        } catch (err) {
            console.error('Errore caricamento schede:', err);
            this.showMessage('❌ Errore nel caricamento', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Nasconde tutte le sezioni
     */
    hideAllSections() {
        const sections = [
            'main-menu', 
            'submenu', 
            'workout-session',
            'stats-section',
            'records-section', 
            'schede-section'
        ];
        
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
            }
        });
    }


    /**
 * SISTEMA GESTIONE SCHEDE PERSONALIZZATE
 * Aggiungi queste funzioni al tuo app.js nella classe GymTracker
 */

/**
 * Mostra la sezione gestione schede con editor completo
 */
async showSchede() {
    console.log('📝 Caricando gestione schede...');
    this.hideAllSections();
    
    // Crea/mostra la sezione schede se non esiste
    let schedeSection = document.getElementById('schede-section');
    if (!schedeSection) {
        schedeSection = document.createElement('div');
        schedeSection.id = 'schede-section';
        schedeSection.className = 'workout-session';
        schedeSection.style.display = 'none';
        document.querySelector('.container').appendChild(schedeSection);
    }
    
    schedeSection.style.display = 'block';
    
    // Carica schede salvate
    const savedWorkouts = this.loadCustomWorkouts();
    
    // Renderizza l'interfaccia
    this.renderSchedeManager(savedWorkouts);
}

/**
 * Carica schede personalizzate dal localStorage
 */
loadCustomWorkouts() {
    try {
        const saved = localStorage.getItem('custom_schede');
        if (saved) {
            const schede = JSON.parse(saved);
            console.log('Schede caricate dal localStorage:', schede);
            return schede;
        }
    } catch (err) {
        console.error('Errore caricamento schede:', err);
    }
    
    console.log('Nessuna scheda salvata, creo default vuota');
    
    // NON usare più WORKOUT_TEMPLATES, crea scheda vuota
    const emptyScheda = {
        1: {
            id: 1,
            name: "Nuova Scheda",
            description: "Configura i tuoi allenamenti",
            isActive: true,
            workout1: {
                id: 1,
                name: "Primo Allenamento",
                description: "Da configurare",
                exercises: []
            },
            workout2: {
                id: 2,
                name: "Secondo Allenamento",
                description: "Da configurare",
                exercises: []
            },
            workout3: {
                id: 3,
                name: "Terzo Allenamento - Leggero",
                description: "Generato automaticamente",
                exercises: []
            }
        }
    };
    
    // Salva e attiva la scheda vuota
    this.saveCustomWorkouts(emptyScheda);
    localStorage.setItem('active_scheda_id', '1');
    
    return emptyScheda;
}

/**
 * Salva schede personalizzate nel localStorage
 */
saveCustomWorkouts(workouts) {
    try {
        localStorage.setItem('custom_schede', JSON.stringify(workouts));
        return true;
    } catch (err) {
        console.error('Errore salvataggio schede:', err);
        return false;
    }
}

/**
 * Renderizza l'interfaccia di gestione schede
 */
renderSchedeManager(workouts) {
    const container = document.getElementById('schede-section');
    const activeSchedaId = localStorage.getItem('active_scheda_id');
    
    container.innerHTML = `
        <!-- Back Button -->
        <button class="menu-button back-button" onclick="showMainMenu()">
            ← Torna al Menu
        </button>
        
        <!-- Titolo -->
        <h2 style="text-align: center; margin: 20px 0; color: var(--neon-green); text-transform: uppercase; letter-spacing: 2px;">
            📋 Gestione Schede Allenamento
        </h2>
        
        <!-- Info Sistema -->
        <div class="exercise-card" style="background: rgba(0,255,255,0.05); border-color: var(--neon-cyan);">
            <div class="exercise-name">ℹ️ Sistema Allenamento</div>
            <div class="exercise-details">
                • <strong>Allenamento 1:</strong> Prima parte della scheda<br>
                • <strong>Allenamento 2:</strong> Seconda parte della scheda<br>
                • <strong>Allenamento 3:</strong> Combinazione leggera (-25% peso) dei primi due
            </div>
        </div>
        
        <!-- Bottone Nuova Scheda -->
        <button class="menu-button success" onclick="app.createNewScheda()">
            ➕ CREA NUOVA SCHEDA
        </button>
        
        <!-- Lista Schede Esistenti -->
        <div id="schede-list" style="margin-top: 30px;">
            ${Object.entries(workouts).map(([id, scheda]) => `
                <div class="exercise-card workout-card ${id === activeSchedaId ? 'active-scheda' : ''}" 
                     data-scheda-id="${id}" 
                     style="margin: 15px 0; ${id === activeSchedaId ? 'border-color: var(--neon-green); background: rgba(0,255,65,0.05);' : ''}">
                    
                    <div class="exercise-name" style="display: flex; justify-content: space-between; align-items: center;">
                        <span>
                            ${scheda.name} 
                            ${id === activeSchedaId ? '<span style="color: var(--neon-cyan); font-size: 12px;">[ATTIVA]</span>' : ''}
                        </span>
                        <div style="display: flex; gap: 10px;">
                            ${id !== activeSchedaId ? `
                                <button onclick="app.activateScheda('${id}')" style="
                                    padding: 5px 10px;
                                    background: rgba(0,255,65,0.1);
                                    border: 1px solid var(--neon-green);
                                    color: var(--neon-green);
                                    font-size: 11px;
                                    cursor: pointer;
                                    text-transform: uppercase;
                                ">✓ Attiva</button>
                            ` : ''}
                            <button onclick="app.editScheda('${id}')" style="
                                padding: 5px 10px;
                                background: rgba(0,255,255,0.1);
                                border: 1px solid var(--neon-cyan);
                                color: var(--neon-cyan);
                                font-size: 11px;
                                cursor: pointer;
                                text-transform: uppercase;
                            ">✏️ Modifica</button>
                            <button onclick="app.deleteScheda('${id}')" style="
                                padding: 5px 10px;
                                background: rgba(255,0,0,0.1);
                                border: 1px solid #ff0040;
                                color: #ff0040;
                                font-size: 11px;
                                cursor: pointer;
                                text-transform: uppercase;
                            ">🗑️ Elimina</button>
                        </div>
                    </div>
                    
                    <div class="exercise-details" style="margin: 10px 0;">
                        ${scheda.description || 'Nessuna descrizione'}
                    </div>
                    
                    <!-- Dettagli Allenamenti -->
                    <div style="padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
                        <details>
                            <summary style="cursor: pointer; color: var(--neon-cyan); font-size: 12px;">
                                ALLENAMENTO 1 (${scheda.workout1?.exercises?.length || 0} esercizi)
                            </summary>
                            <ul style="list-style: none; padding: 10px 0 0 20px;">
                                ${(scheda.workout1?.exercises || []).map(ex => `
                                    <li style="color: var(--text-white); font-size: 11px; padding: 2px 0;">
                                        > ${ex.name} - ${ex.sets}x${ex.reps}
                                    </li>
                                `).join('')}
                            </ul>
                        </details>
                        
                        <details style="margin-top: 10px;">
                            <summary style="cursor: pointer; color: var(--neon-cyan); font-size: 12px;">
                                ALLENAMENTO 2 (${scheda.workout2?.exercises?.length || 0} esercizi)
                            </summary>
                            <ul style="list-style: none; padding: 10px 0 0 20px;">
                                ${(scheda.workout2?.exercises || []).map(ex => `
                                    <li style="color: var(--text-white); font-size: 11px; padding: 2px 0;">
                                        > ${ex.name} - ${ex.sets}x${ex.reps}
                                    </li>
                                `).join('')}
                            </ul>
                        </details>

                        <!-- Dopo il secondo details, aggiungi: -->
<details style="margin-top: 10px;">
    <summary style="cursor: pointer; color: var(--neon-green); font-size: 12px;">
        ALLENAMENTO 3 - LEGGERO (${scheda.workout3?.exercises?.length || 0} esercizi)
    </summary>
    <ul style="list-style: none; padding: 10px 0 0 20px;">
        ${(scheda.workout3?.exercises || []).map(ex => `
            <li style="color: var(--text-white); font-size: 11px; padding: 2px 0;">
                > ${ex.name} - ${ex.sets}x${ex.reps} <span style="color: var(--neon-yellow);">(-25% peso)</span>
            </li>
        `).join('')}
    </ul>
</details>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <!-- Editor Scheda (nascosto inizialmente) -->
        <div id="scheda-editor" style="display: none; margin-top: 30px;">
            <!-- Verrà popolato dinamicamente -->
        </div>
    `;
}

/**
 * Attiva una scheda
 */
activateScheda(schedaId) {
    this.setActiveScheda(schedaId);
    this.showSchede(); // Ricarica la vista
}

/**
 * Crea una nuova scheda completa
 */
/**
 * Crea una nuova scheda completa
 */
createNewScheda() {
    console.log('➕ Creando nuova scheda...');
    
    const schede = this.loadCustomWorkouts();
    const newId = Math.max(...Object.keys(schede).map(k => parseInt(k)), 0) + 1;
    
    const newScheda = {
        id: newId,
        name: `Scheda ${newId}`,
        description: '',
        isActive: false,
        workout1: {
            id: 1,
            name: "Primo Allenamento",
            description: "Prima parte della scheda",
            exercises: []
        },
        workout2: {
            id: 2,
            name: "Secondo Allenamento", 
            description: "Seconda parte della scheda",
            exercises: []
        },
        workout3: {
            id: 3,
            name: "Terzo Allenamento - Leggero",
            description: "Combinazione leggera con peso ridotto del 25%",
            exercises: []
        }
    };
    
    this.showSchedaEditor(newScheda, true);
}


/**
 * Modifica una scheda esistente
 */
editScheda(schedaId) {
    console.log('✏️ Modificando scheda:', schedaId);
    
    const schede = this.loadCustomWorkouts();
    const scheda = schede[schedaId];
    
    if (!scheda) {
        this.showMessage('⌠ Scheda non trovata', 'error');
        return;
    }
    
    this.showSchedaEditor(scheda, false);
}

/**
 * Mostra l'editor per schede complete (3 allenamenti)
 */
showSchedaEditor(scheda, isNew = false) {
    const editorContainer = document.getElementById('scheda-editor');
    const listContainer = document.getElementById('schede-list');
    
    // Nascondi lista, mostra editor
    listContainer.style.display = 'none';
    editorContainer.style.display = 'block';
    
    editorContainer.innerHTML = `
        <div class="exercise-card" style="padding: 20px;">
            <h3 style="color: var(--neon-green); margin-bottom: 20px; text-transform: uppercase;">
                ${isNew ? '➕ Nuova Scheda' : '✏️ Modifica Scheda'}
            </h3>
            
            <!-- Info Base Scheda -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; color: var(--neon-cyan); font-size: 11px; margin-bottom: 5px; text-transform: uppercase;">
                    Nome Scheda:
                </label>
                <input type="text" id="scheda-name" value="${scheda.name}" style="
                    width: 100%;
                    padding: 10px;
                    background: rgba(0,0,0,0.5);
                    border: 1px solid var(--neon-green);
                    color: var(--neon-green);
                    font-family: var(--font-mono);
                    font-size: 14px;
                ">
            </div>
            
            <div style="margin-bottom: 30px;">
                <label style="display: block; color: var(--neon-cyan); font-size: 11px; margin-bottom: 5px; text-transform: uppercase;">
                    Descrizione:
                </label>
                <textarea id="scheda-description" style="
                    width: 100%;
                    padding: 10px;
                    background: rgba(0,0,0,0.5);
                    border: 1px solid var(--neon-green);
                    color: var(--neon-green);
                    font-family: var(--font-mono);
                    font-size: 12px;
                    min-height: 60px;
                    resize: vertical;
                ">${scheda.description || ''}</textarea>
            </div>
            
            <!-- ALLENAMENTO 1 -->
            <div style="border: 1px solid var(--neon-cyan); padding: 15px; margin-bottom: 20px;">
                <h4 style="color: var(--neon-cyan); margin-bottom: 15px;">
                    🥇 PRIMO ALLENAMENTO
                    <span style="font-size: 11px; color: var(--text-muted); float: right;">
                        ✓ = includi nel terzo
                    </span>
                </h4>
                <div id="workout1-exercises">
                    ${(scheda.workout1?.exercises || []).map((ex, idx) => 
                        this.renderExerciseRow(ex, 1, idx)
                    ).join('')}
                </div>
                <button class="menu-button secondary" onclick="app.addExerciseToWorkout(1)" style="margin-top: 10px;">
                    ➕ Aggiungi Esercizio
                </button>
            </div>
            
            <!-- ALLENAMENTO 2 -->
            <div style="border: 1px solid var(--neon-cyan); padding: 15px; margin-bottom: 20px;">
                <h4 style="color: var(--neon-cyan); margin-bottom: 15px;">
                    🥈 SECONDO ALLENAMENTO
                    <span style="font-size: 11px; color: var(--text-muted); float: right;">
                        ✓ = includi nel terzo
                    </span>
                </h4>
                <div id="workout2-exercises">
                    ${(scheda.workout2?.exercises || []).map((ex, idx) => 
                        this.renderExerciseRow(ex, 2, idx)
                    ).join('')}
                </div>
                <button class="menu-button secondary" onclick="app.addExerciseToWorkout(2)" style="margin-top: 10px;">
                    ➕ Aggiungi Esercizio
                </button>
            </div>
            
            <!-- PREVIEW ALLENAMENTO 3 -->
            <div style="border: 2px solid var(--neon-green); padding: 15px; margin-bottom: 20px; background: rgba(0,255,65,0.02);">
                <h4 style="color: var(--neon-green); margin-bottom: 15px;">
                    🥉 TERZO ALLENAMENTO - ANTEPRIMA (Generato Automaticamente)
                </h4>
                <div style="background: rgba(255,255,0,0.05); border: 1px solid rgba(255,255,0,0.3); padding: 10px; margin-bottom: 15px;">
                    <p style="color: var(--neon-yellow); font-size: 11px; margin: 0;">
                        ⚠️ Il terzo allenamento viene generato automaticamente dagli esercizi selezionati (✓) del primo e secondo allenamento.
                        L'ordine sarà: prima tutti gli esercizi spuntati del primo, poi quelli del secondo. 
                        I pesi suggeriti saranno ridotti del 25%.
                    </p>
                </div>
                <div id="workout3-preview" style="padding: 10px; background: rgba(0,0,0,0.3);">
                    <!-- Preview generata dinamicamente -->
                </div>
                <button class="menu-button secondary" onclick="app.updateWorkout3Preview()" style="margin-top: 10px;">
                    🔄 Aggiorna Anteprima
                </button>
            </div>
            
            <!-- Bottoni Azione -->
            <div style="display: flex; gap: 10px;">
                <button class="menu-button success" onclick="app.saveScheda(${scheda.id}, ${isNew})" style="flex: 1;">
                    💾 Salva Scheda
                </button>
                <button class="menu-button warning" onclick="app.cancelSchedaEdit()" style="flex: 1;">
                    ❌ Annulla
                </button>
            </div>
        </div>
    `;
    
    // Aggiungi listener per aggiornare preview quando cambiano le checkbox
    setTimeout(() => {
        document.querySelectorAll('.exercise-checkbox').forEach(cb => {
            cb.addEventListener('change', () => this.updateWorkout3Preview());
        });
        this.updateWorkout3Preview();
    }, 100);
}

/**
 * Aggiorna la preview del terzo allenamento
 */
updateWorkout3Preview() {
    const preview = document.getElementById('workout3-preview');
    if (!preview) return;
    
    const selectedExercises = [];
    
    // Raccogli esercizi selezionati dal primo allenamento
    document.querySelectorAll('#workout1-exercises .exercise-checkbox:checked').forEach(cb => {
        const row = cb.closest('.exercise-row');
        const index = row.dataset.index;
        const name = document.getElementById(`ex-1-${index}-name`)?.value;
        if (name) {
            selectedExercises.push({
                name: name,
                from: 'Allenamento 1'
            });
        }
    });
    
    // Raccogli esercizi selezionati dal secondo allenamento
    document.querySelectorAll('#workout2-exercises .exercise-checkbox:checked').forEach(cb => {
        const row = cb.closest('.exercise-row');
        const index = row.dataset.index;
        const name = document.getElementById(`ex-2-${index}-name`)?.value;
        if (name) {
            selectedExercises.push({
                name: name,
                from: 'Allenamento 2'
            });
        }
    });
    
    if (selectedExercises.length === 0) {
        preview.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Nessun esercizio selezionato</p>';
    } else {
        preview.innerHTML = `
            <ol style="list-style: none; padding: 0;">
                ${selectedExercises.map((ex, i) => `
                    <li style="padding: 5px 0; color: var(--text-white); font-size: 12px;">
                        ${i + 1}. ${ex.name} 
                        <span style="color: var(--text-muted); font-size: 10px;">(da ${ex.from})</span>
                        <span style="color: var(--neon-yellow); font-size: 10px;">-25% peso</span>
                    </li>
                `).join('')}
            </ol>
        `;
    }
}

/**
 * Renderizza una riga esercizio nell'editor
 */
renderExerciseRow(exercise, workoutNum, index) {
    // Aggiungi checkbox solo per workout 1 e 2
    const showCheckbox = workoutNum <= 2;
    
    return `
        <div class="exercise-row" data-workout="${workoutNum}" data-index="${index}" style="
            margin: 10px 0;
            padding: 10px;
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
        ">
            <!-- Prima riga: checkbox + nome + elimina -->
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                ${showCheckbox ? `
                    <input type="checkbox" 
                        id="ex-${workoutNum}-${index}-check" 
                        data-workout="${workoutNum}"
                        data-index="${index}"
                        class="exercise-checkbox"
                        ${exercise.includeInThird ? 'checked' : ''}
                        style="
                            width: 20px;
                            height: 20px;
                            cursor: pointer;
                            accent-color: var(--neon-green);
                        "
                        title="Includi nel terzo allenamento">
                ` : '<div style="width: 20px;"></div>'}
                
                <input type="text" 
                    id="ex-${workoutNum}-${index}-name" 
                    value="${exercise.name || ''}" 
                    placeholder="Nome esercizio"
                    style="
                        flex: 1;
                        padding: 8px;
                        background: rgba(0,0,0,0.5);
                        border: 1px solid rgba(0,255,255,0.3);
                        color: var(--neon-cyan);
                        font-family: var(--font-mono);
                        font-size: 12px;
                    ">
                
                <button onclick="app.removeExerciseRow(${workoutNum}, ${index})" style="
                    padding: 8px 12px;
                    background: rgba(255,0,0,0.1);
                    border: 1px solid #ff0040;
                    color: #ff0040;
                    font-size: 11px;
                    cursor: pointer;
                    white-space: nowrap;
                ">🗑️</button>
            </div>
            
            <!-- Seconda riga: serie + reps -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div>
                    <label style="color: var(--text-muted); font-size: 10px;">SERIE:</label>
                    <input type="number" 
                        id="ex-${workoutNum}-${index}-sets" 
                        value="${exercise.sets || 3}" 
                        min="1" max="10"
                        style="
                            width: 100%;
                            padding: 6px;
                            background: rgba(0,0,0,0.5);
                            border: 1px solid rgba(0,255,255,0.3);
                            color: var(--neon-green);
                            font-family: var(--font-mono);
                            font-size: 12px;
                            text-align: center;
                        ">
                </div>
                
                <div>
                    <label style="color: var(--text-muted); font-size: 10px;">REPS:</label>
                    <input type="text" 
                        id="ex-${workoutNum}-${index}-reps" 
                        value="${exercise.reps || '8-10'}" 
                        placeholder="8-10"
                        style="
                            width: 100%;
                            padding: 6px;
                            background: rgba(0,0,0,0.5);
                            border: 1px solid rgba(0,255,255,0.3);
                            color: var(--neon-green);
                            font-family: var(--font-mono);
                            font-size: 12px;
                            text-align: center;
                        ">
                </div>
            </div>
            
            <!-- Terza riga: categoria + equipment -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <select id="ex-${workoutNum}-${index}-category" style="
                    padding: 6px;
                    background: rgba(0,0,0,0.5);
                    border: 1px solid rgba(0,255,255,0.3);
                    color: var(--neon-cyan);
                    font-family: var(--font-mono);
                    font-size: 11px;
                ">
                    <option value="Petto" ${exercise.category === 'Petto' ? 'selected' : ''}>Petto</option>
                    <option value="Dorso" ${exercise.category === 'Dorso' ? 'selected' : ''}>Dorso</option>
                    <option value="Spalle" ${exercise.category === 'Spalle' ? 'selected' : ''}>Spalle</option>
                    <option value="Gambe" ${exercise.category === 'Gambe' ? 'selected' : ''}>Gambe</option>
                    <option value="Bicipiti" ${exercise.category === 'Bicipiti' ? 'selected' : ''}>Bicipiti</option>
                    <option value="Tricipiti" ${exercise.category === 'Tricipiti' ? 'selected' : ''}>Tricipiti</option>
                    <option value="Addominali" ${exercise.category === 'Addominali' ? 'selected' : ''}>Addominali</option>
                </select>
                
                <select id="ex-${workoutNum}-${index}-equipment" style="
                    padding: 6px;
                    background: rgba(0,0,0,0.5);
                    border: 1px solid rgba(0,255,255,0.3);
                    color: var(--neon-cyan);
                    font-family: var(--font-mono);
                    font-size: 11px;
                ">
                    <option value="Bilanciere" ${exercise.equipment === 'Bilanciere' ? 'selected' : ''}>Bilanciere</option>
                    <option value="Manubri" ${exercise.equipment === 'Manubri' ? 'selected' : ''}>Manubri</option>
                    <option value="Macchina" ${exercise.equipment === 'Macchina' ? 'selected' : ''}>Macchina</option>
                    <option value="Cavi" ${exercise.equipment === 'Cavi' ? 'selected' : ''}>Cavi</option>
                    <option value="Corpo libero" ${exercise.equipment === 'Corpo libero' ? 'selected' : ''}>Corpo libero</option>
                </select>
            </div>
        </div>
    `;
}

/**
 * Aggiunge esercizio a un workout specifico
 */
addExerciseToWorkout(workoutNum) {
    const container = document.getElementById(`workout${workoutNum}-exercises`);
    const newIndex = container.querySelectorAll('.exercise-row').length;
    
    const newExercise = {
        name: '',
        sets: 3,
        reps: '8-10',
        category: 'Petto',
        equipment: 'Bilanciere'
    };
    
    const div = document.createElement('div');
    div.innerHTML = this.renderExerciseRow(newExercise, workoutNum, newIndex);
    container.appendChild(div.firstElementChild);
}

/**
 * Rimuove una riga esercizio
 */
removeExerciseRow(workoutNum, index) {
    const row = document.querySelector(`[data-workout="${workoutNum}"][data-index="${index}"]`);
    if (row) {
        row.remove();
    }
}

/**
 * Salva la scheda completa
 */
saveScheda(schedaId, isNew) {
    console.log('💾 Salvando scheda...');
    
    // Raccogli dati
    const name = document.getElementById('scheda-name')?.value || `Scheda ${schedaId}`;
    const description = document.getElementById('scheda-description')?.value || '';
    
    // Raccogli esercizi per allenamento 1 e 2
    const collectExercises = (workoutNum) => {
        const exercises = [];
        document.querySelectorAll(`#workout${workoutNum}-exercises .exercise-row`).forEach((row) => {
            const index = row.dataset.index;
            const exerciseName = document.getElementById(`ex-${workoutNum}-${index}-name`)?.value;
            if (exerciseName && exerciseName.trim()) {
                const isChecked = document.getElementById(`ex-${workoutNum}-${index}-check`)?.checked;
                exercises.push({
                    name: exerciseName.trim(),
                    sets: parseInt(document.getElementById(`ex-${workoutNum}-${index}-sets`)?.value) || 3,
                    reps: document.getElementById(`ex-${workoutNum}-${index}-reps`)?.value || '8-10',
                    category: document.getElementById(`ex-${workoutNum}-${index}-category`)?.value || 'Petto',
                    equipment: document.getElementById(`ex-${workoutNum}-${index}-equipment`)?.value || 'Bilanciere',
                    includeInThird: isChecked || false
                });
            }
        });
        return exercises;
    };
    
    const workout1Exercises = collectExercises(1);
    const workout2Exercises = collectExercises(2);
    
    // Genera automaticamente il terzo allenamento
    const workout3Exercises = [];
    
    // Prima aggiungi gli esercizi spuntati del primo allenamento
    workout1Exercises.forEach(ex => {
        if (ex.includeInThird) {
            workout3Exercises.push({
                ...ex,
                reps: ex.reps + ' (leggero)',
                includeInThird: undefined // rimuovi il flag
            });
        }
    });
    
    // Poi aggiungi gli esercizi spuntati del secondo allenamento
    workout2Exercises.forEach(ex => {
        if (ex.includeInThird) {
            workout3Exercises.push({
                ...ex,
                reps: ex.reps + ' (leggero)',
                includeInThird: undefined // rimuovi il flag
            });
        }
    });
    
    // Validazione
    if (!name.trim()) {
        this.showMessage('⚠️ Inserisci un nome per la scheda', 'warning');
        return;
    }
    
    if (workout1Exercises.length === 0 || workout2Exercises.length === 0) {
        this.showMessage('⚠️ I primi due allenamenti devono avere almeno un esercizio', 'warning');
        return;
    }
    
    if (workout3Exercises.length === 0) {
        this.showMessage('⚠️ Seleziona almeno un esercizio per il terzo allenamento', 'warning');
        return;
    }
    
    // Crea oggetto scheda
    const scheda = {
        id: schedaId,
        name: name.trim(),
        description: description.trim(),
        isActive: false,
        workout1: {
            id: 1,
            name: "Primo Allenamento",
            description: "Prima parte della scheda",
            exercises: workout1Exercises
        },
        workout2: {
            id: 2,
            name: "Secondo Allenamento",
            description: "Seconda parte della scheda",
            exercises: workout2Exercises
        },
        workout3: {
            id: 3,
            name: "Terzo Allenamento - Leggero",
            description: "Combinazione leggera con peso ridotto del 25%",
            exercises: workout3Exercises
        }
    };
    
       
    // Salva
    const schede = this.loadCustomWorkouts();
    schede[schedaId] = scheda;

    if (this.saveCustomWorkouts(schede)) {
        // IMPORTANTE: Se è nuova O se è quella attiva, ricarica i template
        if (isNew || schedaId === localStorage.getItem('active_scheda_id')) {
            this.setActiveScheda(schedaId);
        
            // Forza il refresh dei template globali se ancora li usi
            if (typeof WORKOUT_TEMPLATES !== 'undefined') {
                delete WORKOUT_TEMPLATES[1];
                delete WORKOUT_TEMPLATES[2];
                delete WORKOUT_TEMPLATES[3];
            }
        }
    
        this.showMessage('✅ Scheda salvata con successo!', 'success');
        setTimeout(() => this.showSchede(), 1500);
    } else {
        this.showMessage('❌ Errore nel salvataggio', 'error');
    }
}

/**
 * Elimina una scheda
 */
deleteScheda(schedaId) {
    if (!confirm(`⚠️ Vuoi davvero eliminare questa scheda?\n\nQuesta azione non può essere annullata.`)) {
        return;
    }
    
    const schede = this.loadCustomWorkouts();
    const activeId = localStorage.getItem('active_scheda_id');
    
    // Non permettere di eliminare l'unica scheda
    if (Object.keys(schede).length <= 1) {
        this.showMessage('⚠️ Devi avere almeno una scheda', 'warning');
        return;
    }
    
    // Elimina la scheda
    delete schede[schedaId];
    
    // Se era la scheda attiva, attiva la prima disponibile
    if (schedaId === activeId) {
        const firstId = Object.keys(schede)[0];
        this.setActiveScheda(firstId);
    }
    
    // Salva le modifiche
    if (this.saveCustomWorkouts(schede)) {
        this.showMessage('✅ Scheda eliminata', 'success');
        this.showSchede();
    } else {
        this.showMessage('❌ Errore nell\'eliminazione', 'error');
    }
}

/**
 * Crea una nuova scheda
 */
createNewWorkout() {
    console.log('➕ Creando nuova scheda...');
    
    const workouts = this.loadCustomWorkouts();
    const newId = Math.max(...Object.keys(workouts).map(k => parseInt(k))) + 1;
    
    const newWorkout = {
        id: newId,
        name: `Scheda ${newId}`,
        description: '',
        color: this.getRandomColor(),
        exercises: []
    };
    
    this.showWorkoutEditor(newWorkout, true);
}

/**
 * Modifica una scheda esistente
 */
editWorkout(workoutId) {
    console.log('✏️ Modificando scheda:', workoutId);
    
    const workouts = this.loadCustomWorkouts();
    const workout = workouts[workoutId];
    
    if (!workout) {
        this.showMessage('❌ Scheda non trovata', 'error');
        return;
    }
    
    this.showWorkoutEditor(workout, false);
}

/**
 * Mostra l'editor per creare/modificare una scheda
 */
showWorkoutEditor(workout, isNew = false) {
    const editorContainer = document.getElementById('workout-editor');
    const listContainer = document.getElementById('workouts-list');
    
    // Nascondi lista, mostra editor
    listContainer.style.display = 'none';
    editorContainer.style.display = 'block';
    
    // ID temporaneo per gli esercizi
    let exerciseIdCounter = workout.exercises.length;
    
    editorContainer.innerHTML = `
        <div class="exercise-card" style="padding: 20px;">
            <h3 style="color: var(--neon-green); margin-bottom: 20px; text-transform: uppercase;">
                ${isNew ? '➕ Nuova Scheda' : '✏️ Modifica Scheda'}
            </h3>
            
            <!-- Info Base Scheda -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; color: var(--neon-cyan); font-size: 11px; margin-bottom: 5px; text-transform: uppercase;">
                    Nome Scheda:
                </label>
                <input type="text" id="workout-name" value="${workout.name}" style="
                    width: 100%;
                    padding: 10px;
                    background: rgba(0,0,0,0.5);
                    border: 1px solid var(--neon-green);
                    color: var(--neon-green);
                    font-family: var(--font-mono);
                    font-size: 14px;
                ">
            </div>
            
            <div style="margin-bottom: 30px;">
                <label style="display: block; color: var(--neon-cyan); font-size: 11px; margin-bottom: 5px; text-transform: uppercase;">
                    Descrizione:
                </label>
                <textarea id="workout-description" style="
                    width: 100%;
                    padding: 10px;
                    background: rgba(0,0,0,0.5);
                    border: 1px solid var(--neon-green);
                    color: var(--neon-green);
                    font-family: var(--font-mono);
                    font-size: 12px;
                    min-height: 60px;
                    resize: vertical;
                ">${workout.description || ''}</textarea>
            </div>
            
            <!-- Lista Esercizi -->
            <div style="border-top: 1px solid rgba(0,255,255,0.3); padding-top: 20px;">
                <h4 style="color: var(--neon-cyan); margin-bottom: 15px; text-transform: uppercase; font-size: 14px;">
                    Esercizi della Scheda:
                </h4>
                
                <div id="exercises-list">
                    ${workout.exercises.map((ex, idx) => this.renderExerciseEditor(ex, idx)).join('')}
                </div>
                
                <!-- Bottone Aggiungi Esercizio -->
                <button class="menu-button secondary" onclick="app.addExerciseToEditor()" style="margin-top: 15px;">
                    ➕ Aggiungi Esercizio
                </button>
            </div>
            
            <!-- Bottoni Azione -->
            <div style="display: flex; gap: 10px; margin-top: 30px;">
                <button class="menu-button success" onclick="app.saveWorkout(${workout.id}, ${isNew})" style="flex: 1;">
                    💾 Salva Scheda
                </button>
                <button class="menu-button warning" onclick="app.cancelWorkoutEdit()" style="flex: 1;">
                    ❌ Annulla
                </button>
            </div>
        </div>
    `;
    
    // Inizializza counter per nuovi esercizi
    this.exerciseCounter = exerciseIdCounter;
}

/**
 * Renderizza un singolo esercizio nell'editor
 */
renderExerciseEditor(exercise, index) {
    return `
        <div class="exercise-editor-item" data-exercise-index="${index}" style="
            margin: 10px 0;
            padding: 15px;
            background: rgba(0,255,65,0.02);
            border: 1px solid rgba(0,255,65,0.2);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="color: var(--neon-green); font-weight: bold;">Esercizio #${index + 1}</span>
                <button onclick="app.removeExercise(${index})" style="
                    padding: 5px 10px;
                    background: rgba(255,0,0,0.1);
                    border: 1px solid #ff0040;
                    color: #ff0040;
                    font-size: 11px;
                    cursor: pointer;
                ">🗑️ Rimuovi</button>
            </div>
            
            <!-- Nome Esercizio -->
            <div style="margin-bottom: 10px;">
                <input type="text" 
                    id="exercise-name-${index}" 
                    value="${exercise.name || ''}" 
                    placeholder="Nome esercizio (es. Panca Piana)"
                    style="
                        width: 100%;
                        padding: 8px;
                        background: rgba(0,0,0,0.5);
                        border: 1px solid rgba(0,255,255,0.3);
                        color: var(--neon-cyan);
                        font-family: var(--font-mono);
                        font-size: 12px;
                    ">
            </div>
            
            <!-- Categoria e Equipment -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div>
                    <label style="display: block; color: var(--text-muted); font-size: 10px; margin-bottom: 3px;">
                        CATEGORIA:
                    </label>
                    <select id="exercise-category-${index}" style="
                        width: 100%;
                        padding: 6px;
                        background: rgba(0,0,0,0.5);
                        border: 1px solid rgba(0,255,255,0.3);
                        color: var(--neon-cyan);
                        font-family: var(--font-mono);
                        font-size: 11px;
                    ">
                        <option value="Petto" ${exercise.category === 'Petto' ? 'selected' : ''}>Petto</option>
                        <option value="Dorso" ${exercise.category === 'Dorso' ? 'selected' : ''}>Dorso</option>
                        <option value="Spalle" ${exercise.category === 'Spalle' ? 'selected' : ''}>Spalle</option>
                        <option value="Gambe" ${exercise.category === 'Gambe' ? 'selected' : ''}>Gambe</option>
                        <option value="Bicipiti" ${exercise.category === 'Bicipiti' ? 'selected' : ''}>Bicipiti</option>
                        <option value="Tricipiti" ${exercise.category === 'Tricipiti' ? 'selected' : ''}>Tricipiti</option>
                        <option value="Addominali" ${exercise.category === 'Addominali' ? 'selected' : ''}>Addominali</option>
                        <option value="Cardio" ${exercise.category === 'Cardio' ? 'selected' : ''}>Cardio</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; color: var(--text-muted); font-size: 10px; margin-bottom: 3px;">
                        ATTREZZATURA:
                    </label>
                    <select id="exercise-equipment-${index}" style="
                        width: 100%;
                        padding: 6px;
                        background: rgba(0,0,0,0.5);
                        border: 1px solid rgba(0,255,255,0.3);
                        color: var(--neon-cyan);
                        font-family: var(--font-mono);
                        font-size: 11px;
                    ">
                        <option value="Bilanciere" ${exercise.equipment === 'Bilanciere' ? 'selected' : ''}>Bilanciere</option>
                        <option value="Manubri" ${exercise.equipment === 'Manubri' ? 'selected' : ''}>Manubri</option>
                        <option value="Macchina" ${exercise.equipment === 'Macchina' ? 'selected' : ''}>Macchina</option>
                        <option value="Cavi" ${exercise.equipment === 'Cavi' ? 'selected' : ''}>Cavi</option>
                        <option value="Corpo libero" ${exercise.equipment === 'Corpo libero' ? 'selected' : ''}>Corpo libero</option>
                        <option value="Kettlebell" ${exercise.equipment === 'Kettlebell' ? 'selected' : ''}>Kettlebell</option>
                        <option value="Elastici" ${exercise.equipment === 'Elastici' ? 'selected' : ''}>Elastici</option>
                        <option value="Altro" ${exercise.equipment === 'Altro' ? 'selected' : ''}>Altro</option>
                    </select>
                </div>
            </div>
            
            <!-- Serie e Ripetizioni -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                    <label style="display: block; color: var(--text-muted); font-size: 10px; margin-bottom: 3px;">
                        NUMERO SERIE:
                    </label>
                    <input type="number" 
                        id="exercise-sets-${index}" 
                        value="${exercise.sets || 3}" 
                        min="1" max="10"
                        style="
                            width: 100%;
                            padding: 6px;
                            background: rgba(0,0,0,0.5);
                            border: 1px solid rgba(0,255,255,0.3);
                            color: var(--neon-green);
                            font-family: var(--font-mono);
                            font-size: 12px;
                            text-align: center;
                        ">
                </div>
                
                <div>
                    <label style="display: block; color: var(--text-muted); font-size: 10px; margin-bottom: 3px;">
                        RIPETIZIONI:
                    </label>
                    <input type="text" 
                        id="exercise-reps-${index}" 
                        value="${exercise.reps || '8-10'}" 
                        placeholder="es. 8-10 o 12"
                        style="
                            width: 100%;
                            padding: 6px;
                            background: rgba(0,0,0,0.5);
                            border: 1px solid rgba(0,255,255,0.3);
                            color: var(--neon-green);
                            font-family: var(--font-mono);
                            font-size: 12px;
                            text-align: center;
                        ">
                </div>
            </div>
        </div>
    `;
}

/**
 * Aggiunge un nuovo esercizio all'editor
 */
addExerciseToEditor() {
    const exercisesList = document.getElementById('exercises-list');
    if (!exercisesList) return;
    
    const newIndex = document.querySelectorAll('.exercise-editor-item').length;
    
    const newExercise = {
        name: '',
        sets: 3,
        reps: '8-10',
        category: 'Petto',
        equipment: 'Bilanciere'
    };
    
    const exerciseHtml = this.renderExerciseEditor(newExercise, newIndex);
    
    // Aggiungi al DOM
    const div = document.createElement('div');
    div.innerHTML = exerciseHtml;
    exercisesList.appendChild(div.firstElementChild);
    
    // Scrolla al nuovo esercizio
    div.firstElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Focus sul campo nome
    setTimeout(() => {
        document.getElementById(`exercise-name-${newIndex}`)?.focus();
    }, 100);
}

/**
 * Rimuove un esercizio dall'editor
 */
removeExercise(index) {
    const exerciseElement = document.querySelector(`[data-exercise-index="${index}"]`);
    if (exerciseElement) {
        exerciseElement.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            exerciseElement.remove();
            // Rinumera gli esercizi rimanenti
            this.renumberExercises();
        }, 300);
    }
}

/**
 * Rinumera gli esercizi dopo una rimozione
 */
renumberExercises() {
    const exercises = document.querySelectorAll('.exercise-editor-item');
    exercises.forEach((el, idx) => {
        el.dataset.exerciseIndex = idx;
        el.querySelector('span').textContent = `Esercizio #${idx + 1}`;
    });
}

/**
 * Salva la scheda
 */
saveWorkout(workoutId, isNew) {
    console.log('💾 Salvando scheda...');
    
    // Raccogli dati dalla form
    const name = document.getElementById('workout-name')?.value || `Scheda ${workoutId}`;
    const description = document.getElementById('workout-description')?.value || '';
    
    // Raccogli esercizi
    const exercises = [];
    const exerciseElements = document.querySelectorAll('.exercise-editor-item');
    
    exerciseElements.forEach((el, idx) => {
        const exerciseName = document.getElementById(`exercise-name-${idx}`)?.value;
        
        if (exerciseName && exerciseName.trim()) {
            exercises.push({
                name: exerciseName.trim(),
                sets: parseInt(document.getElementById(`exercise-sets-${idx}`)?.value) || 3,
                reps: document.getElementById(`exercise-reps-${idx}`)?.value || '8-10',
                category: document.getElementById(`exercise-category-${idx}`)?.value || 'Petto',
                equipment: document.getElementById(`exercise-equipment-${idx}`)?.value || 'Bilanciere'
            });
        }
    });
    
    // Validazione
    if (!name.trim()) {
        this.showMessage('⚠️ Inserisci un nome per la scheda', 'warning');
        return;
    }
    
    if (exercises.length === 0) {
        this.showMessage('⚠️ Aggiungi almeno un esercizio', 'warning');
        return;
    }
    
    // Crea oggetto workout
    const workout = {
        id: workoutId,
        name: name.trim(),
        description: description.trim(),
        color: this.getRandomColor(),
        exercises: exercises
    };
    
    // Salva
    const workouts = this.loadCustomWorkouts();
    workouts[workoutId] = workout;
    
    if (this.saveCustomWorkouts(workouts)) {
        this.showMessage('✅ Scheda salvata con successo!', 'success');
        // Torna alla lista
        setTimeout(() => this.showSchede(), 1500);
    } else {
        this.showMessage('❌ Errore nel salvataggio', 'error');
    }
}

/**
 * Annulla la modifica/creazione
 */
cancelWorkoutEdit() {
    if (confirm('⚠️ Vuoi davvero annullare? Le modifiche non salvate andranno perse.')) {
        this.showSchede();
    }
}

/**
 * Elimina una scheda
 */
deleteWorkout(workoutId) {
    if (!confirm(`⚠️ Vuoi davvero eliminare questa scheda?\n\nQuesta azione non può essere annullata.`)) {
        return;
    }
    
    const workouts = this.loadCustomWorkouts();
    
    // Non permettere di eliminare tutte le schede
    if (Object.keys(workouts).length <= 1) {
        this.showMessage('⚠️ Devi avere almeno una scheda', 'warning');
        return;
    }
    
    delete workouts[workoutId];
    
    // Riassegna gli ID se necessario
    const newWorkouts = {};
    let newId = 1;
    Object.values(workouts).forEach(workout => {
        newWorkouts[newId] = { ...workout, id: newId };
        newId++;
    });
    
    if (this.saveCustomWorkouts(newWorkouts)) {
        this.showMessage('✅ Scheda eliminata', 'success');
        this.showSchede();
    } else {
        this.showMessage('❌ Errore nell\'eliminazione', 'error');
    }
}

/**
 * Genera un colore casuale per le schede
 */
getRandomColor() {
    const colors = [
        '#74b9ff', '#a29bfe', '#00b894', '#fdcb6e', 
        '#e17055', '#fd79a8', '#00cec9', '#6c5ce7'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Esporta una scheda in formato JSON
 */
exportWorkout(workoutId) {
    const workouts = this.loadCustomWorkouts();
    const workout = workouts[workoutId];
    
    if (!workout) return;
    
    const dataStr = JSON.stringify(workout, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportName = `scheda_${workout.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
    
    this.showMessage('✅ Scheda esportata', 'success');
}

/**
 * Importa una scheda da file JSON
 */
importWorkout(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const workout = JSON.parse(e.target.result);
            
            // Validazione base
            if (!workout.name || !workout.exercises || !Array.isArray(workout.exercises)) {
                throw new Error('Formato file non valido');
            }
            
            // Aggiungi alla lista
            const workouts = this.loadCustomWorkouts();
            const newId = Math.max(...Object.keys(workouts).map(k => parseInt(k))) + 1;
            workout.id = newId;
            workouts[newId] = workout;
            
            if (this.saveCustomWorkouts(workouts)) {
                this.showMessage('✅ Scheda importata con successo', 'success');
                this.showSchede();
            }
            
        } catch (err) {
            console.error('Errore importazione:', err);
            this.showMessage('❌ Errore nell\'importazione del file', 'error');
        }
    };
    
    reader.readAsText(file);
}

    /* ============================
       GESTIONE ALLENAMENTI
    ============================ */

    /**
 * Inizia una nuova sessione di allenamento
 */
startWorkout(workoutNumber) {
    console.log(`🏋️ Iniziando allenamento ${workoutNumber}`);
    
    this.currentWorkout = workoutNumber;
    
    // Carica schede personalizzate salvate localmente
    const customWorkouts = this.loadCustomWorkouts();
    const activeSchedaId = localStorage.getItem('active_scheda_id');
    
    let template = null;
    
    // Prima cerca la scheda attiva nelle schede personalizzate
    if (activeSchedaId && customWorkouts[activeSchedaId]) {
        const activeScheda = customWorkouts[activeSchedaId];
        console.log('Scheda attiva trovata:', activeScheda);
        
        // Prendi il workout specifico dalla scheda
        template = activeScheda[`workout${workoutNumber}`];
        
        // Se è il terzo allenamento, imposta il flag
        if (workoutNumber === 3) {
            this.isLightWorkout = true;
            this.weightReductionFactor = 0.75;
        } else {
            this.isLightWorkout = false;
            this.weightReductionFactor = 1;
        }
    }
    
    // Se non trova template nella scheda personalizzata, usa default SOLO come fallback
    if (!template || !template.exercises || template.exercises.length === 0) {
        console.warn('Template non trovato nella scheda attiva, uso fallback');
        
        // Crea un template vuoto di emergenza
        template = {
            id: workoutNumber,
            name: `Allenamento ${workoutNumber}`,
            description: 'Nessuna scheda attiva configurata',
            exercises: []
        };
        
        this.showMessage('⚠️ Nessuna scheda attiva trovata. Configura prima una scheda.', 'warning');
        setTimeout(() => this.showSchede(), 2000);
        return;
    }

    console.log('Template caricato:', template);

    this.hideAllSections();
    document.getElementById('workout-session').style.display = 'block';
    document.getElementById('workout-title').textContent = template.name || `Allenamento ${workoutNumber}`;
    this.updateCurrentDate();
    
    // Inizializza dati workout
    this.currentWorkoutData = {
        workoutNumber,
        workoutName: template.name || `Allenamento ${workoutNumber}`,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        exercises: {}
    };
    
    // Renderizza gli esercizi della scheda attiva
    this.renderExercises(template.exercises);
    
    // Carica dati ultima sessione
    this.loadLastSessionData(workoutNumber);
    
    // Se è il terzo allenamento, mostra avviso
    if (workoutNumber === 3) {
        this.showMessage('💡 Allenamento leggero: pesi calcolati -25%', 'info', 3000);
    }
}

/**
 * Ottiene la scheda attualmente attiva
 */
getActiveScheda() {
    try {
        const activeId = localStorage.getItem('active_scheda_id');
        if (!activeId) return null;
        
        const customWorkouts = this.loadCustomWorkouts();
        return customWorkouts[activeId] || null;
    } catch (err) {
        console.error('Errore caricamento scheda attiva:', err);
        return null;
    }
}

/**
 * Imposta una scheda come attiva
 */
async setActiveScheda(schedaId) {
    localStorage.setItem('active_scheda_id', schedaId);
    
    // Sincronizza con Google Sheets se online
    if (this.isOnline) {
        try {
            const schede = this.loadCustomWorkouts();
            const schedaAttiva = schede[schedaId];
            
            if (schedaAttiva) {
                const payload = {
                    action: 'saveActiveScheda',
                    data: schedaAttiva
                };
                
                const res = await fetch(CONFIG.webAppUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(payload),
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                const json = await res.json();
                console.log('Scheda sincronizzata con Sheets:', json);
            }
        } catch (err) {
            console.error('Errore sincronizzazione scheda:', err);
        }
    }
    
    this.showMessage('✅ Scheda attivata!', 'success');
}


    /**
 * Renderizza gli esercizi nel DOM
 */
renderExercises(exercises) {
    const container = document.getElementById('exercises-container');
    container.innerHTML = '';
    
    exercises.forEach((ex, i) => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        
        // Se è il terzo allenamento, mostra solo i pesi calcolati
        if (this.currentWorkout === 3) {
            card.innerHTML = `
                <div class="exercise-name">
                    ${ex.name}
                    <span id="last-weight-${i}" style="font-size: 11px; opacity: 0.6; margin-left: 8px; color: var(--neon-yellow);">
                        <!-- Peso ultima sessione caricato dinamicamente -->
                    </span>
                    <span style="font-size: 12px; opacity: 0.7; display: block;">${ex.category}</span>
                </div>
                <div class="exercise-details">
                    ${ex.sets} serie x ${ex.reps} • ${ex.equipment}
                    <span style="color: var(--neon-yellow); font-weight: bold;">(-25% peso)</span>
                </div>
                <div class="sets-container">
                    ${Array.from({ length: ex.sets }, (_, s) => `
                        <div class="weight-display" 
                             id="weight-${i}-${s}"
                             data-exercise="${i}" 
                             data-set="${s}"
                             data-exercise-name="${ex.name}"
                             style="
                                padding: 12px 8px;
                                background: rgba(255, 255, 0, 0.1);
                                border: 1px solid var(--neon-yellow);
                                color: var(--neon-yellow);
                                text-align: center;
                                font-size: 14px;
                                font-weight: 600;
                                font-family: var(--font-mono);
                             ">
                            <div style="font-size: 10px; opacity: 0.7;">Serie ${s+1}</div>
                            <div id="weight-value-${i}-${s}">--</div>
                        </div>
                    `).join('')}
                </div>
                <div class="exercise-summary" id="summary-${i}" style="margin-top: 10px; font-size: 12px; color: #666;">
                    Caricamento pesi...
                </div>
            `;
        } else {
            // Allenamenti normali (1 e 2)
            card.innerHTML = `
                <div class="exercise-name">
                    ${ex.name}
                    <span id="last-weight-${i}" style="font-size: 11px; opacity: 0.6; margin-left: 8px; color: var(--accent-color);">
                        <!-- Peso ultima sessione caricato dinamicamente -->
                    </span>
                    <span style="font-size: 12px; opacity: 0.7; display: block;">${ex.category}</span>
                </div>
                <div class="exercise-details">
                    ${ex.sets} serie x ${ex.reps} • ${ex.equipment}
                </div>
                <div class="sets-container">
                    ${Array.from({ length: ex.sets }, (_, s) => `
                        <input type="number" 
                            class="set-input"
                            id="input-${i}-${s}"
                            data-exercise="${i}" 
                            data-set="${s}"
                            data-exercise-name="${ex.name}"
                            step="0.5" 
                            min="0" 
                            max="${CONFIG.limits.maxWeight}"
                            placeholder="Kg S${s+1}"
                            inputmode="decimal">
                    `).join('')}
                </div>
                <div class="exercise-summary" id="summary-${i}" style="margin-top: 10px; font-size: 12px; color: #666;">
                    Volume: 0 kg • Max: 0 kg
                </div>
            `;
        }
        
        container.appendChild(card);
    });

    // Se è il terzo allenamento, calcola i pesi
    if (this.currentWorkout === 3) {
        this.calculateThirdWorkoutWeights();
    } else {
        // Aggiungi event listeners per allenamenti normali
        container.querySelectorAll('.set-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleInputChange(e);
                this.debounceAutoSave();
            });
            input.addEventListener('blur', (e) => this.validateInput(e.target));
        });
    }

    // Carica e mostra i pesi dell'ultima sessione per ogni esercizio
    this.loadLastWeightsDisplay(exercises);
}

/**
 * Carica e mostra i pesi dell'ultima sessione per ogni esercizio
 */
async loadLastWeightsDisplay(exercises) {
    for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        const lastWeightElement = document.getElementById(`last-weight-${i}`);
        
        if (lastWeightElement) {
            try {
                const lastWeight = await this.getLastWeightForExercise(ex.name, this.currentWorkout);
                
                if (lastWeight && lastWeight > 0) {
                    lastWeightElement.innerHTML = `(ultima: ${lastWeight}kg)`;
                    lastWeightElement.style.color = this.currentWorkout === 3 ? 'var(--neon-yellow)' : 'var(--accent-color)';
                } else {
                    lastWeightElement.innerHTML = `(nuovo esercizio)`;
                    lastWeightElement.style.opacity = '0.4';
                }
            } catch (err) {
                console.warn(`Errore caricamento ultimo peso per ${ex.name}:`, err);
                lastWeightElement.innerHTML = '';
            }
        }
    }
}

/**
 * Calcola i pesi per il terzo allenamento
 */
calculateThirdWorkoutWeights() {
    const template = this.getActiveScheda()?.[`workout${this.currentWorkout}`];
    if (!template) return;
    
    template.exercises.forEach((ex, i) => {
        // Trova l'ultimo peso usato per questo esercizio
        let lastMaxWeight = 0;
        
        // Prova prima con l'allenamento 1
        const lastData1 = this.getLastWeightForExercise(ex.name, 1);
        // Poi con l'allenamento 2
        const lastData2 = this.getLastWeightForExercise(ex.name, 2);
        
        // Prendi il peso maggiore tra i due
        lastMaxWeight = Math.max(lastData1, lastData2);
        
        // Se non trova nulla nei dati recenti, cerca nello storico
        if (lastMaxWeight === 0) {
            lastMaxWeight = this.getHistoricalMaxWeight(ex.name);
        }
        
        // Calcola il peso ridotto
        const reducedWeight = lastMaxWeight > 0 ? (lastMaxWeight * 0.75).toFixed(1) : 0;
        
        // Mostra i pesi calcolati
        for (let s = 0; s < ex.sets; s++) {
            const weightElement = document.getElementById(`weight-value-${i}-${s}`);
            if (weightElement) {
                if (reducedWeight > 0) {
                    weightElement.textContent = `${reducedWeight} kg`;
                    weightElement.style.color = 'var(--neon-green)';
                } else {
                    weightElement.textContent = 'N/D';
                    weightElement.style.color = 'var(--text-muted)';
                }
            }
        }
        
        // Aggiorna summary
        const summaryEl = document.getElementById(`summary-${i}`);
        if (summaryEl) {
            if (reducedWeight > 0) {
                const totalVolume = (reducedWeight * ex.sets).toFixed(1);
                summaryEl.innerHTML = `
                    Peso suggerito: <strong style="color: var(--neon-yellow);">${reducedWeight} kg</strong> • 
                    Volume: <strong>${totalVolume} kg</strong> • 
                    Base: ${lastMaxWeight.toFixed(1)} kg
                `;
            } else {
                summaryEl.innerHTML = `
                    <span style="color: var(--text-muted);">Nessun dato precedente disponibile</span>
                `;
            }
        }
        
        // Salva nei dati del workout corrente
        if (!this.currentWorkoutData.exercises[ex.name]) {
            this.currentWorkoutData.exercises[ex.name] = {
                name: ex.name,
                category: ex.category,
                sets: [],
                totalVolume: 0,
                maxWeight: 0
            };
        }
        
        // Popola con i pesi calcolati
        for (let s = 0; s < ex.sets; s++) {
            this.currentWorkoutData.exercises[ex.name].sets.push({
                weight: parseFloat(reducedWeight) || 0,
                reps: ex.reps,
                completed: reducedWeight > 0
            });
        }
        
        if (reducedWeight > 0) {
            this.currentWorkoutData.exercises[ex.name].totalVolume = reducedWeight * ex.sets;
            this.currentWorkoutData.exercises[ex.name].maxWeight = parseFloat(reducedWeight);
        }
    });
}

/**
 * Recupera l'ultimo peso per un esercizio specifico
 */
getLastWeightForExercise(exerciseName, workoutNumber) {
    try {
        // Prima prova con l'ultima sessione
        const lastData = localStorage.getItem(`last_workout_${workoutNumber}`);
        if (lastData) {
            const parsed = JSON.parse(lastData);
            const exercise = parsed.exercises?.[exerciseName];
            if (exercise && exercise.maxWeight > 0) {
                return exercise.maxWeight;
            }
        }
        
        // Poi prova con tutti i dati salvati localmente
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`workout_`) && key.includes(`_${workoutNumber}_`)) {
                const data = JSON.parse(localStorage.getItem(key));
                const exercise = data.exercises?.[exerciseName];
                if (exercise && exercise.maxWeight > 0) {
                    return exercise.maxWeight;
                }
            }
        }
    } catch (err) {
        console.error('Errore recupero peso:', err);
    }
    return 0;
}

/**
 * Cerca il peso massimo storico per un esercizio
 */
getHistoricalMaxWeight(exerciseName) {
    let maxWeight = 0;
    
    try {
        // Cerca in tutti i dati salvati
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('workout_')) {
                const data = JSON.parse(localStorage.getItem(key));
                const exercise = data.exercises?.[exerciseName];
                if (exercise && exercise.maxWeight > maxWeight) {
                    maxWeight = exercise.maxWeight;
                }
            }
        }
    } catch (err) {
        console.error('Errore ricerca storica:', err);
    }
    
    return maxWeight;
}

    /**
 * Recupera l'ultimo peso usato per un esercizio in un allenamento specifico
 */
getLastWeight(exerciseName, workoutNumber) {
    try {
        const lastData = localStorage.getItem(`last_workout_${workoutNumber}`);
        if (lastData) {
            const parsed = JSON.parse(lastData);
            const exercise = parsed.exercises?.[exerciseName];
            if (exercise && exercise.sets) {
                // Trova il peso massimo usato nell'ultima sessione
                return exercise.sets.reduce((max, set) => 
                    Math.max(max, set.weight || 0), 0
                );
            }
        }
    } catch (err) {
        console.error('Errore recupero peso precedente:', err);
    }
    return 0;
}



    /**
     * Aggiorna il riepilogo dell'esercizio
     */
    updateExerciseSummary(exerciseIdx, exerciseName) {
        const inputs = document.querySelectorAll(`[data-exercise="${exerciseIdx}"]`);
        let totalVolume = 0;
        let maxWeight = 0;
        
        inputs.forEach(input => {
            const weight = parseFloat(input.value) || 0;
            if (weight > 0) {
                totalVolume += weight;
                maxWeight = Math.max(maxWeight, weight);
            }
        });
        
        const summaryEl = document.getElementById(`summary-${exerciseIdx}`);
        if (summaryEl) {
            summaryEl.innerHTML = `
                Volume: <strong>${totalVolume.toFixed(1)} kg</strong> • 
                Max: <strong>${maxWeight.toFixed(1)} kg</strong>
            `;
        }
    }

    /**
     * Carica i dati dell'ultima sessione
     */
    loadLastSessionData(workoutNumber) {
        try {
            const lastData = localStorage.getItem(`last_workout_${workoutNumber}`);
            if (lastData) {
                const parsed = JSON.parse(lastData);
                console.log('📥 Caricando dati ultima sessione:', parsed);
                
                // Popola gli input con i dati precedenti
                Object.keys(parsed.exercises || {}).forEach(exerciseName => {
                    const exercise = parsed.exercises[exerciseName];
                    const inputs = document.querySelectorAll(`[data-exercise-name="${exerciseName}"]`);
                    
                    inputs.forEach((input, idx) => {
                        if (exercise.sets && exercise.sets[idx]) {
                            input.value = exercise.sets[idx].weight || '';
                            input.style.background = '#e8f5e9';
                        }
                    });
                });
                
                // Aggiorna i summary
                document.querySelectorAll('[data-exercise]').forEach(input => {
                    const idx = parseInt(input.dataset.exercise);
                    const name = input.dataset.exerciseName;
                    this.updateExerciseSummary(idx, name);
                });
                
                this.showMessage('✅ Caricati dati ultima sessione', 'success', 2000);
            }
        } catch (err) {
            console.error('Errore caricamento ultima sessione:', err);
        }

        // Se è il terzo allenamento, suggerisci pesi ridotti
if (this.currentWorkout === 3) {
    document.querySelectorAll('.set-input').forEach(input => {
        if (input.value) {
            const currentWeight = parseFloat(input.value);
            const suggestedWeight = (currentWeight * 0.75).toFixed(1);
            input.placeholder = `Sugg: ${suggestedWeight}kg`;
            input.style.borderColor = 'var(--neon-yellow)';
        }
    });
}
    }

    /**
     * Valida input peso
     */
    validateInput(input) {
        const val = parseFloat(input.value) || 0;
        if (val < CONFIG.limits.minWeight) {
            input.value = '';
        } else if (val > CONFIG.limits.maxWeight) {
            input.value = CONFIG.limits.maxWeight;
            this.showMessage(`⚠️ Peso massimo: ${CONFIG.limits.maxWeight}kg`, 'warning');
        }
    }

    /**
     * Ottiene il peso dell'ultima serie di un esercizio dalle sessioni precedenti
     */
    async getLastWeightForExercise(exerciseName, workoutNumber) {
        console.log(`🔍 Cercando ultimo peso per: ${exerciseName} (Workout ${workoutNumber})`);
        
        try {
            // Prima prova dai dati locali dell'ultima sessione
            const lastData = localStorage.getItem(`last_workout_${workoutNumber}`);
            if (lastData) {
                console.log('📱 Trovati dati locali:', lastData);
                const parsed = JSON.parse(lastData);
                if (parsed.exercises && parsed.exercises[exerciseName]) {
                    const exercise = parsed.exercises[exerciseName];
                    if (exercise.sets && exercise.sets.length > 0) {
                        // Trova l'ultima serie con peso valido
                        for (let i = exercise.sets.length - 1; i >= 0; i--) {
                            if (exercise.sets[i].weight && exercise.sets[i].weight > 0) {
                                console.log(`✅ Peso trovato localmente: ${exercise.sets[i].weight}kg`);
                                return parseFloat(exercise.sets[i].weight);
                            }
                        }
                    }
                }
            } else {
                console.log('📱 Nessun dato locale trovato per questo workout');
            }

            // Se non trovato nei dati locali, prova a recuperare dallo storico remoto
            console.log('🌐 Tentativo recupero da server...');
            const url = `${CONFIG.webAppUrl}?action=getHistory&limit=10`;
            console.log('URL chiamata:', url);
            
            const res = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-store'
            });
            
            console.log('Risposta server status:', res.status);
            
            if (res.ok) {
                const json = await res.json();
                console.log('Dati ricevuti dal server:', json);
                
                if (json?.success && json.workouts) {
                    console.log(`📊 Trovati ${json.workouts.length} allenamenti nello storico`);
                    
                    // Cerca negli allenamenti più recenti dello stesso tipo
                    for (const workout of json.workouts) {
                        if (workout.sessionNumber === workoutNumber && workout.exercises) {
                            console.log(`🎯 Controllo workout ${workout.date} - ${workout.sessionName}`);
                            
                            // Cerca l'esercizio specifico nell'array
                            const exerciseData = workout.exercises.find(ex => ex.name === exerciseName);
                            if (exerciseData && exerciseData.sets && exerciseData.sets.length > 0) {
                                console.log(`💪 Trovato esercizio ${exerciseName} con ${exerciseData.sets.length} serie`);
                                
                                // Trova l'ultimo peso valido (l'ultimo valore nell'array sets)
                                for (let i = exerciseData.sets.length - 1; i >= 0; i--) {
                                    const weight = exerciseData.sets[i];
                                    if (weight && weight > 0) {
                                        console.log(`✅ Peso trovato dal server: ${weight}kg`);
                                        return parseFloat(weight);
                                    }
                                }
                            }
                        }
                    }
                    console.log('❌ Nessun peso trovato negli allenamenti del server');
                } else {
                    console.log('⚠️ Risposta server non valida:', json);
                }
            } else {
                console.log('❌ Errore risposta server:', res.status, res.statusText);
            }
        } catch (err) {
            console.error('❌ Errore nel recupero ultimo peso:', err);
        }
        
        console.log(`❌ Nessun peso trovato per ${exerciseName}`);
        return null;
    }

    /* ============================
       SALVATAGGIO DATI
    ============================ */

    /**
     * Debounce per autosalvataggio
     */
    debounceAutoSave() {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => this.autoSaveSession(), CONFIG.ui.autoSaveDelay);
    }

    /**
     * Autosalva la sessione localmente
     */
    autoSaveSession() {
        const data = this.collectWorkoutData();
        if (data) {
            localStorage.setItem(CONFIG.cache.keys.lastSession, JSON.stringify(data));
            localStorage.setItem(`last_workout_${this.currentWorkout}`, JSON.stringify(data));
            console.log('💾 Sessione autosalvata localmente');
        }
    }

    /**
     * Raccoglie i dati del workout corrente
     */
    collectWorkoutData() {
    if (!this.currentWorkout) return null;
    
    // USA LA SCHEDA ATTIVA, NON I TEMPLATE DEFAULT
    const customWorkouts = this.loadCustomWorkouts();
    const activeSchedaId = localStorage.getItem('active_scheda_id');
    
    if (!activeSchedaId || !customWorkouts[activeSchedaId]) {
        console.error('Nessuna scheda attiva trovata');
        return null;
    }
    
    const activeScheda = customWorkouts[activeSchedaId];
    const template = activeScheda[`workout${this.currentWorkout}`];
    
    if (!template || !template.exercises) {
        console.error('Template non valido per workout', this.currentWorkout);
        return null;
    }
    
    const workoutData = { ...this.currentWorkoutData };
    
        template.exercises.forEach((ex, i) => {
            const exData = {
                name: ex.name,
                category: ex.category,
                sets: [],
                totalVolume: 0,
                maxWeight: 0
            };
            
            for (let s = 0; s < ex.sets; s++) {
                const input = document.querySelector(`[data-exercise="${i}"][data-set="${s}"]`);
                const weight = parseFloat(input?.value) || 0;
                
                exData.sets.push({
                    weight: weight,
                    reps: ex.reps,
                    completed: weight > 0
                });
                
                if (weight > 0) {
                    exData.totalVolume += weight;
                    exData.maxWeight = Math.max(exData.maxWeight, weight);
                }
            }
            
            workoutData.exercises[ex.name] = exData;
        });
        
        return workoutData;
    }

    /**
     * Salva la sessione di allenamento
     */
    async saveWorkoutSession() {
        if (!this.currentWorkout) {
            this.showMessage('❌ Nessuna sessione attiva', 'error');
            return;
        }
        
        const data = this.collectWorkoutData();
        
        if (!this.validateWorkoutData(data)) {
            this.showMessage('⚠️ Inserisci almeno un peso', 'warning');
            return;
        }
        
        // Salva localmente
        this.saveWorkoutLocally(data);
        
        // Mostra loading
        this.showLoading(true);
        
        // Tenta salvataggio remoto
        if (this.isOnline) {
            const success = await this.saveWorkoutRemotely(data);
            if (success) {
                this.showMessage('✅ Sessione salvata con successo!', 'success');
                // Pulisci cache locale dopo salvataggio riuscito
                localStorage.removeItem(CONFIG.cache.keys.lastSession);
                // Torna al menu
                setTimeout(() => this.showSubmenu(), 1500);
            } else {
                this.addToPendingSync(data);
                this.showMessage('⚠️ Salvato offline, verrà sincronizzato', 'warning');
            }
        } else {
            this.addToPendingSync(data);
            this.showMessage('📱 Salvato offline', 'info');
        }
        
        this.showLoading(false);
    }

    /**
     * Valida i dati del workout
     */
    validateWorkoutData(data) {
        if (!data || !data.exercises) return false;
        
        // Controlla che ci sia almeno un peso inserito
        return Object.values(data.exercises).some(ex =>
            ex.sets && ex.sets.some(s => s.weight > 0)
        );
    }

    /**
     * Salva workout localmente
     */
    saveWorkoutLocally(data) {
        const key = `workout_${data.date}_${data.workoutNumber}_${Date.now()}`;
        localStorage.setItem(key, JSON.stringify(data));
        console.log('💾 Salvato localmente con chiave:', key);
    }

    /**
     * Salva workout sul server remoto
     */
    async saveWorkoutRemotely(data) {
        try {
            console.log('📤 Invio dati al server:', data);
            
            const payload = {
                action: 'saveWorkoutSession',
                data: data
            };
            
            const res = await fetch(CONFIG.webAppUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'  // Evita preflight CORS
                },
                body: JSON.stringify(payload),
                mode: 'cors',
                credentials: 'omit'
            });
            
            const json = await res.json();
            console.log('📥 Risposta server:', json);
            
            if (json && json.success) {
                return true;
            } else {
                console.error('Errore dal server:', json?.message);
                return false;
            }
            
        } catch (err) {
            console.error('❌ Errore invio dati:', err);
            return false;
        }
    }

    /* ============================
       SINCRONIZZAZIONE OFFLINE
    ============================ */

    /**
     * Carica dati pendenti da sincronizzare
     */
    loadPendingSync() {
        try {
            const pending = localStorage.getItem('pending_sync');
            this.pendingSync = pending ? JSON.parse(pending) : [];
            
            if (this.pendingSync.length > 0) {
                console.log(`📱 ${this.pendingSync.length} sessioni da sincronizzare`);
            }
        } catch (err) {
            console.error('Errore caricamento pending sync:', err);
            this.pendingSync = [];
        }
    }

    /**
     * Aggiunge dati alla coda di sincronizzazione
     */
    addToPendingSync(data) {
        this.pendingSync.push({
            type: 'workout',
            data: data,
            timestamp: new Date().toISOString()
        });
        
        localStorage.setItem('pending_sync', JSON.stringify(this.pendingSync));
        console.log('📱 Aggiunto a pending sync. Totale:', this.pendingSync.length);
    }

    /**
     * Sincronizza dati pendenti
     */
    async syncPendingData() {
        if (!this.isOnline || this.pendingSync.length === 0) return;
        
        console.log('🔄 Iniziando sincronizzazione...');
        this.showMessage('🔄 Sincronizzazione in corso...', 'info');
        
        const remaining = [];
        let syncCount = 0;
        
        for (const item of this.pendingSync) {
            const success = await this.saveWorkoutRemotely(item.data);
            if (success) {
                syncCount++;
            } else {
                remaining.push(item);
            }
        }
        
        this.pendingSync = remaining;
        localStorage.setItem('pending_sync', JSON.stringify(remaining));
        
        if (syncCount > 0) {
            this.showMessage(`✅ Sincronizzate ${syncCount} sessioni`, 'success');
        }
        
        console.log(`✅ Sincronizzate: ${syncCount}, Rimanenti: ${remaining.length}`);
    }

    /* ============================
       RENDERING UI COMPONENTI
    ============================ */

    /**
     * Renderizza grafici statistiche
     */
    renderStatsCharts(workouts) {
        // Ordina per data
        workouts.sort((a, b) => new Date(a.date || a.timestamp) - new Date(b.date || b.timestamp));
        
        // Prepara dati per grafici
        const labels = workouts.map(w => {
            const date = new Date(w.date || w.timestamp);
            return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        });
        
        const volumeSeries = workouts.map(w => w.totalVolume || 0);
        
        const maxWeightSeries = workouts.map(w => {
            const exercises = w.exercises || [];
            return exercises.reduce((max, ex) => Math.max(max, ex.maxWeight || 0), 0);
        });
        
        // Grafico peso massimo
        const weightCtx = document.getElementById('stats-chart-weight').getContext('2d');
        this.createOrUpdateChart('weightChart', weightCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Peso massimo (kg)',
                    data: maxWeightSeries,
                    borderColor: '#74b9ff',
                    backgroundColor: 'rgba(116, 185, 255, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#74b9ff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Kg' }
                    }
                }
            }
        });
        
        // Grafico volume
        const volumeCtx = document.getElementById('stats-chart-volume').getContext('2d');
        this.createOrUpdateChart('volumeChart', volumeCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Volume totale',
                    data: volumeSeries,
                    backgroundColor: '#00b894',
                    borderColor: '#00a085',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Volume (kg)' }
                    }
                }
            }
        });
    }

    /**
     * Renderizza tabella record
     */
    renderRecordsTable(records) {
        const tbody = document.querySelector('#records-table tbody');
        if (!tbody) return;
        
        if (records.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="padding: 20px; text-align: center; color: #636e72;">
                        Nessun record registrato
                    </td>
                </tr>
            `;
            return;
        }
        
        // Ordina per peso decrescente
        records.sort((a, b) => (b.maxWeight || 0) - (a.maxWeight || 0));
        
        tbody.innerHTML = records.map(r => {
            const weight = (r.maxWeight || 0).toFixed(1);
            const date = r.date ? new Date(r.date).toLocaleDateString('it-IT') : '-';
            const session = r.sessionType || '-';
            
            return `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${r.exercise}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">
                        ${weight} kg
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${date}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${session}</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Renderizza schede/storico
     */
    renderSchede(workouts) {
        const currentEl = document.getElementById('scheda-corrente');
        const listEl = document.getElementById('schede-list');
        
        if (!currentEl || !listEl) return;
        
        if (workouts.length === 0) {
            currentEl.innerHTML = '<em>Nessuna scheda corrente</em>';
            listEl.innerHTML = '<div class="exercise-details">Nessun allenamento in archivio</div>';
            return;
        }
        
        // Scheda corrente = ultima sessione
        const current = workouts[0];
        const currentDate = new Date(current.date || current.timestamp).toLocaleDateString('it-IT');
        const currentExercises = current.exercises || [];
        
        currentEl.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px;">
                ${current.sessionName} - ${currentDate}
            </div>
            <div style="font-size: 14px; color: #636e72; margin-bottom: 10px;">
                Esercizi: ${currentExercises.length} • 
                Volume totale: ${current.totalVolume?.toFixed(0) || 0} kg
            </div>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                ${currentExercises.map(ex => `
                    <li style="margin: 4px 0;">
                        ${ex.name} - Max: ${(ex.maxWeight || 0).toFixed(1)}kg, 
                        Volume: ${(ex.volume || 0).toFixed(0)}kg
                    </li>
                `).join('')}
            </ul>
        `;
        
        // Lista storico
        listEl.innerHTML = workouts.slice(0, 20).map(w => {
            const date = new Date(w.date || w.timestamp).toLocaleDateString('it-IT');
            const exercises = w.exercises || [];
            
            return `
                <div class="exercise-card" style="margin: 10px 0;">
                    <div class="exercise-name">
                        📅 ${date} - ${w.sessionName || 'Allenamento'} #${w.sessionNumber || 1}
                    </div>
                    <div class="exercise-details">
                        Esercizi: ${exercises.length} • Volume: ${(w.totalVolume || 0).toFixed(0)} kg
                    </div>
                    <details style="margin-top: 8px;">
                        <summary style="cursor: pointer; font-size: 13px; color: #74b9ff;">
                            Vedi dettagli
                        </summary>
                        <ul style="margin: 8px 0 0 20px; padding: 0; font-size: 12px;">
                            ${exercises.map(e => `
                                <li style="margin: 4px 0;">
                                    ${e.name} - Max: ${(e.maxWeight || 0).toFixed(1)}kg
                                </li>
                            `).join('')}
                        </ul>
                    </details>
                </div>
            `;
        }).join('');
    }

    /* ============================
       UTILITY & HELPERS
    ============================ */

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Online/Offline
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
        
        // Service Worker (solo in produzione)
        if ('serviceWorker' in navigator && !this.isLocalDev()) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('✅ Service Worker registrato'))
                .catch(err => console.error('❌ SW errore:', err));
        }
    }

    /**
     * Gestisce cambio stato online/offline
     */
    handleOnlineStatus(isOnline) {
        this.isOnline = isOnline;
        console.log(isOnline ? '🟢 Online' : '🔴 Offline');
        
        if (isOnline && this.pendingSync.length > 0) {
            this.syncPendingData();
        }
        
        this.showMessage(
            isOnline ? '🟢 Connessione ripristinata' : '🔴 Modalità offline',
            isOnline ? 'success' : 'warning',
            2000
        );
    }

    /**
     * Controlla connessione
     */
    async checkConnection() {
        try {
            const res = await fetch(`${CONFIG.webAppUrl}?action=ping`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-store'
            });
            const json = await res.json();
            
            if (json.success) {
                console.log('✅ Connessione al server OK');
                return true;
            }
        } catch (err) {
            console.warn('⚠️ Server non raggiungibile:', err);
        }
        return false;
    }

    /**
     * Aggiorna data corrente
     */
    updateCurrentDate() {
        const now = new Date();
        const formatted = now.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        document.querySelectorAll('.current-date, #current-date, #workout-date')
            .forEach(el => {
                if (el) el.textContent = formatted;
            });
    }

    /**
     * Mostra/nascondi loading
     */
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Mostra messaggio utente
     */
    showMessage(msg, type = 'info', duration = 3000) {
        // Rimuovi messaggi esistenti
        document.querySelectorAll('.success-message, .error-message, .info-message, .warning-message')
            .forEach(el => el.remove());
        
        const div = document.createElement('div');
        div.className = `${type}-message`;
        div.textContent = msg;
        div.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1001;
            animation: slideIn 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        
        document.body.appendChild(div);
        
        setTimeout(() => {
            div.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => div.remove(), 300);
        }, duration);
    }

    /**
     * Crea o aggiorna un grafico
     */
    createOrUpdateChart(key, ctx, config) {
        // Distruggi grafico esistente
        if (this.charts[key]) {
            this.charts[key].destroy();
        }
        
        // Crea nuovo grafico
        this.charts[key] = new Chart(ctx, config);
        return this.charts[key];
    }

    /**
     * Pulisce tutti i grafici
     */
    clearCharts() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
                delete this.charts[key];
            }
        });
    }

    /**
     * Controlla se in ambiente di sviluppo locale
     */
    isLocalDev() {
        return location.hostname === 'localhost' || 
               location.hostname === '127.0.0.1' ||
               location.protocol === 'file:';
    }

    /**
     * Debug: log formattato
     */
    log(message, data = null) {
        const timestamp = new Date().toLocaleTimeString('it-IT');
        const prefix = `[${timestamp}] GymTracker:`;
        
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }
}

/* ============================
   INIZIALIZZAZIONE GLOBALE
============================ */

// Crea istanza app
const app = new GymTracker();

// Binding funzioni globali per onclick HTML
window.showMainMenu = () => app.showMainMenu();
window.showSubmenu = () => app.showSubmenu();
window.startWorkout = (n) => app.startWorkout(n);
window.saveWorkoutSession = () => app.saveWorkoutSession();
window.showStats = () => app.showStats();
window.showMaxRecords = () => app.showMaxRecords();
window.showSchede = () => app.showSchede();

/* ============================
   FUNZIONI DI TEST/DEBUG
============================ */

/**
 * Test connessione al backend
 */
window.testConnection = async function() {
    console.log('🔧 Test connessione backend...');
    
    try {
        const url = `${CONFIG.webAppUrl}?action=ping`;
        console.log('URL:', url);
        
        const res = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-store'
        });
        
        const json = await res.json();
        console.log('✅ Risposta:', json);
        
        if (json.success) {
            alert('✅ Connessione OK!\n' + JSON.stringify(json, null, 2));
        } else {
            alert('⚠️ Risposta non valida:\n' + JSON.stringify(json, null, 2));
        }
        
        return json;
        
    } catch (err) {
        console.error('❌ Errore:', err);
        alert('❌ Errore connessione:\n' + err.toString());
        return null;
    }
};

/**
 * Test salvataggio dati
 */
window.testSave = async function() {
    console.log('🔧 Test salvataggio...');
    
    const testData = {
        workoutNumber: 1,
        workoutName: "Test Allenamento",
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        exercises: {
            "Test Exercise": {
                name: "Test Exercise",
                category: "Test",
                sets: [
                    { weight: 50, reps: "10", completed: true },
                    { weight: 55, reps: "10", completed: true }
                ],
                totalVolume: 105,
                maxWeight: 55
            }
        }
    };
    
    try {
        const payload = {
            action: 'saveWorkoutSession',
            data: testData
        };
        
        const res = await fetch(CONFIG.webAppUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(payload),
            mode: 'cors',
            credentials: 'omit'
        });
        
        const json = await res.json();
        console.log('✅ Risposta salvataggio:', json);
        
        if (json.success) {
            alert('✅ Salvataggio test riuscito!\n' + JSON.stringify(json, null, 2));
        } else {
            alert('⚠️ Salvataggio fallito:\n' + JSON.stringify(json, null, 2));
        }
        
        return json;
        
    } catch (err) {
        console.error('❌ Errore:', err);
        alert('❌ Errore salvataggio:\n' + err.toString());
        return null;
    }
};

/**
 * Pulisce tutti i dati locali
 */
window.clearLocalData = function() {
    if (confirm('⚠️ Vuoi davvero cancellare tutti i dati locali?')) {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('gym') || key.includes('workout'))) {
                keys.push(key);
            }
        }
        
        keys.forEach(key => localStorage.removeItem(key));
        
        app.pendingSync = [];
        localStorage.removeItem('pending_sync');
        
        console.log('🗑️ Dati locali cancellati');
        alert('✅ Dati locali cancellati');
        location.reload();
    }
};

/**
 * Mostra stato app
 */
window.showAppStatus = function() {
    const status = {
        online: app.isOnline,
        pendingSync: app.pendingSync.length,
        currentWorkout: app.currentWorkout,
        localStorage: {
            keys: Object.keys(localStorage).length,
            size: new Blob(Object.values(localStorage)).size
        },
        config: {
            webAppUrl: CONFIG.webAppUrl,
            spreadsheetId: CONFIG.spreadsheetId
        }
    };
    
    console.log('📊 Stato App:', status);
    alert('📊 Stato App:\n' + JSON.stringify(status, null, 2));
    
    return status;
};

/**
 * Debug: mostra scheda attiva
 */
window.debugActiveScheda = function() {
    const customWorkouts = app.loadCustomWorkouts();
    const activeSchedaId = localStorage.getItem('active_scheda_id');
    
    console.log('=== DEBUG SCHEDA ATTIVA ===');
    console.log('ID Attivo:', activeSchedaId);
    
    if (activeSchedaId && customWorkouts[activeSchedaId]) {
        const scheda = customWorkouts[activeSchedaId];
        console.log('Nome:', scheda.name);
        console.log('Workout 1 esercizi:', scheda.workout1?.exercises?.map(e => e.name));
        console.log('Workout 2 esercizi:', scheda.workout2?.exercises?.map(e => e.name));
        console.log('Workout 3 esercizi:', scheda.workout3?.exercises?.map(e => e.name));
    } else {
        console.log('NESSUNA SCHEDA ATTIVA TROVATA!');
    }
    
    console.log('Tutte le schede:', customWorkouts);
    return customWorkouts;
};

/**
 * Debug: resetta e pulisci tutto
 */
window.resetSchede = function() {
    if (confirm('⚠️ ATTENZIONE: Questo cancellerà TUTTE le schede. Continuare?')) {
        localStorage.removeItem('custom_schede');
        localStorage.removeItem('active_scheda_id');
        location.reload();
    }
};

// Log inizializzazione
console.log(`
╔═══════════════════════════════════╗
║   💪 MY GYM TRACKER v2.0          ║
║   App inizializzata con successo  ║
╚═══════════════════════════════════╝

Comandi debug disponibili:
- testConnection()  : Testa connessione backend
- testSave()       : Testa salvataggio dati
- showAppStatus()  : Mostra stato app
- clearLocalData() : Pulisce dati locali

Per testare: apri console (F12) e digita un comando
`);