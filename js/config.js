/**
 * Configurazione generale dell'applicazione My Gym Tracker
 */

// Configurazione principale
const CONFIG = {
    // Google Sheets & Apps Script
    spreadsheetId: '1UlO-G1jAzetmAuOP5dtNGQ2dvUo3hPtk0-soPAbxFZI', // DA CONFIGURARE: Inserisci qui l'ID del tuo Google Sheet
    webAppUrl: 'https://script.google.com/macros/s/AKfycbx3h_Gw5lX8jdrg_fUAzK4fj-elUKz7AEN5U8_zGmHqM4jbDz479XKdCola4_82yQb1/exec', // DA CONFIGURARE: Inserisci qui l'URL del tuo Web App Google Apps Script
    
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
const WORKOUT_TEMPLATES = {
    1: {
        id: 1,
        name: "Primo Allenamento",
        description: "Focus su petto, spalle e tricipiti",
        color: "#74b9ff",
        exercises: [
            { 
                name: "Panca Piana", 
                sets: 4, 
                reps: "8-10",
                category: "Petto",
                equipment: "Bilanciere"
            },
            { 
                name: "Trazioni", 
                sets: 4, 
                reps: "6-8",
                category: "Dorso",
                equipment: "Corpo libero"
            },
            { 
                name: "Squat", 
                sets: 4, 
                reps: "10-12",
                category: "Gambe",
                equipment: "Bilanciere"
            },
            { 
                name: "Shoulder Press", 
                sets: 3, 
                reps: "8-10",
                category: "Spalle",
                equipment: "Manubri"
            },
            { 
                name: "Dips", 
                sets: 3, 
                reps: "8-12",
                category: "Tricipiti",
                equipment: "Parallele"
            }
        ]
    },
    2: {
        id: 2,
        name: "Secondo Allenamento",
        description: "Focus su gambe e braccia",
        color: "#a29bfe",
        exercises: [
            { 
                name: "Stacco da Terra", 
                sets: 4, 
                reps: "5-6",
                category: "Gambe",
                equipment: "Bilanciere"
            },
            { 
                name: "Rematore", 
                sets: 4, 
                reps: "8-10",
                category: "Dorso",
                equipment: "Bilanciere"
            },
            { 
                name: "Affondi", 
                sets: 3, 
                reps: "10-12",
                category: "Gambe",
                equipment: "Manubri"
            },
            { 
                name: "Curl Bicipiti", 
                sets: 3, 
                reps: "10-12",
                category: "Bicipiti",
                equipment: "Manubri"
            },
            { 
                name: "French Press", 
                sets: 3, 
                reps: "10-12",
                category: "Tricipiti",
                equipment: "Bilanciere EZ"
            }
        ]
    },
    3: {
        id: 3,
        name: "Terzo Allenamento",
        description: "Allenamento completo e definizione",
        color: "#00b894",
        exercises: [
            { 
                name: "Panca Inclinata", 
                sets: 4, 
                reps: "8-10",
                category: "Petto",
                equipment: "Manubri"
            },
            { 
                name: "Lat Machine", 
                sets: 4, 
                reps: "8-10",
                category: "Dorso",
                equipment: "Cavi"
            },
            { 
                name: "Leg Press", 
                sets: 4, 
                reps: "12-15",
                category: "Gambe",
                equipment: "Macchina"
            },
            { 
                name: "Alzate Laterali", 
                sets: 3, 
                reps: "12-15",
                category: "Spalle",
                equipment: "Manubri"
            },
            { 
                name: "Crunch", 
                sets: 3, 
                reps: "15-20",
                category: "Addominali",
                equipment: "Corpo libero"
            }
        ]
    }
};

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