# Option B : version partagée (plusieurs recruteurs)

L'outil livré fonctionne en **option A** : chaque recruteur garde ses CV dans son propre navigateur. Si les 4 RRH doivent voir **les mêmes candidatures**, il faut une base de données commune. La solution recommandée est **Supabase** :

- offre gratuite suffisante pour un service RH ;
- serveurs en **Europe** (choisissez la région Frankfurt ou Paris à la création) ;
- connexion par e-mail réservée à l'équipe RH ;
- **suppression automatique côté serveur** chaque nuit, même si personne n'ouvre l'outil.

## Ce qui est déjà prêt

- `schema.sql` : tables, sécurité (seuls les e-mails de l'équipe RH ont accès) et tâche de purge quotidienne des CV de plus d'un an.

## Étapes

1. Créez un compte sur **supabase.com**, puis un projet en **région Europe**.
2. Dans **SQL Editor**, collez le contenu de `schema.sql` et cliquez sur **Run**.
3. Ajoutez les e-mails de l'équipe RH (ligne `insert into public.equipe_rh…`).
4. Dans **Authentication → Providers**, activez **Email** (lien magique).
5. Il reste à brancher l'interface sur Supabase : il faut remplacer `assets/js/stockage.js` par une version qui lit et écrit dans Supabase, et ajouter un écran de connexion. Le reste de l'outil ne change pas, car tout le stockage passe par ce seul fichier.

## Avec l'IA en mode partagé

La clé d'API ne doit jamais être visible dans le navigateur. Elle se place alors dans une **Edge Function** Supabase, qui appelle l'IA côté serveur.
