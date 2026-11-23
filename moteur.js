/* =====================================================================
   MOTEUR D'ANALYSE (fonctionne sans Internet ni clé d'API)
   - extraction : expérience, diplômes
   - notation pondérée par critère, avec justification
   - points de vigilance (incohérences, signaux à vérifier)
   - grille d'entretien structurée
   Principe : l'outil AIDE à décider. Il ne rejette jamais un candidat
   automatiquement (exigence de contrôle humain – AI Act / RGPD art. 22).
   Il n'utilise ni l'âge, ni le genre, ni le nom, ni le niveau de diplôme
   pour noter.
   ===================================================================== */
(function (root) {
  "use strict";

  var ANNEE = new Date().getFullYear();

  function normaliser(txt) {
    return String(txt || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[’`´]/g, "'")
      .replace(/ /g, " ")
      .replace(/[ \t]+/g, " ");
  }

  function echapperRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // Un mot-clé matche s'il commence un mot ; les mots courts (≤ 4 lettres) doivent être entiers.
  function contientMot(texteNorm, motCle) {
    var k = normaliser(motCle).trim();
    var fin = k.length <= 4 ? "(?![a-z0-9])" : "";
    return new RegExp("(^|[^a-z0-9])" + echapperRegex(k) + fin).test(texteNorm);
  }

  function motsTrouves(texteNorm, liste) {
    var res = [];
    (liste || []).forEach(function (m) { if (m && contientMot(texteNorm, m) && res.indexOf(m) < 0) res.push(m); });
    return res;
  }

  var RX_DIPLOME = /(master|licence|bachelor|bts|dut|but |doctorat|rncp|^du\b|diplome|titulaire|formation gestion|certification|mba)/;

  function lignes(texte) {
    return String(texte || "").split(/\n|(?<=\.)\s+/).map(function (l) { return l.trim(); }).filter(Boolean);
  }

  /* ---------- Extraction ---------- */
  function extraireExperience(texte) {
    var t = normaliser(texte);
    var m = t.match(/(plus de\s+)?(\d+(?:[.,]\d+)?)\s*(ans|annees)\s+d['e ]\s*(experience|accompagnement|pratique)/);
    if (m) return { annees: parseFloat(m[2].replace(",", ".")) + (m[1] ? 0.5 : 0), source: m[0] };
    m = t.match(/(\d+)\s*mois/);
    if (m) return { annees: Math.round((parseInt(m[1], 10) / 12) * 10) / 10, source: m[0] };
    var ls = lignes(t);
    for (var i = 0; i < ls.length; i++) {
      var d = ls[i].match(/depuis\s+(\d+)\s*ans/);
      if (d && !RX_DIPLOME.test(ls[i])) return { annees: parseInt(d[1], 10), source: d[0] };
    }
    if (/jeune diplome|debutant|premiere experience/.test(t)) return { annees: 0, source: "débutant(e) / première expérience" };
    return { annees: null, source: null };
  }

  function extraireDiplomes(texte) {
    var res = [];
    lignes(texte).forEach(function (l) {
      var n = normaliser(l);
      if (!RX_DIPLOME.test(n)) return;
      if (/^-/.test(l)) return; // puces de compétences
      var annees = (n.match(/(19|20)\d{2}/g) || []).map(Number);
      var depuis = n.match(/depuis\s+(\d+)\s*ans/);
      if (!annees.length && depuis) annees = [ANNEE - parseInt(depuis[1], 10)];
      res.push({ texte: l, annee: annees.length ? Math.max.apply(null, annees) : null, enCours: /en cours/.test(n) });
    });
    return res;
  }

  /* ---------- Points de vigilance (indépendants du poste) ---------- */
  function vigilanceGenerale(texte, exp, diplomes, entreprise) {
    var t = normaliser(texte), v = [];
    diplomes.filter(function (d) { return d.enCours; }).forEach(function (d) {
      v.push({ niveau: "moyen", message: "Diplôme non encore obtenu (« en cours ») : « " + d.texte + " ». Vérifier la date d'obtention prévue." });
    });
    var anneesDip = diplomes.filter(function (d) { return d.annee && !d.enCours; }).map(function (d) { return d.annee; });
    var dernierDip = anneesDip.length ? Math.max.apply(null, anneesDip) : null;
    if (dernierDip && exp.annees && exp.annees > ANNEE - dernierDip) {
      v.push({ niveau: "moyen", message: "Expérience annoncée (" + exp.annees + " ans) supérieure au temps écoulé depuis le diplôme (" + dernierDip + ") : à clarifier (expérience antérieure, alternance ?)." });
    }
    if (dernierDip && dernierDip >= ANNEE - 1 && !exp.annees &&
        /(j'ai mis en place|ai mis en place|j'ai pilote|j'ai conduit|j'ai deploye)/.test(t)) {
      v.push({ niveau: "fort", message: "Diplôme très récent (" + dernierDip + ") sans durée d'expérience, mais réalisations importantes revendiquées : demander des preuves concrètes (contexte, stage, alternance ?)." });
    }
    if (/premiere experience/.test(t) && /(specialiste|expert)/.test(t)) {
      v.push({ niveau: "fort", message: "Incohérence : se présente comme spécialiste/expert(e) tout en recherchant une première expérience." });
    }
    if (exp.annees === null) {
      v.push({ niveau: "faible", message: "Durée d'expérience non précisée dans le CV." });
    }
    (entreprise.vigilance || []).forEach(function (r) {
      if (t.indexOf(normaliser(r.motif)) >= 0) v.push({ niveau: "moyen", message: r.message });
    });
    return v;
  }

  /* ---------- Notation pour un poste ---------- */
  function noterCritere(c, t, exp, entreprise) {
    if (c.type === "experience") {
      var a = exp.annees, s, j;
      if (a === null) { s = 0.4; j = "Non précisée (note neutre par défaut)"; }
      else if (a < c.min) { s = c.min ? (a / c.min) * 0.8 : 1; j = a + " an(s) – minimum souhaité : " + c.min; }
      else { s = 1; j = a + " an(s) – attendu : " + c.min + " à " + c.idealMax + " ans"; }
      return { score: s, justification: j, mots: [] };
    }
    var liste = c.type === "culture" ? entreprise.culturePositive : c.motsCles;
    var mots = motsTrouves(t, liste);
    var cible = c.type === "culture" ? 3 : (c.poids >= 4 ? 3 : 2);
    var score = Math.min(1, mots.length / cible);
    return {
      score: score, mots: mots,
      justification: mots.length ? "Repéré : " + mots.join(", ") : "Aucun élément trouvé dans le CV"
    };
  }

  function analyser(candidat, poste, entreprise) {
    var texte = candidat.texte || "";
    var t = normaliser(texte);
    var exp = extraireExperience(texte);
    var diplomes = extraireDiplomes(texte);
    var details = [], somme = 0, total = 0;
    poste.criteres.forEach(function (c) {
      var r = noterCritere(c, t, exp, entreprise);
      details.push({ id: c.id, label: c.label, poids: c.poids, score: r.score, justification: r.justification, mots: r.mots, question: c.question });
      somme += r.score * c.poids; total += c.poids;
    });
    var vig = vigilanceGenerale(texte, exp, diplomes, entreprise);
    var ce = poste.criteres.filter(function (c) { return c.type === "experience"; })[0];
    if (ce && exp.annees !== null && exp.annees > ce.idealMax + 3) {
      vig.push({ niveau: "faible", message: "Expérience (" + exp.annees + " ans) nettement au-delà du besoin : vérifier attentes salariales, motivation et perspectives (ou orienter vers un autre poste)." });
    }
    return {
      posteId: poste.id,
      score: total ? Math.round((somme / total) * 100) : 0,
      details: details,
      experience: exp,
      diplomes: diplomes,
      vigilance: vig
    };
  }

  /* ---------- Grille d'entretien ---------- */
  function grilleEntretien(analyse) {
    var q = [];
    analyse.details.slice().sort(function (a, b) { return a.score - b.score; }).forEach(function (d) {
      q.push({ theme: d.label, question: d.question, priorite: d.score < 0.5 ? "À creuser" : d.score < 1 ? "À confirmer" : "Point fort à illustrer" });
    });
    analyse.vigilance.forEach(function (v) {
      q.unshift({ theme: "Point de vigilance", question: v.message.replace(/\s*:.*$/, "") + " : pouvez-vous nous en dire plus ?", priorite: "À clarifier" });
    });
    q.push({ theme: "Motivation", question: "Pourquoi CHIFFON, et pourquoi maintenant ? Où vous voyez-vous dans 2 ans ?", priorite: "Systématique" });
    return q;
  }

  /* ---------- Découpage d'un document contenant plusieurs CV ---------- */
  function decouperCandidatures(texte) {
    var ls = String(texte || "").split(/\r?\n/);
    var titres = [];
    for (var i = 0; i < ls.length; i++) {
      if (/^\s*r[ée]sum[ée]\s*:?/i.test(ls[i])) {
        for (var j = i - 1; j >= 0; j--) {
          if (ls[j].trim()) { titres.push(j); break; }
        }
      }
    }
    if (titres.length < 2) return [{ titre: devinerTitre(texte), texte: String(texte).trim() }];
    return titres.map(function (debut, k) {
      var fin = k + 1 < titres.length ? titres[k + 1] : ls.length;
      var bloc = ls.slice(debut, fin).join("\n").replace(/^[_\s-]+/, "").trim();
      return { titre: bloc.split("\n")[0].trim(), texte: bloc };
    });
  }

  function devinerTitre(texte) {
    var l = String(texte || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    return (l[0] || "Candidature").slice(0, 80);
  }

  /* ---------- Anonymisation de l'affichage ---------- */
  function anonymiser(texte) {
    return String(texte || "")
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[e-mail masqué]")
      .replace(/(\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g, "[téléphone masqué]")
      .replace(/(n[ée]e?\s+le|date de naissance|[âa]ge)\s*:?\s*[^\n,;]+/gi, "[information masquée]")
      .replace(/https?:\/\/\S+/g, "[lien masqué]");
  }

  root.CHIFFON_MOTEUR = {
    normaliser: normaliser, extraireExperience: extraireExperience, extraireDiplomes: extraireDiplomes,
    analyser: analyser, grilleEntretien: grilleEntretien, decouperCandidatures: decouperCandidatures,
    devinerTitre: devinerTitre, anonymiser: anonymiser
  };
  if (typeof module !== "undefined") module.exports = root.CHIFFON_MOTEUR;
})(typeof window !== "undefined" ? window : globalThis);
