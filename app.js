/* =====================================================================
   CHIFFON · Tri de CV — interface
   ===================================================================== */
(function () {
  "use strict";
  var REF = window.CHIFFON_REF, M = window.CHIFFON_MOTEUR, S = window.CHIFFON_STOCKAGE, IA = window.CHIFFON_IA;
  var JOUR = S.JOUR;

  var STATUTS = [
    { id: "nouveau", label: "Nouveau" },
    { id: "contacter", label: "À contacter" },
    { id: "entretien", label: "Entretien" },
    { id: "retenu", label: "Retenu" },
    { id: "vivier", label: "Vivier" },
    { id: "refuse", label: "Non retenu" }
  ];

  var etat = {
    vue: "tableau", candidats: [], postes: [], reglages: S.reglages(),
    filtres: { q: "", statut: "", poste: "" }, classementPoste: null, masquerRefus: true,
    detail: null, cache: {}
  };

  /* ---------------- Utilitaires ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function dateFr(iso) { return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"; }
  function joursRestants(c) { return Math.ceil((new Date(c.dateExpiration).getTime() - Date.now()) / JOUR); }
  function classeScore(s) { return s >= 60 ? "s-haut" : s >= 40 ? "s-moyen" : "s-bas"; }
  function statutLabel(id) { var s = STATUTS.filter(function (x) { return x.id === id; })[0]; return s ? s.label : id; }
  function pastilleStatut(id) { return '<span class="pastille p-' + esc(id) + '">' + esc(statutLabel(id)) + "</span>"; }
  function entreprise() { return etat.reglages.entreprise || REF.ENTREPRISE; }
  function posteParId(id) { return etat.postes.filter(function (p) { return p.id === id; })[0]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 3200);
  }

  function libelle(c) {
    if (etat.reglages.anonyme) return c.ref + (c.titre ? " · " + c.titre : "");
    return c.nom || c.titre || c.ref;
  }
  function texteAffiche(c) {
    if (!etat.reglages.anonyme) return c.texte;
    var t = M.anonymiser(c.texte);
    if (c.nom) t = t.split(c.nom).join("[nom masqué]");
    return t;
  }

  /* ---------------- Analyses (mémoïsées) ---------------- */
  function analyse(c, p) {
    var k = c.id + "|" + p.id;
    if (!etat.cache[k]) etat.cache[k] = M.analyser(c, p, entreprise());
    return etat.cache[k];
  }
  function viderCache() { etat.cache = {}; }
  function meilleurPoste(c) {
    var best = null;
    etat.postes.forEach(function (p) { var a = analyse(c, p); if (!best || a.score > best.a.score) best = { p: p, a: a }; });
    return best;
  }

  /* ---------------- Chargement ---------------- */
  function demarrer() {
    $("#anonyme").checked = !!etat.reglages.anonyme;
    $("#anonyme").addEventListener("change", function (e) {
      etat.reglages.anonyme = e.target.checked; S.sauverReglages(etat.reglages); rendre(); if (etat.detail) rendreDetail();
    });
    $$(".onglets button").forEach(function (b) { b.addEventListener("click", function () { allerA(b.dataset.vue); }); });
    document.addEventListener("click", function (e) {
      if (e.target.matches("[data-fermer]")) { fermerTiroir(); fermerModale(); }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (!$("#modale").hidden) fermerModale(); else fermerTiroir(); } });

    S.purger().then(function (purges) {
      if (purges.length) {
        etat.reglages.journalPurges = (etat.reglages.journalPurges || []).concat([{ date: new Date().toISOString(), nombre: purges.length }]).slice(-50);
        S.sauverReglages(etat.reglages);
        toast(purges.length + " CV arrivé(s) à échéance ont été supprimés définitivement (RGPD).");
      }
      return Promise.all([S.tous("candidats"), S.tous("postes")]);
    }).then(function (r) {
      etat.candidats = r[0] || [];
      etat.postes = (r[1] && r[1].length) ? r[1].sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0); }) : clone(REF.POSTES);
      if (!(r[1] && r[1].length)) S.enregistrerPlusieurs("postes", etat.postes.map(function (p, i) { p.ordre = i; return p; }));
      etat.classementPoste = etat.postes[0] && etat.postes[0].id;
      rendre();
    }).catch(function (err) {
      $("#vue").innerHTML = '<div class="carte"><h2>Stockage indisponible</h2><p>Ce navigateur bloque le stockage local (navigation privée ?). Ouvrez l\'outil dans une fenêtre normale de Chrome, Edge, Firefox ou Safari.</p><p class="muted petit">' + esc(err && err.message) + "</p></div>";
    });
    // purge aussi si l'onglet reste ouvert plusieurs jours
    setInterval(function () { S.purger().then(function (p) { if (p.length) recharger(); }); }, 6 * 3600 * 1000);
  }

  function recharger() {
    return S.tous("candidats").then(function (l) { etat.candidats = l; viderCache(); rendre(); if (etat.detail) rendreDetail(); });
  }

  function allerA(vue) {
    etat.vue = vue;
    $$(".onglets button").forEach(function (b) { b.classList.toggle("actif", b.dataset.vue === vue); });
    rendre(); window.scrollTo(0, 0);
  }

  function rendre() {
    var v = { tableau: vueTableau, candidats: vueCandidats, classement: vueClassement, postes: vuePostes, reglages: vueReglages }[etat.vue];
    $("#vue").innerHTML = v();
    lier();
  }

  /* ================= VUE : TABLEAU DE BORD ================= */
  function vueTableau() {
    var cs = etat.candidats;
    var actifs = cs.filter(function (c) { return c.statut !== "refuse"; });
    var bientot = cs.filter(function (c) { return joursRestants(c) <= 30; });
    var nb = function (s) { return cs.filter(function (c) { return c.statut === s; }).length; };
    var h = '<section class="bandeau"><div><h1>Trier mieux, recruter juste.</h1>' +
      "<p>" + cs.length + " candidature(s) · " + etat.postes.length + " poste(s) ouverts dans l'équipe RH CHIFFON</p></div>" +
      '<div class="actions"><button class="btn btn-jaune" data-action="importer">+ Importer des CV</button>' +
      (cs.length ? "" : '<button class="btn" data-action="exemple">Charger les 15 candidatures de l\'Annexe 2</button>') + "</div></section>";

    if (!cs.length) {
      return h + '<div class="carte vide"><img src="assets/img/logo.svg" alt="" style="background:var(--violet-nuit);border-radius:50%;padding:10px">' +
        "<h2>Aucune candidature pour l'instant</h2><p class=\"muted\">Importez des CV (PDF, Word, texte) ou chargez le jeu d'exemple pour découvrir l'outil.</p>" +
        '<div class="actions" style="justify-content:center"><button class="btn btn-principal" data-action="importer">Importer des CV</button>' +
        '<button class="btn" data-action="exemple">Charger l\'exemple (Annexe 2)</button></div></div>' + blocMethode();
    }

    h += '<div class="grille g4" style="margin-bottom:20px">' +
      kpi(actifs.length, "Candidatures actives", true) + kpi(nb("nouveau"), "Nouvelles à traiter") +
      kpi(nb("entretien"), "En entretien") + kpi(nb("retenu"), "Retenues") +
      kpi(bientot.length, "Suppression sous 30 jours") + "</div>";

    h += '<div class="grille g3">';
    etat.postes.forEach(function (p) {
      var top = actifs.map(function (c) { return { c: c, a: analyse(c, p) }; })
        .sort(function (x, y) { return y.a.score - x.a.score; }).slice(0, 5);
      h += '<div class="carte"><div class="carte-titre"><div><h3 style="margin:0">' + esc(p.titre) + '</h3><div class="muted petit">' + esc(p.rattachement) + "</div></div></div>" +
        '<ul class="liste-top">' + top.map(function (t, i) {
          var nv = t.a.vigilance.filter(function (v) { return v.niveau !== "faible"; }).length;
          return '<li data-ouvrir="' + t.c.id + '" data-poste="' + p.id + '" tabindex="0"><span class="rang">' + (i + 1) + '</span><span><span class="nom">' + esc(libelle(t.c)) + "</span>" +
            '<br><span class="sous">' + statutLabel(t.c.statut) + (nv ? ' · <span style="color:var(--attention)">' + nv + " point(s) de vigilance</span>" : "") + "</span></span>" +
            '<span class="score ' + classeScore(t.a.score) + '">' + t.a.score + "</span></li>";
        }).join("") + "</ul>" +
        '<div class="actions" style="margin-top:12px"><button class="btn btn-petit" data-classement="' + p.id + '">Voir le classement complet →</button></div></div>';
    });
    h += "</div>";

    if (bientot.length) {
      h += '<div class="carte" style="margin-top:20px"><h3>Prochaines suppressions automatiques</h3><p class="muted petit">Conformément à la durée de conservation (' + etat.reglages.dureeJours + " jours). Renouvelable uniquement avec l'accord écrit du candidat.</p>" +
        '<div class="table-wrap"><table><tbody>' + bientot.sort(function (a, b) { return joursRestants(a) - joursRestants(b); }).map(function (c) {
          return '<tr class="cliquable" data-ouvrir="' + c.id + '"><td>' + esc(libelle(c)) + "</td><td>" + pastilleStatut(c.statut) + '</td><td class="num"><span class="pastille p-attention">dans ' + joursRestants(c) + " j</span></td></tr>";
        }).join("") + "</tbody></table></div></div>";
    }
    return h + blocMethode();
  }

  function kpi(v, l, accent) { return '<div class="carte kpi' + (accent ? " accent" : "") + '"><div class="kpi-valeur">' + v + '</div><div class="kpi-label">' + l + "</div></div>"; }

  function blocMethode() {
    return '<div class="grille g3" style="margin-top:20px">' +
      '<div class="carte"><h3>1. Importer</h3><p class="petit muted">Glissez des CV PDF ou Word, ou un document regroupant plusieurs candidatures. Ils restent stockés dans ce navigateur, sur votre ordinateur.</p></div>' +
      '<div class="carte"><h3>2. Comparer</h3><p class="petit muted">Chaque CV est noté sur les critères pondérés de chaque poste, avec la justification de la note et les incohérences repérées. Analyse IA approfondie en option.</p></div>' +
      '<div class="carte"><h3>3. Décider</h3><p class="petit muted">Une grille d\'entretien structurée est générée pour chaque candidat. La décision reste humaine. Les CV sont supprimés automatiquement à échéance.</p></div></div>';
  }

  /* ================= VUE : CANDIDATURES ================= */
  function vueCandidats() {
    var f = etat.filtres, q = M.normaliser(f.q);
    var liste = etat.candidats.filter(function (c) {
      if (f.statut && c.statut !== f.statut) return false;
      if (q && M.normaliser(c.texte + " " + c.nom + " " + c.titre + " " + c.ref).indexOf(q) < 0) return false;
      return true;
    }).map(function (c) {
      var b = f.poste ? { p: posteParId(f.poste), a: analyse(c, posteParId(f.poste)) } : meilleurPoste(c);
      return { c: c, b: b };
    }).sort(function (x, y) { return (y.b ? y.b.a.score : 0) - (x.b ? x.b.a.score : 0); });

    var h = '<div class="titre-vue"><div><h1>Candidatures</h1><p>' + etat.candidats.length + " au total · triées par adéquation</p></div>" +
      '<div class="actions"><button class="btn btn-principal" data-action="importer">+ Importer des CV</button></div></div>' +
      '<div class="filtres"><input class="champ" type="search" id="f-q" placeholder="Rechercher une compétence, un mot…" value="' + esc(f.q) + '" style="flex:1;min-width:220px">' +
      '<select class="champ" id="f-statut"><option value="">Tous les statuts</option>' + STATUTS.map(function (s) { return '<option value="' + s.id + '"' + (f.statut === s.id ? " selected" : "") + ">" + s.label + "</option>"; }).join("") + "</select>" +
      '<select class="champ" id="f-poste"><option value="">Score : meilleur poste</option>' + etat.postes.map(function (p) { return '<option value="' + p.id + '"' + (f.poste === p.id ? " selected" : "") + ">Score : " + esc(p.titre) + "</option>"; }).join("") + "</select></div>";

    if (!liste.length) return h + '<div class="carte vide"><p class="muted">Aucune candidature ne correspond.</p></div>';

    h += '<div class="carte" style="padding:6px 8px"><div class="table-wrap"><table><thead><tr><th>Réf.</th><th>Candidat·e</th><th>' + (f.poste ? "Poste évalué" : "Meilleure adéquation") + '</th><th class="num">Score</th><th>Vigilance</th><th>Statut</th><th class="num">Conservation</th></tr></thead><tbody>';
    liste.forEach(function (x) {
      var c = x.c, b = x.b, nv = b ? b.a.vigilance.filter(function (v) { return v.niveau !== "faible"; }).length : 0;
      var j = joursRestants(c);
      h += '<tr class="cliquable" data-ouvrir="' + c.id + '"' + (b ? ' data-poste="' + b.p.id + '"' : "") + ' tabindex="0"><td class="muted petit">' + esc(c.ref) + "</td>" +
        '<td><strong>' + esc(libelle(c)) + "</strong>" + (c.source ? '<div class="muted petit">' + esc(c.source) + "</div>" : "") + "</td>" +
        '<td class="petit">' + (b ? esc(b.p.titre) : "—") + "</td>" +
        '<td class="num"><span class="score ' + classeScore(b ? b.a.score : 0) + '">' + (b ? b.a.score : "—") + "</span></td>" +
        "<td>" + (nv ? '<span class="pastille p-attention">' + nv + " point(s)</span>" : '<span class="muted petit">—</span>') + "</td>" +
        "<td>" + pastilleStatut(c.statut) + "</td>" +
        '<td class="num petit ' + (j <= 30 ? "" : "muted") + '">' + (j <= 30 ? '<span class="pastille p-attention">' + j + " j</span>" : j + " j") + "</td></tr>";
    });
    return h + "</tbody></table></div></div>";
  }

  /* ================= VUE : CLASSEMENT ================= */
  function vueClassement() {
    var p = posteParId(etat.classementPoste) || etat.postes[0];
    if (!p) return '<div class="carte vide"><p>Aucun poste défini.</p></div>';
    var liste = etat.candidats.filter(function (c) { return !(etat.masquerRefus && c.statut === "refuse"); })
      .map(function (c) { return { c: c, a: analyse(c, p) }; }).sort(function (x, y) { return y.a.score - x.a.score; });

    var h = '<div class="titre-vue"><div><h1>Classement par poste</h1><p>Comparez les candidats critère par critère. Plus la case est foncée, plus le critère est couvert.</p></div></div>' +
      '<div class="choix-poste">' + etat.postes.map(function (x) {
        return '<button data-classement="' + x.id + '" class="' + (x.id === p.id ? "actif" : "") + '"><span class="t">' + esc(x.titre) + '<br><span class="muted" style="font-weight:400;font-size:12px">' + esc(x.rattachement) + "</span></span></button>";
      }).join("") + "</div>" +
      '<div class="encart" style="margin-bottom:14px"><strong>Mission :</strong> ' + esc(p.mission) + "</div>" +
      '<label class="case" style="margin-top:0"><input type="checkbox" id="masquer-refus"' + (etat.masquerRefus ? " checked" : "") + "> Masquer les candidatures « Non retenu »</label>";

    if (!liste.length) return h + '<div class="carte vide"><p class="muted">Aucune candidature à classer.</p></div>';

    h += '<div class="carte" style="padding:6px 8px"><div class="table-wrap"><table class="chaleur"><thead><tr><th>#</th><th>Candidat·e</th><th class="num">Score</th>' +
      p.criteres.map(function (cr) { return '<th class="rot">' + esc(cr.label) + '<br><span style="font-weight:400">poids ' + cr.poids + "</span></th>"; }).join("") +
      (etat.reglages.iaCle ? '<th class="num">IA</th>' : "") + '<th>Vigilance</th><th>Statut</th></tr></thead><tbody>';
    liste.forEach(function (x, i) {
      var ia = x.c.ia && x.c.ia[p.id];
      var nv = x.a.vigilance.filter(function (v) { return v.niveau !== "faible"; }).length;
      h += '<tr class="cliquable" data-ouvrir="' + x.c.id + '" data-poste="' + p.id + '" tabindex="0"><td class="muted">' + (i + 1) + '</td><td class="nomc"><strong>' + esc(libelle(x.c)) + "</strong></td>" +
        '<td class="num"><span class="score ' + classeScore(x.a.score) + '">' + x.a.score + "</span></td>" +
        x.a.details.map(function (d) {
          var v = Math.round(d.score * 100), a = 0.08 + d.score * 0.85;
          return '<td class="cell" title="' + esc(d.justification) + '" style="background:rgba(134,87,237,' + a.toFixed(2) + ");color:" + (d.score > 0.55 ? "#fff" : "var(--violet-nuit)") + '">' + v + "</td>";
        }).join("") +
        (etat.reglages.iaCle ? '<td class="num">' + (ia && ia.score != null ? '<span class="pastille p-jaune">' + ia.score + "</span>" : '<span class="muted">—</span>') + "</td>" : "") +
        "<td>" + (nv ? '<span class="pastille p-attention">' + nv + "</span>" : '<span class="muted">—</span>') + "</td><td>" + pastilleStatut(x.c.statut) + "</td></tr>";
    });
    return h + "</tbody></table></div></div>";
  }

  /* ================= VUE : POSTES ================= */
  function vuePostes() {
    var e = entreprise();
    var h = '<div class="titre-vue"><div><h1>Postes &amp; critères</h1><p>Ajustez les critères et leurs poids : les scores se recalculent immédiatement.</p></div>' +
      '<div class="actions"><button class="btn" data-action="reinit-postes">Réinitialiser</button><button class="btn btn-principal" data-action="nouveau-poste">+ Nouveau poste</button></div></div>';
    etat.postes.forEach(function (p, idx) {
      h += '<details class="carte poste-carte" style="margin-bottom:14px"' + (idx === 0 && etat.postes.length === 1 ? " open" : "") + ' data-poste-edit="' + p.id + '"><summary style="cursor:pointer;list-style:none">' +
        '<div class="carte-titre" style="margin:0"><div><h3>' + esc(p.titre) + '</h3><div class="muted petit">' + esc(p.rattachement) + " · " + p.criteres.length + ' critères</div></div><span class="btn btn-petit">Modifier</span></div></summary>' +
        '<label class="lbl">Intitulé du poste</label><input class="champ" style="width:100%" type="text" data-f="titre" value="' + esc(p.titre) + '">' +
        '<label class="lbl">Rattachement</label><input class="champ" style="width:100%" type="text" data-f="rattachement" value="' + esc(p.rattachement) + '">' +
        '<label class="lbl">Mission (utilisée aussi par l\'analyse IA)</label><textarea class="champ" rows="2" data-f="mission">' + esc(p.mission) + "</textarea>" +
        '<h3 style="margin-top:18px">Critères</h3>' +
        p.criteres.map(function (c, i) { return editeurCritere(c, i); }).join("") +
        '<div class="actions" style="margin-top:14px"><button class="btn btn-petit" data-ajout-critere>+ Ajouter un critère</button><span style="flex:1"></span>' +
        '<button class="btn btn-petit btn-danger" data-suppr-poste>Supprimer ce poste</button><button class="btn btn-principal" data-sauver-poste>Enregistrer</button></div></details>';
    });
    h += '<div class="carte" style="margin-top:20px"><h2>Contexte et culture CHIFFON</h2>' +
      '<label class="lbl">Contexte de l\'entreprise (transmis à l\'IA)</label><textarea class="champ" rows="5" id="ent-contexte">' + esc(e.contexte) + "</textarea>" +
      '<label class="lbl">Signaux de culture positifs (critère « Adéquation culture »)</label><textarea class="champ" rows="2" id="ent-culture">' + esc(e.culturePositive.join(", ")) + '</textarea><div class="aide">Séparés par des virgules. Le début d\'un mot suffit (ex. « adapt » trouve adaptable, adaptation…).</div>' +
      '<label class="lbl">Signaux de vigilance (une ligne par signal : mot-clé = message)</label><textarea class="champ" rows="5" id="ent-vigil">' + esc(e.vigilance.map(function (v) { return v.motif + " = " + v.message; }).join("\n")) + "</textarea>" +
      '<div class="actions" style="margin-top:12px"><button class="btn btn-principal" data-action="sauver-entreprise">Enregistrer le contexte</button></div></div>';
    return h;
  }

  function editeurCritere(c, i) {
    var corps;
    if (c.type === "experience") {
      corps = '<div class="plein actions petit">Années minimum <input class="champ" type="number" min="0" step="0.5" style="width:80px" data-c="min" value="' + c.min + '"> · idéal jusqu\'à <input class="champ" type="number" min="0" step="0.5" style="width:80px" data-c="idealMax" value="' + c.idealMax + '"> ans</div>';
    } else if (c.type === "culture") {
      corps = '<div class="plein aide">Utilise les signaux de culture définis en bas de page.</div>';
    } else {
      corps = '<textarea class="champ plein" rows="2" data-c="motsCles" placeholder="mots-clés séparés par des virgules">' + esc((c.motsCles || []).join(", ")) + "</textarea>";
    }
    return '<div class="crit-edit" data-i="' + i + '"><input class="champ" type="text" data-c="label" value="' + esc(c.label) + '">' +
      '<div><input type="range" min="0" max="5" step="1" data-c="poids" value="' + c.poids + '"><div class="aide" style="text-align:center">Poids <strong data-poids-val>' + c.poids + "</strong>/5</div></div>" +
      '<button class="btn btn-petit btn-danger" data-suppr-critere title="Supprimer ce critère">✕</button>' + corps +
      '<input class="champ plein" type="text" data-c="question" placeholder="Question d\'entretien associée" value="' + esc(c.question || "") + '"></div>';
  }

  function lireEditeurPoste(box) {
    var p = clone(posteParId(box.dataset.posteEdit));
    p.titre = $('[data-f="titre"]', box).value.trim() || p.titre;
    p.rattachement = $('[data-f="rattachement"]', box).value.trim();
    p.mission = $('[data-f="mission"]', box).value.trim();
    p.criteres = $$(".crit-edit", box).map(function (row) {
      var c = clone(p.criteres[+row.dataset.i]);
      c.label = $('[data-c="label"]', row).value.trim() || c.label;
      c.poids = +$('[data-c="poids"]', row).value;
      c.question = $('[data-c="question"]', row).value.trim();
      var mc = $('[data-c="motsCles"]', row); if (mc) c.motsCles = mc.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      var mn = $('[data-c="min"]', row); if (mn) c.min = +mn.value || 0;
      var mx = $('[data-c="idealMax"]', row); if (mx) c.idealMax = +mx.value || 0;
      return c;
    });
    return p;
  }

  function sauverPoste(p) {
    etat.postes = etat.postes.map(function (x) { return x.id === p.id ? p : x; });
    viderCache();
    return S.enregistrer("postes", p);
  }

  /* ================= VUE : RÉGLAGES & RGPD ================= */
  function vueReglages() {
    var r = etat.reglages;
    var notice = noticeCandidat();
    var purges = (r.journalPurges || []).slice().reverse();
    return '<div class="titre-vue"><div><h1>Paramètres &amp; RGPD</h1><p>Conservation, sauvegardes, IA et information des candidats.</p></div></div>' +
      '<div class="grille g2">' +
      '<div class="carte"><h2>Conservation des CV</h2>' +
      '<label class="lbl" for="duree">Durée de conservation des nouvelles candidatures</label>' +
      '<select class="champ" id="duree"><option value="180"' + (r.dureeJours == 180 ? " selected" : "") + '>6 mois</option><option value="365"' + (r.dureeJours == 365 ? " selected" : "") + '>1 an (recommandé)</option><option value="730"' + (r.dureeJours == 730 ? " selected" : "") + ">2 ans (maximum CNIL)</option></select>" +
      '<p class="aide">Chaque CV est supprimé définitivement à son échéance, à l\'ouverture de l\'outil. Une prolongation n\'est possible qu\'avec l\'accord écrit du candidat.</p>' +
      '<hr class="sep"><h3>Journal des suppressions automatiques</h3>' +
      (purges.length ? '<ul class="petit">' + purges.slice(0, 8).map(function (x) { return "<li>" + dateFr(x.date) + " : " + x.nombre + " CV supprimé(s)</li>"; }).join("") + "</ul>" : '<p class="muted petit">Aucune suppression pour l\'instant.</p>') +
      "</div>" +

      '<div class="carte"><h2>Sauvegarde &amp; données</h2>' +
      '<p class="petit muted">Les CV sont stockés <strong>uniquement dans ce navigateur, sur cet ordinateur</strong>. Ils ne sont jamais envoyés sur GitHub. Exportez régulièrement une sauvegarde et rangez-la dans un dossier protégé (jamais sur GitHub).</p>' +
      '<div class="actions"><button class="btn" data-action="exporter-tout">Exporter une sauvegarde (.json)</button>' +
      '<label class="btn" style="margin:0">Restaurer une sauvegarde<input type="file" id="restaurer" accept=".json,application/json" hidden></label></div>' +
      '<hr class="sep"><button class="btn btn-danger" data-action="tout-supprimer">Supprimer toutes les candidatures</button></div>' +

      '<div class="carte"><h2>Analyse approfondie par IA <span class="pastille p-jaune" style="vertical-align:middle">optionnel</span></h2>' +
      '<p class="petit muted">Sans clé, l\'outil fonctionne déjà avec son moteur de notation intégré. Avec une clé d\'API Claude (console.anthropic.com), il peut produire une analyse argumentée et des questions sur mesure. Le CV est <strong>anonymisé avant l\'envoi</strong>.</p>' +
      '<label class="lbl" for="ia-cle">Clé d\'API Anthropic</label><input class="champ" style="width:100%" type="password" id="ia-cle" autocomplete="off" placeholder="sk-ant-…" value="' + esc(r.iaCle) + '">' +
      '<div class="aide">Conservée uniquement dans ce navigateur. Ne la mettez jamais dans les fichiers publiés sur GitHub.</div>' +
      '<label class="lbl" for="ia-modele">Modèle</label><input class="champ" style="width:100%" type="text" id="ia-modele" value="' + esc(r.iaModele) + '">' +
      '<div class="actions" style="margin-top:12px"><button class="btn btn-principal" data-action="sauver-ia">Enregistrer</button>' + (r.iaCle ? '<button class="btn btn-danger" data-action="effacer-ia">Effacer la clé</button>' : "") + "</div>" +
      '<div class="encart jaune petit" style="margin-top:14px">Utiliser l\'IA revient à transmettre des données à un sous-traitant : à mentionner dans la notice candidat et dans le registre RGPD de CHIFFON.</div></div>' +

      '<div class="carte"><h2>Notice d\'information candidat</h2><p class="petit muted">À ajouter aux annonces et à l\'accusé de réception des candidatures (obligation d\'information, art. 13 RGPD).</p>' +
      '<textarea class="champ" rows="9" id="notice" readonly>' + esc(notice) + "</textarea>" +
      '<div class="actions" style="margin-top:10px"><button class="btn" data-action="copier-notice">Copier le texte</button></div></div>' +

      '<div class="carte" style="grid-column:1/-1"><h2>Comment l\'outil calcule les scores</h2>' +
      '<p class="petit">Chaque poste comporte des critères pondérés de 0 à 5. Pour chaque critère, l\'outil cherche dans le CV les mots-clés correspondants et attribue une couverture de 0 à 100 %. L\'expérience est comparée à la fourchette attendue. Le score final est la moyenne pondérée (sur 100).</p>' +
      '<p class="petit"><strong>Ce que l\'outil ne prend jamais en compte :</strong> l\'âge, le genre, le nom, la photo, l\'adresse, la situation familiale ni le niveau ou l\'ancienneté du diplôme. Les incohérences (diplôme en cours, dates qui ne collent pas, profil « expert » cherchant une première expérience…) sont signalées en <strong>points de vigilance</strong>, sans baisser la note.</p>' +
      '<p class="petit"><strong>Contrôle humain :</strong> le tri de CV par IA est classé « à haut risque » par le règlement européen sur l\'IA. L\'outil classe et explique. Aucun candidat n\'est écarté automatiquement : chaque décision est prise par un recruteur.</p></div>' +
      "</div>";
  }

  function noticeCandidat() {
    return "Protection de vos données personnelles\n\n" +
      "CHIFFON traite les informations de votre candidature dans le seul but d'étudier votre profil pour nos recrutements (base légale : mesures précontractuelles prises à votre demande). " +
      "Elles sont accessibles uniquement à l'équipe Ressources Humaines.\n\n" +
      "Pour faciliter la présélection, nous utilisons un outil d'aide au tri qui compare votre CV aux compétences attendues pour le poste" +
      (etat.reglages.iaCle ? ", avec l'appui d'un service d'intelligence artificielle (Anthropic) auquel votre CV est transmis sous forme anonymisée" : "") +
      ". Aucune décision n'est prise de manière automatisée : chaque candidature est examinée par un recruteur.\n\n" +
      "Si votre candidature n'est pas retenue, vos données sont conservées " + (etat.reglages.dureeJours >= 730 ? "2 ans" : etat.reglages.dureeJours >= 365 ? "1 an" : "6 mois") +
      " afin de vous proposer d'autres opportunités, puis supprimées automatiquement. Vous pouvez demander leur suppression plus tôt.\n\n" +
      "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et d'opposition. Contact : [adresse e-mail RH / DPO]. " +
      "Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).";
  }

  /* ================= TIROIR : DÉTAIL CANDIDAT ================= */
  function ouvrirDetail(id, posteId) {
    var c = etat.candidats.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    etat.detail = { id: id, posteId: posteId || (meilleurPoste(c) || {}).p && meilleurPoste(c).p.id, onglet: (etat.detail && etat.detail.id === id && etat.detail.onglet) || "analyse" };
    $("#tiroir").hidden = false;
    document.body.style.overflow = "hidden";
    rendreDetail();
  }
  function fermerTiroir() { if ($("#tiroir").hidden) return; $("#tiroir").hidden = true; document.body.style.overflow = ""; etat.detail = null; rendre(); }

  function candidatCourant() { return etat.detail && etat.candidats.filter(function (x) { return x.id === etat.detail.id; })[0]; }

  function rendreDetail() {
    var c = candidatCourant(); if (!c) { fermerTiroir(); return; }
    var p = posteParId(etat.detail.posteId) || etat.postes[0];
    etat.detail.posteId = p.id;
    var j = joursRestants(c), o = etat.detail.onglet;
    var h = '<div class="tiroir-entete"><div class="ligne1"><div><h2>' + esc(libelle(c)) + "</h2>" +
      '<div class="meta"><span>' + esc(c.ref) + "</span><span>Reçu le " + dateFr(c.dateAjout) + "</span><span>Suppression auto. le " + dateFr(c.dateExpiration) + " (" + j + " j)</span><span>" + pastilleStatut(c.statut) + "</span></div></div>" +
      '<button class="fermer" data-fermer aria-label="Fermer">×</button></div>' +
      '<div class="sous-onglets">' + [["analyse", "Analyse"], ["entretien", "Grille d'entretien"], ["cv", "CV"], ["suivi", "Suivi & RGPD"]].map(function (t) {
        return '<button data-onglet="' + t[0] + '" class="' + (o === t[0] ? "actif" : "") + '">' + t[1] + "</button>";
      }).join("") + "</div></div>" +
      '<div class="tiroir-corps">' + ({ analyse: detailAnalyse, entretien: detailEntretien, cv: detailCV, suivi: detailSuivi }[o])(c, p) + "</div>";
    $("#tiroir-contenu").innerHTML = h;
    lierDetail(c, p);
  }

  function choixPoste(c, p) {
    var best = meilleurPoste(c);
    return '<div class="choix-poste no-print">' + etat.postes.map(function (x) {
      var a = analyse(c, x);
      return '<button data-choix-poste="' + x.id + '" class="' + (x.id === p.id ? "actif" : "") + '"><span class="score ' + classeScore(a.score) + '">' + a.score + '</span><span class="t">' + esc(x.titre) +
        (best && best.p.id === x.id ? '<br><span style="color:var(--violet);font-size:11px">★ meilleure adéquation</span>' : "") + "</span></button>";
    }).join("") + "</div>";
  }

  function detailAnalyse(c, p) {
    var a = analyse(c, p), ia = c.ia && c.ia[p.id];
    var h = choixPoste(c, p) +
      '<div class="carte resume" style="margin-bottom:16px"><div class="anneau" style="--p:' + a.score + '"><div>' + a.score + "</div></div>" +
      '<div><h3 style="margin:0 0 4px">Adéquation au poste ' + esc(p.titre) + "</h3>" +
      '<div class="petit muted">Expérience détectée : <strong>' + (a.experience.annees === null ? "non précisée" : a.experience.annees + " an(s)") + "</strong>" +
      (a.diplomes.length ? " · Formation : " + a.diplomes.map(function (d) { return esc(d.texte.replace(/\.$/, "")); }).join(" ; ") : "") + "</div>" +
      '<div class="petit muted" style="margin-top:6px">Score indicatif : à confirmer en entretien.</div></div></div>' +
      '<div class="grille g2"><div class="carte"><h3>Détail par critère</h3>' +
      a.details.map(function (d) {
        var v = Math.round(d.score * 100);
        return '<div class="critere"><div class="lib">' + esc(d.label) + " <small>· poids " + d.poids + '</small></div><div class="barre"><span style="width:' + v + '%"></span></div><div class="val">' + v + '</div><div class="just">' + esc(d.justification) + "</div></div>";
      }).join("") + "</div>" +
      '<div><div class="carte" style="margin-bottom:16px"><h3>Points de vigilance</h3>' +
      (a.vigilance.length ? '<ul class="vigil">' + a.vigilance.map(function (v) { return '<li class="' + v.niveau + '">' + esc(v.message) + "</li>"; }).join("") + "</ul>" : '<p class="muted petit">Aucune incohérence détectée.</p>') +
      "</div>" + blocIA(c, p, ia) + "</div></div>";
    return h;
  }

  function blocIA(c, p, ia) {
    var h = '<div class="carte"><div class="carte-titre"><h3 style="margin:0">Analyse approfondie IA</h3>' +
      (ia && ia.score != null ? '<span class="pastille p-jaune">Score IA ' + ia.score + "</span>" : "") + "</div>";
    if (!etat.reglages.iaCle) {
      return h + '<p class="petit muted">Option désactivée. Ajoutez une clé d\'API Claude dans <a href="#" data-aller="reglages">Paramètres</a> pour obtenir une analyse argumentée et des questions sur mesure.</p></div>';
    }
    if (ia) {
      h += '<p class="petit">' + esc(ia.synthese || "") + "</p>" +
        (ia.points_forts && ia.points_forts.length ? '<h4 class="petit" style="margin:10px 0 4px">Points forts</h4><ul class="petit">' + ia.points_forts.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
        (ia.vigilance && ia.vigilance.length ? '<h4 class="petit" style="margin:10px 0 4px">Vigilance</h4><ul class="petit">' + ia.vigilance.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
        (ia.autre_poste_suggere ? '<p class="petit"><strong>Autre poste suggéré :</strong> ' + esc(ia.autre_poste_suggere) + "</p>" : "") +
        '<p class="aide">Analyse du ' + dateFr(ia.date) + " · " + esc(ia.modele || "") + "</p>";
    }
    return h + '<div class="actions" style="margin-top:10px"><button class="btn ' + (ia ? "" : "btn-principal") + '" data-action="lancer-ia">' + (ia ? "Relancer l'analyse IA" : "Lancer l'analyse IA") + "</button></div></div>";
  }

  function cleQuestion(q) { return M.normaliser(q.theme + "|" + q.question).replace(/[^a-z0-9]/g, "").slice(0, 60); }

  function detailEntretien(c, p) {
    var a = analyse(c, p), qs = M.grilleEntretien(a);
    var ia = c.ia && c.ia[p.id];
    if (ia && ia.questions_entretien) ia.questions_entretien.forEach(function (q) { qs.push({ theme: "Question IA", question: q, priorite: "Sur mesure" }); });
    var e = (c.entretiens && c.entretiens[p.id]) || { notes: {}, commentaires: {} };
    var notes = Object.keys(e.notes).map(function (k) { return +e.notes[k]; }).filter(Boolean);
    var moy = notes.length ? (notes.reduce(function (s, x) { return s + x; }, 0) / notes.length).toFixed(1) : null;
    var h = choixPoste(c, p) +
      '<div class="carte resume" style="margin-bottom:16px;justify-content:space-between;flex-wrap:wrap"><div><h3 style="margin:0">Grille d\'entretien · ' + esc(p.titre) + "</h3>" +
      '<div class="petit muted">Mêmes questions pour tous les candidats d\'un poste, ajustées selon les points à creuser. Notez de 1 (insuffisant) à 4 (excellent).</div></div>' +
      '<div class="actions"><span class="pastille p-contacter" style="font-size:14px;padding:6px 12px">Moyenne : ' + (moy ? moy + " / 4" : "—") + " (" + notes.length + "/" + qs.length + ')</span><button class="btn no-print" data-action="imprimer">Imprimer / PDF</button></div></div>';
    qs.forEach(function (q) {
      var k = cleQuestion(q), n = e.notes[k];
      h += '<div class="question" data-q="' + k + '"><div class="q-entete"><span class="theme">' + esc(q.theme) + '</span><span class="pastille ' + (q.priorite === "À clarifier" ? "p-attention" : q.priorite === "À creuser" ? "p-contacter" : "p-nouveau") + '">' + esc(q.priorite) + "</span></div>" +
        "<div>" + esc(q.question) + "</div>" +
        '<div class="actions" style="margin-top:8px"><div class="notes-radio" role="radiogroup" aria-label="Note">' + [1, 2, 3, 4].map(function (v) {
          return '<label><input type="radio" name="n-' + k + '" value="' + v + '"' + (+n === v ? " checked" : "") + "><span>" + v + "</span></label>";
        }).join("") + "</div></div>" +
        '<textarea class="champ" rows="2" placeholder="Notes d\'entretien (faits observés, exemples cités)…">' + esc(e.commentaires[k] || "") + "</textarea></div>";
    });
    return h;
  }

  function detailCV(c) {
    return (etat.reglages.anonyme ? '<div class="encart" style="margin-bottom:12px">Mode anonyme actif : coordonnées, liens, âge et nom sont masqués.</div>' : "") +
      '<div class="cv-texte">' + esc(texteAffiche(c)) + "</div>";
  }

  function detailSuivi(c, p) {
    var j = joursRestants(c);
    return '<div class="grille g2"><div class="carte"><h3>Suivi de la candidature</h3>' +
      '<label class="lbl" for="d-statut">Statut</label><select class="champ" id="d-statut" style="width:100%">' + STATUTS.map(function (s) { return '<option value="' + s.id + '"' + (c.statut === s.id ? " selected" : "") + ">" + s.label + "</option>"; }).join("") + "</select>" +
      '<label class="lbl" for="d-poste">Poste visé</label><select class="champ" id="d-poste" style="width:100%"><option value="">— non défini —</option>' + etat.postes.map(function (x) { return '<option value="' + x.id + '"' + (c.posteVise === x.id ? " selected" : "") + ">" + esc(x.titre) + "</option>"; }).join("") + "</select>" +
      '<label class="lbl" for="d-nom">Nom du candidat</label><input class="champ" style="width:100%" id="d-nom" type="text" value="' + esc(c.nom || "") + '" placeholder="Facultatif">' +
      '<label class="lbl" for="d-titre">Intitulé / titre du CV</label><input class="champ" style="width:100%" id="d-titre" type="text" value="' + esc(c.titre || "") + '">' +
      '<label class="lbl" for="d-notes">Notes internes</label><textarea class="champ" id="d-notes" rows="5" placeholder="Faits, échanges, prochaine étape… (pas de jugement sur la personne)">' + esc(c.notes || "") + "</textarea>" +
      '<div class="actions" style="margin-top:12px"><button class="btn btn-principal" data-action="sauver-suivi">Enregistrer</button></div></div>' +
      '<div><div class="carte" style="margin-bottom:16px"><h3>Conservation (RGPD)</h3>' +
      '<p class="petit">Reçu le <strong>' + dateFr(c.dateAjout) + "</strong>. Suppression automatique le <strong>" + dateFr(c.dateExpiration) + "</strong> (dans " + j + " jours).</p>" +
      '<p class="petit">Information du candidat : <strong>' + (c.informe ? "oui" : "non confirmée") + "</strong></p>" +
      '<div class="actions"><button class="btn btn-petit" data-action="renouveler">Prolonger d\'un an (accord écrit du candidat)</button></div></div>' +
      '<div class="carte" style="margin-bottom:16px"><h3>Droits du candidat</h3><p class="petit muted">Droit d\'accès / portabilité : exportez sa fiche. Droit à l\'effacement : supprimez-la immédiatement.</p>' +
      '<div class="actions"><button class="btn btn-petit" data-action="exporter-un">Exporter la fiche (.json)</button><button class="btn btn-petit btn-danger" data-action="supprimer-un">Supprimer définitivement</button></div></div>' +
      '<div class="carte"><h3>Historique</h3><ul class="petit" style="padding-left:18px;margin:0">' + (c.journal || []).slice().reverse().map(function (x) { return "<li>" + dateFr(x.date) + " · " + esc(x.action) + "</li>"; }).join("") + "</ul></div></div></div>";
  }

  function journaliser(c, action) { c.journal = (c.journal || []).concat([{ date: new Date().toISOString(), action: action }]); }
  function sauverCandidat(c) {
    etat.candidats = etat.candidats.map(function (x) { return x.id === c.id ? c : x; });
    Object.keys(etat.cache).forEach(function (k) { if (k.indexOf(c.id + "|") === 0) delete etat.cache[k]; });
    return S.enregistrer("candidats", c);
  }

  /* ================= MODALES ================= */
  function ouvrirModale(html) { $("#modale-contenu").innerHTML = html; $("#modale").hidden = false; var f = $("#modale-contenu input, #modale-contenu button"); if (f) f.focus(); }
  function fermerModale() { $("#modale").hidden = true; $("#modale-contenu").innerHTML = ""; }

  function confirmer(titre, texte, libelleOk, danger) {
    return new Promise(function (ok) {
      ouvrirModale("<h2>" + esc(titre) + '</h2><p class="petit">' + texte + '</p><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-non>Annuler</button><button class="btn ' + (danger ? "btn-danger" : "btn-principal") + '" data-oui>' + esc(libelleOk) + "</button></div>");
      $("[data-non]").onclick = function () { fermerModale(); ok(false); };
      $("[data-oui]").onclick = function () { fermerModale(); ok(true); };
    });
  }

  function modaleImport() {
    ouvrirModale('<h2>Importer des candidatures</h2>' +
      '<div class="depot" id="depot" tabindex="0" role="button"><strong>Glissez vos CV ici</strong><br><span class="petit muted">ou cliquez pour choisir · PDF, Word (.docx), texte</span><input type="file" id="fichiers" multiple accept=".pdf,.docx,.txt,.md" hidden></div>' +
      '<div id="liste-fichiers" class="petit" style="margin-top:8px"></div>' +
      '<label class="lbl" for="colle">… ou collez le texte d\'un CV</label><textarea class="champ" id="colle" rows="4" placeholder="Copiez-collez le contenu d\'un CV ou d\'un e-mail de candidature"></textarea>' +
      '<label class="case"><input type="checkbox" id="multi"> Un même document contient <strong>&nbsp;plusieurs candidatures&nbsp;</strong> (découpage automatique sur les blocs « Résumé »)</label>' +
      '<label class="case"><input type="checkbox" id="informe" checked> Les candidats ont été informés du traitement de leurs données (notice RGPD) et de la conservation pendant ' + (etat.reglages.dureeJours / 365 >= 1 ? Math.round(etat.reglages.dureeJours / 365) + " an(s)" : "6 mois") + ".</label>" +
      '<div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-fermer>Annuler</button><button class="btn btn-principal" id="go-import">Importer et analyser</button></div>');
    var fichiers = [];
    var depot = $("#depot"), input = $("#fichiers");
    function maj() { $("#liste-fichiers").innerHTML = fichiers.map(function (f) { return '<span class="chip">' + esc(f.name) + "</span>"; }).join(""); }
    depot.onclick = function () { input.click(); };
    depot.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } };
    input.onchange = function () { fichiers = fichiers.concat(Array.prototype.slice.call(input.files)); maj(); };
    ["dragenter", "dragover"].forEach(function (ev) { depot.addEventListener(ev, function (e) { e.preventDefault(); depot.classList.add("survol"); }); });
    ["dragleave", "drop"].forEach(function (ev) { depot.addEventListener(ev, function (e) { e.preventDefault(); depot.classList.remove("survol"); }); });
    depot.addEventListener("drop", function (e) { fichiers = fichiers.concat(Array.prototype.slice.call(e.dataTransfer.files)); maj(); });
    $("#go-import").onclick = function () {
      var multi = $("#multi").checked, informe = $("#informe").checked, colle = $("#colle").value.trim();
      if (!fichiers.length && !colle) { toast("Ajoutez au moins un fichier ou un texte."); return; }
      $("#go-import").disabled = true; $("#go-import").textContent = "Lecture des fichiers…";
      Promise.all(fichiers.map(function (f) { return lireFichier(f).then(function (t) { return { nom: f.name, texte: t }; }, function (err) { return { nom: f.name, erreur: err.message || String(err) }; }); }))
        .then(function (res) {
          if (colle) res.push({ nom: "Texte collé", texte: colle });
          var erreurs = res.filter(function (r) { return r.erreur; });
          var docs = res.filter(function (r) { return !r.erreur && r.texte && r.texte.trim(); });
          var nouveaux = [];
          docs.forEach(function (d) {
            var morceaux = multi ? M.decouperCandidatures(d.texte) : [{ titre: "", texte: d.texte.trim() }];
            morceaux.forEach(function (m) {
              var nom = (!multi && d.nom !== "Texte collé") ? M.devinerTitre(m.texte) : "";
              nouveaux.push(creerCandidat({ texte: m.texte, titre: m.titre, nom: nom, source: d.nom, informe: informe }));
            });
          });
          return ajouterCandidats(nouveaux).then(function () {
            fermerModale();
            toast(nouveaux.length + " candidature(s) importée(s)" + (erreurs.length ? " · " + erreurs.length + " fichier(s) illisible(s)" : ""));
            if (erreurs.length) console.warn(erreurs);
            allerA("candidats");
          });
        });
    };
  }

  function lireFichier(f) {
    var nom = f.name.toLowerCase();
    if (nom.endsWith(".pdf")) {
      return f.arrayBuffer().then(function (buf) {
        var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "assets/vendor/pdf.worker.min.js";
        return lib.getDocument({ data: buf }).promise.then(function (pdf) {
          var pages = [];
          for (var i = 1; i <= pdf.numPages; i++) pages.push(pdf.getPage(i).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
            return tc.items.map(function (it) { return it.str + (it.hasEOL ? "\n" : " "); }).join("");
          }));
          return Promise.all(pages).then(function (t) {
            var txt = t.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
            if (txt.replace(/\s/g, "").length < 30) throw new Error("PDF scanné (image) : texte non lisible, collez le texte à la main.");
            return txt;
          });
        });
      });
    }
    if (nom.endsWith(".docx")) return f.arrayBuffer().then(function (buf) { return window.mammoth.extractRawText({ arrayBuffer: buf }); }).then(function (r) { return r.value; });
    if (nom.endsWith(".doc")) return Promise.reject(new Error("Format .doc ancien : enregistrez-le en .docx ou PDF."));
    return f.text();
  }

  function prochaineRef() {
    var max = etat.candidats.reduce(function (m, c) { var n = parseInt(String(c.ref).replace(/\D/g, ""), 10) || 0; return Math.max(m, n); }, 0);
    prochaineRef.n = Math.max(prochaineRef.n || 0, max) + 1;
    return "C-" + String(prochaineRef.n).padStart(3, "0");
  }

  function creerCandidat(o) {
    var maintenant = new Date();
    var c = {
      id: uid(), ref: prochaineRef(), nom: o.nom || "", titre: o.titre || "", texte: o.texte, source: o.source || "",
      dateAjout: maintenant.toISOString(), dateExpiration: new Date(maintenant.getTime() + etat.reglages.dureeJours * JOUR).toISOString(),
      statut: "nouveau", notes: "", posteVise: "", informe: !!o.informe, entretiens: {}, ia: {}, journal: []
    };
    journaliser(c, "Candidature importée (" + (o.source || "saisie") + ")");
    return c;
  }

  function ajouterCandidats(liste) {
    if (!liste.length) return Promise.resolve();
    etat.candidats = etat.candidats.concat(liste);
    return S.enregistrerPlusieurs("candidats", liste);
  }

  function telecharger(nom, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ================= ÉVÉNEMENTS ================= */
  function lier() {
    var v = $("#vue");
    $$("[data-ouvrir]", v).forEach(function (el) {
      el.addEventListener("click", function () { ouvrirDetail(el.dataset.ouvrir, el.dataset.poste); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter") ouvrirDetail(el.dataset.ouvrir, el.dataset.poste); });
    });
    $$("[data-classement]", v).forEach(function (b) { b.onclick = function () { etat.classementPoste = b.dataset.classement; allerA("classement"); }; });
    $$("[data-action]", v).forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); action(b.dataset.action, b); }); });

    var fq = $("#f-q", v);
    if (fq) {
      fq.oninput = function () { etat.filtres.q = fq.value; var pos = fq.selectionStart; rendre(); var n = $("#f-q"); n.focus(); n.setSelectionRange(pos, pos); };
      $("#f-statut").onchange = function (e) { etat.filtres.statut = e.target.value; rendre(); };
      $("#f-poste").onchange = function (e) { etat.filtres.poste = e.target.value; rendre(); };
    }
    var mr = $("#masquer-refus", v); if (mr) mr.onchange = function () { etat.masquerRefus = mr.checked; rendre(); };

    // éditeur de postes
    $$("[data-poste-edit]", v).forEach(function (box) {
      $$('input[type=range]', box).forEach(function (r) { r.oninput = function () { $("[data-poids-val]", r.parentNode).textContent = r.value; }; });
      $("[data-sauver-poste]", box).onclick = function () { sauverPoste(lireEditeurPoste(box)).then(function () { toast("Poste enregistré, scores recalculés."); rendre(); }); };
      $("[data-ajout-critere]", box).onclick = function () {
        var p = lireEditeurPoste(box);
        p.criteres.push({ id: "c" + uid(), label: "Nouveau critère", poids: 3, type: "mots", motsCles: [], question: "" });
        sauverPoste(p).then(function () { rendre(); var b = $('[data-poste-edit="' + p.id + '"]'); b.open = true; b.scrollIntoView({ block: "end" }); });
      };
      $$("[data-suppr-critere]", box).forEach(function (btn) {
        btn.onclick = function () {
          var p = lireEditeurPoste(box), i = +btn.closest(".crit-edit").dataset.i;
          p.criteres.splice(i, 1);
          sauverPoste(p).then(function () { rendre(); $('[data-poste-edit="' + p.id + '"]').open = true; });
        };
      });
      $("[data-suppr-poste]", box).onclick = function () {
        var p = posteParId(box.dataset.posteEdit);
        confirmer("Supprimer ce poste ?", "Le poste « " + esc(p.titre) + " » et ses critères seront supprimés. Les candidatures sont conservées.", "Supprimer", true).then(function (ok) {
          if (!ok) return;
          etat.postes = etat.postes.filter(function (x) { return x.id !== p.id; }); viderCache();
          S.supprimer("postes", p.id).then(function () { if (etat.classementPoste === p.id) etat.classementPoste = etat.postes[0] && etat.postes[0].id; rendre(); });
        });
      };
    });
  }

  function action(nom) {
    var r = etat.reglages;
    switch (nom) {
      case "importer": modaleImport(); break;
      case "exemple":
        var liste = (window.CHIFFON_DEMO || []).map(function (d) { return creerCandidat({ texte: d.texte, titre: d.titre, source: "Annexe 2 – exemple", informe: true }); });
        ajouterCandidats(liste).then(function () { toast(liste.length + " candidatures d'exemple chargées."); rendre(); });
        break;
      case "nouveau-poste":
        var p = { id: "p" + uid(), titre: "Nouveau poste", rattachement: "", mission: "", ordre: etat.postes.length, criteres: [
          { id: "competences", label: "Compétences clés", poids: 5, type: "mots", motsCles: [], question: "" },
          { id: "experience", label: "Expérience professionnelle", poids: 3, type: "experience", min: 2, idealMax: 6, question: "Pouvez-vous décrire votre expérience la plus proche de ce poste ?" },
          { id: "culture", label: "Adéquation culture CHIFFON (transformation, éthique)", poids: 2, type: "culture", question: "Qu'est-ce qui vous attire dans le projet CHIFFON ?" }] };
        etat.postes.push(p);
        S.enregistrer("postes", p).then(function () { rendre(); var b = $('[data-poste-edit="' + p.id + '"]'); b.open = true; b.scrollIntoView(); });
        break;
      case "reinit-postes":
        confirmer("Réinitialiser les postes ?", "Les 3 postes et critères d'origine seront restaurés. Vos modifications seront perdues.", "Réinitialiser").then(function (ok) {
          if (!ok) return;
          etat.postes = clone(REF.POSTES).map(function (x, i) { x.ordre = i; return x; }); viderCache();
          S.vider("postes").then(function () { return S.enregistrerPlusieurs("postes", etat.postes); }).then(function () { etat.classementPoste = etat.postes[0].id; rendre(); toast("Postes réinitialisés."); });
        });
        break;
      case "sauver-entreprise":
        r.entreprise = {
          nom: "CHIFFON", contexte: $("#ent-contexte").value.trim(),
          culturePositive: $("#ent-culture").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean),
          vigilance: $("#ent-vigil").value.split("\n").map(function (l) { var i = l.indexOf("="); return i > 0 ? { motif: l.slice(0, i).trim(), message: l.slice(i + 1).trim() } : null; }).filter(Boolean)
        };
        S.sauverReglages(r); viderCache(); toast("Contexte enregistré, scores recalculés.");
        break;
      case "sauver-ia":
        r.iaCle = $("#ia-cle").value.trim(); r.iaModele = $("#ia-modele").value.trim() || "claude-sonnet-5-5";
        S.sauverReglages(r); toast("Réglages IA enregistrés."); rendre();
        break;
      case "effacer-ia": r.iaCle = ""; S.sauverReglages(r); rendre(); toast("Clé effacée."); break;
      case "copier-notice":
        var n = $("#notice"); n.select();
        (navigator.clipboard ? navigator.clipboard.writeText(n.value) : Promise.reject()).then(function () { toast("Notice copiée."); }, function () { document.execCommand("copy"); toast("Notice copiée."); });
        break;
      case "exporter-tout":
        telecharger("chiffon-tri-cv-sauvegarde-" + new Date().toISOString().slice(0, 10) + ".json", { version: 1, date: new Date().toISOString(), candidats: etat.candidats, postes: etat.postes, entreprise: r.entreprise || null });
        toast("Sauvegarde téléchargée : conservez-la dans un dossier protégé.");
        break;
      case "tout-supprimer":
        confirmer("Supprimer toutes les candidatures ?", "Les " + etat.candidats.length + " candidatures seront effacées définitivement de ce navigateur. Cette action est irréversible.", "Tout supprimer", true).then(function (ok) {
          if (!ok) return; S.vider("candidats").then(function () { etat.candidats = []; viderCache(); rendre(); toast("Toutes les candidatures ont été supprimées."); });
        });
        break;
    }
  }

  // restauration (input file dans Réglages)
  document.addEventListener("change", function (e) {
    if (e.target.id !== "restaurer" || !e.target.files[0]) return;
    e.target.files[0].text().then(function (t) {
      var d = JSON.parse(t), maintenant = Date.now();
      var cs = (d.candidats || []).filter(function (c) { return new Date(c.dateExpiration).getTime() > maintenant; });
      var exist = {}; etat.candidats.forEach(function (c) { exist[c.id] = 1; });
      cs = cs.filter(function (c) { return !exist[c.id]; });
      var p = d.postes && d.postes.length ? S.vider("postes").then(function () { etat.postes = d.postes; return S.enregistrerPlusieurs("postes", d.postes); }) : Promise.resolve();
      if (d.entreprise) { etat.reglages.entreprise = d.entreprise; S.sauverReglages(etat.reglages); }
      return p.then(function () { return ajouterCandidats(cs); }).then(function () {
        viderCache(); etat.classementPoste = etat.postes[0] && etat.postes[0].id; rendre();
        toast(cs.length + " candidature(s) restaurée(s) (les CV expirés ne sont pas réimportés).");
      });
    }).catch(function () { toast("Fichier de sauvegarde invalide."); });
  });

  function lierDetail(c, p) {
    var t = $("#tiroir-contenu");
    $$("[data-onglet]", t).forEach(function (b) { b.onclick = function () { etat.detail.onglet = b.dataset.onglet; rendreDetail(); t.parentNode.scrollTop = 0; }; });
    $$("[data-choix-poste]", t).forEach(function (b) { b.onclick = function () { etat.detail.posteId = b.dataset.choixPoste; rendreDetail(); }; });
    $$("[data-aller]", t).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); fermerTiroir(); allerA(a.dataset.aller); }; });

    // grille d'entretien : enregistrement à la volée
    $$(".question", t).forEach(function (q) {
      var k = q.dataset.q;
      function e() { c.entretiens = c.entretiens || {}; return (c.entretiens[p.id] = c.entretiens[p.id] || { notes: {}, commentaires: {} }); }
      $$("input[type=radio]", q).forEach(function (r) { r.onchange = function () { e().notes[k] = +r.value; e().date = new Date().toISOString(); sauverCandidat(c).then(rendreDetail); }; });
      var ta = $("textarea", q); var tm;
      ta.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { e().commentaires[k] = ta.value; sauverCandidat(c); }, 400); };
    });

    $$("[data-action]", t).forEach(function (b) {
      b.onclick = function () {
        switch (b.dataset.action) {
          case "imprimer": window.print(); break;
          case "lancer-ia":
            b.disabled = true; b.textContent = "Analyse en cours…";
            var txt = M.anonymiser(c.texte); if (c.nom) txt = txt.split(c.nom).join("[nom masqué]");
            IA.analyser(txt, p, entreprise(), etat.reglages).then(function (res) {
              c.ia = c.ia || {}; c.ia[p.id] = res; journaliser(c, "Analyse IA – " + p.titre);
              return sauverCandidat(c).then(function () { rendreDetail(); toast("Analyse IA terminée."); });
            }).catch(function (err) { b.disabled = false; b.textContent = "Réessayer"; toast("Analyse IA impossible : " + err.message); });
            break;
          case "sauver-suivi":
            var ancien = c.statut;
            c.statut = $("#d-statut").value; c.posteVise = $("#d-poste").value; c.notes = $("#d-notes").value;
            c.nom = $("#d-nom").value.trim(); c.titre = $("#d-titre").value.trim();
            if (ancien !== c.statut) journaliser(c, "Statut : " + statutLabel(ancien) + " → " + statutLabel(c.statut));
            sauverCandidat(c).then(function () { toast("Enregistré."); rendreDetail(); });
            break;
          case "renouveler":
            confirmer("Prolonger la conservation ?", "À faire uniquement si le candidat a donné son <strong>accord écrit</strong> pour que son CV soit conservé un an de plus. Conservez la trace de cet accord.", "Le candidat est d'accord : prolonger").then(function (ok) {
              if (!ok) return;
              c.dateExpiration = new Date(Date.now() + 365 * JOUR).toISOString(); journaliser(c, "Conservation prolongée d'un an (accord du candidat)");
              sauverCandidat(c).then(function () { rendreDetail(); toast("Conservation prolongée."); });
            });
            break;
          case "exporter-un":
            telecharger("fiche-" + c.ref + ".json", c); journaliser(c, "Fiche exportée"); sauverCandidat(c);
            break;
          case "supprimer-un":
            confirmer("Supprimer définitivement ?", "La candidature " + esc(c.ref) + " (CV, analyses, notes d'entretien) sera effacée. Action irréversible.", "Supprimer", true).then(function (ok) {
              if (!ok) return;
              S.supprimer("candidats", c.id).then(function () {
                etat.candidats = etat.candidats.filter(function (x) { return x.id !== c.id; }); viderCache(); fermerTiroir(); toast("Candidature supprimée.");
              });
            });
            break;
        }
      };
    });
  }

  demarrer();
})();
