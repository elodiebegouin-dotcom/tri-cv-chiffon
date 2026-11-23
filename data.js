/* =====================================================================
   Données de référence : grilles de postes CHIFFON + candidatures démo
   ---------------------------------------------------------------------
   Les grilles sont construites à partir de l'Annexe 1 (besoins RH non
   couverts par les 4 RRH déjà recrutés). Elles sont modifiables dans
   l'onglet « Poste & grille » de l'application.
   Les mots-clés peuvent être des racines (ex. « digitali » trouve
   « digitalisation », « digitaliser »). Accents et majuscules ignorés.
   ===================================================================== */

const SIGNAUX_DEFAUT = [
  { motif: "en externe|intervenir en externe",
    message: "Projet orienté vers le conseil externe : vérifier la motivation à rejoindre une entreprise (risque de fidélisation)." },
  { motif: "mouvant|changement permanent",
    message: "Recherche un environnement en changement permanent : vérifier l'adéquation avec un poste durable." },
  { motif: "directif",
    message: "Style de management directif : à confronter au projet de modernisation des pratiques managériales." },
  { motif: "premiere experience|jeune diplome|debutant|je debute",
    message: "Expérience limitée : vérifier la cohérence avec les compétences annoncées et prévoir l'accompagnement." },
  { motif: "en cours",
    message: "Diplôme ou formation en cours : vérifier l'échéance et la disponibilité." },
  { motif: "expatriation|mobilite internationale|fiscalite internationale",
    message: "Expertise orientée international : lien faible avec un modèle en circuit court local." },
  { motif: "vision theorique",
    message: "Approche présentée comme théorique : vérifier la capacité à opérer sur le terrain." }
];

const GRILLES_DEFAUT = [
  {
    id: "sirh",
    poste: "Responsable SIRH & digitalisation RH",
    contexte: "Paie et administration sur supports papier, navettes courrier : dématérialiser les processus RH de 450 salariés.",
    minExp: 5, poidsExp: 10,
    criteres: [
      { nom: "SIRH & outils numériques", poids: 30, indispensable: true,
        motsCles: ["sirh", "workday", "successfactors", "digitali", "demateriali", "automatisation", "logiciel", "sap", "adp", "talentsoft", "sage", "ats"] },
      { nom: "Gestion de projet", poids: 20, indispensable: false,
        motsCles: ["gestion de projet", "projet", "cahier des charges", "recette", "deploi", "pilotage"] },
      { nom: "Conduite du changement & formation des utilisateurs", poids: 20, indispensable: false,
        motsCles: ["accompagnement au changement", "formation des utilisateurs", "changement", "transformation", "former"] },
      { nom: "Paie & administration du personnel", poids: 15, indispensable: false,
        motsCles: ["paie", "dsn", "administration du personnel", "process rh", "processus rh", "conformite"] },
      { nom: "Posture attendue (analyse, rigueur, service)", poids: 15, indispensable: false,
        motsCles: ["analyse", "rigueur", "rigoureu", "autonomie", "sens du service", "vision globale", "force de proposition"] }
    ],
    signaux: SIGNAUX_DEFAUT
  },
  {
    id: "qvct",
    poste: "Chargé(e) QVCT & prévention",
    contexte: "Obligations QVCT méconnues et non respectées : diagnostic, prévention des RPS, plan d'actions.",
    minExp: 3, poidsExp: 10,
    criteres: [
      { nom: "QVCT & risques psychosociaux", poids: 35, indispensable: true,
        motsCles: ["qvct", "qualite de vie", "conditions de travail", "rps", "risques psychosociaux", "bien-etre", "prevention"] },
      { nom: "Diagnostic & écoute des équipes", poids: 20, indispensable: false,
        motsCles: ["enquete", "satisfaction", "evaluation", "diagnostic", "indicateur", "ecoute"] },
      { nom: "Mise en œuvre d'actions", poids: 20, indispensable: false,
        motsCles: ["atelier", "animation", "sensibilisation", "teletravail", "politique de prevention", "mise en place"] },
      { nom: "Médiation & gestion des conflits", poids: 15, indispensable: false,
        motsCles: ["mediation", "conflit", "gestion du stress", "resolution"] },
      { nom: "Engagement social & RSE", poids: 10, indispensable: false,
        motsCles: ["rse", "inclusion", "handicap", "egalite", "ethique"] }
    ],
    signaux: SIGNAUX_DEFAUT
  },
  {
    id: "relsoc",
    poste: "Responsable relations sociales",
    contexte: "450 salariés : CSE, négociations, conformité légale à structurer dans une entreprise souvent restructurée.",
    minExp: 5, poidsExp: 10,
    criteres: [
      { nom: "Dialogue social & instances (CSE, IRP)", poids: 35, indispensable: true,
        motsCles: ["dialogue social", "cse", "irp", "instances representatives", "partenaires sociaux", "relations sociales"] },
      { nom: "Négociation collective", poids: 20, indispensable: false,
        motsCles: ["negociation", "accords collectifs", "accord"] },
      { nom: "Droit du travail & conformité", poids: 25, indispensable: false,
        motsCles: ["droit du travail", "conformite", "legal", "juridique", "disciplinaire"] },
      { nom: "Gestion des conflits", poids: 10, indispensable: false,
        motsCles: ["conflit", "mediation", "gestion du stress", "resolution de problemes"] },
      { nom: "Confidentialité & posture", poids: 10, indispensable: false,
        motsCles: ["confidentialite", "ecoute", "diplomatie"] }
    ],
    signaux: SIGNAUX_DEFAUT
  },
  {
    id: "onboarding",
    poste: "Chargé(e) onboarding & accompagnement managérial",
    contexte: "Onboarding inexistant, entretiens sans cadre, pratiques managériales datées : structurer l'intégration et outiller les managers.",
    minExp: 3, poidsExp: 10,
    criteres: [
      { nom: "Onboarding & intégration", poids: 30, indispensable: true,
        motsCles: ["onboarding", "accueil", "integration", "nouveaux collaborateurs"] },
      { nom: "Accompagnement des managers", poids: 25, indispensable: false,
        motsCles: ["conseil aux managers", "managers", "accompagne", "business partner", "hrbp", "coaching"] },
      { nom: "Entretiens & gestion des talents", poids: 20, indispensable: false,
        motsCles: ["entretiens annuels", "entretien", "performance", "gestion des talents", "competences"] },
      { nom: "Conduite du changement", poids: 15, indispensable: false,
        motsCles: ["accompagnement au changement", "changement", "transformation", "organisation du travail"] },
      { nom: "Polyvalence RH", poids: 10, indispensable: false,
        motsCles: ["recrutement", "formation", "relations sociales", "generaliste", "transverse"] }
    ],
    signaux: SIGNAUX_DEFAUT
  },
  {
    id: "inclusion",
    poste: "Chargé(e) diversité, inclusion & RSE",
    contexte: "Concept éthique à vocation sociale (fabrication française, tissus recyclés) : traduire ces valeurs dans la politique RH.",
    minExp: 2, poidsExp: 10,
    criteres: [
      { nom: "Diversité & inclusion", poids: 35, indispensable: true,
        motsCles: ["diversite", "inclusion", "handicap", "egalite des chances", "parite", "egalite"] },
      { nom: "RSE & indicateurs", poids: 25, indispensable: false,
        motsCles: ["rse", "qse", "indicateur", "charte", "developpement durable", "ethique"] },
      { nom: "Sensibilisation & communication", poids: 20, indispensable: false,
        motsCles: ["sensibilisation", "communication interne", "formation", "animation"] },
      { nom: "Partenariats & ancrage local", poids: 10, indispensable: false,
        motsCles: ["partenariat", "associati", "local", "insertion"] },
      { nom: "Posture (proactivité, relationnel)", poids: 10, indispensable: false,
        motsCles: ["proactivite", "relationnel", "force de proposition", "ecoute"] }
    ],
    signaux: SIGNAUX_DEFAUT
  }
];

/* Candidatures de démonstration : texte de l'Annexe 2 (profils fictifs). */
const CANDIDATURES_DEMO = [
  ["C01 – Chargé(e) de recrutement junior", `Chargé(e) de Recrutement – Junior
Titulaire d'un master en psychologie du travail depuis 2 ans, je débute ma carrière dans le recrutement avec une première expérience (18 mois) en sourcing et entretiens téléphoniques au sein d'une agence d'intérim. Je suis motivé(e) à développer mes compétences dans le recrutement de profils techniques.
Compétences clés : Sourcing (LinkedIn, CVthèques) ; Préqualification téléphonique ; Organisation des entretiens ; Reporting recrutement ; Bonne communication.
Aisance relationnelle, trilingue anglais et espagnol.`],
  ["C02 – Gestionnaire de paie confirmé(e)", `Gestionnaire de Paie – Confirmé(e)
Professionnel(le) de la paie avec plus de 5 ans d'expérience dans des environnements multi-conventions. Maîtrise du logiciel SAGE et bonne connaissance du droit du travail.
Bachelor paie et social obtenu en 2021.
Compétences clés : Élaboration des bulletins de paie ; Déclarations sociales (DSN) ; Suivi des absences et congés ; Gestion des charges sociales ; Veille réglementaire.
Rigoureux-se, sens du service client, expertise avancée. Intéressé-e par le domaine du recrutement des équipes.`],
  ["C03 – Responsable RH PME", `Responsable Ressources Humaines – PME
RRH généraliste avec 10 ans d'expérience, j'accompagne les dirigeants de PME dans tous les volets RH : recrutement, formation, relations sociales, gestion des talents.
Master en management des Ressources Humaines en cours.
Compétences clés : Conseil aux managers ; Recrutement & onboarding ; Gestion de la formation ; Dialogue social / CSE ; Administration du personnel.
Capacité à se former avec agilité, adaptable et force de proposition. Leadership, curiosité.`],
  ["C04 – Assistant(e) RH débutant(e)", `Assistant(e) RH – Débutant(e)
Jeune diplômé(e) en licence RH Bachelor obtenu en juin 2025, je cherche à intégrer une équipe pour apprendre les bases de l'administration du personnel, du recrutement et de la paie.
Compétences clés : Classement / archivage ; Préparation des dossiers du personnel ; Accueil des nouveaux collaborateurs ; Soutien aux campagnes de recrutement ; Suivi des absences.
Motivé-e et volonté d'évolution professionnelle à court terme sur un poste de chargé-e RH.`],
  ["C05 – Consultant(e) RH en cabinet", `Consultant(e) RH en cabinet
Consultant(e) RH depuis 3 ans, j'interviens en cabinet pour accompagner des clients dans leur stratégie RH : audits sociaux, plans de formation, recrutement.
Compétences clés : Conseil RH ; Conduite d'entretien ; Élaboration de fiches de poste ; Reporting RH ; Connaissance du secteur TPE/PME.
Après 2 années en entreprise, volonté d'intervenir en externe sur les sujets RH des organisations. Besoin d'un environnement mouvant et évolutif pour déployer ses compétences. Le changement permanent est source de motivation et de performance.`],
  ["C06 – Responsable formation senior", `Responsable Formation – Senior
Plus de 12 ans d'expérience dans la gestion et la stratégie de formation. Spécialiste du CPF, plan de développement des compétences et relations avec les OPCO.
Bachelor généraliste obtenu en 2011. Formations légales et veille sur la formation et la GEPP / annuelles en interne. Experte en programme de formation et ingénierie pédagogique.
Compétences clés : Ingénierie de formation ; Montage de dossiers de financement ; Pilotage de budget ; Animation de formations internes ; Évaluation des actions de formation.
Passionné-e et spécialiste de la formation. Forte expertise et connaissances du sujet s'appuyant sur des années d'expérience professionnelle.`],
  ["C07 – Chargé(e) de missions RH polyvalent(e)", `Chargé(e) de Missions RH – Polyvalent(e)
RH généraliste avec 4 ans d'expérience, j'interviens sur des missions transverses : paie, recrutement, relations sociales, formation. Capacité à m'adapter à différents environnements.
Licence en droit du travail obtenue en 2019.
Compétences clés : Suivi administratif ; Gestion des IRP ; Campagnes de recrutement ; Déploiement des entretiens annuels ; Logiciels : ADP, TalentSoft.
Esprit d'équipe, force de proposition et disponibilité. Aime le challenge et les nouveaux apprentissages.`],
  ["C08 – Talent Acquisition Specialist Tech", `Talent Acquisition Specialist – Tech
Spécialiste du recrutement IT avec une forte culture digitale. Je développe des stratégies de sourcing innovantes pour recruter des profils pénuriques.
Titulaire d'un doctorat en innovation RH (en cours d'obtention).
Compétences clés : Chasse sur LinkedIn / GitHub ; Marque employeur ; Conduite d'entretiens techniques ; ATS : SmartRecruiters, Lever ; Reporting KPI.
À la recherche d'une première expérience. Propose une vision théorique et se projette dans un environnement en transformation.`],
  ["C09 – Responsable relations sociales", `Responsable Relations Sociales
Expert(e) des relations sociales depuis 8 ans, je pilote les négociations avec les partenaires sociaux, gère les instances représentatives et veille à la conformité légale.
Licence en droit du travail obtenue en 2011.
Compétences clés : Dialogue social ; Préparation et animation des CSE ; Négociation d'accords collectifs ; Droit du travail ; Gestion de conflits.
Sens de la confidentialité / Gestion du stress / Résolution de problèmes.`],
  ["C10 – Chargé(e) de mobilité internationale", `Chargé(e) de Mobilité Internationale
Spécialisé(e) en mobilité internationale, je gère les expatriations, détachements et aspects juridiques liés aux déplacements internationaux.
Titulaire d'une licence en langues étrangères anglais italien allemand depuis 2001. 8 ans d'accompagnement à la mobilité au sein de grand groupe international.
Compétences clés : Gestion des visas et permis de travail ; Fiscalité internationale ; Gestion des packages d'expatriation ; Relations avec les prestataires ; Conformité légale.
Participation à la mise en œuvre de la stratégie de recrutements à l'international.`],
  ["C11 – Chargé(e) diversité & inclusion", `Chargé(e) Diversité & Inclusion
Passionné(e) par les enjeux d'inclusion, j'ai mis en place plusieurs politiques RSE favorisant l'égalité des chances, la parité et l'intégration des personnes en situation de handicap.
Titulaire d'un bachelor responsable QSE depuis juin 2025.
Compétences clés : Élaboration de chartes diversité ; Suivi des indicateurs RSE ; Sensibilisation / formation ; Partenariats associatifs ; Communication interne.
Aisance relationnelle, proactivité, mise en avant des sujets de diversité pour une priorisation au sein de l'entreprise.`],
  ["C12 – Responsable administration du personnel", `Responsable Administration du Personnel
Manager d'équipe paie & administration RH avec 8 ans d'expérience. Je supervise la conformité des processus RH de l'entrée à la sortie du salarié.
Formation gestion de la paie en 1998.
Compétences clés : Supervision des contrats / avenants ; Audits internes RH ; Management d'équipe ; Processus disciplinaire ; Logiciels : SAP HR, ADP.
Capacité à prendre le leadership pour diriger et faire grandir les équipes. Management directif par objectifs ayant fait ses preuves.`],
  ["C13 – HR Business Partner groupe international", `HR Business Partner – Groupe international
HRBP bilingue (FR/EN) avec 6 ans d'expérience dans un groupe industriel international. J'accompagne les managers sur la stratégie RH locale et globale.
Titulaire d'un RNCP 7 RRH depuis 2015.
Compétences clés : Gestion de projets RH ; Accompagnement au changement ; Suivi des performances ; Organisation du travail ; Communication RH.
Sens de l'adaptation, capacité à s'adapter à la dimension multiculturelle, à la recherche d'un prochain défi professionnel.`],
  ["C14 – Responsable SIRH", `Responsable SIRH
Expert(e) SIRH depuis 10 ans, j'ai conduit la digitalisation complète du processus RH dans une entreprise de 1000 collaborateurs. Maîtrise de l'intégration d'outils comme Workday et SuccessFactors.
BTS informatique obtenu en 1998 / master RH en 2013.
Compétences clés : Gestion de projets SIRH ; Cahiers des charges & recette ; Formation des utilisateurs ; Automatisation des process RH ; Veille technologique.
Vision globale, sens de l'analyse et du service, rigueur et autonomie.`],
  ["C15 – Chargé(e) de QVCT", `Chargé(e) de QVCT
Professionnel(le) RH avec une spécialisation en QVCT. Mise en place d'actions concrètes pour améliorer le bien-être des salariés et réduire les risques psychosociaux.
DU qualité de vie et conditions de travail 2019 / Certification en gestion émotionnelle 2023.
Compétences clés : Enquêtes de satisfaction ; Animation d'ateliers bien-être ; Mise en place de télétravail ; Évaluation des RPS ; Politique de prévention.
Écoute, disponibilité, résolution de conflits, pratique de la médiation.`]
];
