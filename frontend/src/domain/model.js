// DOMAINE · Modèle
// Objets métier de l'application, indépendants de la source (manifest.json, API FastAPI, autre).
// Les adaptateurs d'infrastructure convertissent leurs données vers ces formes : le reste du code ne voit qu'elles.

/**
 * Emprise d'étude et grille commune à toutes les images.
 * @typedef {Object} StudyArea
 * @property {string} name
 * @property {{west:number, south:number, east:number, north:number}} bbox  degrés WGS84
 * @property {string} crs
 * @property {number} width   largeur de la grille en pixels
 * @property {number} height  hauteur de la grille en pixels
 */

/**
 * Couches image d'une acquisition (URL prêtes à afficher, ou null si absente).
 * @typedef {Object} AcquisitionLayers
 * @property {string|null} backscatterHh
 * @property {string|null} backscatterHv
 * @property {string|null} waterMask
 * @property {string|null} newWaterMask
 */

/**
 * Une acquisition radar à une date.
 * @typedef {Object} Acquisition
 * @property {string} id
 * @property {string} date            AAAA-MM-JJ
 * @property {"dry"|"rain"} season
 * @property {string|null} orbit
 * @property {string[]} polarizations
 * @property {string} maturity
 * @property {boolean} isMock          donnée factice
 * @property {number} waterAreaKm2     eau détectée (permanente + inondée)
 * @property {number|null} newWaterKm2 eau absente de la référence ; null pour la référence
 * @property {number} waterFraction    part de l'emprise en eau (0–1)
 * @property {number} validFraction    part de l'emprise couverte (0–1)
 * @property {number} thresholdDb      seuil HH utilisé pour le masque
 * @property {number} meanHhDb         rétrodiffusion HH moyenne
 * @property {AcquisitionLayers} layers
 */

/**
 * Catalogue brut renvoyé par une source de données (avant règles métier).
 * @typedef {Object} RawCatalog
 * @property {StudyArea} studyArea
 * @property {string} referenceId         scène de référence « eau permanente »
 * @property {number} defaultThresholdDb
 * @property {number} minValidFraction
 * @property {[number, number]} dbRange    échelle dB des PNG de rétrodiffusion (gris 0 -> lo, 255 -> hi)
 * @property {"static"|"api"} source       d'où viennent réellement les données
 * @property {Acquisition[]} acquisitions triées par date
 */

/**
 * Quartier suivi.
 * @typedef {Object} Quartier
 * @property {string} id
 * @property {string} name
 * @property {number} lon
 * @property {number} lat
 */

export {};
