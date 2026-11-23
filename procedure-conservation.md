# Procédure de conservation des CV : 1 an

Cette procédure accompagne l'outil de tri (option 1 : GitHub Pages, traitement dans le navigateur).
**Le dépôt GitHub contient uniquement le code. Les CV et le registre sont rangés dans l'espace de stockage RH de l'entreprise.**

## 1. Où ranger les CV

| Élément | Emplacement | Accès |
|---|---|---|
| Code de l'outil | Dépôt GitHub (privé conseillé) | Équipe RH + informatique |
| CV originaux | Espace de stockage RH : SharePoint/OneDrive, Google Drive ou serveur de fichiers, dans un dossier `Recrutement/Vivier` | Équipe RH uniquement |
| Registre du vivier (CSV) | Même dossier `Recrutement/` | Équipe RH uniquement |
| Journal de purge (CSV) | Même dossier `Recrutement/Journal` | Équipe RH + DPO / référent RGPD |

Bonnes pratiques :
- Nommez chaque CV avec sa référence (ex. `CAND-20261123-004.pdf`) et non avec le nom du candidat.
- Restreignez le dossier à l'équipe RH. N'utilisez pas de lien de partage public.
- **Si votre outil le permet, ajoutez une règle de suppression automatique comme filet de sécurité** :
  - *Microsoft 365* : étiquette de rétention « Supprimer 1 an après la dernière modification » sur la bibliothèque `Vivier` (centre de conformité Purview, sous réserve de votre licence) ;
  - *Google Workspace* : règle de conservation Google Vault (selon votre édition), à défaut la revue mensuelle ci-dessous.
  Le registre reste la référence, car le délai court à partir du **dernier contact** et non du dépôt.

## 2. Informer le candidat et recueillir son accord

À afficher sur le formulaire de candidature ou dans l'accusé de réception (à faire valider par votre DPO ou référent RGPD) :

> Les informations de votre candidature sont traitées par la société CHIFFON (service RH) pour gérer ce recrutement.
> Un outil d'aide au tri est utilisé pour faciliter la lecture des candidatures ; **toutes les décisions sont prises par un membre de l'équipe RH**.
> Les données sont réservées au service RH et aux managers concernés par le recrutement.
>
> ☐ J'accepte que ma candidature soit conservée **1 an à compter de notre dernier échange** afin de me proposer d'autres postes.
> Sans votre accord, elle sera supprimée à la fin de ce recrutement.
>
> Vous pouvez à tout moment accéder à vos données, les faire rectifier ou supprimer en écrivant à : [adresse RH dédiée].
> Vous pouvez également introduire une réclamation auprès de la CNIL.

Conservez la trace de l'accord (case cochée, e-mail de réponse) avec le CV.

## 3. Règles de conservation appliquées par l'outil

| Situation | Règle | Statut dans le registre |
|---|---|---|
| Accord pour le vivier | Conservation jusqu'au **dernier contact + 365 jours** | Actif |
| Moins de 30 jours avant l'échéance | Proposer au candidat de prolonger d'un an (nouvel accord) | Expire dans X j : relancer |
| Échéance dépassée | Supprimer le CV | EXPIRÉ : supprimer le CV |
| Pas d'accord | Supprimer à la clôture du recrutement | Sans consentement |
| Candidat embauché | Le dossier sort du vivier et rejoint le dossier du personnel | Sortir du vivier |
| Demande de suppression du candidat | Supprimer sans attendre et **répondre au candidat** | à traiter immédiatement |

Pour un candidat non retenu, la CNIL recommande une conservation de deux ans au maximum à compter du dernier contact, en l'en informant. La durée d'un an choisie par CHIFFON reste donc dans ce cadre.

## 4. Revue mensuelle (environ 15 min)

Le 1er de chaque mois, GitHub ouvre automatiquement un ticket « Revue du vivier CV » avec cette liste :

1. Ouvrir l'outil, écran **Vivier, 1 an**, puis importer le registre CSV.
2. Relancer les candidats en orange. S'ils renouvellent leur accord, cliquer « Prolonger 1 an ».
3. Pour chaque ligne rouge : supprimer le CV dans l'espace de stockage **et vider la corbeille**, puis cliquer « CV supprimé ».
4. Exporter le registre à jour et le journal de purge, puis les ranger dans `Recrutement/`.
5. Fermer le ticket.

Le journal de purge contient seulement la référence, la date et le motif. Il ne contient aucune donnée personnelle et prouve que la règle est appliquée.

## 5. Ce que contient (et ne contient pas) l'outil

- Les **grilles de postes** sont mémorisées dans le navigateur de l'utilisateur (aucune donnée personnelle).
- Les **CV** sont lus en mémoire et disparaissent à la fermeture de l'onglet. Ils ne sont envoyés à aucun serveur.
- Les **bibliothèques de lecture** PDF et Word ainsi que les **polices** sont incluses dans le dépôt (`vendor/`) : l'outil ne charge rien depuis un site tiers.

## 6. En cas d'erreur : un CV a été poussé sur GitHub

1. Le workflow « Garde-fou » échoue et signale le fichier.
2. Supprimer le fichier **et réécrire l'historique** (un simple `git rm` le laisse dans les anciens commits) :
   ```bash
   pip install git-filter-repo
   git filter-repo --invert-paths --path chemin/du/fichier.pdf
   git push --force --all
   ```
3. Si le dépôt est public ou a été cloné, considérer l'incident comme une **violation de données** : prévenir le DPO ou référent RGPD, qui évalue la notification à la CNIL (72 h).
4. Contacter le support GitHub pour purger les caches et les vues de pull request.
