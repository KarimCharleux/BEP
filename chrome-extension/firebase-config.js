// Configuration et intégration Firebase pour l'extension BEP Extractor
// Utilise l'API REST Firestore pour compatibilité Manifest V3

class FirebaseManager {
    constructor() {
        this.config = null;
        this.isInitialized = false;
        this.baseUrl = null;
    }

    async initialize(config) {
        try {
            this.config = {
                apiKey: config.apiKey,
                projectId: config.projectId,
                authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`
            };
            
            this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.config.projectId}/databases/(default)/documents`;
            this.isInitialized = true;

            console.log('🔥 Firebase REST API initialisé avec succès');
            console.log('📍 Projet:', this.config.projectId);
            return true;

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation Firebase:', error);
            throw error;
        }
    }

    async saveAnnonces(annonces) {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }

        const results = { success: 0, errors: 0, duplicates: 0 };

        try {
            console.log(`📊 Traitement de ${annonces.length} annonces...`);
            
            for (const annonce of annonces) {
                try {
                    // Créer un ID unique pour le document
                    const docId = `${annonce.id}_${annonce.dateBulletin?.replace(/\//g, '-') || 'no-date'}`;
                    
                    // Créer le document directement (écrasera si existe déjà)
                    const firestoreData = this.convertToFirestoreFormat({
                        ...annonce,
                        createdAt: new Date().toISOString(),
                        lastUpdate: new Date().toISOString()
                    });
                    
                    await this.createOrUpdateDocument('annonces_bep', docId, firestoreData);
                    results.success++;
                    
                } catch (error) {
                    if (error.message.includes('Document already exists')) {
                        results.duplicates++;
                    } else {
                        console.error(`❌ Erreur pour l'annonce ${annonce.id}:`, error);
                        results.errors++;
                    }
                }
            }
            
            // Mettre à jour les statistiques du bulletin
            await this.updateBulletinStats(annonces);

            console.log('✅ Sauvegarde Firebase terminée:', results);
            return results;

        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde Firebase:', error);
            throw error;
        }
    }

    // Convertir les données JavaScript vers le format Firestore REST API
    convertToFirestoreFormat(data) {
        const firestoreData = { fields: {} };
        
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) continue;
            
            if (typeof value === 'string') {
                firestoreData.fields[key] = { stringValue: value };
            } else if (typeof value === 'number') {
                if (Number.isInteger(value)) {
                    firestoreData.fields[key] = { integerValue: value.toString() };
                } else {
                    firestoreData.fields[key] = { doubleValue: value };
                }
            } else if (typeof value === 'boolean') {
                firestoreData.fields[key] = { booleanValue: value };
            } else if (Array.isArray(value)) {
                firestoreData.fields[key] = {
                    arrayValue: {
                        values: value.map(v => ({ stringValue: v.toString() }))
                    }
                };
            } else if (value instanceof Date) {
                firestoreData.fields[key] = { timestampValue: value.toISOString() };
            } else {
                // Convertir les objets en string JSON
                firestoreData.fields[key] = { stringValue: JSON.stringify(value) };
            }
        }
        
        return firestoreData;
    }

    // Créer un nouveau document
    async createDocument(collection, docId, data) {
        const url = `${this.baseUrl}/${collection}?documentId=${docId}&key=${this.config.apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Erreur création document: ${response.status} - ${error}`);
        }
        
        return await response.json();
    }

    // Créer ou mettre à jour un document (évite les erreurs de permissions de lecture)
    async createOrUpdateDocument(collection, docId, data) {
        const url = `${this.baseUrl}/${collection}/${docId}?key=${this.config.apiKey}`;
        
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Erreur création/mise à jour document: ${response.status} - ${error}`);
        }
        
        return await response.json();
    }

    // Récupérer un document
    async getDocument(collection, docId) {
        const url = `${this.baseUrl}/${collection}/${docId}?key=${this.config.apiKey}`;
        
        const response = await fetch(url);
        
        if (response.status === 404) {
            return null; // Document n'existe pas
        }
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Erreur récupération document: ${response.status} - ${error}`);
        }
        
        const doc = await response.json();
        return this.convertFromFirestoreFormat(doc);
    }

    // Mettre à jour un document
    async updateDocument(collection, docId, updates) {
        const url = `${this.baseUrl}/${collection}/${docId}?key=${this.config.apiKey}`;
        
        const updateData = {
            fields: updates
        };
        
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Erreur mise à jour document: ${response.status} - ${error}`);
        }
        
        return await response.json();
    }

    // Convertir depuis le format Firestore REST API vers JavaScript
    convertFromFirestoreFormat(doc) {
        if (!doc.fields) return {};
        
        const data = {};
        
        for (const [key, field] of Object.entries(doc.fields)) {
            if (field.stringValue !== undefined) {
                data[key] = field.stringValue;
            } else if (field.integerValue !== undefined) {
                data[key] = parseInt(field.integerValue);
            } else if (field.doubleValue !== undefined) {
                data[key] = field.doubleValue;
            } else if (field.booleanValue !== undefined) {
                data[key] = field.booleanValue;
            } else if (field.timestampValue !== undefined) {
                data[key] = field.timestampValue;
            } else if (field.arrayValue !== undefined) {
                data[key] = field.arrayValue.values?.map(v => 
                    v.stringValue || v.integerValue || v.doubleValue
                ) || [];
            }
        }
        
        return data;
    }

    async updateBulletinStats(annonces) {
        try {
            // Grouper par bulletin
            const bulletinGroups = {};
            
            annonces.forEach(annonce => {
                if (annonce.bulletin && annonce.dateBulletin) {
                    const key = `${annonce.bulletin}_${annonce.dateBulletin.replace(/\//g, '-')}`;
                    if (!bulletinGroups[key]) {
                        bulletinGroups[key] = {
                            numero: annonce.bulletin,
                            date: annonce.dateBulletin,
                            annonces: []
                        };
                    }
                    bulletinGroups[key].annonces.push(annonce.id);
                }
            });

            // Sauvegarder les stats par bulletin directement
            for (const [key, bulletinData] of Object.entries(bulletinGroups)) {
                try {
                    const bulletinDoc = this.convertToFirestoreFormat({
                        numero: bulletinData.numero,
                        date: bulletinData.date,
                        nombreAnnonces: bulletinData.annonces.length,
                        annonceIds: bulletinData.annonces,
                        lastUpdate: new Date().toISOString()
                    });
                    
                    // Créer ou mettre à jour directement (évite la lecture)
                    await this.createOrUpdateDocument('bulletins', key, bulletinDoc);
                    
                } catch (error) {
                    console.error(`❌ Erreur bulletin ${key}:`, error);
                }
            }
            
            console.log('📈 Statistiques des bulletins mises à jour');

        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour des bulletins:', error);
        }
    }

    async getAnnonces(filters = {}) {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }

        try {
            let query = this.db.collection('annonces_bep');

            // Appliquer les filtres
            if (filters.bulletin) {
                query = query.where('bulletin', '==', filters.bulletin);
            }

            if (filters.type) {
                query = query.where('type', '==', filters.type);
            }

            if (filters.prixMax) {
                query = query.where('loyer', '<=', filters.prixMax);
            }

            if (filters.dateDebut) {
                query = query.where('dateExtraction', '>=', filters.dateDebut);
            }

            // Ordonner par date de création
            query = query.orderBy('createdAt', 'desc');

            // Limiter les résultats
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const snapshot = await query.get();
            const annonces = [];

            snapshot.forEach(doc => {
                annonces.push({
                    firestoreId: doc.id,
                    ...doc.data()
                });
            });

            return annonces;

        } catch (error) {
            console.error('Erreur lors de la récupération des annonces:', error);
            throw error;
        }
    }

    async deleteAnnonce(annonceId) {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }

        try {
            await this.db.collection('annonces_bep').doc(annonceId).delete();
            console.log(`Annonce ${annonceId} supprimée`);
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            throw error;
        }
    }

    async getStatistics() {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }

        try {
            const annoncesSnapshot = await this.db.collection('annonces_bep').get();
            const bulletinsSnapshot = await this.db.collection('bulletins').get();

            const totalAnnonces = annoncesSnapshot.size;
            let annoncesAvecTelephone = 0;
            const typesCount = {};

            annoncesSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.telephone) {
                    annoncesAvecTelephone++;
                }
                
                if (data.type) {
                    typesCount[data.type] = (typesCount[data.type] || 0) + 1;
                }
            });

            return {
                totalAnnonces,
                annoncesAvecTelephone,
                totalBulletins: bulletinsSnapshot.size,
                typesCount,
                pourcentageTelephones: totalAnnonces > 0 ? (annoncesAvecTelephone / totalAnnonces * 100).toFixed(1) : 0
            };

        } catch (error) {
            console.error('Erreur lors du calcul des statistiques:', error);
            throw error;
        }
    }

    async syncWithLocalStorage() {
        try {
            // Récupérer les données locales
            const result = await chrome.storage.local.get(['extractedData']);
            const localData = result.extractedData || [];

            if (localData.length === 0) {
                console.log('Aucune donnée locale à synchroniser');
                return;
            }

            console.log(`Synchronisation de ${localData.length} annonces locales...`);
            
            // Sauvegarder vers Firebase
            const results = await this.saveAnnonces(localData);
            
            console.log('Synchronisation terminée:', results);
            return results;

        } catch (error) {
            console.error('Erreur lors de la synchronisation:', error);
            throw error;
        }
    }

    async cleanup(olderThanDays = 180) {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

            const oldDocsQuery = this.db.collection('annonces_bep')
                .where('createdAt', '<', cutoffDate);

            const snapshot = await oldDocsQuery.get();
            
            if (snapshot.empty) {
                console.log('Aucun document ancien à supprimer');
                return 0;
            }

            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`${snapshot.size} documents anciens supprimés`);
            
            return snapshot.size;

        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
            throw error;
        }
    }
}

// FirebaseManager est maintenant disponible directement dans le content script 