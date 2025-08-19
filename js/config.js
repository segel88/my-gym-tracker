/**
 * Configurazione generale dell'applicazione My Gym Tracker
 */

// Configurazione principale
const CONFIG = {
    // Google Sheets & Apps Script
    spreadsheetId: '1UlO-G1jAzetmAuOP5dtNGQ2dvUo3hPtk0-soPAbxFZI', // ← Il tuo ID vero
    webAppUrl: 'https://script.google.com/macros/s/AKfycbyUk38cT_-iP94kbjkNEZDP0-IbipK5_a72u-KILNV63yskPKgzK50Mp3bK1npVmi-j/exec', // ← Il tuo URL vero
    
    // Modalità sviluppo (commentata per permettere connessione reale)
    // devMode: location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1',
    
    // Versioning
    version: '1.0.0',
    lastUpdate: '2025-01-01',
    
    // Impostazioni App
    app: {
        name: 'My Gym Tracker',
        description: 'Traccia i tuoi progressi in palestra',
        author: 'Your Name',
        theme: 'auto' // 'light', 'dark', 'auto'
    },
    
    // Cache e Storage
    cache: {
        enabled: true,
        duration: 24 * 60 * 60 * 1000, // 24 ore in millisecondi
        keys: {
            workoutTemplates: 'gym_workout_templates',
            userSettings: 'gym_user_settings',
            lastSession: 'gym_last_session',
            stats: 'gym_stats_cache'
        }
    },
    
    // Impostazioni UI
    ui: {
        animationDuration: 300,
        showSuccessMessage: 3000,
        showErrorMessage: 5000,
        autoSaveDelay: 2000
    },
    
    // Limiti e Validazioni
    limits: {
        maxWeight: 500, // kg
        minWeight: 0,
        maxSets: 10,
        maxReps: 50,
        exerciseNameLength: 50
    }
};

// Template schede allenamento predefinite
const WORKOUT_TEMPLATES = { }
// NON USARE PIU I TEMPLATE PREDEFINITI
   
    

// Impostazioni Google Apps Script
const GAS_CONFIG = {
    // Endpoint functions
    endpoints: {
        saveWorkout: 'saveWorkoutSession',
        getStats: 'getWorkoutStats',
        getWorkouts: 'getWorkoutHistory',
        saveTemplate: 'saveWorkoutTemplate',
        getTemplates: 'getWorkoutTemplates',
        deleteWorkout: 'deleteWorkoutSession'
    },
    
    // Fogli Google Sheets
    sheets: {
        workouts: 'Allenamenti',
        templates: 'Schede',
        stats: 'Statistiche',
        records: 'Record'
    },
    
    // Timeout per le chiamate
    timeout: 10000, // 10 secondi
    
    // Retry configuration
    retry: {
        attempts: 3,
        delay: 1000 // 1 secondo
    }
};

// Categorie esercizi e icone
const EXERCISE_CATEGORIES = {
    'Petto': { icon: '💪', color: '#ff6b6b' },
    'Dorso': { icon: '🔙', color: '#74b9ff' },
    'Spalle': { icon: '🤲', color: '#a29bfe' },
    'Gambe': { icon: '🦵', color: '#00b894' },
    'Bicipiti': { icon: '💪', color: '#fdcb6e' },
    'Tricipiti': { icon: '🔧', color: '#e17055' },
    'Addominali': { icon: '🎯', color: '#6c5ce7' },
    'Cardio': { icon: '❤️', color: '#fd79a8' }
};

// Messaggi dell'applicazione
const MESSAGES = {
    success: {
        workoutSaved: '✅ Sessione salvata con successo!',
        templateSaved: '✅ Scheda salvata!',
        dataLoaded: '✅ Dati caricati!',
        settingsUpdated: '✅ Impostazioni aggiornate!'
    },
    error: {
        networkError: '❌ Errore di connessione. Riprova.',
        invalidData: '❌ Dati non validi.',
        saveError: '❌ Errore durante il salvataggio.',
        loadError: '❌ Errore durante il caricamento.',
        notFound: '❌ Elemento non trovato.'
    },
    info: {
        loading: '⏳ Caricamento in corso...',
        saving: '💾 Salvataggio in corso...',
        processing: '⚙️ Elaborazione...',
        connecting: '🔗 Connessione al server...'
    }
};

// Export per compatibilità
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        WORKOUT_TEMPLATES,
        GAS_CONFIG,
        EXERCISE_CATEGORIES,
        MESSAGES
    };
}