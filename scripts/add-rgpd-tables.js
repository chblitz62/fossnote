/**
 * Script de migration SQL pour ajouter les tables RGPD
 * À exécuter : node src/migrations/add-rgpd-tables.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Début de la migration RGPD...');

db.serialize(() => {
    // Table des consentements utilisateurs
    db.run(`
        CREATE TABLE IF NOT EXISTS user_consents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            consent_type VARCHAR(50) NOT NULL,
            consent_given BOOLEAN NOT NULL DEFAULT 0,
            consent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            withdrawn_date DATETIME,
            ip_address VARCHAR(45),
            user_agent TEXT,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, consent_type)
        )
    `, (err) => {
        if (err) console.error('❌ Erreur création table user_consents:', err);
        else console.log('✅ Table user_consents créée');
    });

    // Index pour optimiser les requêtes
    db.run(`CREATE INDEX IF NOT EXISTS idx_consents_user ON user_consents(user_id)`, (err) => {
        if (err) console.error('❌ Erreur création index consents:', err);
        else console.log('✅ Index consents créé');
    });

    // Table des logs d'accès aux données personnelles
    db.run(`
        CREATE TABLE IF NOT EXISTS data_access_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            accessed_by INTEGER NOT NULL,
            access_type VARCHAR(50) NOT NULL,
            access_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45),
            user_agent TEXT,
            resource TEXT,
            reason TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (accessed_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `, (err) => {
        if (err) console.error('❌ Erreur création table data_access_log:', err);
        else console.log('✅ Table data_access_log créée');
    });

    // Index pour les logs
    db.run(`CREATE INDEX IF NOT EXISTS idx_access_log_user ON data_access_log(user_id)`, (err) => {
        if (err) console.error('❌ Erreur création index logs:', err);
        else console.log('✅ Index logs créé');
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_access_log_date ON data_access_log(access_date)`, (err) => {
        if (err) console.error('❌ Erreur création index date:', err);
        else console.log('✅ Index date créé');
    });

    // Table des demandes d'exercice de droits RGPD
    db.run(`
        CREATE TABLE IF NOT EXISTS gdpr_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            request_type VARCHAR(50) NOT NULL,
            request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'pending',
            completion_date DATETIME,
            processed_by INTEGER,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `, (err) => {
        if (err) console.error('❌ Erreur création table gdpr_requests:', err);
        else console.log('✅ Table gdpr_requests créée');
    });

    // Index pour les demandes RGPD
    db.run(`CREATE INDEX IF NOT EXISTS idx_gdpr_user ON gdpr_requests(user_id)`, (err) => {
        if (err) console.error('❌ Erreur création index requests:', err);
        else console.log('✅ Index requests créé');
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_gdpr_status ON gdpr_requests(status)`, (err) => {
        if (err) console.error('❌ Erreur création index status:', err);
        else console.log('✅ Index status créé');
    });

    // Table pour stocker les préférences de cookies
    db.run(`
        CREATE TABLE IF NOT EXISTS cookie_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            session_id VARCHAR(255),
            essential BOOLEAN DEFAULT 1,
            analytics BOOLEAN DEFAULT 0,
            functional BOOLEAN DEFAULT 0,
            marketing BOOLEAN DEFAULT 0,
            preference_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('❌ Erreur création table cookie_preferences:', err);
        else console.log('✅ Table cookie_preferences créée');
    });

    // Table pour l'historique des modifications de données sensibles
    db.run(`
        CREATE TABLE IF NOT EXISTS data_modification_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            modified_by INTEGER NOT NULL,
            table_name VARCHAR(50) NOT NULL,
            field_name VARCHAR(50) NOT NULL,
            old_value TEXT,
            new_value TEXT,
            modification_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45),
            reason TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `, (err) => {
        if (err) console.error('❌ Erreur création table data_modification_log:', err);
        else console.log('✅ Table data_modification_log créée');
    });

    // Ajouter des colonnes RGPD à la table users si elles n'existent pas
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur récupération schéma users:', err);
            return;
        }

        const columnNames = columns.map(col => col.name);

        if (!columnNames.includes('date_creation')) {
            db.run(`ALTER TABLE users ADD COLUMN date_creation DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
                if (err) console.error('❌ Erreur ajout colonne date_creation:', err);
                else console.log('✅ Colonne date_creation ajoutée');
            });
        }

        if (!columnNames.includes('rgpd_consent_date')) {
            db.run(`ALTER TABLE users ADD COLUMN rgpd_consent_date DATETIME`, (err) => {
                if (err) console.error('❌ Erreur ajout colonne rgpd_consent_date:', err);
                else console.log('✅ Colonne rgpd_consent_date ajoutée');
            });
        }

        if (!columnNames.includes('data_retention_date')) {
            db.run(`ALTER TABLE users ADD COLUMN data_retention_date DATETIME`, (err) => {
                if (err) console.error('❌ Erreur ajout colonne data_retention_date:', err);
                else console.log('✅ Colonne data_retention_date ajoutée');
            });
        }
    });

    console.log('✨ Migration RGPD terminée !');
});

// Fermer la connexion
db.close((err) => {
    if (err) {
        console.error('❌ Erreur fermeture base de données:', err);
    } else {
        console.log('✅ Base de données fermée proprement');
    }
});
