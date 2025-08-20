# 💪 My Gym Tracker

Una Progressive Web App (PWA) per tracciare i progressi degli allenamenti in palestra, con sincronizzazione automatica su Google Sheets.

## 🚀 Caratteristiche

- **📱 PWA**: Installabile su dispositivi mobili
- **🔄 Sincronizzazione**: Backup automatico su Google Sheets
- **📊 Statistiche**: Tracciamento progressi e record personali
- **🏋️ Schede personalizzabili**: Gestione completa degli allenamenti
- **💾 Offline**: Funziona anche senza connessione internet
- **📈 Grafici**: Visualizzazione dei progressi nel tempo

## 🛠️ Tecnologie Utilizzate

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Hosting**: GitHub Pages
- **PWA**: Service Worker, Web App Manifest

## 📁 Struttura del Progetto

```
my-gym-tracker/
├── index.html                 # App principale
├── manifest.json             # Configurazione PWA
├── css/
│   └── styles.css            # Stili CSS
├── js/
│   ├── app.js                # Logica principale
│   ├── config.js             # Configurazioni
│   └── utils.js              # Funzioni utility
├── google-apps-script/
│   ├── code.gs               # Script principale GAS
│   ├── database.gs           # Gestione database
│   └── appsscript.json       # Configurazione GAS
├── assets/
│   └── icons/                # Icone PWA
└── docs/
    └── setup.md              # Guida setup
```

## 🎯 Funzionalità Principali

### ✅ Implementate (v1.0)
- [x] Interface utente responsive
- [x] Menu navigazione
- [x] Inserimento pesi per serie
- [x] Salvataggio locale (offline)
- [x] Template allenamenti predefiniti
- [x] Validazione input
- [x] PWA manifest

### 🚧 In Sviluppo (v1.1)
- [X] Connessione Google Apps Script
- [x] Sincronizzazione Google Sheets
- [x] Statistiche e grafici
- [x] Gestione schede personalizzate
- [x] Record personali

### 🔮 Prossime Release
- [ ] Export dati (PDF, Excel)
- [ ] Promemoria allenamenti
- [ ] Social sharing
- [ ] Modalità dark/light
- [ ] Backup cloud

## 🔧 Setup Locale

### Prerequisiti
- Browser moderno (Chrome, Firefox, Safari, Edge)
- Git installato
- Account Google (per Apps Script)

## 📱 Installazione come App

### Android/Chrome
1. Apri l'app nel browser
2. Menu > "Aggiungi alla schermata Home"
3. L'app apparirà come app nativa

### iOS/Safari
1. Apri l'app in Safari
2. Tocca il pulsante "Condividi"
3. "Aggiungi alla schermata Home"

## ⚙️ Configurazione Google Apps Script

### 1. Crea nuovo progetto Apps Script
```
https://script.google.com/
```

### 2. Carica i file da `/google-apps-script/`
- Copia il contenuto dei file .gs
- Configura le autorizzazioni

### 3. Deploy come Web App
- Deploy > Nuova distribuzione
- Tipo: App Web
- Esegui come: Me
- Autorizzazioni: Chiunque

### 4. Aggiorna configurazione
Nel file `js/config.js`:
```javascript
const CONFIG = {
    spreadsheetId: 'TUO_SPREADSHEET_ID',
    webAppUrl: 'TUO_WEB_APP_URL'
};
```

## 📊 Struttura Google Sheets

L'app creerà automaticamente questi fogli:

- **Allenamenti**: Dati delle sessioni
- **Schede**: Template personalizzati  
- **Statistiche**: Metriche aggregate
- **Record**: Massimali personali

## 🐛 Risoluzione Problemi

### App non si installa
- Verifica che il manifest.json sia valido
- Controlla la console per errori
- Assicurati che sia servita via HTTPS

### Dati non si sincronizzano
- Verifica la configurazione Apps Script
- Controlla le autorizzazioni Google
- Verifica la connessione internet

### Performance lente
- Controlla la cache del browser
- Verifica la dimensione del localStorage
- Riavvia l'app

## 🤝 Contributi

I contributi sono benvenuti! Per favore:

1. Fai fork del progetto
2. Crea un branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Changelog

### v1.0.0 (20/08/2025)
- ✨ Interface utente completa
- ✨ Sistema di navigazione
- ✨ Template allenamenti predefiniti
- ✨ Salvataggio locale
- ✨ PWA manifest
- ✨ Design responsive
- ✨ Integrazione Google Apps Script
- ✨ Sistema statistiche base
- ✨ Tracking record personali

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

## 👨‍💻 Autore

- GitHub: [@Segel88](https://github.com/Segel88)
- Email: tua.email@example.com

## 📞 Supporto

Se hai problemi o domande:
- 🐛 [Apri un Issue](https://github.com/tuo-username/my-gym-tracker/issues)
- 💬 [Discussioni](https://github.com/tuo-username/my-gym-tracker/discussions)

---

**⭐ Se questo progetto ti è utile, lascia una stella!**