# Guide d'installation RGPD pour Fossnote

## 📋 Prérequis

- Node.js v14+ installé
- Accès au dépôt Fossnote
- Droits d'administrateur sur le serveur

## 🚀 Installation étape par étape

### Étape 1 : Cloner ou mettre à jour le dépôt

```bash
cd fossnote
git pull origin master
```

### Étape 2 : Installer les nouvelles dépendances

Ajoutez ces dépendances à votre `package.json` :

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "better-sqlite3": "^9.2.2",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "node-cron": "^3.0.3"
  }
}
```

Puis installez :

```bash
npm install
```

### Étape 3 : Créer les tables RGPD dans la base de données

Exécutez le script SQL :

```bash
sqlite3 database.db < create-rgpd-tables.sql
```

Ou utilisez le script Node.js :

```bash
node add-rgpd-tables.js
```

### Étape 4 : Ajouter les routes dans votre serveur

Dans votre fichier principal (`src/server.js` ou `src/index.js`), ajoutez :

```javascript
const legalRoutes = require('./routes/legal');
const gdprRoutes = require('./routes/gdpr');

// ... autres imports et configurations ...

// Ajouter les routes légales
app.use('/fossnote', legalRoutes);
app.use('/fossnote/api/gdpr', gdprRoutes);
```

### Étape 5 : Copier les fichiers dans votre projet

```bash
# Copier les routes
cp legal.js src/routes/
cp gdpr.js src/routes/

# Copier les fichiers publics
mkdir -p src/public/js
mkdir -p src/public/css
cp cookie-consent-script.js src/public/js/cookie-consent.js
cp cookie-consent.css src/public/css/

# Copier les pages HTML
cp politique-confidentialite.html src/public/
cp cookie-banner.html src/public/includes/
```

### Étape 6 : Intégrer le banner de cookies dans vos pages

Dans chaque fichier HTML (index.html, eleve.html, professeur.html, etc.), ajoutez avant la balise `</body>` :

```html
<!-- Banner de cookies RGPD -->
<div id="cookie-banner" class="cookie-banner" style="display:none;">
    <div class="cookie-content">
        <h3>🍪 Cookies et confidentialité</h3>
        <p>
            Nous utilisons des cookies pour améliorer votre expérience. 
            Certains sont essentiels au fonctionnement du site.
        </p>
        <div class="cookie-buttons">
            <button id="cookie-accept-all" class="btn-primary">Tout accepter</button>
            <button id="cookie-reject-optional" class="btn-secondary">Refuser les cookies optionnels</button>
            <button id="cookie-customize" class="btn-outline">Personnaliser</button>
        </div>
        <a href="/fossnote/politique-confidentialite" class="cookie-link">En savoir plus</a>
    </div>
</div>

<!-- Modal de personnalisation des cookies -->
<div id="cookie-modal" class="modal" style="display:none;">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Gestion des cookies</h2>
            <button id="cookie-modal-close" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
            <div class="cookie-category">
                <div class="cookie-category-header">
                    <input type="checkbox" id="cookie-essential" checked disabled>
                    <label for="cookie-essential">
                        <strong>Cookies essentiels (obligatoires)</strong>
                    </label>
                </div>
                <p class="cookie-description">
                    Nécessaires au fonctionnement du site (authentification, session, sécurité).
                    Ces cookies ne peuvent pas être désactivés.
                </p>
            </div>
            
            <div class="cookie-category">
                <div class="cookie-category-header">
                    <input type="checkbox" id="cookie-analytics">
                    <label for="cookie-analytics">
                        <strong>Cookies analytiques</strong>
                    </label>
                </div>
                <p class="cookie-description">
                    Nous aident à comprendre comment vous utilisez le site pour l'améliorer.
                    Données anonymisées et agrégées.
                </p>
            </div>
            
            <div class="cookie-category">
                <div class="cookie-category-header">
                    <input type="checkbox" id="cookie-functional">
                    <label for="cookie-functional">
                        <strong>Cookies fonctionnels</strong>
                    </label>
                </div>
                <p class="cookie-description">
                    Mémorisent vos préférences (langue, thème, paramètres d'affichage).
                </p>
            </div>
        </div>
        
        <div class="modal-footer">
            <button id="cookie-save-preferences" class="btn-primary">Enregistrer mes choix</button>
        </div>
    </div>
</div>

<!-- Scripts -->
<link rel="stylesheet" href="/fossnote/css/cookie-consent.css">
<script src="/fossnote/js/cookie-consent.js"></script>
```

### Étape 7 : Ajouter les liens dans le footer

Dans vos pages HTML, ajoutez un footer avec les liens légaux :

```html
<footer class="site-footer">
    <div class="footer-links">
        <a href="/fossnote/mentions-legales">Mentions légales</a>
        <a href="/fossnote/politique-confidentialite">Politique de confidentialité</a>
        <a href="/fossnote/cgu">CGU</a>
        <a href="#" onclick="openCookiePreferences(); return false;">Gérer mes cookies</a>
    </div>
    <p class="footer-copyright">© 2024 Fossnote - Logiciel libre sous licence MIT</p>
</footer>
```

### Étape 8 : Ajouter la gestion automatique de nettoyage des données

Dans votre serveur principal, ajoutez :

```javascript
const dataRetention = require('./services/data-retention');
// Le service se lancera automatiquement avec cron
```

### Étape 9 : Configurer Helmet pour la sécurité

Dans `src/server.js` :

```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Helmet pour les en-têtes de sécurité
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limite par IP
    message: 'Trop de requêtes, veuillez réessayer plus tard.'
});

app.use('/fossnote/api/', limiter);
```

### Étape 10 : Tester la conformité

1. **Test du banner de cookies** :
   - Visitez http://localhost:3000/fossnote/
   - Vérifiez que le banner s'affiche
   - Testez "Tout accepter", "Refuser" et "Personnaliser"

2. **Test des droits RGPD** :
   - Connectez-vous comme élève
   - Testez : http://localhost:3000/fossnote/api/gdpr/mes-donnees
   - Vérifiez que le fichier JSON se télécharge

3. **Test des pages légales** :
   - http://localhost:3000/fossnote/politique-confidentialite
   - http://localhost:3000/fossnote/mentions-legales

## 📝 À personnaliser

### 1. Politique de confidentialité

Éditez `src/public/politique-confidentialite.html` et personnalisez :
- Nom de l'établissement
- Coordonnées du responsable de traitement
- Adresse de contact DPO (si applicable)
- Détails spécifiques de votre traitement

### 2. Mentions légales

Créez `src/public/mentions-legales.html` avec :
- Raison sociale
- Adresse du siège social
- Numéro SIRET
- Directeur de publication
- Hébergeur

### 3. Durées de conservation

Dans `src/services/data-retention.js`, ajustez selon vos besoins légaux :
- Sessions : 30 jours par défaut
- Logs : 1 an par défaut
- Données utilisateur : durée de scolarité + X années

## 🔒 Sécurité supplémentaire recommandée

1. **HTTPS obligatoire** : Configurez un certificat SSL (Let's Encrypt gratuit)
2. **Mots de passe** : Utilisez bcrypt pour hasher (voir fichier séparé)
3. **Sessions sécurisées** : Configurez express-session avec secret fort
4. **Backups** : Automatisez les sauvegardes de database.db

## 📊 Checklist de conformité RGPD

- [ ] Tables RGPD créées dans la base de données
- [ ] Banner de cookies fonctionnel
- [ ] Politique de confidentialité publiée et accessible
- [ ] Mentions légales publiées
- [ ] Droits d'accès, rectification, effacement implémentés
- [ ] Logging des accès aux données personnelles
- [ ] Durées de conservation définies et automatisées
- [ ] Consentements enregistrés et traçables
- [ ] HTTPS activé en production
- [ ] Rate limiting activé
- [ ] Headers de sécurité (Helmet) configurés

## 🆘 Support

Pour toute question :
1. Consultez la documentation CNIL : https://www.cnil.fr
2. Ouvrez une issue sur GitHub
3. Contactez un DPO si nécessaire

## 📜 Licence

Ces fichiers RGPD sont fournis sous la même licence que Fossnote (à préciser).
