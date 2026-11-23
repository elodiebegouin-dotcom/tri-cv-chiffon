# Conformité RGPD & AI Act : ce que l'outil fait, ce qu'il reste à faire

> Ce document est un guide pratique, pas un avis juridique. Faites-le valider par le DPO ou le conseil juridique de CHIFFON.

## Ce que l'outil fait déjà

| Exigence | Mise en œuvre dans l'outil |
|---|---|
| **Durée de conservation limitée** (la CNIL admet jusqu'à 2 ans après le dernier contact pour un candidat non retenu, s'il en est informé) | Expiration automatique à 365 jours par défaut, purge définitive, journal des suppressions |
| **Minimisation** | Seul le texte du CV est conservé ; mode anonyme ; CV anonymisé avant tout envoi à l'IA |
| **Sécurité / localisation** | Données stockées uniquement sur le poste du recruteur, jamais sur GitHub ; police et bibliothèques hébergées localement (aucun appel à des services tiers) |
| **Droit d'accès / portabilité** | Bouton « Exporter la fiche (.json) » |
| **Droit à l'effacement** | Bouton « Supprimer définitivement » |
| **Information des candidats** (art. 13) | Notice prête à copier dans Paramètres |
| **Pas de décision automatisée** (art. 22) | Aucun rejet automatique : l'outil classe et explique, le recruteur décide |
| **Non-discrimination** | L'âge, le genre, le nom, la photo, l'adresse, la situation familiale et le niveau ou l'ancienneté du diplôme n'entrent pas dans la note |

## AI Act (règlement européen sur l'IA)

Un système d'IA qui sert à filtrer ou évaluer des candidatures est classé **« à haut risque »** (annexe III). En tant qu'utilisateur (« déployeur »), CHIFFON doit notamment :

- assurer un **contrôle humain** effectif, ce que l'outil permet par construction ;
- **informer les candidats** qu'un outil d'aide à la décision est utilisé (c'est déjà dans la notice) ;
- **informer les représentants du personnel** (CSE) avant de déployer l'outil ;
- conserver des traces de fonctionnement : historique par candidat et journal des purges.

Le moteur intégré, à base de mots-clés et de règles transparentes, rend chaque note **explicable** : on voit exactement quels éléments du CV ont été retenus.

## Ce qu'il reste à faire côté CHIFFON

1. Ajouter le traitement « Recrutement » au **registre des traitements** de l'entreprise.
2. Insérer la **notice d'information** dans les annonces et dans l'accusé de réception des candidatures.
3. **Consulter le CSE** sur l'introduction de l'outil (art. L2312-38 du Code du travail).
4. Si l'IA est activée : vérifier les conditions du fournisseur (sous-traitant, transferts hors UE) et le mentionner dans le registre.
5. Protéger l'ordinateur du recruteur : session avec mot de passe et disque chiffré (FileVault sur Mac).
6. Ranger les sauvegardes exportées dans un espace protégé, **jamais sur GitHub**.
