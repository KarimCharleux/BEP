# 🚀 Installation Rapide - BEP Extracteur

## ⚡ Installation en 3 minutes

### 1. Télécharger l'extension
- Téléchargez le dossier `chrome-extension` complet
- Ou clonez le repository : `git clone [url]`

### 2. Charger dans Chrome
1. **Ouvrir Chrome** et aller dans `chrome://extensions/`
2. **Activer le mode développeur** (bouton en haut à droite)
3. **Cliquer sur "Charger l'extension non empaquetée"**
4. **Sélectionner le dossier `chrome-extension`**
5. ✅ L'extension apparaît dans la barre d'outils !

### 3. Configuration initiale
1. **Cliquer sur l'icône** 🏠 de l'extension
2. **Saisir vos credentials BEP** :
   - Login BEP
   - Mot de passe
   - 💾 Sauvegarder
3. **Configurer Firebase** (optionnel) :
   - ⚙️ Configurer Firebase
   - Saisir API Key, Auth Domain, Project ID
   - 💾 Sauvegarder

## 🎯 Premier test

### Test rapide (sans téléphones)
1. **Aller sur** [abonnes.beplogement.com](https://abonnes.beplogement.com)
2. **Se connecter** (ou auto-login automatique)
3. **Naviguer** vers la page des annonces
4. **Ouvrir l'extension** et :
   - ❌ Décocher "Extraire téléphones"
   - ✅ Garder "Mode batch" 
5. **Cliquer** 🚀 Lancer l'extraction
6. **Voir les résultats** dans les logs

### Test complet (avec téléphones)
1. **Même processus** mais :
   - ✅ Cocher "Extraire téléphones"
   - ⚠️ Plus long : +15s par annonce
2. **Suivre l'avancement** dans les logs
3. **Export** des données en JSON/CSV

## 🔧 Dépannage rapide

### ❌ Extension ne se charge pas
- Vérifier que tous les fichiers sont présents
- Redémarrer Chrome
- Vérifier le mode développeur activé

### ❌ Auto-login ne fonctionne pas
- Re-saisir les credentials
- Vérifier sur la page de login BEP

### ❌ Aucune annonce trouvée
- Vérifier que vous êtes sur la page des annonces
- Ouvrir F12 → Console pour voir les erreurs

### ❌ Firebase ne fonctionne pas
- Vérifier les clés de configuration
- Tester sans Firebase d'abord (sauvegarde locale)

## 📱 Utilisation quotidienne

1. **Naviguer** vers BEP → Page annonces
2. **Clic** sur l'extension → 🚀 Lancer
3. **Attendre** la fin (logs en temps réel)
4. **Export** des données si besoin

---

**🕐 Temps d'extraction** :
- Sans téléphones : ~1-2 min pour 50 annonces
- Avec téléphones : ~15-20 min pour 50 annonces

**💾 Données sauvegardées** :
- Localement dans Chrome (toujours)
- Dans Firestore (si configuré)
- Export manuel JSON/CSV

---

Pour plus de détails, voir le [README.md](README.md) complet. 