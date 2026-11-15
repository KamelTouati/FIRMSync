export const TRANSLATIONS = {
  en: {
    appTitle: "FIRMSync",
    appSubtitle: "Calibrated 25-Year MODIS–VIIRS Fire Intelligence · Northern Algeria",
    challengeTag: "NASA Space Apps Challenge 2026",
    
    // Controls
    selectWilaya: "Select Wilaya",
    metricLabel: "Metric",
    metricCount: "Hotspots (VIIRS-eq)",
    metricFRP: "Fire Energy (FRP MW)",
    langToggle: "Français",
    
    // Status banner
    unusualHeader: "IS THIS MONTH UNUSUAL?",
    statusLow: "LOW",
    statusNormal: "NORMAL",
    statusHigh: "HIGH",
    statusExtreme: "EXTREME",
    
    partialMonthBadge: "PARTIAL DATA (Month in Progress)",
    partialMonthNotice: "November 2026 data contains observations through Nov 14 (partial month). Statistical percentiles are provisional.",
    lowConfidenceNotice: "Few detections, low confidence: High proportion of urban/coastal land cover yields sparse vegetation fire detections, reducing statistical confidence in anomaly percentiles.",

    verdictSentence: (wilaya, monthName, year, pct, status, isPartial) => {
      const partialSuffix = isPartial ? " (partial month in progress)" : "";
      if (status === 'extreme') {
        return `${wilaya} experienced extraordinary fire activity in ${monthName} ${year}${partialSuffix}, higher than ${pct}% of all recorded ${monthName}s in the 2003–2025 baseline.`;
      }
      if (status === 'high') {
        return `Elevated fire activity in ${wilaya} for ${monthName} ${year}${partialSuffix}, higher than ${pct}% of past ${monthName}s in the 2003–2025 baseline.`;
      }
      if (status === 'normal') {
        return `Burning activity in ${wilaya} for ${monthName} ${year}${partialSuffix} is within normal historical range, near the multi-year median (${pct}% of past ${monthName}s).`;
      }
      return `Fire detections in ${wilaya} for ${monthName} ${year}${partialSuffix} remain low, lower than ${100 - pct}% of past ${monthName}s in the 2003–2025 baseline.`;
    },

    // Metrics pills
    recordedValue: "Recorded Activity",
    baselineMedian: "2003–2025 Baseline Median",
    historicalRank: "Historical Comparison",
    anomalySigma: "Anomaly Score",
    sensorSeries: "Primary Satellite Sensor",
    nrtBadge: "Near-Real-Time",
    rawCountLabel: "Raw Satellite Detections",

    // Accordion
    analystBreakdown: "Analyst Baseline Distribution",
    p25Label: "25th Percentile",
    p75Label: "75th Percentile",
    p90Label: "90th Percentile (Extreme Threshold)",
    baselineRange: "Historical Range (Min - Max)",

    // Map section
    mapTitle: "Territorial Choropleth",
    mapSubtitle: "Hover over wilayas to inspect local activity. Click to select.",
    clickToSelect: "Click to select",
    areaKm2: "Area",
    mapLegend: "Fire Intensity",

    // Heatmap section
    calendarTitle: "25-Year Burning Activity Calendar",
    calendarSubtitle: "Harmonized monthly time series (2000–2026) in continuous Suomi-NPP equivalent units.",
    filterYears: "Year Range",
    allYears: "All (2000–2026)",
    viirsEra: "VIIRS Era (2012–2026)",
    recent5: "Past 5 Years",
    legendTitle: "Inferno Perceptually-Uniform Scale",
    zeroActivity: "0 (Zero Burning)",
    extremeActivity: "Peak Extreme",
    clickCellHint: "Click any month cell to inspect its anomaly status above.",

    // Sensor timeline badge
    modisEraLabel: "MODIS Era (Terra/Aqua Calibrated)",
    snppEraLabel: "VIIRS S-NPP Era (Direct Standard)",
    noaa20EraLabel: "VIIRS NOAA-20 (Post-SNPP Continuity)",

    // Actions & Modals
    openMethodology: "Science & Validation (LOOCV)",
    openExport: "Export CSV",
    methodologyTitle: "MODIS-VIIRS Satellite Harmonization Methodology",
    methodologySubtitle: "Resolving 25 years of split satellite records into a single continuous time series.",
    loocvHeader: "Leave-One-Year-Out Cross-Validation (LOOCV)",
    loocvIntro: "To guarantee scientific validity, the transfer functions were cross-validated between sensors across overlap periods (2012–2025 for MODIS to S-NPP). Error reduced from 72.6% to 33.6% with r = 0.953.",
    hfDatasetBtn: "Open Public Dataset on Hugging Face",
    closeModal: "Close",

    // Export modal
    exportTitle: "Export Harmonized Fire Data",
    exportSubtitle: "Generate calibrated monthly active-fire records in standard CSV format.",
    exportScope: "Data Scope",
    exportCurrentOnly: "Current Wilaya Only",
    exportAllWilayas: "All 7 Northern Algerian Wilayas",
    exportRange: "Time Horizon",
    downloadBtn: "Download Verified CSV",
    
    // Acknowledgement & Disclaimer
    disclaimerText: "Analytical aid, not an official warning: This application is an analytical decision aid based on satellite thermal anomalies, not an official operational wildfire warning system.",
    acknowledgementText: "Data sourced from NASA Fire Information for Resource Management System (FIRMS), part of NASA's LANCE and ESDIS projects. Presets aligned with administrative boundaries of northern Algeria.",
    lastUpdatedText: "Last Updated: November 15, 2026 (NASA FIRMS data through Nov 14, 2026)",

    months: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ],
    monthsShort: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
  },

  fr: {
    appTitle: "FIRMSync",
    appSubtitle: "Intelligence Satellitaire Harmonisée MODIS–VIIRS sur 25 Ans · Algérie du Nord",
    challengeTag: "NASA Space Apps Challenge 2026",

    // Controls
    selectWilaya: "Sélectionner la Wilaya",
    metricLabel: "Métrique",
    metricCount: "Points Chauds (Éq. VIIRS)",
    metricFRP: "Énergie Émise (FRP MW)",
    langToggle: "English",

    // Status banner
    unusualHeader: "CE MOIS EST-IL INHABITUEL ?",
    statusLow: "FAIBLE",
    statusNormal: "NORMAL",
    statusHigh: "ÉLEVÉ",
    statusExtreme: "EXTRÊME",

    partialMonthBadge: "DONNÉES PARTIELLES (Mois en cours)",
    partialMonthNotice: "Novembre 2026 inclut les détections jusqu'au 14 nov (mois partiel). Les percentiles statistiques sont provisoires.",
    lowConfidenceNotice: "Peu de détections, faible confiance : La forte proportion de zones urbaines et côtières génère peu d'incendies de végétation, réduisant la confiance statistique dans les percentiles d'anomalie.",

    verdictSentence: (wilaya, monthName, year, pct, status, isPartial) => {
      const partialSuffix = isPartial ? " (mois partiel en cours)" : "";
      if (status === 'extreme') {
        return `${wilaya} a subi des feux exceptionnels en ${monthName} ${year}${partialSuffix}, supérieurs à ${pct}% des mois de référence 2003–2025.`;
      }
      if (status === 'high') {
        return `Activité de feux élevée à ${wilaya} en ${monthName} ${year}${partialSuffix}, supérieure à ${pct}% des mois de référence 2003–2025.`;
      }
      if (status === 'normal') {
        return `L'activité d'incendie à ${wilaya} en ${monthName} ${year}${partialSuffix} est normale, proche de la médiane historique (${pct}% des mois de ${monthName}).`;
      }
      return `Les détections de feux à ${wilaya} pour ${monthName} ${year}${partialSuffix} demeurent faibles (${pct}% des mois de référence).`;
    },

    // Metrics pills
    recordedValue: "Activité Enregistrée",
    baselineMedian: "Médiane Historique (2003–2025)",
    historicalRank: "Comparaison Historique",
    anomalySigma: "Score d'Anomalie",
    sensorSeries: "Capteur Satellitaire Principal",
    nrtBadge: "Temps Quasi-Réel",
    rawCountLabel: "Détections Satellitaires Brutes",

    // Accordion
    analystBreakdown: "Distribution Statistique Détaillée",
    p25Label: "25e Percentile",
    p75Label: "75e Percentile",
    p90Label: "90e Percentile (Seuil Critique)",
    baselineRange: "Étendue Historique (Min - Max)",

    // Map section
    mapTitle: "Choroplèthe Territorial",
    mapSubtitle: "Survolez une wilaya pour inspecter l'activité locale. Cliquez pour sélectionner.",
    clickToSelect: "Cliquer pour sélectionner",
    areaKm2: "Superficie",
    mapLegend: "Intensité des Feux",

    // Heatmap section
    calendarTitle: "Calendrier de l'Activité d'Incendie sur 25 Ans",
    calendarSubtitle: "Série temporelle mensuelle harmonisée (2000–2026) en unités continues équivalentes Suomi-NPP.",
    filterYears: "Période",
    allYears: "Tout (2000–2026)",
    viirsEra: "Ère VIIRS (2012–2026)",
    recent5: "5 Dernières Années",
    legendTitle: "Échelle Perceptive Uniforme Inferno",
    zeroActivity: "0 (Aucun Feu)",
    extremeActivity: "Pic Catastrophique",
    clickCellHint: "Cliquez sur une cellule mensuelle pour examiner son statut au-dessus.",

    // Sensor timeline badge
    modisEraLabel: "Ère MODIS (Terra/Aqua Calibré)",
    snppEraLabel: "Ère VIIRS S-NPP (Standard Direct)",
    noaa20EraLabel: "VIIRS NOAA-20 (Continuité post-SNPP)",

    // Actions & Modals
    openMethodology: "Science & Validation (LOOCV)",
    openExport: "Exporter CSV",
    methodologyTitle: "Méthodologie d'Harmonisation Satellitaire MODIS-VIIRS",
    methodologySubtitle: "Résoudre 25 ans d'archives satellitaires divergentes en une série temporelle continue.",
    loocvHeader: "Validation Croisée par Année Exclue (LOOCV)",
    loocvIntro: "Pour garantir la rigueur scientifique, les fonctions de transfert ont été validées croisées entre capteurs sur les périodes de chevauchement (2012–2025). Erreur réduite de 72.6% à 33.6% avec r = 0.953.",
    hfDatasetBtn: "Accéder au Jeu de Données Public sur Hugging Face",
    closeModal: "Fermer",

    // Export modal
    exportTitle: "Exporter les Données Harmonnisées",
    exportSubtitle: "Générez les relevés mensuels calibrés au format CSV standard.",
    exportScope: "Périmètre des Données",
    exportCurrentOnly: "Wilaya Actuelle Uniquement",
    exportAllWilayas: "Les 7 Wilayas du Nord Algérien",
    exportRange: "Horizon Temporel",
    downloadBtn: "Télécharger le Fichier CSV",

    // Acknowledgement & Disclaimer
    disclaimerText: "Aide analytique, pas un système d'alerte officiel : Cette application est un outil d'aide à la décision basé sur les anomalies thermiques satellitaires, et non un système officiel d'alerte incendie.",
    acknowledgementText: "Données issues du système FIRMS de la NASA (LANCE / ESDIS). Alignement cartographique sur les limites administratives officielles du nord algérien.",
    lastUpdatedText: "Dernière mise à jour : 15 novembre 2026 (Données NASA FIRMS jusqu'au 14 nov 2026)",

    months: [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ],
    monthsShort: [
      "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
      "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
    ]
  }
};
