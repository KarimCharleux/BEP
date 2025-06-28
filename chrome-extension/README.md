# 🏠 BEP Immobilier Extractor

Extension Chrome pour extraire automatiquement les annonces immobilières depuis le site BEP (abonnes.beplogement.com) et les stocker dans Firestore.

## 🚀 Fonctionnalités

### ✨ Extraction Automatique
- **Auto-login** : Connexion automatique avec vos credentials sauvegardés
- **Extraction intelligente** : Récupération de toutes les données d'annonces
- **Mode batch** : Traitement de toutes les pages d'annonces en un clic
- **Extraction des téléphones** : Automatisation des clics "Demande d'informations" avec attente de 15s

### 📊 Données Extraites
Chaque annonce contient :
- **Référence** et **titre**
- **Type de bien** (Studio, Appartement, etc.)
- **Description complète**
- **Prix** (loyer et charges)
- **Surface** en m²
- **Disponibilité**
- **Images** (liens vers toutes les photos)
- **Classe énergétique**
- **Numéro de bulletin** et date
- **Téléphone du propriétaire** (si extraction activée)

### 🔥 Intégration Firebase
- **Stockage Firestore** automatique
- **Déduplication** intelligente
- **Statistiques** par bulletin
- **Sauvegarde locale** en backup
- **Synchronisation** bidirectionnelle

### 📈 Interface Utilisateur
- **Tableau de bord** avec statistiques en temps réel
- **Logs d'activité** détaillés
- **Configuration** simple Firebase
- **Export** JSON et CSV
- **Contrôles** d'extraction avancés

## 📦 Installation

### 1. Téléchargement
```bash
git clone [url-du-repo]
cd BEP/chrome-extension
```

### 2. Chargement dans Chrome
1. Ouvrir Chrome et aller dans `chrome://extensions/`
2. Activer le **Mode développeur** (coin supérieur droit)
3. Cliquer sur **Charger l'extension non empaquetée**
4. Sélectionner le dossier `chrome-extension`
5. L'extension apparaît dans la barre d'outils

### 3. Configuration Firebase (Optionnel)
1. Créer un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activer Firestore Database
3. Récupérer les clés de configuration :
   - API Key
   - Auth Domain  
   - Project ID
4. Les saisir dans l'extension via le bouton "⚙️ Configurer Firebase"

## 🎯 Utilisation

### Configuration Initiale
1. **Cliquer sur l'icône** de l'extension dans Chrome
2. **Saisir vos credentials BEP** :
   - Nom d'utilisateur
   - Mot de passe
   - Cliquer "💾 Sauvegarder"
3. **Configurer Firebase** (recommandé) :
   - Cliquer "⚙️ Configurer Firebase"
   - Saisir vos clés Firebase
   - Valider

### Extraction d'Annonces
1. **Naviguer** vers [abonnes.beplogement.com](https://abonnes.beplogement.com)
2. **Se connecter** (ou laisser l'auto-login faire)
3. **Aller** sur la page des annonces
4. **Ouvrir l'extension** et configurer :
   - ☑️ **Mode batch** : Toutes les pages
   - ☑️ **Extraire téléphones** : +15s par annonce
5. **Cliquer** "🚀 Lancer l'extraction"
6. **Suivre** les logs en temps réel

### Options Avancées
- **Mode page unique** : Décocher "Mode batch"
- **Sans téléphones** : Décocher "Extraire téléphones" (extraction rapide)
- **Arrêt manuel** : Bouton "⏹️ Arrêter" pendant l'extraction

## 📊 Export des Données

### Export Automatique
Les données sont automatiquement :
- **Sauvegardées localement** dans Chrome
- **Envoyées vers Firestore** (si configuré)
- **Dédupliquées** par référence + date bulletin

### Export Manuel
1. **JSON** : Bouton "📄 Export JSON" → Fichier `bep_annonces_YYYY-MM-DD.json`
2. **CSV** : Bouton "📊 Export CSV" → Fichier `bep_annonces_YYYY-MM-DD.csv`

## 🏗️ Structure Firestore

### Collection `annonces_bep`
```javascript
Document ID: {annonceId}_{dateBulletin}
{
  id: "1109008",
  titre: "JUAN LES PINS PONTEIL SALIS",
  type: "STUDIO MEUBLE",
  description: "STUDIO MEUBLE, 22 M²...",
  loyer: "520.00 €",
  charges: "40.00 €",
  surface: "22 M²",
  disponibilite: "1ER SEPTEMBRE 2025...",
  images: ["url1.png", "url2.png"],
  classeEnergetique: "C",
  bulletin: "10312",
  dateBulletin: "27/06/2025",
  telephone: "0612345678",
  dateExtraction: "2025-01-01T12:00:00.000Z",
  statut: "complete",
  createdAt: timestamp,
  lastUpdate: timestamp
}
```

### Collection `bulletins`
```javascript
Document ID: {numeroBulletin}_{date}
{
  numero: "10312",
  date: "27/06/2025",
  nombreAnnonces: 15,
  annonceIds: ["1109008", "1109009", ...],
  lastUpdate: timestamp
}
```

## ⚙️ Configuration Avancée

### Sélecteurs CSS Personnalisés
Le fichier `content.js` contient des sélecteurs CSS adaptés à la structure HTML du site BEP. Si le site change :

```javascript
this.selectors = {
  annonceRows: 'tr[onmouseover*="backgroundColor"]',
  referenceCell: 'td b',
  typeHeaders: 'tr[bgcolor="#FFAAAA"] font',
  boutonDemande: 'input[onclick*="sendreq"]',
  // ...
};
```

### Délais et Timeouts
```javascript
// Dans content.js
await this.delay(15000); // Attente téléphone
await this.delay(2000);  // Délai entre pages
await this.delay(1000);  // Délai entre annonces
```

## 🔧 Développement

### Structure des Fichiers
```
chrome-extension/
├── manifest.json          # Configuration extension
├── popup.html             # Interface utilisateur
├── popup.js              # Logique interface
├── content.js            # Script injection site
├── background.js         # Service worker
├── firebase-config.js    # Intégration Firebase
├── styles.css           # Styles interface
└── icons/               # Icônes extension
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Permissions Chrome
```json
{
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": ["*://abonnes.beplogement.com/*"]
}
```

## 🛡️ Sécurité

### Stockage des Credentials
- **Chiffrement** automatique par Chrome Storage API
- **Accès local** uniquement (pas de transmission)
- **Suppression** possible via paramètres Chrome

### Données Firebase
- **Transmission sécurisée** (HTTPS)
- **Règles Firestore** à configurer côté Firebase
- **Backup local** en cas d'échec réseau

## 🐛 Résolution de Problèmes

### Problèmes Courants

#### ❌ "Credentials manquants"
- Vérifier la saisie login/mot de passe
- Re-sauvegarder les credentials

#### ❌ "Firebase non configuré"
- Vérifier les clés Firebase
- Tester la connexion internet
- Vérifier les règles Firestore

#### ❌ "Aucune annonce trouvée"
- Vérifier que vous êtes sur la page des annonces
- Le site a peut-être changé sa structure
- Vérifier les logs pour plus de détails

#### ❌ "Téléphones non extraits"
- Délai de 15s insuffisant → Augmenter dans le code
- Boutons "Demande info" introuvables → Structure site changée
- Quota dépassé côté BEP → Attendre ou réduire la fréquence

### Debug
1. **Ouvrir DevTools** : F12 sur la page BEP
2. **Console** : Voir les logs `[BEP Extractor]`
3. **Extension DevTools** : Clic droit sur icône → "Inspecter la popup"
4. **Storage** : `chrome://extensions/` → Détails → Données stockées

## 📝 Logs

L'extension génère des logs détaillés :
- **Info** : Opérations normales (bleu)
- **Success** : Réussites (vert)  
- **Warning** : Avertissements (orange)
- **Error** : Erreurs (rouge)

Les logs sont visibles dans :
- Interface de l'extension
- Console du navigateur
- Background service worker

## 🔄 Mises à Jour

### Version de l'Extension
Modifiez `manifest.json` :
```json
{
  "version": "1.1.0"
}
```

### Changements Site BEP
Si la structure HTML change, mettre à jour les sélecteurs dans `content.js`.

## 📞 Support

Pour les problèmes techniques :
1. Vérifier les logs dans l'extension
2. Tester sur une annonce unique d'abord
3. Vérifier la console développeur
4. Redémarrer Chrome si nécessaire

## 📄 Licence

Ce projet est sous licence MIT. Libre d'utilisation et modification.

---

**⚠️ Avertissement** : Respectez les conditions d'utilisation du site BEP. Cette extension est destinée à un usage personnel et doit être utilisée de manière responsable. 