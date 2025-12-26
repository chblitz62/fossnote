-- Script SQL pour ajouter les tables RGPD à database.db

-- Table pour gérer les consentements utilisateurs
CREATE TABLE IF NOT EXISTS user_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    consent_type VARCHAR(50) NOT NULL, -- 'data_processing', 'newsletter', 'analytics', etc.
    consent_given BOOLEAN NOT NULL DEFAULT 0,
    consent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    withdrawn_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);

-- Table pour l'audit des accès aux données personnelles
CREATE TABLE IF NOT EXISTS data_access_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    accessed_by INTEGER NOT NULL, -- ID de l'utilisateur qui accède (peut être le même)
    access_type VARCHAR(50) NOT NULL, -- 'view', 'edit', 'export', 'delete'
    access_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    reason TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (accessed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour l'audit
CREATE INDEX IF NOT EXISTS idx_data_access_user_id ON data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_date ON data_access_log(access_date);

-- Table pour les demandes d'exercice de droits RGPD
CREATE TABLE IF NOT EXISTS gdpr_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    request_type VARCHAR(50) NOT NULL, -- 'access', 'rectification', 'deletion', 'portability', 'opposition'
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
    completion_date DATETIME,
    processed_by INTEGER, -- ID de l'admin qui a traité la demande
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- Index pour les demandes RGPD
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);

-- Table pour stocker l'historique des modifications de données sensibles
CREATE TABLE IF NOT EXISTS data_modification_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    modified_by INTEGER NOT NULL,
    modification_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (modified_by) REFERENCES users(id)
);

-- Index pour l'historique
CREATE INDEX IF NOT EXISTS idx_data_history_user_id ON data_modification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_data_history_date ON data_modification_history(modification_date);
