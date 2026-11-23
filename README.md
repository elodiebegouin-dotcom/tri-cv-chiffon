# CHIFFON · Outil de tri de CV

Outil web d'aide au tri de candidatures pour l'équipe RH de CHIFFON. Il permet de :

- **importer des CV** (PDF, Word, texte collé, ou un document regroupant plusieurs candidatures) ;
- **noter chaque CV** sur des critères pondérés propres à chaque poste, avec la justification de chaque note ;
- **repérer les incohérences** : diplôme « en cours », dates qui ne collent pas, profil « expert » cherchant une première expérience, souhait d'exercer en externe… ;
- **comparer les candidats** critère par critère, dans un tableau de chaleur ;
- **générer une grille d'entretien structurée**, à noter de 1 à 4 et imprimable en PDF ;
- **respecter le RGPD** : suppression automatique au bout d'un an, mode anonyme, export et suppression à la demande, notice d'information prête à l'emploi.

Trois postes sont préconfigurés d'après l'organigramme cible (Annexe 1), et entièrement modifiables :

| Poste | Rattachement | Pourquoi |
|---|---|---|
| Chargé(e) SIRH & digitalisation RH | RRH 1 – Administration & paie | L'administration et la paie fonctionnent encore sur papier |
| Chargé(e) de recrutement & intégration | RRH 3 – Recrutement | Recrutement sans grille, onboarding inexistant |
| Chargé(e) QVCT & accompagnement managérial | RRH 2 – Généraliste | QVCT méconnue, pratiques managériales datées |

---

## 1. Décompresser le dossier sur Mac

1. Ouvrez le **Finder**, puis le dossier **Téléchargements**.
2. **Double-cliquez** sur `tri-cv-chiffon.zip`. macOS crée automatiquement à côté un dossier `tri-cv-chiffon`.
3. C'est tout : vous n'avez aucun logiciel à installer.

> Variante avec le Terminal : `cd ~/Downloads && unzip tri-cv-chiffon.zip`

**Pour essayer tout de suite, sans GitHub :** ouvrez le dossier `tri-cv-chiffon` et faites glisser `index.html` sur **Google Chrome**. *(Safari peut bloquer le stockage pour un fichier ouvert en local ; une fois l'outil en ligne sur GitHub, tous les navigateurs fonctionnent.)*

## 2. Mettre l'outil en ligne sur GitHub (environ 10 minutes)

1. Créez un compte gratuit sur **github.com**, si ce n'est pas déjà fait.
2. Cliquez sur **+** (en haut à droite), puis sur **New repository**.
   - Nom : `tri-cv-chiffon`.
   - Visibilité : **Public** (obligatoire pour GitHub Pages gratuit). Ce n'est pas un problème : **le dépôt ne contient que le code, jamais de CV.**
   - Cliquez sur **Create repository**.
3. Sur la page du dépôt, cliquez sur **uploading an existing file**.
4. Dans le Finder, ouvrez le dossier `tri-cv-chiffon`, faites **Cmd + A** pour tout sélectionner (pas le dossier lui-même, son **contenu**), puis glissez le tout dans la page GitHub.
   - Pour voir le fichier caché `.nojekyll` : faites **Cmd + Maj + .** dans le Finder. S'il manque, ce n'est pas bloquant.
5. Cliquez sur **Commit changes**.
6. Allez dans **Settings**, puis **Pages**. Sous **Branch**, choisissez **main** et **/(root)**, puis cliquez sur **Save**.
7. Après 1 à 2 minutes, votre outil est en ligne à l'adresse :
   `https://VOTRE-NOM-GITHUB.github.io/tri-cv-chiffon/`

Ajoutez cette adresse à vos favoris. Pour mettre à jour l'outil plus tard, il suffit de déposer à nouveau les fichiers modifiés (étape 3).

> Option pratique : l'application gratuite **GitHub Desktop** (desktop.github.com) permet de synchroniser le dossier sans passer par le navigateur.

## 3. Utilisation au quotidien

1. **Tableau de bord**, puis **Importer des CV**. Glissez vos fichiers. Si un document contient plusieurs CV (comme l'Annexe 2), cochez « plusieurs candidatures ».
2. **Classement** : choisissez un poste pour voir qui couvre quels critères.
3. Cliquez sur un candidat pour ouvrir sa fiche :
   - **Analyse** : son score pour chaque poste, la justification de chaque note et les points de vigilance ;
   - **Grille d'entretien** : les questions à poser, à noter de 1 à 4, puis à imprimer ;
   - **Suivi & RGPD** : son statut, vos notes, et les boutons pour prolonger, exporter ou supprimer sa fiche.
4. **Postes & critères** : modifiez les poids et les mots-clés. Les scores se recalculent aussitôt.
5. **Mode anonyme** (en haut à droite) : masque le nom, les coordonnées, les liens et l'âge pour une première lecture sans biais.

Pour découvrir l'outil, cliquez sur **« Charger les 15 candidatures de l'Annexe 2 »**.

## 4. Où sont stockés les CV ? Comment sont-ils supprimés après 1 an ?

- Les CV sont stockés **dans le navigateur de l'ordinateur qui les a importés** (technologie IndexedDB). Ils **ne sont jamais envoyés sur GitHub**.
- Chaque CV a une **date d'expiration**, fixée à la date d'import + 365 jours (modifiable dans Paramètres : 6 mois, 1 an ou 2 ans maximum).
- À chaque ouverture de l'outil, et toutes les 6 heures s'il reste ouvert, les CV expirés sont **supprimés définitivement**. Un journal de ces suppressions est tenu.
- Une prolongation n'est possible qu'avec **l'accord écrit du candidat** (bouton dans la fiche).
- **Sauvegarde :** Paramètres → « Exporter une sauvegarde ». Rangez ce fichier dans un dossier protégé, **jamais sur GitHub**. À la restauration, les CV déjà expirés ne sont pas réimportés.

⚠️ Vider l'historique ou les données de navigation du navigateur efface aussi les CV. Pensez à exporter une sauvegarde régulièrement.

**Vous travaillez à plusieurs recruteurs ?** Passez à l'option partagée (base Supabase hébergée en Europe, avec suppression automatique côté serveur) : voir `supabase/LISEZ-MOI.md`.

## 5. Analyse par IA (optionnelle)

Sans configuration, l'outil fonctionne avec son moteur de notation intégré : il est gratuit, ne passe par aucun serveur et ses notes sont explicables.

Pour une analyse plus fine (compréhension du contexte, synthèse, questions sur mesure) :

1. Créez une clé d'API sur **console.anthropic.com** (service payant à l'usage, quelques centimes par CV).
2. Collez-la dans **Paramètres → Analyse approfondie par IA**.
3. Dans la fiche d'un candidat, cliquez sur **Lancer l'analyse IA**.

Le CV est **anonymisé avant l'envoi**. La clé reste dans votre navigateur : ne la mettez **jamais** dans un fichier publié sur GitHub.

## 6. Contenu du dossier

```
index.html                 page de l'application
assets/css/style.css       charte graphique CHIFFON
assets/js/referentiel.js   postes, critères, contexte CHIFFON (valeurs par défaut)
assets/js/moteur.js        notation, détection d'incohérences, grille d'entretien
assets/js/stockage.js      stockage local + suppression automatique
assets/js/ia.js            analyse IA optionnelle
assets/js/app.js           interface
assets/js/exemple-annexe2.js  les 15 candidatures d'exemple
assets/vendor/             lecture des PDF et Word (pdf.js, mammoth)
assets/fonts/              police Poppins (hébergée localement, sans Google Fonts)
docs/RGPD.md               conformité RGPD & AI Act
supabase/                  option B : version partagée multi-utilisateurs
```
