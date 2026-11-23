# Tri CV – CHIFFON

Outil d'aide à la présélection de CV, conçu pour les besoins RH de la société CHIFFON.
Il classe les candidatures selon une **grille pondérée propre à chaque poste**, **explique chaque score**,
signale les points à vérifier et propose des **questions d'entretien structurées**. C'est toujours le recruteur qui décide.

- **100 % navigateur** : aucun serveur, aucune clé d'API, **aucun CV envoyé sur Internet**.
- **Hébergement gratuit** sur GitHub Pages.
- **Conservation d'un an** pilotée par un registre (dernier contact + 365 j) et un rappel mensuel automatique.

## Ce que fait l'outil

| Écran | Rôle |
|---|---|
| Poste et grille | Choisir ou créer un poste. Régler les poids avec des curseurs, ajouter ou retirer des mots-clés, marquer un critère comme indispensable. Une barre colorée montre la part de chaque critère dans le score. 5 grilles prêtes à l'emploi, tirées de l'Annexe 1 : SIRH & digitalisation, QVCT, relations sociales, onboarding & management, diversité & RSE. |
| Candidatures | Glisser-déposer des CV PDF, Word ou texte, ou coller leur texte. Bouton de démo : les 15 candidatures de l'Annexe 2. |
| Classement | Indicateurs clés, graphique par niveau d'adéquation (cliquable pour filtrer), répartition des décisions, recherche et tri. Chaque candidat a un anneau de score et une barre par critère. Un clic ouvre sa fiche : radar des critères, mots trouvés, points d'attention, questions d'entretien, décision. Les flèches du clavier passent d'un candidat à l'autre. Jusqu'à 3 candidats peuvent être comparés côte à côte. |
| Vivier, 1 an | Registre des CV conservés, avec une barre de temps restant par candidat : alerte à 30 jours, CV expirés à supprimer, prolongation après nouvel accord, journal de suppression. |

**Réduction des biais** : avant la notation, l'outil masque les années (qui révèlent l'âge), les dates, l'âge, la situation familiale,
la nationalité, la civilité, les coordonnées et l'adresse.

## Mise en ligne sur GitHub (10 minutes)

1. Créer un compte sur <https://github.com> (ou utiliser celui de l'entreprise).
2. **New repository** → nom `tri-cv-chiffon`.
   - Avec un compte gratuit, GitHub Pages exige un dépôt **public**. C'est acceptable ici, car le dépôt ne contient que du code et aucune donnée.
   - Avec un forfait payant (Pro, Team ou Enterprise), choisissez **Private**.
3. Envoyer les fichiers :
   - *Sans ligne de commande* : **Add file → Upload files**, glisser tout le contenu du dossier (y compris `.github` et `.gitignore`), puis **Commit changes**.
   - *Avec Git* :
     ```bash
     cd tri-cv-chiffon
     git init && git add . && git commit -m "Outil de tri CV CHIFFON"
     git branch -M main
     git remote add origin https://github.com/<compte>/tri-cv-chiffon.git
     git push -u origin main
     ```
4. **Settings → Pages** → *Source : Deploy from a branch* → branche `main`, dossier `/ (root)` → **Save**.
5. Après une à deux minutes, l'outil est disponible à `https://<compte>.github.io/tri-cv-chiffon/`.
6. **Actions** : vérifier que les workflows sont activés. Lancer une fois « Rappel mensuel – revue du vivier CV » avec **Run workflow** pour tester.

> L'adresse GitHub Pages est publique, mais la page ne contient aucune donnée : chaque utilisateur charge ses CV localement, dans son propre navigateur.
> Pour l'utiliser hors ligne, ouvrez simplement `index.html` sur un poste de travail.

## Conservation des CV : 1 an

Les CV **ne vont jamais dans le dépôt GitHub**, car l'historique Git rend une suppression définitive très difficile.
Ils sont rangés dans l'espace de stockage RH (SharePoint, Drive…). L'outil gère le registre qui dit quoi supprimer et quand.
Deux garde-fous sont prévus :

- `.gitignore` empêche d'ajouter par erreur des PDF, des fichiers Word ou des CSV ;
- le workflow **Garde-fou** fait échouer tout push contenant ce type de fichier.

Procédure complète, mention d'information du candidat et conduite à tenir en cas d'erreur : [`docs/procedure-conservation.md`](docs/procedure-conservation.md).
Modèle de registre : [`docs/registre-modele.csv`](docs/registre-modele.csv).

## Structure

```
index.html                       Application (page unique)
assets/app.js                    Logique : lecture, masquage, notation, registre
assets/data.js                   Grilles de postes CHIFFON + 15 candidatures de démo
assets/style.css                 Mise en forme (couleurs, mise en page, écrans mobiles)
vendor/                          Lecteurs PDF et Word, polices Bricolage Grotesque et Figtree (inclus localement)
docs/procedure-conservation.md   Procédure RGPD de conservation sur 1 an
docs/registre-modele.csv         Modèle de registre du vivier
.github/workflows/               Rappel mensuel + garde-fou anti-CV
```

## Personnaliser

- **Depuis l'interface** (onglet 1) : les réglages sont mémorisés dans le navigateur. « Exporter les grilles » permet de les partager entre recruteurs.
- **Pour tout le monde** : modifier `assets/data.js` (tableau `GRILLES_DEFAUT`) puis pousser sur GitHub.
- Durée de conservation et délai d'alerte : constantes `CONSERVATION_JOURS` et `ALERTE_JOURS` en tête de `assets/app.js`.

## Limites

- La notation repose sur des **mots-clés** : elle ne comprend pas le sens d'un texte. Relisez toujours les CV du milieu de classement.
- Les PDF scannés (images) ne sont pas lisibles : demandez une version texte ou collez le contenu.
- L'outil est une **aide à la décision**. Aucune candidature n'est écartée automatiquement (article 22 du RGPD).
- Les systèmes d'IA utilisés pour le recrutement sont classés « à haut risque » par le règlement européen sur l'IA, avec des obligations attendues à partir de décembre 2027.
  Ce prototype à règles transparentes est un bon point de départ. Si vous passez à un vrai modèle d'IA, prévoyez documentation, tests de biais et supervision humaine.

## Licences

Code de l'outil : à définir par CHIFFON. Bibliothèques incluses : pdf.js (Apache 2.0), mammoth.js (BSD 2-Clause), polices Bricolage Grotesque et Figtree (SIL Open Font License). Leurs licences se trouvent dans `vendor/`.
