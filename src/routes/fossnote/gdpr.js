// src/routes/gdpr.js
const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

// Middleware d'authentification
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Non authentifié' });
}

// Droit d'accès - Télécharger toutes ses données personnelles
router.get('/mes-donnees', isAuthenticated, async (req, res) => {
    try {
        const db = new Database(path.join(__dirname, '../../database.db'));
        const userId = req.session.userId;
        
        // Récupérer toutes les données de l'utilisateur
        const userData = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const sessions = db.prepare('SELECT * FROM sessions WHERE user_id = ?').all(userId);
        const consents = db.prepare('SELECT * FROM user_consents WHERE user_id = ?').all(userId);
        
        // Logger l'accès aux données
        db.prepare(`
            INSERT INTO data_access_log (user_id, accessed_by, access_type, ip_address) 
            VALUES (?, ?, ?, ?)
        `).run(userId, userId, 'export', req.ip);
        
        // Supprimer le mot de passe de l'export
        if (userData) {
            delete userData.password;
        }
        
        const exportData = {
            utilisateur: userData,
            sessions: sessions,
            consentements: consents,
            export_date: new Date().toISOString(),
            format_version: '1.0'
        };
        
        db.close();
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=mes-donnees-fossnote.json');
        res.send(JSON.stringify(exportData, null, 2));
        
    } catch (error) {
        console.error('Erreur export données:', error);
        res.status(500).json({ error: 'Erreur lors de l\'export de vos données' });
    }
});

// Droit à l'effacement (droit à l'oubli)
router.post('/demande-suppression', isAuthenticated, async (req, res) => {
    try {
        const db = new Database(path.join(__dirname, '../../database.db'));
        const userId = req.session.userId;
        const { motif } = req.body;
        
        // Créer une demande de suppression
        db.prepare(`
            INSERT INTO gdpr_requests (user_id, request_type, notes, status) 
            VALUES (?, ?, ?, ?)
        `).run(userId, 'deletion', motif || 'Demande de suppression de compte', 'pending');
        
        db.close();
        
        res.json({ 
            success: true, 
            message: 'Votre demande de suppression a été enregistrée. Elle sera traitée sous 30 jours conformément au RGPD.' 
        });
        
    } catch (error) {
        console.error('Erreur demande suppression:', error);
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement de votre demande' });
    }
});

// Droit de rectification
router.post('/rectifier-donnees', isAuthenticated, async (req, res) => {
    try {
        const db = new Database(path.join(__dirname, '../../database.db'));
        const userId = req.session.userId;
        const { field, newValue, justification } = req.body;
        
        // Valider les champs modifiables directement par l'utilisateur
        const directlyEditableFields = ['email', 'telephone'];
        const requiresValidationFields = ['nom', 'prenom', 'adresse'];
        
        if (directlyEditableFields.includes(field)) {
            // Mise à jour directe pour les champs autorisés
            db.prepare(`UPDATE users SET ${field} = ? WHERE id = ?`).run(newValue, userId);
            
            // Logger la modification
            db.prepare(`
                INSERT INTO data_access_log (user_id, accessed_by, access_type, ip_address, reason) 
                VALUES (?, ?, ?, ?, ?)
            `).run(userId, userId, 'edit', req.ip, `Modification du champ ${field}`);
            
            db.close();
            
            return res.json({ 
                success: true, 
                message: 'Vos données ont été mises à jour immédiatement.' 
            });
        } else if (requiresValidationFields.includes(field)) {
            // Créer une demande de rectification nécessitant validation
            db.prepare(`
                INSERT INTO gdpr_requests (user_id, request_type, notes, status) 
                VALUES (?, ?, ?, ?)
            `).run(
                userId, 
                'rectification', 
                JSON.stringify({ field, newValue, justification }), 
                'pending'
            );
            
            db.close();
            
            return res.json({ 
                success: true, 
                message: 'Votre demande de rectification a été enregistrée et sera examinée.' 
            });
        } else {
            db.close();
            return res.status(400).json({ error: 'Champ non modifiable' });
        }
        
    } catch (error) {
        console.error('Erreur rectification:', error);
        res.status(500).json({ error: 'Erreur lors de la rectification' });
    }
});

// Droit d'opposition au traitement
router.post('/opposition-traitement', isAuthenticated, async (req, res) => {
    try {
        const db = new Database(path.join(__dirname, '../../database.db'));
        const userId = req.session.userId;
        const { processingType } = req.body;
        
        // Enregistrer l'opposition
        db.prepare(`
            INSERT INTO user_consents (user_id, consent_type, consent_given, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, processingType, 0, req.ip, req.get('user-agent'));
        
        db.close();
        
        res.json({ 
            success: true, 
            message: 'Votre opposition au traitement a été enregistrée.' 
        });
        
    } catch (error) {
        console.error('Erreur opposition:', error);
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement de votre opposition' });
    }
});

// Consulter ses consentements
router.get('/mes-consentements', isAuthenticated, async (req, res) => {
    try {
        const db = new Database(path.join(__dirname, '../../database.db'));
        const userId = req.session.userId;
        
        const consents = db.prepare(`
            SELECT consent_type, consent_given, consent_date, withdrawn_date 
            FROM user_consents 
            WHERE user_id = ? 
            ORDER BY consent_date DESC
        `).all(userId);
        
        db.close();
        
        res.json({ success: true, consents });
        
    } catch (error) {
        console.error('Erreur consultation consentements:', error);
        res.status(500).json({ error: 'Erreur lors de la consultation' });
    }
});

module.exports = router;
