class BEPExtractorPopup {
    constructor() {
        this.isExtracting = false;
        this.extractedCount = 0;
        this.totalCount = 0;
        this.phonesCount = 0;
        this.progress = 0;
        this.elapsedTime = 0;
        this.estimatedTimeRemaining = 0;
        this.estimatedTotalTime = 0;
        this.logs = [];
        
        this.initializeUI();
        this.loadStoredData();
        this.setupEventListeners();
    }

    initializeUI() {
        // Éléments DOM
        this.elements = {
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            username: document.getElementById('username'),
            password: document.getElementById('password'),
            saveCredentials: document.getElementById('saveCredentials'),
            configFirebase: document.getElementById('configFirebase'),
            firebaseStatus: document.getElementById('firebaseStatus'),
            firebaseModal: document.getElementById('firebaseModal'),
            extractedCount: document.getElementById('extractedCount'),
            totalCount: document.getElementById('totalCount'),
            phonesCount: document.getElementById('phonesCount'),
            progressBar: document.getElementById('progressBar'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            timeStats: document.getElementById('timeStats'),
            timeRemaining: document.getElementById('timeRemaining'),
            timeElapsed: document.getElementById('timeElapsed'),
            timeTotal: document.getElementById('timeTotal'),
            startExtraction: document.getElementById('startExtraction'),
            stopExtraction: document.getElementById('stopExtraction'),
            extractPhones: document.getElementById('extractPhones'),
            batchMode: document.getElementById('batchMode'),
            logs: document.getElementById('logs'),
            clearLogs: document.getElementById('clearLogs'),
            
            // Firebase modal
            firebaseApiKey: document.getElementById('firebaseApiKey'),
            firebaseAuthDomain: document.getElementById('firebaseAuthDomain'),
            firebaseProjectId: document.getElementById('firebaseProjectId'),
            saveFirebaseConfig: document.getElementById('saveFirebaseConfig'),
            cancelFirebaseConfig: document.getElementById('cancelFirebaseConfig')
        };
    }

    async loadStoredData() {
        try {
            // Charger les credentials BEP
            const result = await chrome.storage.local.get(['bepCredentials', 'firebaseConfig', 'extractionStats']);
            
            if (result.bepCredentials) {
                this.elements.username.value = result.bepCredentials.username || '';
                this.elements.password.value = result.bepCredentials.password || '';
            }

            if (result.firebaseConfig) {
                this.updateFirebaseStatus(true);
            }

            if (result.extractionStats) {
                this.extractedCount = result.extractionStats.extracted || 0;
                this.totalCount = result.extractionStats.total || 0;
                this.phonesCount = result.extractionStats.phones || 0;
                this.progress = result.extractionStats.progress || 0;
                this.updateStats();
            }

            // Vérifier le statut de connexion
            await this.checkConnectionStatus();
            
        } catch (error) {
            this.addLog('Erreur lors du chargement des données: ' + error.message, 'error');
        }
    }

    setupEventListeners() {
        // Sauvegarde des credentials
        this.elements.saveCredentials.addEventListener('click', () => this.saveCredentials());

        // Configuration Firebase
        this.elements.configFirebase.addEventListener('click', () => this.showFirebaseModal());
        this.elements.saveFirebaseConfig.addEventListener('click', () => this.saveFirebaseConfig());
        this.elements.cancelFirebaseConfig.addEventListener('click', () => this.hideFirebaseModal());

        // Extraction
        this.elements.startExtraction.addEventListener('click', () => this.startExtraction());
        this.elements.stopExtraction.addEventListener('click', () => this.stopExtraction());

        // Logs
        this.elements.clearLogs.addEventListener('click', () => this.clearLogs());

        // Messages du content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message);
        });
    }

    async saveCredentials() {
        const credentials = {
            username: this.elements.username.value,
            password: this.elements.password.value
        };

        try {
            await chrome.storage.local.set({ bepCredentials: credentials });
            this.addLog('Credentials sauvegardés avec succès', 'success');
        } catch (error) {
            this.addLog('Erreur lors de la sauvegarde: ' + error.message, 'error');
        }
    }

    showFirebaseModal() {
        this.elements.firebaseModal.style.display = 'flex';
    }

    hideFirebaseModal() {
        this.elements.firebaseModal.style.display = 'none';
    }

    async saveFirebaseConfig() {
        const config = {
            apiKey: this.elements.firebaseApiKey.value,
            authDomain: this.elements.firebaseAuthDomain.value,
            projectId: this.elements.firebaseProjectId.value
        };

        if (!config.apiKey || !config.authDomain || !config.projectId) {
            this.addLog('Veuillez remplir tous les champs Firebase', 'error');
            return;
        }

        try {
            await chrome.storage.local.set({ firebaseConfig: config });
            this.updateFirebaseStatus(true);
            this.hideFirebaseModal();
            this.addLog('Configuration Firebase sauvegardée', 'success');
        } catch (error) {
            this.addLog('Erreur lors de la sauvegarde Firebase: ' + error.message, 'error');
        }
    }

    updateFirebaseStatus(connected) {
        if (connected) {
            this.elements.firebaseStatus.textContent = 'Configuré et connecté';
            this.elements.firebaseStatus.classList.add('connected');
        } else {
            this.elements.firebaseStatus.textContent = 'Non configuré';
            this.elements.firebaseStatus.classList.remove('connected');
        }
    }

    async checkConnectionStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab.url && tab.url.includes('abonnes.beplogement.com')) {
                this.updateConnectionStatus('connected', 'Connecté au site BEP');
            } else {
                this.updateConnectionStatus('disconnected', 'Naviguez vers le site BEP');
            }
        } catch (error) {
            this.updateConnectionStatus('disconnected', 'Erreur de connexion');
        }
    }

    updateConnectionStatus(status, text) {
        this.elements.statusText.textContent = text;
        this.elements.statusIndicator.className = 'indicator';
        
        if (status === 'connected') {
            this.elements.statusIndicator.classList.add('connected');
        } else if (status === 'processing') {
            this.elements.statusIndicator.classList.add('processing');
        }
    }

    async startExtraction() {
        this.addLog('🔄 Début de startExtraction()', 'info');
        
        if (this.isExtracting) {
            this.addLog('⚠️ Extraction déjà en cours, abandon', 'warning');
            return;
        }

        // Vérifier les credentials
        this.addLog('🔍 Vérification des credentials...', 'info');
        const result = await chrome.storage.local.get(['bepCredentials', 'firebaseConfig']);
        this.addLog(`📋 Credentials trouvés: ${result.bepCredentials ? 'Oui' : 'Non'}`, 'info');
        
        if (!result.bepCredentials?.username || !result.bepCredentials?.password) {
            this.addLog('❌ Credentials manquants', 'error');
            return;
        }

        // Récupérer la destination choisie
        this.addLog('🎯 Vérification de la destination...', 'info');
        const destinationRadio = document.querySelector('input[name="destination"]:checked');
        const destination = destinationRadio ? destinationRadio.value : 'csv';
        this.addLog(`📍 Destination choisie: ${destination}`, 'info');

        // Vérifier Firebase seulement si choisi
        if (destination === 'firebase' && !result.firebaseConfig) {
            this.addLog('❌ Firebase non configuré', 'error');
            return;
        }

        this.addLog('✅ Toutes les vérifications passées', 'success');
        this.isExtracting = true;
        this.updateExtractionUI(true);
        this.updateConnectionStatus('processing', 'Extraction en cours...');

        // Envoyer le message au content script
        try {
            this.addLog('🔎 Recherche de l\'onglet actif...', 'info');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.addLog(`🌐 URL de l'onglet: ${tab.url}`, 'info');
            
            // Vérifier que l'onglet est sur le bon site
            if (!tab.url || !tab.url.includes('abonnes.beplogement.com')) {
                throw new Error('Veuillez naviguer vers le site BEP (abonnes.beplogement.com)');
            }

            this.addLog('✅ Onglet BEP détecté', 'success');

            const options = {
                extractPhones: this.elements.extractPhones.checked,
                batchMode: this.elements.batchMode.checked,
                destination: destination
            };

            this.addLog(`⚙️ Options d'extraction: ${JSON.stringify(options)}`, 'info');

            // Attendre un peu pour s'assurer que le content script est chargé
            this.addLog('⏳ Attente de 500ms pour le content script...', 'info');
            await this.delay(500);

            // Essayer d'envoyer le message avec retry
            this.addLog('📨 Envoi du message au content script...', 'info');
            await this.sendMessageWithRetry(tab.id, {
                action: 'startExtraction',
                options: options
            });

            this.addLog(`🚀 Extraction démarrée vers ${destination === 'firebase' ? 'Firestore' : 'fichier CSV'}...`, 'success');
            
        } catch (error) {
            this.addLog('💥 Erreur lors du démarrage: ' + error.message, 'error');
            this.stopExtraction();
        }
    }

    async sendMessageWithRetry(tabId, message, maxRetries = 3) {
        this.addLog(`📤 Envoi message à l'onglet ${tabId}: ${message.action}`, 'info');
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                this.addLog(`🔄 Tentative ${i + 1}/${maxRetries} d'envoi du message...`, 'info');
                await chrome.tabs.sendMessage(tabId, message);
                this.addLog(`✅ Message envoyé avec succès !`, 'success');
                return; // Succès
            } catch (error) {
                this.addLog(`❌ Erreur tentative ${i + 1}: ${error.message}`, 'warning');
                
                if (i === maxRetries - 1) {
                    // Dernière tentative
                    if (error.message.includes('Receiving end does not exist')) {
                        throw new Error('Le script d\'extraction n\'est pas chargé. Rechargez la page BEP et réessayez.');
                    }
                    throw error;
                }
                // Attendre avant de réessayer
                this.addLog(`⏳ Attente de 1s avant nouvelle tentative...`, 'info');
                await this.delay(1000);
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async stopExtraction() {
        this.isExtracting = false;
        this.updateExtractionUI(false);
        this.updateConnectionStatus('connected', 'Extraction arrêtée');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { action: 'stopExtraction' });
            this.addLog('Extraction arrêtée par l\'utilisateur', 'warning');
        } catch (error) {
            console.log('Erreur lors de l\'arrêt:', error);
        }
    }

    updateExtractionUI(extracting) {
        this.elements.startExtraction.style.display = extracting ? 'none' : 'block';
        this.elements.stopExtraction.style.display = extracting ? 'block' : 'none';
        this.elements.startExtraction.disabled = extracting;
    }

    handleMessage(message) {
        switch (message.action) {
            case 'contentScriptReady':
                const version = message.version || 'inconnue';
                this.addLog(`✅ Script d'extraction chargé et prêt - ${version}`, 'success');
                this.updateConnectionStatus('connected', 'Prêt pour l\'extraction');
                break;

            case 'updateStats':
                this.extractedCount = message.data.extracted || 0;
                this.totalCount = message.data.total || 0;
                this.phonesCount = message.data.phones || 0;
                this.progress = message.data.progress || 0;
                this.elapsedTime = message.data.elapsedTime || 0;
                this.estimatedTimeRemaining = message.data.estimatedTimeRemaining || 0;
                this.estimatedTotalTime = message.data.estimatedTotalTime || 0;
                this.updateStats();
                break;

            case 'log':
                this.addLog(message.text, message.type);
                break;

            case 'extractionComplete':
                this.isExtracting = false;
                this.updateExtractionUI(false);
                this.updateConnectionStatus('connected', 'Extraction terminée');
                this.addLog(`Extraction terminée: ${message.data.extracted} annonces, ${message.data.phones} téléphones`, 'success');
                
                // Masquer les éléments de progression à la fin
                setTimeout(() => {
                    this.elements.timeStats.style.display = 'none';
                }, 3000); // Laisser visible 3 secondes pour voir le résultat final
                break;

            case 'extractionError':
                this.isExtracting = false;
                this.updateExtractionUI(false);
                this.updateConnectionStatus('connected', 'Erreur d\'extraction');
                this.addLog('Erreur: ' + message.error, 'error');
                break;
        }
    }

    updateStats() {
        // Mettre à jour le compteur principal
        this.elements.extractedCount.textContent = this.extractedCount;
        this.elements.phonesCount.textContent = this.phonesCount;

        // Afficher le total si disponible
        if (this.totalCount > 0) {
            this.elements.totalCount.textContent = `/${this.totalCount}`;
            this.elements.totalCount.style.display = 'inline-block';
            
            // Afficher et mettre à jour la barre de progression
            this.elements.progressBar.style.display = 'block';
            this.elements.progressFill.style.width = `${this.progress}%`;
            this.elements.progressText.textContent = `${this.progress}%`;
            
            // Afficher les statistiques de temps si en cours d'extraction
            if (this.isExtracting && this.extractedCount > 0) {
                this.elements.timeStats.style.display = 'block';
                
                // Temps écoulé
                this.elements.timeElapsed.textContent = this.formatTime(this.elapsedTime);
                
                // Temps restant
                if (this.estimatedTimeRemaining > 0) {
                    this.elements.timeRemaining.textContent = this.formatTime(this.estimatedTimeRemaining);
                } else {
                    this.elements.timeRemaining.textContent = '--';
                }
                
                // Temps total estimé
                if (this.estimatedTotalTime > 0) {
                    this.elements.timeTotal.textContent = this.formatTime(this.estimatedTotalTime);
                } else {
                    this.elements.timeTotal.textContent = '--';
                }
            }
        } else {
            // Masquer les éléments progressifs si pas d'extraction en cours
            this.elements.totalCount.style.display = 'none';
            this.elements.progressBar.style.display = 'none';
            if (!this.isExtracting) {
                this.elements.timeStats.style.display = 'none';
            }
        }

        // Sauvegarder les stats
        chrome.storage.local.set({
            extractionStats: {
                extracted: this.extractedCount,
                total: this.totalCount,
                phones: this.phonesCount,
                progress: this.progress
            }
        });
    }

    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    addLog(text, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${text}`;
        
        this.elements.logs.appendChild(logEntry);
        this.elements.logs.scrollTop = this.elements.logs.scrollHeight;

        // Limiter à 100 logs
        const logEntries = this.elements.logs.querySelectorAll('.log-entry');
        if (logEntries.length > 100) {
            logEntries[0].remove();
        }
    }

    clearLogs() {
        this.elements.logs.innerHTML = '';
    }

    async exportData(format) {
        try {
            const result = await chrome.storage.local.get(['extractedData']);
            const data = result.extractedData || [];

            if (data.length === 0) {
                this.addLog('Aucune donnée à exporter', 'warning');
                return;
            }

            let content, filename;

            if (format === 'csv') {
                content = this.convertToCSV(data);
                filename = `bep_annonces_${new Date().toISOString().split('T')[0]}.csv`;
            } else {
                this.addLog('Format d\'export non supporté', 'error');
                return;
            }

            // Utiliser l'API Chrome downloads (plus propre que blob URL)
            try {
                const dataURL = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
                
                const downloadId = await chrome.downloads.download({
                    url: dataURL,
                    filename: filename,
                    saveAs: false  // Téléchargement automatique sans dialogue
                });
                
                this.addLog(`Export CSV terminé (ID: ${downloadId}): ${data.length} annonces`, 'success');
                
            } catch (chromeError) {
                // Fallback vers la méthode blob si l'API Chrome downloads n'est pas disponible
                this.addLog('API downloads non disponible, fallback vers blob...', 'warning');
                
                const blob = new Blob([content], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.addLog(`Export CSV terminé (fallback): ${data.length} annonces`, 'success');
            }

        } catch (error) {
            this.addLog('Erreur lors de l\'export: ' + error.message, 'error');
        }
    }

    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        return csvContent;
    }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new BEPExtractorPopup();
}); 