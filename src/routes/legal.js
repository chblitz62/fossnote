// src/routes/legal.js
const express = require('express');
const router = express.Router();
const path = require('path');

// Page mentions légales
router.get('/mentions-legales', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/mentions-legales.html'));
});

// Page politique de confidentialité
router.get('/politique-confidentialite', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/politique-confidentialite.html'));
});

// Page CGU (Conditions Générales d'Utilisation)
router.get('/cgu', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/cgu.html'));
});

module.exports = router;
