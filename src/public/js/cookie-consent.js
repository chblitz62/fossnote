// src/public/js/cookie-consent.js

class CookieConsent {
    constructor() {
        this.cookieName = 'fossnote_cookie_consent';
        this.cookieDuration = 365; // jours
        this.init();
    }

    init() {
        const consent = this.getConsent();
        if (!consent) {
            this.showBanner();
        } else {
            this.applyConsent(consent);
        }
        
        this.attachEventListeners();
    }

    showBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.style.display = 'block';
        }
    }

    hideBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.style.display = 'none';
        }
    }

    getConsent() {
        const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith(this.cookieName + '='));
        
        return cookie ? JSON.parse(decodeURIComponent(cookie.split('=')[1])) : null;
    }

    setConsent(consent) {
        const expires = new Date();
        expires.setDate(expires.getDate() + this.cookieDuration);
        
        const cookieValue = encodeURIComponent(JSON.stringify(consent));
        document.cookie = `${this.cookieName}=${cookieValue}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${window.location.protocol === 'https:' ? '; Secure' : ''}`;
        
        this.applyConsent(consent);
        this.hideBanner();
    }

    applyConsent(consent) {
        if (consent.analytics) {
            this.loadAnalytics();
        } else {
            this.disableAnalytics();
        }
        
        if (consent.functional) {
            this.loadFunctionalScripts();
        }
    }

    loadAnalytics() {
        console.log('Analytics activées');
    }

    disableAnalytics() {
        console.log('Analytics désactivées');
    }

    loadFunctionalScripts() {
        console.log('Scripts fonctionnels activés');
    }

    attachEventListeners() {
        const acceptAllBtn = document.getElementById('cookie-accept-all');
        if (acceptAllBtn) {
            acceptAllBtn.addEventListener('click', () => {
                this.setConsent({
                    essential: true,
                    analytics: true,
                    functional: true,
                    timestamp: new Date().toISOString()
                });
            });
        }

        const rejectOptionalBtn = document.getElementById('cookie-reject-optional');
        if (rejectOptionalBtn) {
            rejectOptionalBtn.addEventListener('click', () => {
                this.setConsent({
                    essential: true,
                    analytics: false,
                    functional: false,
                    timestamp: new Date().toISOString()
                });
            });
        }

        const customizeBtn = document.getElementById('cookie-customize');
        if (customizeBtn) {
            customizeBtn.addEventListener('click', () => {
                const modal = document.getElementById('cookie-modal');
                if (modal) {
                    modal.style.display = 'flex';
                }
            });
        }

        const closeModalBtn = document.getElementById('cookie-modal-close');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                const modal = document.getElementById('cookie-modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }

        const savePrefsBtn = document.getElementById('cookie-save-preferences');
        if (savePrefsBtn) {
            savePrefsBtn.addEventListener('click', () => {
                const analyticsCheckbox = document.getElementById('cookie-analytics');
                const functionalCheckbox = document.getElementById('cookie-functional');
                
                this.setConsent({
                    essential: true,
                    analytics: analyticsCheckbox ? analyticsCheckbox.checked : false,
                    functional: functionalCheckbox ? functionalCheckbox.checked : false,
                    timestamp: new Date().toISOString()
                });
                
                const modal = document.getElementById('cookie-modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    openPreferences() {
        const modal = document.getElementById('cookie-modal');
        if (modal) {
            modal.style.display = 'flex';
            
            const consent = this.getConsent();
            if (consent) {
                const analyticsCheckbox = document.getElementById('cookie-analytics');
                const functionalCheckbox = document.getElementById('cookie-functional');
                
                if (analyticsCheckbox) analyticsCheckbox.checked = consent.analytics;
                if (functionalCheckbox) functionalCheckbox.checked = consent.functional;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cookieConsent = new CookieConsent();
});

window.openCookiePreferences = () => {
    if (window.cookieConsent) {
        window.cookieConsent.openPreferences();
    }
};
