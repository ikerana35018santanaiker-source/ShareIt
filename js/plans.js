// js/plans.js
const PLANS = {
    PERSONAL: {
        GRATUITO: {
            name: "Gratuito",
            storage: 15 * 1024 * 1024 * 1024, // 15 GB
            ia: "Básica",
            iaCredits: 200,
            price: 0
        },
        PLUS: {
            name: "Plus",
            storage: 125 * 1024 * 1024 * 1024,
            ia: "Avanzada Básica",
            iaCredits: 350,
            priceMonthly: 1.99,
            priceAnnual: 22.99
        },
        PRO: {
            name: "Pro",
            storage: 350 * 1024 * 1024 * 1024,
            ia: "Premium",
            iaCredits: 750,
            priceMonthly: 19.99,
            priceAnnual: 199.99
        }
    },
    EMPRESA: {
        GRATUITO: { name: "Empresa Gratuito", storage: 15 * 1024 * 1024 * 1024, ia: "Básica", price: 0 },
        BUSINESS_PRO: { name: "Business Pro", storage: 500 * 1024 * 1024 * 1024 * 1024, ia: "Empresarial", iaCredits: "2000-5000", priceMonthly: 59.99 },
        BUSINESS_INFINITY: { name: "Business Infinity", storage: 1000 * 1024 * 1024 * 1024 * 1024, ia: "Corporativa Avanzada", iaCredits: "ilimitados", priceMonthly: 79.99 }
    }
};
