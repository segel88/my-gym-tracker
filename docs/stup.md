# Setup Guida Dettagliata

## Configurazione Google Apps Script

### 1. Crea Foglio Google Sheets
1. Vai su [sheets.google.com](https://sheets.google.com)
2. Crea nuovo foglio: "My Gym Tracker Database"
3. Copia l'ID dal URL: `https://docs.google.com/spreadsheets/d/[QUESTO_È_L_ID]/edit`

### 2. Setup Apps Script
1. Dal foglio: Estensioni > Apps Script
2. Rinomina progetto: "My Gym Tracker API"
3. Copia i file dalla cartella `google-apps-script/`

### 3. Deploy Web App
1. Deploy > Nuova distribuzione
2. Tipo: App Web
3. Esegui come: Me
4. Accesso: Chiunque
5. Copia URL Web App

### 4. Aggiorna Configurazione
Nel file `js/config.js`, aggiorna:
```javascript
const CONFIG = {
    spreadsheetId: 'IL_TUO_SPREADSHEET_ID',
    webAppUrl: 'IL_TUO_WEB_APP_URL'
};