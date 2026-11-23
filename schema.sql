-- =====================================================================
-- OPTION B · Base partagée Supabase (région Europe) pour CHIFFON Tri de CV
-- À exécuter dans Supabase → SQL Editor. Voir supabase/LISEZ-MOI.md
-- =====================================================================

-- Candidatures
create table if not exists public.candidats (
  id              text primary key,
  ref             text not null,
  nom             text default '',
  titre           text default '',
  texte           text not null,
  source          text default '',
  statut          text not null default 'nouveau',
  notes           text default '',
  poste_vise      text default '',
  informe         boolean default false,
  entretiens      jsonb default '{}'::jsonb,
  ia              jsonb default '{}'::jsonb,
  journal         jsonb default '[]'::jsonb,
  date_ajout      timestamptz not null default now(),
  date_expiration timestamptz not null default (now() + interval '365 days'),
  cree_par        uuid default auth.uid()
);

-- Postes & critères
create table if not exists public.postes (
  id      text primary key,
  ordre   int default 0,
  donnees jsonb not null
);

-- Journal des purges RGPD
create table if not exists public.journal_purges (
  id      bigserial primary key,
  date    timestamptz default now(),
  nombre  int not null
);

-- Sécurité : seuls les membres de l'équipe RH connectés ont accès
alter table public.candidats      enable row level security;
alter table public.postes         enable row level security;
alter table public.journal_purges enable row level security;

create table if not exists public.equipe_rh (email text primary key);
-- insert into public.equipe_rh(email) values ('rrh1@chiffon.fr'), ('rrh2@chiffon.fr');

create or replace function public.est_rh() returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.equipe_rh where email = auth.jwt() ->> 'email');
$$;

create policy "rh_candidats" on public.candidats      for all using (public.est_rh()) with check (public.est_rh());
create policy "rh_postes"    on public.postes         for all using (public.est_rh()) with check (public.est_rh());
create policy "rh_journal"   on public.journal_purges for select using (public.est_rh());

-- Suppression automatique à échéance : tous les jours à 3 h
create extension if not exists pg_cron;

create or replace function public.purger_cv_expires() returns void
language plpgsql security definer as $$
declare n int;
begin
  delete from public.candidats where date_expiration <= now();
  get diagnostics n = row_count;
  if n > 0 then insert into public.journal_purges(nombre) values (n); end if;
end $$;

select cron.schedule('purge-cv-rgpd', '0 3 * * *', $$select public.purger_cv_expires();$$);
