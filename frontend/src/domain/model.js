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
 * @property {string|null} backscatter       rétrodiffusion en co-polarisation (HH ou VV selon le capteur)
 * @property {string|null} backscatterCross  rétrodiffusion en polarisation croisée (HV ou VH), facultative
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
 * @property {string|null} polarization  co-polarisation affichée (« VV », « HH »)
 * @property {string|null} satellite     ex. « S1A »
 * @property {string|null} product       ex. « SENTINEL1_RTC30_HYP3 »
 * @property {string} maturity
 * @property {boolean} isMock          donnée factice (doit être false en production)
 * @property {number} waterAreaKm2     eau détectée (permanente + inondée)
 * @property {number|null} newWaterKm2 eau absente de la référence ; null pour la référence
 * @property {number} waterFraction    part de l'emprise en eau (0–1)
 * @property {number} validFraction    part de l'emprise couverte (0–1)
 * @property {number} thresholdDb      seuil de rétrodiffusion utilisé pour le masque
 * @property {number|null} meanDb      rétrodiffusion moyenne de l'emprise (co-polarisation)
 * @property {AcquisitionLayers} layers
 */

/**
 * Image composite d'une saison (moyenne de plusieurs passages), sans date ni statistiques.
 * @typedef {Object} SeasonComposite
 * @property {string} id
 * @property {"dry"|"rain"} season
 * @property {{backscatter: string|null, waterMask: string|null}} layers
 */

/**
 * Capteur à l'origine des images, déduit du manifest (domain/sensor.js).
 * @typedef {Object} Sensor
 * @property {string} name               « Sentinel-1 », « NISAR »…
 * @property {string|null} instrument
 * @property {string|null} band          « C », « L »
 * @property {number|null} wavelengthCm
 * @property {number|null} revisitDays
 * @property {string|null} polarization  co-polarisation affichée
 * @property {string[]} polarizations
 * @property {string[]} satellites       libellés lisibles
 * @property {string[]} products
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
 * @property {{dry?: SeasonComposite, rain?: SeasonComposite}} [composites]
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
