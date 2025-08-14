/**
 * My Gym Tracker - Applicazione Principale
 * Gestisce la logica dell'interfaccia utente e l'interazione con Google Apps Script
 */

class GymTracker {
    constructor() {
        this.currentWorkout = null;
        this.currentWorkoutData = {};
        this.isOnline = navigator.onLine;
        this.pendingSync = [];
        
        this.initializeApp();
    }

    /**
     * Inizializza l'applicazione
     */
    initializeApp() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.updateCurrentDate();
            this.loadUserSettings();
            this.showMainMenu();
            this.checkOnlineStatus();
        });
    }

    /**
     * Configura i listener degli eventi
     */
    setupEventListeners() {
        // Eventi di connessione
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
        
        // Service Worker per PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registrato:', registration))
                .catch(error => console.log('Errore SW:', error));
        }
    }

    /**
     * Gestisce lo stato di connessione
     */
    handleOnlineStatus(isOnline) {
        this.isOnline = isOnline;
        
        if (isOnline && this.pendingSync.length > 0) {
            this.syncPendingData();
        }
        
        // Mostra indicatore di stato
        this.showConnectionStatus(isOnline);
    }

    /**
     * Mostra lo stato della connessione
     */
    showConnectionStatus(isOnline) {
        const statusClass = isOnline ? 'success' : 'error';
        const message = isOnline ? 'Connesso' : 'Modalità offline';
        this.showMessage(message, statusClass, 2000);
    }

    /**
     * Verifica stato connessione
     */
    checkOnlineStatus() {
        this.isOnline = navigator.onLine;
    }

    /**
     * Aggiorna la data corrente in tutti gli elementi
     */
    updateCurrentDate() {
        const now = new Date();
        const dateString = now.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const dateElements = document.querySelectorAll('.current-date, #current-date, #workout-date');
        dateElements.forEach(el => {
            if (el) el.textContent = dateString;
        });
    }

    /**
     * Carica le impostazioni utente salvate
     */
    loadUserSettings() {
        try {
            const settings = localStorage.getItem(CONFIG.cache.keys.userSettings);
            if (settings) {
                const userSettings = JSON.parse(settings);
                this.applyUserSettings(userSettings);
            }
        } catch (error) {
            console.warn('Errore nel caricamento delle impostazioni:', error);
        }
    }

    /**
     * Applica le impostazioni utente
     */
    applyUserSettings(settings) {
        if (settings.theme) {
            document.body.className = `theme-${settings.theme}`;
        }
    }

    /**
     * Naviga verso il menu principale
     */
    showMainMenu() {
        this.hideAllSections();
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) {
            mainMenu.style.display = 'block';
            mainMenu.classList.add('fade-in');
        }
    }

    /**
     * Naviga verso il sottomenu delle sessioni
     */
    showSubmenu() {
        this.hideAllSections();
        const submenu = document.getElementById('submenu');
        if (submenu) {
            submenu.style.display = 'block';
            submenu.classList.add('fade-in');
        }
        this.updateCurrentDate();
    }

    /**
     * Nasconde tutte le sezioni
     */
    hideAllSections() {
        const sections = ['main-menu', 'submenu', 'workout-session'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
                element.classList.remove('fade-in', 'slide-up');
            }
        });
    }

    /**
     * Avvia una sessione di allenamento
     */
    async startWorkout(workoutNumber) {
        try {
            this.showLoading('Caricamento scheda...');
            
            this.currentWorkout = workoutNumber;
            const template = await this.getWorkoutTemplate(workoutNumber);
            
            if (!template) {
                throw new Error('Scheda allenamento non trovata');
            }

            this.hideAllSections();
            const workoutSession = document.getElementById('workout-session');
            if (workoutSession) {
                workoutSession.style.display = 'block';
                workoutSession.classList.add('slide-up');
            }

            // Aggiorna UI
            const titleElement = document.getElementById('workout-title');
            if (titleElement) {
                titleElement.textContent = template.name;
                titleElement.style.color = template.color || '#2d3436';
            }

            this.updateCurrentDate();
            await this.renderExercises(template.exercises);
            
            // Inizializza dati sessione
            this.currentWorkoutData = {
                workoutNumber: workoutNumber,
                workoutName: template.name,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                exercises: {}
            };

            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            this.showMessage(error.message, 'error');
            console.error('Errore avvio allenamento:', error);
        }
    }

    /**
     * Ottiene il template di allenamento
     */
    async getWorkoutTemplate(workoutNumber) {
        // Prima controlla la cache locale
        const cachedTemplate = this.getCachedTemplate(workoutNumber);
        if (cachedTemplate) {
            return cachedTemplate;
        }

        // Poi prova a caricare da Google Apps Script
        if (this.isOnline && CONFIG.webAppUrl) {
            try {
                const template = await this.fetchTemplateFromServer(workoutNumber);
                if (template) {
                    this.cacheTemplate(workoutNumber, template);
                    return template;
                }
            } catch (error) {
                console.warn('Errore caricamento da server:', error);
            }
        }

        // Fallback ai template predefiniti
        return WORKOUT_TEMPLATES[workoutNumber] || null;
    }

    /**
     * Ottiene template dalla cache
     */
    getCachedTemplate(workoutNumber) {
        try {
            const cached = localStorage.getItem(`${CONFIG.cache.keys.workoutTemplates}_${workoutNumber}`);
            if (cached) {
                const data = JSON.parse(cached);
                const isExpired = Date.now() - data.timestamp > CONFIG.cache.duration;
                if (!isExpired) {
                    return data.template;
                }
            }
        } catch (error) {
            console.warn('Errore lettura cache:', error);
        }
        return null;
    }

    /**
     * Salva template in cache
     */
    cacheTemplate(workoutNumber, template) {
        try {
            const data = {
                template: template,
                timestamp: Date.now()
            };
            localStorage.setItem(`${CONFIG.cache.keys.workoutTemplates}_${workoutNumber}`, JSON.stringify(data));
        } catch (error) {
            console.warn('Errore salvataggio cache:', error);
        }
    }

    /**
     * Carica template dal server
     */
    async fetchTemplateFromServer(workoutNumber) {
        const response = await fetch(`${CONFIG.webAppUrl}?action=getTemplate&id=${workoutNumber}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.template;
    }

    /**
     * Renderizza gli esercizi nella UI
     */
    async renderExercises(exercises) {
        const container = document.getElementById('exercises-container');
        if (!container) return;

        container.innerHTML = '';

        exercises.forEach((exercise, index) => {
            const exerciseCard = this.createExerciseCard(exercise, index);
            container.appendChild(exerciseCard);
        });

        // Aggiungi animazione
        container.classList.add('slide-up');
    }

    /**
     * Crea una card per l'esercizio
     */
    createExerciseCard(exercise, index) {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        
        // Ottieni icona e colore dalla categoria
        const category = EXERCISE_CATEGORIES[exercise.category] || { icon: '💪', color: '#74b9ff' };
        
        card.innerHTML = `
            <div class="exercise-name" style="border-left-color: ${category.color}">
                <span>${category.icon}</span>
                <span>${exercise.name}</span>
            </div>
            <div class="exercise-details">
                ${exercise.sets} serie x ${exercise.reps} ripetizioni
                ${exercise.equipment ? ` • ${exercise.equipment}` : ''}
            </div>
            <div class="sets-container">
                ${Array.from({length: exercise.sets}, (_, i) => `
                    <input 
                        type="number" 
                        class="set-input" 
                        placeholder="Kg ${i+1}°"
                        data-exercise="${index}"
                        data-set="${i}"
                        step="0.5"
                        min="0"
                        max="${CONFIG.limits.maxWeight}"
                        autocomplete="off"
                    >
                `).join('')}
            </div>
        `;

        // Aggiungi listener per auto-salvataggio
        const inputs = card.querySelectorAll('.set-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.debounceAutoSave());
            input.addEventListener('blur', () => this.validateInput(input));
        });

        return card;
    }

    /**
     * Valida input peso
     */
    validateInput(input) {
        const value = parseFloat(input.value);
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || CONFIG.limits.maxWeight;

        if (value < min) {
            input.value = min;
            this.showMessage('Peso minimo: ' + min + 'kg', 'error', 2000);
        } else if (value > max) {
            input.value = max;
            this.showMessage('Peso massimo: ' + max + 'kg', 'error', 2000);
        }
    }

    /**
     * Auto-salvataggio con debounce
     */
    debounceAutoSave() {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => {
            this.autoSaveSession();
        }, CONFIG.ui.autoSaveDelay);
    }

    /**
     * Auto-salvataggio locale
     */
    autoSaveSession() {
        try {
            const sessionData = this.collectWorkoutData();
            localStorage.setItem(CONFIG.cache.keys.lastSession, JSON.stringify(sessionData));
        } catch (error) {
            console.warn('Errore auto-salvataggio:', error);
        }
    }

    /**
     * Raccoglie i dati dell'allenamento corrente
     */
    collectWorkoutData() {
        if (!this.currentWorkout) return null;

        const inputs = document.querySelectorAll('.set-input');
        const template = WORKOUT_TEMPLATES[this.currentWorkout];
        const workoutData = { ...this.currentWorkoutData };

        template.exercises.forEach((exercise, exerciseIndex) => {
            const exerciseData = {
                name: exercise.name,
                category: exercise.category,
                sets: [],
                totalVolume: 0,
                maxWeight: 0
            };
            
            for (let setIndex = 0; setIndex < exercise.sets; setIndex++) {
                const input = document.querySelector(`[data-exercise="${exerciseIndex}"][data-set="${setIndex}"]`);
                const weight = input ? parseFloat(input.value) || 0 : 0;
                
                exerciseData.sets.push({
                    weight: weight,
                    reps: exercise.reps,
                    completed: weight > 0
                });

                // Calcola statistiche
                if (weight > 0) {
                    exerciseData.totalVolume += weight * this.parseReps(exercise.reps);
                    exerciseData.maxWeight = Math.max(exerciseData.maxWeight, weight);
                }
            }
            
            workoutData.exercises[exercise.name] = exerciseData;
        });

        return workoutData;
    }

    /**
     * Converte stringa reps in numero (es. "8-10" -> 9)
     */
    parseReps(repsString) {
        if (typeof repsString === 'number') return repsString;
        
        const match = repsString.match(/(\d+)(?:-(\d+))?/);
        if (match) {
            const min = parseInt(match[1]);
            const max = match[2] ? parseInt(match[2]) : min;
            return Math.round((min + max) / 2);
        }
        return 10; // default
    }

    /**
     * Salva la sessione di allenamento
     */
    async saveWorkoutSession() {
        try {
            if (!this.currentWorkout) {
                throw new Error('Nessuna sessione attiva');
            }

            this.showLoading('Salvataggio in corso...');

            const workoutData = this.collectWorkoutData();
            
            // Validazione dati
            if (!this.validateWorkoutData(workoutData)) {
                throw new Error('Inserisci almeno un peso per salvare la sessione');
            }

            // Salva localmente sempre
            this.saveWorkoutLocally(workoutData);

            // Tenta salvataggio remoto se online
            if (this.isOnline && CONFIG.webAppUrl) {
                await this.saveWorkoutRemotely(workoutData);
                this.showMessage(MESSAGES.success.workoutSaved, 'success');
            } else {
                // Aggiungi alla coda di sincronizzazione
                this.addToPendingSync(workoutData);
                this.showMessage('Sessione salvata offline. Verrà sincronizzata quando tornerai online.', 'info');
            }

            this.hideLoading();
            
            // Torna al menu dopo salvataggio
            setTimeout(() => {
                this.showSubmenu();
            }, 2000);
            
        } catch (error) {
            this.hideLoading();
            this.showMessage(error.message, 'error');
            console.error('Errore salvataggio sessione:', error);
        }
    }

    /**
     * Valida i dati dell'allenamento
     */
    validateWorkoutData(data) {
        if (!data || !data.exercises) return false;
        
        // Controlla se almeno un peso è stato inserito
        return Object.values(data.exercises).some(exercise => 
            exercise.sets.some(set => set.weight > 0)
        );
    }

    /**
     * Salva allenamento localmente
     */
    saveWorkoutLocally(data) {
        try {
            const key = `workout_${data.date}_${data.workoutNumber}`;
            localStorage.setItem(key, JSON.stringify(data));
            
            // Aggiorna lista allenamenti locali
            this.updateLocalWorkoutsList(data);
        } catch (error) {
            console.error('Errore salvataggio locale:', error);
        }
    }

    /**
     * Aggiorna lista allenamenti locali
     */
    updateLocalWorkoutsList(newWorkout) {
        try {
            const workoutsKey = 'local_workouts_list';
            let workoutsList = JSON.parse(localStorage.getItem(workoutsKey) || '[]');
            
            // Rimuovi duplicato se esiste
            workoutsList = workoutsList.filter(w => 
                !(w.date === newWorkout.date && w.workoutNumber === newWorkout.workoutNumber)
            );
            
            // Aggiungi nuovo
            workoutsList.push({
                date: newWorkout.date,
                workoutNumber: newWorkout.workoutNumber,
                workoutName: newWorkout.workoutName,
                timestamp: newWorkout.timestamp
            });
            
            // Ordina per data decrescente
            workoutsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            localStorage.setItem(workoutsKey, JSON.stringify(workoutsList));
        } catch (error) {
            console.error('Errore aggiornamento lista locale:', error);
        }
    }

    /**
     * Salva allenamento su Google Sheets
     */
    async saveWorkoutRemotely(data) {
        const response = await fetch(CONFIG.webAppUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: GAS_CONFIG.endpoints.saveWorkout,
                data: data
            })
        });

        if (!response.ok) {
            throw new Error(`Errore server: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Errore sconosciuto');
        }

        return result;
    }

    /**
     * Aggiunge allenamento alla coda di sincronizzazione
     */
    addToPendingSync(data) {
        this.pendingSync.push({
            type: 'workout',
            data: data,
            timestamp: Date.now()
        });
        
        // Salva coda su localStorage
        try {
            localStorage.setItem('pending_sync', JSON.stringify(this.pendingSync));
        } catch (error) {
            console.error('Errore salvataggio coda sync:', error);
        }
    }

    /**
     * Sincronizza dati in sospeso
     */
    async syncPendingData() {
        if (!this.isOnline || this.pendingSync.length === 0) return;

        this.showMessage('Sincronizzazione in corso...', 'info');

        const successes = [];
        const failures = [];

        for (const item of this.pendingSync) {
            try {
                if (item.type === 'workout') {
                    await this.saveWorkoutRemotely(item.data);
                    successes.push(item);
                }
            } catch (error) {
                failures.push(item);
                console.error('Errore sincronizzazione:', error);
            }
        }

        // Rimuovi elementi sincronizzati con successo
        this.pendingSync = failures;
        
        try {
            localStorage.setItem('pending_sync', JSON.stringify(this.pendingSync));
        } catch (error) {
            console.error('Errore aggiornamento coda sync:', error);
        }

        // Mostra risultato
        if (successes.length > 0) {
            this.showMessage(`${successes.length} sessioni sincronizzate`, 'success');
        }
        if (failures.length > 0) {
            this.showMessage(`${failures.length} sessioni non sincronizzate`, 'error');
        }
    }

    /**
     * Placeholder per le sezioni future
     */
    showStats() {
        this.showMessage('📊 Sezione Statistiche in sviluppo', 'info');
    }

    showSchede() {
        this.showMessage('📝 Gestione Schede in sviluppo', 'info');
    }

    showMaxRecords() {
        this.showMessage('🏆 Record Personali in sviluppo', 'info');
    }

    /**
     * Mostra overlay di loading
     */
    showLoading(message = 'Caricamento...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            const text = overlay.querySelector('p');
            if (text) text.textContent = message;
        }
    }

    /**
     * Nasconde overlay di loading
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Mostra messaggio temporaneo
     */
    showMessage(message, type = 'info', duration = 3000) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, duration);
    }
}

// Inizializza l'applicazione
const gymTracker = new GymTracker();

// Esponi funzioni globali per i bottoni HTML
window.showMainMenu = () => gymTracker.showMainMenu();
window.showSubmenu = () => gymTracker.showSubmenu();
window.startWorkout = (num) => gymTracker.startWorkout(num);
window.saveWorkoutSession = () => gymTracker.saveWorkoutSession();
window.showStats = () => gymTracker.showStats();
window.showSchede = () => gymTracker.showSchede();
window.showMaxRecords = () => gymTracker.showMaxRecords();