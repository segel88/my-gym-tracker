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
                         data.trend === 'down' ? '📉' : '➡️';
        const trendColor = data.trend === 'up' ? 'var(--neon-green)' : 
                          data.trend === 'down' ? '#ff0040' : 'var(--neon-yellow)';
        
        card.innerHTML = `
            <div class="exercise-name" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span>${name}</span>
                <span style="color: ${trendColor}; font-size: 20px;">${trendIcon}</span>
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
            color = 'var(--neon-cyan)';
            bgColor = 'rgba(0, 255, 255, 0.1)';
            break;
        case 'average':
            dataset = data.avgWeights;
            label = 'Peso Medio';
            color = 'var(--neon-yellow)';
            bgColor = 'rgba(255, 255, 0, 0.1)';
            break;
        default: // weight
            dataset = data.maxWeights;
            label = 'Peso Massimo (kg)';
            color = 'var(--neon-green)';
            bgColor = 'rgba(0, 255, 65, 0.1)';
    }
    
    // Limita a ultimi 10 allenamenti per leggibilità
    const limit = 10;
    const labels = data.dates.slice(-limit);
    const values = dataset.slice(-limit);
    
    // Crea il grafico
    canvas.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                borderColor: color,
                backgroundColor: bgColor,
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: color,
                pointBorderColor: color,
                pointHoverRadius: 6
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
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'var(--neon-cyan)',
                    bodyColor: 'var(--neon-green)',
                    borderColor: 'var(--neon-green)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
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
                        color: 'var(--text-muted)',
                        font: {
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
                        color: 'var(--text-muted)',
                        font: {
                            size: 10
                        },
                        callback: function(value) {
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

    /* ============================
       GESTIONE ALLENAMENTI
    ============================ */

    /**
     * Inizia una nuova sessione di allenamento
     */
    startWorkout(workoutNumber) {
        console.log(`🏋️ Iniziando allenamento ${workoutNumber}`);
        
        this.currentWorkout = workoutNumber;
        const template = WORKOUT_TEMPLATES[workoutNumber];
        
        if (!template) {
            this.showMessage('❌ Scheda non trovata', 'error');
            return;
        }

        this.hideAllSections();
        document.getElementById('workout-session').style.display = 'block';
        document.getElementById('workout-title').textContent = template.name;
        this.updateCurrentDate();
        
        // Inizializza dati workout
        this.currentWorkoutData = {
            workoutNumber,
            workoutName: template.name,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            exercises: {}
        };
        
        this.renderExercises(template.exercises);
        this.loadLastSessionData(workoutNumber);
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
            card.innerHTML = `
                <div class="exercise-name">
                    ${ex.name}
                    <span style="font-size: 12px; opacity: 0.7;">${ex.category}</span>
                </div>
                <div class="exercise-details">
                    ${ex.sets} serie x ${ex.reps} reps • ${ex.equipment}
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
            container.appendChild(card);
        });

        // Aggiungi event listeners
        container.querySelectorAll('.set-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleInputChange(e);
                this.debounceAutoSave();
            });
            input.addEventListener('blur', (e) => this.validateInput(e.target));
        });
    }

    /**
     * Gestisce il cambio di un input
     */
    handleInputChange(event) {
        const input = event.target;
        const exerciseIdx = parseInt(input.dataset.exercise);
        const exerciseName = input.dataset.exerciseName;
        
        // Aggiorna summary dell'esercizio
        this.updateExerciseSummary(exerciseIdx, exerciseName);
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
        
        const template = WORKOUT_TEMPLATES[this.currentWorkout];
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