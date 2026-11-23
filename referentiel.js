/* =====================================================================
   RÉFÉRENTIEL CHIFFON
   Contexte entreprise, postes à pourvoir et critères pondérés.
   Tout est modifiable depuis l'onglet « Postes » de l'outil ; ce fichier
   ne sert que de point de départ (valeurs par défaut).
   ===================================================================== */
(function (root) {
  "use strict";

  var ENTREPRISE = {
    nom: "CHIFFON",
    contexte:
      "Entreprise textile d'Auvergne-Rhône-Alpes (plus de 50 ans), environ 450 collaborateurs " +
      "(logistique, fabrication, création, finance…). Repositionnée en 2024 sur un concept éthique : " +
      "fabriqué en France, circuit court, tissus recyclés, vocation sociale. La direction a recruté 4 RRH " +
      "(RRH 1 : administration & paie, RRH 2 : généraliste, RRH 3 : recrutement, RRH 4 : développement RH) " +
      "et veut une politique RH structurée et visionnaire. Process actuels à transformer : recrutement sans grille, " +
      "onboarding inexistant, entretiens d'évaluation sans cadre, formation déconnectée des besoins, peu de mobilité, " +
      "administration et paie sur papier, QVCT méconnue, pratiques managériales datées.",
    // Signaux de culture : comptent dans le critère « Adéquation culture CHIFFON »
    culturePositive: [
      "transformation", "changement", "innovation", "innovant", "adapt", "agilite", "agile",
      "force de proposition", "curiosite", "apprentissage", "esprit d'equipe", "rse", "ethique",
      "inclusion", "egalite", "solidaire", "terrain", "evolutif", "proactiv", "ecoute", "veille"
    ],
    // Signaux qui ne pénalisent pas la note mais déclenchent un point de vigilance
    vigilance: [
      { motif: "management directif", message: "Style de management « directif » revendiqué : à confronter avec la volonté de CHIFFON de moderniser les pratiques managériales." },
      { motif: "en externe", message: "Souhaite intervenir « en externe » (conseil) : risque de départ rapide sur un poste interne." },
      { motif: "vision theorique", message: "Se présente avec une « vision théorique » : vérifier la capacité à opérer sur le terrain." },
      { motif: "court terme", message: "Souhaite évoluer à court terme : anticiper un plan d'évolution, sinon risque de turnover." },
      { motif: "changement permanent", message: "Recherche le « changement permanent » : vérifier la motivation à s'inscrire dans la durée." }
    ]
  };

  function crit(id, label, poids, motsCles, question) {
    return { id: id, label: label, poids: poids, type: "mots", motsCles: motsCles, question: question };
  }
  function critExp(min, idealMax, poids) {
    return {
      id: "experience", label: "Expérience professionnelle", poids: poids, type: "experience",
      min: min, idealMax: idealMax,
      question: "Pouvez-vous décrire votre expérience la plus proche de ce poste : contexte, taille d'entreprise, résultats obtenus ?"
    };
  }
  function critCulture(poids) {
    return {
      id: "culture", label: "Adéquation culture CHIFFON (transformation, éthique)", poids: poids, type: "culture",
      question: "CHIFFON se réinvente autour du fabriqué en France et d'une vocation sociale. Qu'est-ce qui vous attire dans ce projet, et comment avez-vous déjà contribué à une transformation ?"
    };
  }

  var POSTES = [
    {
      id: "sirh",
      titre: "Chargé(e) SIRH & digitalisation RH",
      rattachement: "RRH 1 – Administration & paie",
      mission:
        "Dématérialiser l'administration du personnel et la paie (aujourd'hui sur papier), choisir et déployer un SIRH, " +
        "former les utilisateurs et fiabiliser les données RH.",
      criteres: [
        crit("sirh", "Projets SIRH & digitalisation", 5,
          ["sirh", "digitalisation", "dematerialisation", "workday", "successfactors", "automatisation", "cahier des charges", "recette", "talentsoft", "technologique", "gestion de projets sirh", "processus rh"],
          "Racontez un projet de digitalisation RH que vous avez mené : périmètre, étapes, difficultés, résultat."),
        crit("paie", "Paie & administration du personnel", 3,
          ["paie", "dsn", "bulletin", "administration du personnel", "suivi administratif", "contrats", "absences", "conges", "sage", "adp", "sap", "charges sociales"],
          "Quels processus de paie et d'administration avez-vous gérés, avec quels outils ?"),
        crit("changement", "Formation des utilisateurs & conduite du changement", 3,
          ["formation des utilisateurs", "utilisateurs", "accompagnement au changement", "conduite du changement", "animation", "pedagog", "deploiement", "former"],
          "Comment embarquez-vous des équipes peu à l'aise avec le numérique dans un nouvel outil ?"),
        crit("droit", "Droit social & conformité", 2,
          ["droit du travail", "conformite", "veille reglementaire", "legal", "juridique", "audit"],
          "Comment assurez-vous votre veille réglementaire sur la paie et l'administration du personnel ?"),
        critExp(3, 8, 3),
        crit("savoiretre", "Savoir-être : rigueur, analyse, autonomie", 2,
          ["rigueur", "rigoureux", "autonomie", "analyse", "sens du service", "organisation"],
          "Donnez un exemple où votre rigueur a évité une erreur importante."),
        critCulture(2)
      ]
    },
    {
      id: "recrutement",
      titre: "Chargé(e) de recrutement & intégration",
      rattachement: "RRH 3 – Recrutement",
      mission:
        "Structurer le recrutement (grilles d'entretien, process, indicateurs) pour les 450 collaborateurs, " +
        "sourcer des profils terrain (fabrication, logistique) et créer le parcours d'onboarding aujourd'hui inexistant.",
      criteres: [
        crit("sourcing", "Sourcing & conduite d'entretiens", 5,
          ["sourcing", "recrutement", "linkedin", "cvtheque", "chasse", "prequalification", "entretien", "ats", "campagnes de recrutement"],
          "Décrivez votre méthode de sourcing pour un profil difficile à trouver."),
        crit("onboarding", "Onboarding & accueil des nouveaux", 4,
          ["onboarding", "accueil", "integration", "nouveaux collaborateurs"],
          "Si vous deviez construire le parcours d'intégration d'un opérateur de fabrication, que mettriez-vous en place ?"),
        crit("process", "Structuration : grilles, process, reporting", 3,
          ["reporting", "kpi", "fiche de poste", "fiches de poste", "process", "grille", "indicateurs", "organisation des entretiens"],
          "Quels indicateurs suivez-vous pour piloter un recrutement ?"),
        crit("terrain", "Connaissance des profils terrain / techniques", 2,
          ["technique", "industriel", "production", "logistique", "interim", "operateur", "fabrication"],
          "Quelle expérience avez-vous du recrutement de profils de production ou de logistique ?"),
        crit("marque", "Marque employeur & communication", 2,
          ["marque employeur", "communication", "aisance relationnelle", "relationnel"],
          "Comment rendriez-vous CHIFFON attractive pour les candidats de la région ?"),
        critExp(1, 5, 3),
        critCulture(2)
      ]
    },
    {
      id: "qvct",
      titre: "Chargé(e) QVCT & accompagnement managérial",
      rattachement: "RRH 2 – Généraliste",
      mission:
        "Mettre CHIFFON en conformité sur la QVCT et les RPS, déployer des actions de bien-être au travail, " +
        "accompagner les managers vers des pratiques modernes et porter la dimension sociale et inclusive du projet.",
      criteres: [
        crit("qvct", "QVCT & prévention des RPS", 5,
          ["qvct", "qualite de vie", "rps", "risques psychosociaux", "prevention", "bien-etre", "teletravail", "enquetes de satisfaction", "sante"],
          "Quelle démarche suivriez-vous pour évaluer les RPS dans une entreprise de 450 personnes ?"),
        crit("managers", "Accompagnement des managers & du changement", 4,
          ["manager", "accompagnement au changement", "conseil", "coaching", "mediation", "conflits", "pratiques manageriales"],
          "Comment aidez-vous un manager aux pratiques anciennes à faire évoluer sa posture ?"),
        crit("rse", "RSE, diversité & inclusion", 3,
          ["rse", "diversite", "inclusion", "handicap", "egalite", "parite", "ethique"],
          "Quelle action d'inclusion mettriez-vous en place en priorité chez CHIFFON ?"),
        crit("animation", "Animation, sensibilisation & communication", 2,
          ["animation", "ateliers", "sensibilisation", "communication interne", "formation"],
          "Comment animez-vous un atelier avec des équipes de production ?"),
        crit("legal", "Obligations légales & dialogue social", 2,
          ["cse", "dialogue social", "obligations", "conformite", "droit du travail", "duerp", "politique de prevention"],
          "Quelles obligations légales en matière de QVCT/RPS jugez-vous prioritaires ?"),
        critExp(2, 7, 3),
        critCulture(2)
      ]
    }
  ];

  root.CHIFFON_REF = { ENTREPRISE: ENTREPRISE, POSTES: POSTES };
  if (typeof module !== "undefined") module.exports = root.CHIFFON_REF;
})(typeof window !== "undefined" ? window : globalThis);
