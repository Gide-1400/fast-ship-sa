// ============================================
// FastShip Global - Language Switcher
// ============================================

const LANG_KEY = 'fastship_lang';
let currentLang = localStorage.getItem(LANG_KEY) || 'ar';

document.addEventListener('DOMContentLoaded', function() {
    initLanguage();
    setupLanguageToggle();
});

function initLanguage() {
    // Set HTML direction and lang
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    
    // Update all translatable elements
    updateTranslations();
    
    // Update lang toggle button
    const langToggle = document.getElementById('currentLang');
    if (langToggle) {
        langToggle.textContent = currentLang === 'ar' ? 'EN' : 'AR';
    }
}

function setupLanguageToggle() {
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
    }
}

function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem(LANG_KEY, currentLang);
    initLanguage();
}

function updateTranslations() {
    // Get all elements with data-ar and data-en attributes
    const elements = document.querySelectorAll('[data-ar][data-en]');
    
    elements.forEach(element => {
        const arText = element.getAttribute('data-ar');
        const enText = element.getAttribute('data-en');
        
        if (currentLang === 'ar') {
            element.textContent = arText;
        } else {
            element.textContent = enText;
        }
    });
}

// Export for use in other files
window.getCurrentLang = () => currentLang;
window.translate = (ar, en) => currentLang === 'ar' ? ar : en;
