// Service Worker pour l'extension BEP Extractor

console.log('🚀 BEP Extractor Background Script chargé');

// Installation de l'extension
chrome.runtime.onInstalled.addListener((details) => {
    console.log('📦 BEP Extractor installé:', details.reason);
    
    if (details.reason === 'install') {
        // Première installation
        initializeExtension();
    } else if (details.reason === 'update') {
        console.log('🔄 Mise à jour depuis:', details.previousVersion);
    }
});

// Messages depuis le content script ou popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Permet les réponses asynchrones
});

// Gestion des onglets BEP
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (tab.url.includes('abonnes.beplogement.com')) {
            console.log('📍 Page BEP détectée:', tab.url);
        }
    }
});

async function initializeExtension() {
    console.log('🔧 Initialisation de l\'extension BEP Extractor');
    
    const defaultData = {
        extractionStats: { extracted: 0, phones: 0, total: 0 },
        settings: {
            autoLogin: true,
            batchMode: true,
            extractPhones: false
        }
    };

    try {
        await chrome.storage.local.set(defaultData);
        console.log('✅ Données par défaut créées');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
    }
}

async function handleMessage(message, sender, sendResponse) {
    try {
        switch (message.action) {
            case 'getStats':
                const stats = await getExtractionStats();
                sendResponse({ success: true, data: stats });
                break;

            case 'saveData':
                await saveExtractionData(message.data);
                sendResponse({ success: true });
                break;

            case 'log':
                console.log(`[${sender.tab ? 'Content' : 'Popup'}] ${message.text}`);
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Action inconnue' });
        }
    } catch (error) {
        console.error('❌ Erreur dans handleMessage:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function getExtractionStats() {
    try {
        const result = await chrome.storage.local.get(['extractionStats', 'extractedData']);
        const stats = result.extractionStats || { extracted: 0, phones: 0, total: 0 };
        const data = result.extractedData || [];
        
        return {
            ...stats,
            totalData: data.length
        };
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des stats:', error);
        return { extracted: 0, phones: 0, total: 0, totalData: 0 };
    }
}

async function saveExtractionData(newData) {
    try {
        const result = await chrome.storage.local.get(['extractedData']);
        const existingData = result.extractedData || [];
        
        // Éviter les doublons basés sur l'ID
        const updatedData = [...existingData];
        
        for (const newAnnonce of newData) {
            const exists = existingData.find(existing => 
                existing.id === newAnnonce.id && 
                existing.dateBulletin === newAnnonce.dateBulletin
            );
            
            if (!exists) {
                updatedData.push(newAnnonce);
            }
        }
        
        await chrome.storage.local.set({ 
            extractedData: updatedData,
            lastExtraction: new Date().toISOString()
        });
        
        console.log(`💾 ${newData.length} nouvelles annonces sauvegardées`);
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde:', error);
    }
}