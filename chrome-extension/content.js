class BEPExtractor {
    constructor() {
        this.isExtracting = false;
        this.shouldStop = false;
        this.extractedAnnonces = [];
        this.stats = { extracted: 0, phones: 0, total: 0 };
        this.startTime = null;
        
        // Sélecteurs CSS basés sur la vraie structure HTML du site
        this.selectors = {
            // Authentification
            loginForm: 'form[name="form1"]',
            usernameField: 'input[name="abonlogin1"]',
            passwordField: 'input[name="abonpassword"]',
            submitButton: 'input[type="submit"]',
            
            // Annonces - vraie structure
            annonceRows: 'tr[onmouseover*="backgroundColor"]',
            typeHeaders: 'tr[bgcolor="#FFAAAA"] font',
            bulletinInfo: 'font[style*="color: #AA0000"]',
            boutonDemande: 'input[onclick*="sendreq"]',
            imageLinks: 'a[rel*="image"]',
            classeEnergetique: 'td[background*="fleche_select2.png"] font',
            
            // Navigation
            nextPageLink: 'a[href*="page="]',
            pageInfo: 'td[align="center"] font'
        };
        
        this.init();
    }

    init() {
        const version = 'v2.0-' + Date.now(); // Version avec timestamp
        console.log('🚀 BEP Extractor initialisé - Version:', version);
        console.log('🌐 URL:', window.location.href);
        this.setupMessageListener();
        this.checkForAutoLogin();
        
        // Signaler que le script est prêt avec la version
        this.sendMessage('contentScriptReady', { 
            url: window.location.href,
            version: version
        });
        this.log(`🔧 Content Script ${version} chargé et prêt`, 'success');
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sendResponse);
            return true; // Permet les réponses asynchrones
        });
    }

    async handleMessage(message, sendResponse) {
        this.log(`📨 Message reçu: ${message.action}`, 'info');
        console.log('📨 Message complet reçu:', message);
        
        switch (message.action) {
            case 'startExtraction':
                this.log(`🚀 Début de l'extraction avec options: ${JSON.stringify(message.options)}`, 'info');
                await this.startExtraction(message.options);
                sendResponse({ success: true });
                break;
                
            case 'stopExtraction':
                this.log('⏹️ Arrêt de l\'extraction demandé', 'warning');
                this.stopExtraction();
                sendResponse({ success: true });
                break;
                
            default:
                this.log(`❌ Action inconnue: ${message.action}`, 'error');
                sendResponse({ success: false, error: 'Action inconnue' });
        }
    }

    // Authentification automatique
    async checkForAutoLogin() {
        if (this.isLoginPage()) {
            this.log('Page de connexion détectée', 'info');
            await this.performAutoLogin();
        }
    }

    isLoginPage() {
        return window.location.href.includes('w_index_abonnes.php') ||
               document.querySelector(this.selectors.usernameField) !== null;
    }

    async performAutoLogin() {
        try {
            const result = await chrome.storage.local.get(['bepCredentials']);
            
            if (!result.bepCredentials?.username || !result.bepCredentials?.password) {
                this.log('Credentials manquants pour l\'auto-login', 'warning');
                return;
            }

            const usernameField = document.querySelector(this.selectors.usernameField);
            const passwordField = document.querySelector(this.selectors.passwordField);
            const submitButton = document.querySelector(this.selectors.submitButton);

            if (usernameField && passwordField && submitButton) {
                this.log('Remplissage automatique des credentials...', 'info');
                
                usernameField.value = result.bepCredentials.username;
                passwordField.value = result.bepCredentials.password;
                
                // Attendre un peu pour que les champs soient remplis
                await this.delay(1000);
                
                this.log('Connexion automatique...', 'info');
                submitButton.click();
            }
        } catch (error) {
            this.log('Erreur lors de l\'auto-login: ' + error.message, 'error');
        }
    }

    // Calculer le total d'annonces disponibles
    async calculateTotalAnnonces(options) {
        this.log('🔢 Calcul du nombre total d\'annonces...', 'info');
        
        const currentPageAnnonces = this.findAnnoncesOnPage();
        
        if (options.batchMode) {
            // En mode batch, estimer le total basé sur la pagination visible
            this.stats.total = this.estimateTotalFromPagination(currentPageAnnonces.length);
            this.log(`📊 Total estimé: ${this.stats.total} annonces (${currentPageAnnonces.length} sur cette page)`, 'info');
        } else {
            // En mode page unique, compter sur la page courante
            this.stats.total = currentPageAnnonces.length;
            this.log(`📊 Total sur cette page: ${this.stats.total} annonces`, 'info');
        }
        
        this.updateStats();
    }

    // Estimer le total basé sur les informations de pagination
    estimateTotalFromPagination(currentPageCount) {
        // Chercher des indices de pagination dans la page
        const pageInfo = document.body.textContent;
        
        // Chercher des patterns comme "Page 1 sur 5" ou "1/5" ou "Résultats: 1-10 sur 50"
        const patterns = [
            /Page\s+\d+\s+sur\s+(\d+)/i,
            /\d+\/(\d+)/,
            /sur\s+(\d+)/i,
            /total:\s*(\d+)/i,
            /(\d+)\s+résultats?/i
        ];
        
        for (const pattern of patterns) {
            const match = pageInfo.match(pattern);
            if (match && parseInt(match[1]) > 0) {
                const totalFromPattern = parseInt(match[1]);
                this.log(`📖 Info pagination trouvée: ${totalFromPattern}`, 'info');
                return totalFromPattern;
            }
        }
        
        // Si aucune info de pagination, estimer basé sur les liens "suivant"
        const nextLinks = document.querySelectorAll('a[href*="page="]');
        if (nextLinks.length > 0) {
            // Estimation simple: si il y a des liens de page, multiplier par un facteur
            const estimatedPages = nextLinks.length + 1;
            const estimated = currentPageCount * estimatedPages;
            this.log(`🔗 Estimation basée sur ${estimatedPages} pages visibles`, 'info');
            return estimated;
        }
        
        // Par défaut, retourner le nombre sur cette page
        this.log(`📄 Pas d'info pagination, utilisation du total de cette page`, 'info');
        return currentPageCount;
    }

    // Extraction principale
    async startExtraction(options = {}) {
        this.log('🔄 Entrée dans startExtraction()', 'info');
        
        if (this.isExtracting) {
            this.log('⚠️ Extraction déjà en cours', 'warning');
            return;
        }

        this.log(`🌐 URL actuelle: ${window.location.href}`, 'info');
        
        if (this.isLoginPage()) {
            this.log('❌ Page de connexion détectée, veuillez vous connecter d\'abord', 'error');
            return;
        }

        this.log('✅ Page valide pour extraction', 'success');
        this.isExtracting = true;
        this.shouldStop = false;
        this.extractedAnnonces = [];
        this.stats = { extracted: 0, phones: 0, total: 0 };
        this.extractionOptions = options; // Stocker les options
        this.startTime = Date.now(); // Démarrer le timer

        this.log(`🎯 Début de l'extraction des annonces vers ${options.destination === 'firebase' ? 'Firestore' : 'fichier CSV'}...`, 'info');
        this.log(`⚙️ Mode batch: ${options.batchMode ? 'Oui' : 'Non'}`, 'info');
        this.log(`📞 Extraction téléphones: ${options.extractPhones ? 'Oui' : 'Non'}`, 'info');

        // Calculer le total d'annonces dès le début
        await this.calculateTotalAnnonces(options);
        this.log(`📊 Total d'annonces à extraire: ${this.stats.total}`, 'info');

        try {
            if (options.batchMode) {
                this.log('📄 Mode batch - extraction de toutes les pages', 'info');
                await this.extractAllPages(options);
            } else {
                this.log('📄 Mode page unique', 'info');
                await this.extractCurrentPage(options);
            }

            this.log('💾 Sauvegarde des données extraites...', 'info');
            await this.saveExtractedData();
            
            this.log(`✅ Extraction terminée: ${this.stats.extracted} annonces, ${this.stats.phones} téléphones`, 'success');
            this.sendMessage('extractionComplete', { data: this.stats });
            
        } catch (error) {
            this.log('💥 Erreur pendant l\'extraction: ' + error.message, 'error');
            console.error('Erreur détaillée:', error);
            this.sendMessage('extractionError', { error: error.message });
        } finally {
            this.log('🏁 Fin de l\'extraction', 'info');
            this.isExtracting = false;
        }
    }

    async extractAllPages(options) {
        let currentPage = 1;
        let totalDiscovered = 0;
        
        while (!this.shouldStop) {
            this.log(`📄 Extraction de la page ${currentPage}...`, 'info');
            
            // Compter les annonces sur cette page avant extraction
            const annoncesSurLaPage = this.findAnnoncesOnPage();
            totalDiscovered += annoncesSurLaPage.length;
            
            // Mettre à jour le total découvert (plus précis que l'estimation)
            this.stats.total = totalDiscovered;
            this.log(`📊 Total mis à jour: ${this.stats.total} annonces découvertes jusqu'à la page ${currentPage}`, 'info');
            this.updateStats();
            
            await this.extractCurrentPage(options);
            
            if (!await this.goToNextPage()) {
                this.log('🏁 Dernière page atteinte', 'info');
                // S'assurer que le total final est correct
                this.stats.total = totalDiscovered;
                this.updateStats();
                break;
            }
            
            currentPage++;
            await this.delay(2000); // Délai entre les pages
        }
    }

    async extractCurrentPage(options) {
        this.log('🔍 Recherche des annonces sur la page courante...', 'info');
        const annonces = this.findAnnoncesOnPage();
        this.log(`📊 ${annonces.length} annonces trouvées sur cette page`, 'info');

        if (annonces.length === 0) {
            this.log('⚠️ Aucune annonce trouvée - vérifiez que vous êtes sur la bonne page', 'warning');
            return;
        }

        for (let i = 0; i < annonces.length && !this.shouldStop; i++) {
            const annonceElement = annonces[i];
            this.log(`🔄 Traitement annonce ${i + 1}/${annonces.length}...`, 'info');
            
            try {
                const annonceData = await this.extractAnnonceData(annonceElement, options);
                
                if (annonceData) {
                    this.extractedAnnonces.push(annonceData);
                    this.stats.extracted++;
                    
                    if (annonceData.telephone) {
                        this.stats.phones++;
                    }
                    
                    this.updateStats();
                    this.log(`✅ Annonce ${annonceData.id} extraite`, 'success');
                } else {
                    this.log(`⚠️ Échec extraction annonce ${i + 1}`, 'warning');
                }
                
            } catch (error) {
                this.log(`❌ Erreur sur l'annonce ${i + 1}: ${error.message}`, 'error');
                console.error('Erreur détaillée annonce:', error);
            }
            
            // Délai entre les annonces
            this.log('⏳ Délai de 1s...', 'info');
            await this.delay(1000);
        }
        
        this.log(`📈 Page terminée: ${this.stats.extracted} annonces extraites au total`, 'success');
    }

    findAnnoncesOnPage() {
        this.log('🔍 Recherche avec sélecteur: ' + this.selectors.annonceRows, 'info');
        const rows = document.querySelectorAll(this.selectors.annonceRows);
        this.log(`📋 ${rows.length} lignes trouvées avec onmouseover`, 'info');
        
        const validAnnonces = Array.from(rows).filter(row => {
            // Vérifier que c'est bien une ligne d'annonce en cherchant le pattern "numéro : titre"
            const boldElements = row.querySelectorAll('b');
            this.log(`  🔍 Ligne avec ${boldElements.length} éléments <b>`, 'info');
            
            for (const bold of boldElements) {
                const text = bold.textContent.trim();
                this.log(`    📝 Texte bold: "${text}"`, 'info');
                
                if (text.match(/^\d{7}\s*:/)) {
                    this.log(`    ✅ Pattern d'annonce détecté: ${text}`, 'success');
                    return true;
                }
            }
            return false;
        });
        
        this.log(`🎯 ${validAnnonces.length} annonces valides trouvées`, 'success');
        return validAnnonces;
    }

    async extractAnnonceData(annonceElement, options) {
        const annonceData = {
            id: null,
            titre: null,
            type: null,
            description: null,
            loyer: null,
            charges: null,
            surface: null,
            disponibilite: null,
            images: [],
            classeEnergetique: null,
            bulletin: null,
            dateBulletin: null,
            telephone: null,
            dateExtraction: new Date().toISOString(),
            statut: 'extracted'
        };

        try {
            // Extraction de la référence et du titre depuis les éléments <b>
            const boldElements = annonceElement.querySelectorAll('b');
            for (const bold of boldElements) {
                const text = bold.textContent.trim();
                const match = text.match(/^(\d{7})\s*:\s*(.+)$/);
                if (match) {
                    annonceData.id = match[1];
                    annonceData.titre = match[2].replace(/\*$/, '').trim(); // Enlever l'étoile finale
                    break;
                }
            }

            // Type de bien (chercher dans les headers de section précédents)
            annonceData.type = this.findPropertyType(annonceElement);

            // Extraction de toute la description depuis les font elements
            const fontElements = annonceElement.querySelectorAll('font');
            for (const font of fontElements) {
                const text = font.textContent;
                if (text.includes('DESCRIPTION :')) {
                    annonceData.description = text.trim();
                    
                    // Extraire le loyer
                    const loyerMatch = text.match(/LOYER\s*:\s*(\d+\.?\d*)\s*€/);
                    if (loyerMatch) {
                        annonceData.loyer = loyerMatch[1] + ' €';
                    }
                    
                    // Extraire les charges
                    const chargesMatch = text.match(/CHARGES?\s*:\s*(\d+\.?\d*)\s*€/);
                    if (chargesMatch) {
                        annonceData.charges = chargesMatch[1] + ' €';
                    }
                    
                    // Extraire la surface
                    const surfaceMatch = text.match(/(\d+)\s*M²/);
                    if (surfaceMatch) {
                        annonceData.surface = surfaceMatch[1] + ' M²';
                    }
                    
                    // Extraire la disponibilité
                    const disponibiliteMatch = text.match(/DISPONIBLE\s+([^,]+)/i);
                    if (disponibiliteMatch) {
                        annonceData.disponibilite = disponibiliteMatch[1].trim();
                    }
                    
                    break;
                }
            }

            // Images - chercher tous les liens avec rel="image"
            const imageLinks = annonceElement.querySelectorAll(this.selectors.imageLinks);
            annonceData.images = Array.from(imageLinks).map(link => link.href);

            // Classe énergétique - chercher l'élément avec fleche_select2.png
            const classeElement = annonceElement.querySelector(this.selectors.classeEnergetique);
            if (classeElement) {
                annonceData.classeEnergetique = classeElement.textContent.trim();
            }

            // Informations du bulletin - chercher dans l'élément précédent ou suivant
            const bulletinElement = this.findBulletinInfo(annonceElement);
            if (bulletinElement) {
                const bulletinText = bulletinElement.textContent;
                const bulletinMatch = bulletinText.match(/BULLETIN\s+N°\s*(\d+)/);
                const dateMatch = bulletinText.match(/(\d{2}\/\d{2}\/\d{4})/);
                
                if (bulletinMatch) annonceData.bulletin = bulletinMatch[1];
                if (dateMatch) annonceData.dateBulletin = dateMatch[1];
            }

            // Afficher les données extraites pour déboguer
            this.debugAnnonceData(annonceData);

            // Extraction du téléphone si demandé
            if (options.extractPhones && annonceData.id) {
                annonceData.telephone = await this.extractPhoneNumber(annonceElement, annonceData.id);
                if (annonceData.telephone) {
                    annonceData.statut = 'complete';
                }
            }

            return annonceData;

        } catch (error) {
            this.log(`Erreur lors de l'extraction de l'annonce: ${error.message}`, 'error');
            return null;
        }
    }

    findPropertyType(annonceElement) {
        // Chercher le header de section précédent avec bgcolor="#FFAAAA"
        let currentElement = annonceElement.previousElementSibling;
        
        while (currentElement) {
            if (currentElement.getAttribute('bgcolor') === '#FFAAAA') {
                const typeElement = currentElement.querySelector('font');
                if (typeElement) {
                    return typeElement.textContent.trim();
                }
            }
            currentElement = currentElement.previousElementSibling;
        }
        
        return null;
    }

    findBulletinInfo(annonceElement) {
        // Chercher l'info du bulletin dans l'élément précédent ou suivant
        let currentElement = annonceElement.previousElementSibling;
        
        // Chercher vers le haut
        while (currentElement) {
            const bulletinElement = currentElement.querySelector(this.selectors.bulletinInfo);
            if (bulletinElement) {
                return bulletinElement;
            }
            currentElement = currentElement.previousElementSibling;
        }
        
        // Chercher vers le bas
        currentElement = annonceElement.nextElementSibling;
        while (currentElement) {
            const bulletinElement = currentElement.querySelector(this.selectors.bulletinInfo);
            if (bulletinElement) {
                return bulletinElement;
            }
            currentElement = currentElement.nextElementSibling;
        }
        
        return null;
    }

    debugAnnonceData(annonceData) {
        this.log(`Données extraites pour l'annonce ${annonceData.id}:`, 'info');
        this.log(`- Titre: ${annonceData.titre}`, 'info');
        this.log(`- Type: ${annonceData.type}`, 'info');
        this.log(`- Loyer: ${annonceData.loyer}`, 'info');
        this.log(`- Charges: ${annonceData.charges}`, 'info');
        this.log(`- Surface: ${annonceData.surface}`, 'info');
        this.log(`- Images: ${annonceData.images.length}`, 'info');
        this.log(`- Classe énergétique: ${annonceData.classeEnergetique}`, 'info');
        this.log(`- Bulletin: ${annonceData.bulletin} du ${annonceData.dateBulletin}`, 'info');
    }

    async extractPhoneNumber(annonceElement, annonceId) {
        try {
            const boutonDemande = annonceElement.querySelector(this.selectors.boutonDemande);
            
            if (!boutonDemande) {
                this.log(`Pas de bouton de demande pour l'annonce ${annonceId}`, 'warning');
                return null;
            }

            this.log(`Clic sur le bouton de demande pour l'annonce ${annonceId}...`, 'info');
            
            // Extraire l'ID du onclick pour la demande
            const onclickAttr = boutonDemande.getAttribute('onclick');
            const idMatch = onclickAttr.match(/sendreq\((\d+)\)/);
            if (!idMatch) {
                this.log(`Impossible d'extraire l'ID de demande pour l'annonce ${annonceId}`, 'error');
                return null;
            }
            
            // Cliquer sur le bouton
            boutonDemande.click();
            
            // Attendre 15 secondes pour que le téléphone apparaisse
            this.log('Attente de 15 secondes pour la réponse...', 'info');
            await this.delay(15000);
            
            // Chercher le téléphone dans la page mise à jour
            const phoneNumber = this.findPhoneInPage(annonceId);
            
            if (phoneNumber) {
                this.log(`Téléphone trouvé pour l'annonce ${annonceId}: ${phoneNumber}`, 'success');
                return phoneNumber;
            } else {
                this.log(`Aucun téléphone trouvé pour l'annonce ${annonceId}`, 'warning');
                return null;
            }
            
        } catch (error) {
            this.log(`Erreur lors de l'extraction du téléphone pour ${annonceId}: ${error.message}`, 'error');
            return null;
        }
    }

    findPhoneInPage(annonceId) {
        // Patterns de recherche pour les numéros de téléphone
        const phonePatterns = [
            /\b(?:0[1-9][\s.-]?(?:\d{2}[\s.-]?){4})\b/g,  // Format français standard
            /\b(?:\+33[\s.-]?[1-9][\s.-]?(?:\d{2}[\s.-]?){4})\b/g,  // Format international
            /\b(?:\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})\b/g  // Format générique
        ];

        const pageText = document.body.textContent;
        
        for (const pattern of phonePatterns) {
            const matches = pageText.match(pattern);
            if (matches && matches.length > 0) {
                // Retourner le premier numéro trouvé
                return matches[0].replace(/[\s.-]/g, '');
            }
        }
        
        return null;
    }

    async goToNextPage() {
        const nextLink = this.findNextPageLink();
        
        if (nextLink) {
            this.log('Navigation vers la page suivante...', 'info');
            nextLink.click();
            
            // Attendre que la page soit chargée
            await this.delay(3000);
            return true;
        }
        
        return false;
    }

    findNextPageLink() {
        const links = document.querySelectorAll('a[href*="page="]');
        
        for (const link of links) {
            if (link.textContent.includes('Suivant') || 
                link.textContent.includes('>') ||
                link.textContent.includes('Next')) {
                return link;
            }
        }
        
        return null;
    }

    stopExtraction() {
        this.shouldStop = true;
        this.isExtracting = false;
        this.log('Arrêt de l\'extraction demandé', 'warning');
    }

    async saveExtractedData() {
        try {
            this.log('💾 Début de saveExtractedData()', 'info');
            this.log(`📊 ${this.extractedAnnonces.length} annonces à sauvegarder`, 'info');
            this.log(`🎯 Destination choisie: ${this.extractionOptions.destination}`, 'info');
            
            // Toujours sauvegarder localement
            await chrome.storage.local.set({ 
                extractedData: this.extractedAnnonces,
                lastExtraction: new Date().toISOString()
            });
            this.log('✅ Sauvegarde locale terminée', 'success');
            
            // Traiter selon la destination choisie
            if (this.extractionOptions.destination === 'firebase') {
                this.log('🔥 Envoi vers Firestore...', 'info');
                await this.sendToFirestore();
            } else if (this.extractionOptions.destination === 'csv') {
                this.log('📄 Téléchargement CSV...', 'info');
                await this.downloadAsCSV();
            } else {
                this.log(`❌ Destination inconnue: ${this.extractionOptions.destination}`, 'error');
            }
            
        } catch (error) {
            this.log('💥 Erreur lors de la sauvegarde: ' + error.message, 'error');
        }
    }

    async downloadAsCSV() {
        try {
            this.log('📄 Début de downloadAsCSV()', 'info');
            
            if (this.extractedAnnonces.length === 0) {
                this.log('⚠️ Aucune donnée à télécharger', 'warning');
                return;
            }

            this.log(`📊 Conversion de ${this.extractedAnnonces.length} annonces en CSV...`, 'info');
            const csvContent = this.convertToCSV(this.extractedAnnonces);
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `bep_annonces_${timestamp}.csv`;
            this.log(`📁 Nom du fichier: ${filename}`, 'info');

            // Utiliser l'API Chrome downloads (plus propre que blob URL)
            this.log('💾 Préparation du téléchargement via Chrome API...', 'info');
            const dataURL = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
            
            try {
                this.log('📥 Déclenchement du téléchargement...', 'info');
                const downloadId = await chrome.downloads.download({
                    url: dataURL,
                    filename: filename,
                    saveAs: false  // Téléchargement automatique sans dialogue
                });
                
                this.log(`✅ Téléchargement CSV lancé (ID: ${downloadId}): ${filename}`, 'success');
                
            } catch (chromeError) {
                // Fallback vers la méthode blob si l'API Chrome downloads n'est pas disponible
                this.log('⚠️ API downloads non disponible, fallback vers blob...', 'warning');
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                URL.revokeObjectURL(url);
                
                this.log(`✅ Téléchargement CSV lancé (fallback): ${filename}`, 'success');
            }
            
        } catch (error) {
            this.log('💥 Erreur lors du téléchargement CSV: ' + error.message, 'error');
            console.error('Erreur CSV détaillée:', error);
        }
    }

    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    let value = row[header];
                    
                    // Traitement spécial pour les arrays (images)
                    if (Array.isArray(value)) {
                        value = value.join(';');
                    }
                    
                    // Échapper les guillemets et virgules
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    
                    return value || '';
                }).join(',')
            )
        ].join('\n');

        return csvContent;
    }

    async sendToFirestore() {
        try {
            const result = await chrome.storage.local.get(['firebaseConfig']);
            
            if (!result.firebaseConfig) {
                this.log('⚠️ Firebase non configuré, sauvegarde locale uniquement', 'warning');
                return;
            }

            this.log('🔥 Initialisation de Firebase...', 'info');
            
            // Vérifier que FirebaseManager est disponible
            if (typeof FirebaseManager === 'undefined') {
                throw new Error('FirebaseManager non disponible - vérifiez le chargement de firebase-config.js');
            }
            
            // Créer une instance de FirebaseManager
            const firebaseManager = new FirebaseManager();
            
            await this.uploadToFirestore(firebaseManager, result.firebaseConfig);
            
        } catch (error) {
            this.log('💥 Erreur Firebase: ' + error.message, 'error');
            console.error('Erreur Firebase détaillée:', error);
        }
    }

    async uploadToFirestore(firebaseManager, config) {
        try {
            this.log('🔄 Initialisation Firebase avec la configuration...', 'info');
            
            // Initialiser Firebase avec la config
            await firebaseManager.initialize(config);
            
            this.log(`📊 Envoi de ${this.extractedAnnonces.length} annonces vers Firestore...`, 'info');
            
            // Envoyer les annonces
            const results = await firebaseManager.saveAnnonces(this.extractedAnnonces);
            
            this.log(`✅ Firebase: ${results.success} annonces sauvées, ${results.duplicates} doublons ignorés`, 'success');
            
            if (results.errors > 0) {
                this.log(`⚠️ Firebase: ${results.errors} erreurs rencontrées`, 'warning');
            }
            
        } catch (error) {
            this.log('💥 Erreur lors de l\'upload Firestore: ' + error.message, 'error');
            throw error;
        }
    }

    updateStats() {
        const currentTime = Date.now();
        const elapsedTime = this.startTime ? (currentTime - this.startTime) / 1000 : 0; // en secondes
        
        let estimatedTimeRemaining = 0;
        let estimatedTotalTime = 0;
        
        if (this.stats.extracted > 0 && this.stats.total > 0) {
            // Calculer le temps moyen par annonce
            const timePerAnnonce = elapsedTime / this.stats.extracted;
            
            // Estimer le temps restant
            const remaining = this.stats.total - this.stats.extracted;
            estimatedTimeRemaining = remaining * timePerAnnonce;
            estimatedTotalTime = this.stats.total * timePerAnnonce;
        }
        
        const statsData = {
            ...this.stats,
            elapsedTime: Math.round(elapsedTime),
            estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
            estimatedTotalTime: Math.round(estimatedTotalTime),
            progress: this.stats.total > 0 ? Math.round((this.stats.extracted / this.stats.total) * 100) : 0
        };
        
        this.sendMessage('updateStats', { data: statsData });
    }

    sendMessage(action, data = {}) {
        try {
            const message = {
                action: action,
                ...data
            };
            console.log('📤 Envoi message vers popup:', action, data);
            chrome.runtime.sendMessage(message).catch(error => {
                console.log('❌ Erreur envoi message:', error);
            });
        } catch (error) {
            console.log('💥 Erreur envoi message:', error);
        }
    }

    log(message, type = 'info') {
        console.log(`[BEP Extractor] ${message}`);
        this.sendMessage('log', { text: message, type: type });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialiser l'extracteur quand la page est chargée
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new BEPExtractor();
    });
} else {
    new BEPExtractor();
} 