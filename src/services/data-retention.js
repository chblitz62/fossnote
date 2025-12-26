/**
 * Service de nettoyage et de rétention des données - RGPD
 * À placer dans src/services/data-retention.js
 */

const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DataRetentionService {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '../../database.db'));
        this.setupCronJobs();
    }

    setupCronJobs() {
        // Exécuter tous les jours à 2h du matin
        cron.schedule('0 2 * * *', () => {
            console.log('🔄 Début du nettoyage automatique des données...');
            this.cleanupOldData();
        });

        // Vérifier les demandes RGPD en attente tous les lundis à 9h
        cron.schedule('0 9 * * 1', () => {
            console.log('📋 Vérification des demandes RGPD en attente...');
            this.checkPendingGdprRequests();
        });

        console.log('✅ Services de rétention des données initialisés');
    }

    /**
     * Nettoyage automatique des données obsolètes
     */
    async cleanupOldData() {
        try {
            const stats = {
                sessions_deleted: 0,
                logs_anonymized: 0,
                old_requests_deleted: 0,
                old_cookies_deleted: 0
            };

            // 1. Supprimer les sessions expirées depuis plus de 30 jours
            await this.runQuery(
                `DELETE FROM sessions WHERE last_activity < datetime('now', '-30 days')`,
                (result) => {
                    stats.sessions_deleted = result.changes || 0;
                    console.log(`   ✓ ${stats.sessions_deleted} sessions expirées supprimées`);
                }
            );

            // 2. Anonymiser les logs d'accès de plus d'un an
            await this.runQuery(
                `UPDATE data_access_log 
                 SET ip_address = 'anonymized', user_agent = 'anonymized' 
                 WHERE access_date < datetime('now', '-1 year') 
                 AND ip_address != 'anonymized'`,
                (result) => {
                    stats.logs_anonymized = result.changes || 0;
                    console.log(`   ✓ ${stats.logs_anonymized} logs anonymisés`);
                }
            );

            // 3. Supprimer les demandes RGPD traitées depuis plus de 3 ans
            await this.runQuery(
                `DELETE FROM gdpr_requests 
                 WHERE status = 'completed' 
                 AND completion_date < datetime('now', '-3 years')`,
                (result) => {
                    stats.old_requests_deleted = result.changes || 0;
                    console.log(`   ✓ ${stats.old_requests_deleted} anciennes demandes RGPD supprimées`);
                }
            );

            // 4. Supprimer les anciennes préférences de cookies (> 13 mois)
            await this.runQuery(
                `DELETE FROM cookie_preferences 
                 WHERE preference_date < datetime('now', '-13 months')`,
                (result) => {
                    stats.old_cookies_deleted = result.changes || 0;
                    console.log(`   ✓ ${stats.old_cookies_deleted} anciennes préférences cookies supprimées`);
                }
            );

            // 5. Nettoyer les comptes inactifs (optionnel, à adapter selon vos besoins)
            // await this.cleanupInactiveAccounts();

            console.log('✅ Nettoyage automatique terminé avec succès');
            this.logCleanupActivity(stats);

        } catch (error) {
            console.error('❌ Erreur lors du nettoyage des données:', error);
            this.logError('cleanup_failed', error);
        }
    }

    /**
     * Vérifier et alerter sur les demandes RGPD en attente
     */
    async checkPendingGdprRequests() {
        try {
            const query = `
                SELECT 
                    gr.id,
                    gr.request_type,
                    gr.request_date,
                    u.username,
                    u.email,
                    julianday('now') - julianday(gr.request_date) as days_pending
                FROM gdpr_requests gr
                JOIN users u ON gr.user_id = u.id
                WHERE gr.status = 'pending'
                ORDER BY gr.request_date ASC
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('❌ Erreur vérification demandes RGPD:', err);
                    return;
                }

                if (rows.length === 0) {
                    console.log('   ✓ Aucune demande RGPD en attente');
                    return;
                }

                console.log(`   ⚠️  ${rows.length} demande(s) RGPD en attente :`);
                
                rows.forEach(request => {
                    const urgency = request.days_pending > 25 ? '🔴 URGENT' : 
                                   request.days_pending > 20 ? '🟠 Bientôt' : '🟢 OK';
                    
                    console.log(`   ${urgency} [${request.request_type}] ${request.username} - ${Math.floor(request.days_pending)} jours`);

                    // Alerte si dépassement du délai légal (30 jours)
                    if (request.days_pending > 30) {
                        this.sendUrgentAlert(request);
                    }
                });
            });

        } catch (error) {
            console.error('❌ Erreur vérification demandes RGPD:', error);
        }
    }

    /**
     * Nettoyer les comptes inactifs (optionnel)
     */
    async cleanupInactiveAccounts() {
        // À implémenter selon vos besoins
        // Par exemple : marquer comme inactifs les comptes sans connexion depuis 2 ans
        const query = `
            UPDATE users 
            SET account_status = 'inactive'
            WHERE id IN (
                SELECT u.id 
                FROM users u
                LEFT JOIN sessions s ON u.id = s.user_id
                GROUP BY u.id
                HAVING MAX(s.last_activity) < datetime('now', '-2 years')
                OR MAX(s.last_activity) IS NULL
            )
            AND account_status = 'active'
        `;

        // Décommenter pour activer
        // await this.runQuery(query, (result) => {
        //     console.log(`   ✓ ${result.changes} comptes marqués comme inactifs`);
        // });
    }

    /**
     * Envoyer une alerte urgente pour les demandes RGPD dépassées
     */
    sendUrgentAlert(request) {
        // TODO: Implémenter l'envoi d'email ou notification
        console.log(`   🚨 ALERTE: Demande RGPD #${request.id} dépasse le délai légal !`);
        
        // Exemple d'envoi d'email (à implémenter avec nodemailer)
        /*
        const emailContent = {
            to: 'dpo@votre-etablissement.fr',
            subject: `🚨 URGENT: Demande RGPD en retard - ${request.request_type}`,
            text: `
                Une demande RGPD dépasse le délai légal de 30 jours :
                
                - Type: ${request.request_type}
                - Utilisateur: ${request.username} (${request.email})
                - Date de demande: ${request.request_date}
                - Jours écoulés: ${Math.floor(request.days_pending)}
                
                Action requise immédiatement !
            `
        };
        
        sendEmail(emailContent);
        */
    }

    /**
     * Logger l'activité de nettoyage
     */
    logCleanupActivity(stats) {
        const query = `
            INSERT INTO system_logs (log_type, log_data, created_at)
            VALUES ('data_cleanup', ?, datetime('now'))
        `;

        this.db.run(query, [JSON.stringify(stats)], (err) => {
            if (err) {
                console.error('Erreur log activité:', err);
            }
        });
    }

    /**
     * Logger une erreur
     */
    logError(errorType, error) {
        const query = `
            INSERT INTO system_logs (log_type, log_data, created_at)
            VALUES ('error', ?, datetime('now'))
        `;

        const errorData = {
            type: errorType,
            message: error.message,
            stack: error.stack
        };

        this.db.run(query, [JSON.stringify(errorData)], (err) => {
            if (err) {
                console.error('Erreur log erreur:', err);
            }
        });
    }

    /**
     * Utilitaire pour exécuter une requête avec Promise
     */
    runQuery(sql, callback) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, function(err) {
                if (err) {
                    reject(err);
                } else {
                    if (callback) callback(this);
                    resolve(this);
                }
            });
        });
    }

    /**
     * Créer un export complet pour un utilisateur (pour demande RGPD)
     */
    async createUserDataExport(userId) {
        return new Promise((resolve, reject) => {
            const exportData = {};
            
            const queries = {
                user: `SELECT * FROM users WHERE id = ?`,
                consents: `SELECT * FROM user_consents WHERE user_id = ?`,
                sessions: `SELECT * FROM sessions WHERE user_id = ? ORDER BY last_activity DESC LIMIT 10`,
                gdpr_requests: `SELECT * FROM gdpr_requests WHERE user_id = ?`,
                access_logs: `SELECT * FROM data_access_log WHERE user_id = ? ORDER BY access_date DESC LIMIT 50`
            };

            const promises = Object.entries(queries).map(([key, query]) => {
                return new Promise((res, rej) => {
                    this.db.all(query, [userId], (err, rows) => {
                        if (err) rej(err);
                        else res({ key, rows });
                    });
                });
            });

            Promise.all(promises)
                .then(results => {
                    results.forEach(result => {
                        exportData[result.key] = result.rows;
                    });
                    resolve(exportData);
                })
                .catch(reject);
        });
    }

    /**
     * Anonymiser les données d'un utilisateur (pour droit à l'effacement)
     */
    async anonymizeUserData(userId) {
        try {
            // 1. Anonymiser l'utilisateur
            await this.runQuery(
                `UPDATE users 
                 SET username = 'user_deleted_' || ?, 
                     email = 'deleted_' || ? || '@anonymous.local',
                     nom = 'ANONYMISÉ',
                     prenom = 'ANONYMISÉ',
                     telephone = NULL,
                     adresse = NULL
                 WHERE id = ?`,
                [userId, userId, userId]
            );

            // 2. Supprimer les sessions
            await this.runQuery(
                `DELETE FROM sessions WHERE user_id = ?`,
                [userId]
            );

            // 3. Marquer les consentements comme retirés
            await this.runQuery(
                `UPDATE user_consents 
                 SET consent_given = 0, withdrawn_date = datetime('now')
                 WHERE user_id = ?`,
                [userId]
            );

            // 4. Anonymiser les logs
            await this.runQuery(
                `UPDATE data_access_log 
                 SET ip_address = 'anonymized', user_agent = 'anonymized'
                 WHERE user_id = ?`,
                [userId]
            );

            console.log(`✅ Données de l'utilisateur ${userId} anonymisées avec succès`);
            return true;

        } catch (error) {
            console.error(`❌ Erreur anonymisation utilisateur ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Fermer proprement la connexion à la base de données
     */
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Erreur fermeture DB:', err);
            } else {
                console.log('✅ Connexion base de données fermée');
            }
        });
    }
}

// Export singleton
module.exports = new DataRetentionService();
