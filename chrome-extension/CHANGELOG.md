# Changelog - BEP Immobilier Extractor

## Version 1.1.0 (Correctifs et Améliorations)

### 🔧 Correctifs
- **Fixé l'erreur "Could not establish connection"** - Amélioration de la communication entre popup et content script
- **Ajout de retry automatique** - 3 tentatives avec délais pour établir la connexion
- **Meilleure détection du content script** - Vérification que le script est bien chargé
- **Gestion d'erreurs améliorée** - Messages d'erreur plus clairs et informatifs

### ✨ Nouvelles Fonctionnalités
- **Choix de destination** - Option pour sauvegarder vers Firestore OU télécharger directement en CSV
- **Téléchargement automatique CSV** - Le fichier CSV se télécharge automatiquement à la fin de l'extraction
- **Firebase optionnel** - Plus besoin de configurer Firebase si on choisit CSV
- **Interface simplifiée** - Suppression de l'export JSON (non utilisé)

### 🎯 Améliorations UX
- **Feedback en temps réel** - Indication quand le script est prêt
- **Messages plus clairs** - Logs détaillés sur l'état de la connexion
- **Validation améliorée** - Vérification que l'utilisateur est sur le bon site
- **Interface plus intuitive** - Options radio pour choisir la destination

### 📋 Instructions d'utilisation

#### Pour téléchargement CSV direct (recommandé)
1. Aller sur abonnes.beplogement.com
2. Ouvrir l'extension
3. Choisir "📄 Fichier CSV"
4. Configurer les options d'extraction
5. Cliquer "🚀 Lancer l'extraction"
6. Le fichier CSV se télécharge automatiquement

#### Pour sauvegarde Firestore
1. Configurer Firebase dans l'extension
2. Choisir "🔥 Firestore"
3. Lancer l'extraction
4. Données sauvées dans Firestore + backup local

### 🔧 Résolution des problèmes

#### ❌ "Le script d'extraction n'est pas chargé"
**Solutions :**
- Recharger la page BEP (F5)
- Vérifier que vous êtes bien sur abonnes.beplogement.com
- Fermer et rouvrir l'extension
- Redémarrer Chrome si nécessaire

#### ❌ "Veuillez naviguer vers le site BEP"
**Solutions :**
- S'assurer d'être sur https://abonnes.beplogement.com
- Être connecté à votre compte BEP
- Être sur la page des annonces

#### ✅ "Script d'extraction chargé et prêt"
**Statut :** Tout fonctionne, vous pouvez lancer l'extraction

### 📊 Avantages du mode CSV
- ⚡ **Plus rapide** - Pas de configuration Firebase nécessaire
- 📁 **Direct** - Fichier téléchargé immédiatement
- 🔒 **Local** - Données restent sur votre ordinateur
- 📋 **Compatible** - Ouvrable dans Excel, Google Sheets, etc.

### 📊 Avantages du mode Firestore
- ☁️ **Cloud** - Données sauvées en ligne
- 🔄 **Synchronisation** - Accessible depuis plusieurs appareils
- 📈 **Statistiques** - Analyses avancées possibles
- 💾 **Backup** - Sauvegarde automatique

---

**⚠️ Note importante :** Si vous rencontrez encore des problèmes de connexion, rechargez la page BEP et réessayez. Le script doit être chargé avant de pouvoir extraire les données. 