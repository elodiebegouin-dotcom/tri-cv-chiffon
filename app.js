/* =====================================================================
   Tri CV CHIFFON — application 100 % navigateur (aucun serveur).
   Aucun CV n'est envoyé sur Internet : lecture, masquage et notation
   sont faits localement. Seules les grilles de postes sont mémorisées
   dans le navigateur (localStorage). Les CV et le registre restent en
   mémoire et disparaissent à la fermeture de la page.
   ===================================================================== */
(() => {
  "use strict";

  const LS_GRILLES = "tricv.chiffon.grilles.v1";
  const CONSERVATION_JOURS = 365;
  const ALERTE_JOURS = 30;

  /* Couleurs des critères (ordre d'affichage) */
  const COULEURS = ["#3E4FB8", "#D6336C", "#0E9F8A", "#E39A0B", "#8E4EC6", "#0B8BD9", "#C2571A", "#5B8C2A"];
  const COUL_EXP = "#6B7390";
  const COMPARE_COUL = ["#D6336C", "#3E4FB8", "#0E9F8A"];

  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

  /* ---------------- Utilitaires ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[’`]/g, "'");
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const aujourdhui = () => new Date().toISOString().slice(0, 10);
  const ajouterJours = (iso, j) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + j); return d.toISOString().slice(0, 10); };
  const joursAvant = iso => Math.round((new Date(iso + "T12:00:00") - new Date(aujourdhui() + "T12:00:00")) / 864e5);
  const fmtDate = iso => iso ? iso.split("-").reverse().join("/") : "";
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  const pluriel = (n, s, p) => `${n} ${n > 1 ? (p || s + "s") : s}`;
  const coul = i => COULEURS[i % COULEURS.length];

  function chargerGrilles() {
    try { const g = JSON.parse(localStorage.getItem(LS_GRILLES)); if (Array.isArray(g) && g.length) return g; } catch (e) { /* ignore */ }
    return clone(GRILLES_DEFAUT);
  }
  function sauverGrilles() { try { localStorage.setItem(LS_GRILLES, JSON.stringify(etat.grilles)); } catch (e) { /* ignore */ } }

  /* ---------------- État ---------------- */
  const etat = {
    grilles: chargerGrilles(),
    grilleId: null,
    vue: "p-grille",
    candidats: [],
    registre: [],
    journal: [],
    filtre: "tous",
    recherche: "",
    tri: "score",
    detail: null,
    comparer: new Set(),
    animer: true,
    compteur: 0
  };
  etat.grilleId = etat.grilles[0].id;
  const grille = () => etat.grilles.find(g => g.id === etat.grilleId) || etat.grilles[0];

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2800);
  }
  function telecharger(nom, contenu, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([contenu], { type })); a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------------- Masquage des données à risque de biais ---------------- */
  const D = "(?<![\\wÀ-ÿ])", F = "(?![\\wÀ-ÿ])";
  const R = (s, f = "gi") => new RegExp(s, f);
  const MASQUES = [
    [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]"],
    [/(\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g, "[téléphone]"],
    [/(https?:\/\/)?(www\.)?linkedin\.com\/\S+/gi, "[profil en ligne]"],
    [/\b\d{1,2}[\/.-]\d{1,2}[\/.-](19|20)\d{2}\b/g, "[date]"],
    [R(D + "(date de naissance|n[ée]e?(\\s*\\(e\\))?\\s+le)" + F + "\\s*:?[^\\n.;,]{0,25}"), "[naissance]"],
    [R(D + "(âg[ée]e?s?|age)\\s*(de|:)?\\s*\\d{2}\\s*ans"), "[âge]"],
    [/\b(19|20)\d{2}\b/g, "[année]"],
    [R(D + "(mari[ée]e?|c[ée]libataire|pacs[ée]e?|divorc[ée]e?|veuf|veuve)" + F), "[situation familiale]"],
    [R(D + "\\d+\\s+enfants?" + F), "[situation familiale]"],
    [R(D + "nationalit[ée]\\s*:?\\s*[^\\n,;.]+"), "[nationalité]"],
    [R(D + "(madame|monsieur|mme|mlle)" + F + "\\.?"), "[civilité]"],
    [R(D + "\\d{1,4}\\s*,?\\s*(bis\\s+)?(rue|avenue|av\\.|boulevard|bd|chemin|all[ée]e|impasse|place|route)" + F + "[^\\n,]*"), "[adresse]"],
    [/\b\d{5}\s+[A-ZÉÈ][\w-]+/g, "[ville]"]
  ];
  function masquer(texte) {
    let n = 0, t = texte;
    for (const [re, rep] of MASQUES) t = t.replace(re, () => { n++; return rep; });
    return { texte: t, nb: n };
  }

  /* Expérience déclarée (heuristique) : « 8 ans », « plus de 12 ans », « 18 mois » */
  function experience(texte) {
    const t = norm(texte);
    let max = null;
    for (const m of t.matchAll(/(?:^|[^\d])(\d{1,2})\s*(?:ans|annees)\b/g)) {
      if (/age/.test(t.slice(Math.max(0, m.index - 12), m.index))) continue;
      const v = +m[1]; if (v <= 45) max = Math.max(max ?? 0, v);
    }
    for (const m of t.matchAll(/(\d{1,3})\s*mois\b/g)) max = Math.max(max ?? 0, Math.round(+m[1] / 12 * 10) / 10);
    return max;
  }

  /* ---------------- Notation ---------------- */
  function trouve(tNorm, motCle) {
    const k = norm(motCle).trim(); if (!k) return false;
    return new RegExp("(^|[^a-z0-9])" + reEsc(k)).test(tNorm);
  }
  const cache = new Map();
  function analyser(c, g) {
    const cle = c.ref + "|" + JSON.stringify(g);
    if (cache.has(cle)) return cache.get(cle);
    const m = masquer(c.texte), t = norm(m.texte), exp = experience(c.texte);
    let total = 0, poidsTotal = 0;
    const details = g.criteres.map((cr, i) => {
      const hits = [...new Set(cr.motsCles.filter(k => trouve(t, k)))];
      const s = Math.min(1, hits.length / 2);
      total += cr.poids * s; poidsTotal += +cr.poids;
      return { ...cr, hits, s, couleur: coul(i) };
    });
    let sExp = 0;
    if (g.poidsExp > 0) {
      sExp = exp == null ? 0 : Math.min(1, exp / Math.max(1, g.minExp));
      total += g.poidsExp * sExp; poidsTotal += +g.poidsExp;
    }
    const score = poidsTotal ? Math.round(total / poidsTotal * 100) : 0;
    const signaux = [];
    details.filter(d => d.indispensable && !d.hits.length)
      .forEach(d => signaux.push({ grave: true, message: `Critère indispensable non détecté : ${d.nom}.` }));
    if (exp == null) signaux.push({ message: "Expérience non chiffrée dans le CV : à vérifier en entretien." });
    else if (exp < g.minExp) signaux.push({ message: `Expérience détectée (${pluriel(exp, "an")}) inférieure au minimum souhaité (${g.minExp} ans).` });
    (g.signaux || []).forEach(sg => {
      const motifs = sg.motif.split("|").map(s => s.trim()).filter(Boolean);
      if (motifs.some(k => trouve(t, k))) signaux.push({ message: sg.message });
    });
    const manque = signaux.some(s => s.grave);
    const niveau = manque ? "manque" : score >= 70 ? "fort" : score >= 45 ? "moyen" : "faible";
    const r = { score, details, exp, sExp, signaux, niveau, masque: m };
    cache.set(cle, r);
    return r;
  }
  const NIVEAUX = {
    fort: { lib: "Forte adéquation", coul: "#0E9F8A" },
    moyen: { lib: "À étudier", coul: "#E39A0B" },
    faible: { lib: "Faible adéquation", coul: "#6B7390" },
    manque: { lib: "Indispensable absent", coul: "#E5484D" }
  };
  const DECISIONS = {
    "a-trier": { lib: "À trier", coul: "#6B7390", bg: "#ECEEF4" },
    "rencontrer": { lib: "À rencontrer", coul: "#2B3A86", bg: "#E8EBFA" },
    "vivier": { lib: "Vivier (1 an)", coul: "#0E9F8A", bg: "#DDF5F0" },
    "non-retenu": { lib: "Non retenu", coul: "#C1272D", bg: "#FDE7E8" },
    "embauche": { lib: "Embauché(e)", coul: "#D6336C", bg: "#FCE7EF" }
  };

  function questions(a, g) {
    const q = [];
    a.details.slice().sort((x, y) => x.s - y.s).slice(0, 3).forEach(d => q.push(d.s < 1
      ? `${d.nom} : décrivez une situation concrète où vous avez agi sur ce sujet. Contexte, rôle, résultat ?`
      : `${d.nom} : quel projet vous rend le plus fier(e), et que referiez-vous autrement ?`));
    a.signaux.filter(s => !s.grave).slice(0, 3).forEach(s => q.push(`À clarifier : ${s.message}`));
    q.push(`CHIFFON fabrique en France à partir de tissus recyclés, avec une vocation sociale : qu'est-ce qui vous donne envie de rejoindre ce projet comme ${g.poste} ?`);
    return q;
  }

  /* ---------------- Composants SVG ---------------- */
  function anneau(score, niveau, i = 0) {
    const r = 25, C = 2 * Math.PI * r, off = C * (1 - score / 100);
    return `<svg class="anneau ac-${niveau}" viewBox="0 0 64 64" style="--i:${i};--plein:${C.toFixed(1)}" role="img" aria-label="Score ${score} sur 100">
      <circle class="couture" cx="32" cy="32" r="30.5"/>
      <circle class="piste" cx="32" cy="32" r="${r}"/>
      <circle class="prog" cx="32" cy="32" r="${r}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
      <text x="32" y="38" text-anchor="middle">${score}</text></svg>`;
  }

  function radar(axes, series) {
    const n = axes.length; if (n < 3) return "";
    const W = 400, H = 300, cx = W / 2, cy = H / 2 + 4, R0 = 96;
    const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R0 * v, cy + Math.sin(a) * R0 * v]; };
    let s = `<svg class="radar-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Profil par critère">`;
    [.25, .5, .75, 1].forEach(l => s += `<polygon class="grille-r" points="${axes.map((_, i) => pt(i, l).join(",")).join(" ")}"/>`);
    axes.forEach((ax, i) => {
      const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.2);
      s += `<line class="axe" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`;
      const anc = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
      const mots = ax.split(" "); let l1 = "", l2 = "";
      mots.forEach(m => { if ((l1 + " " + m).trim().length <= 16 && !l2) l1 = (l1 + " " + m).trim(); else l2 = (l2 + " " + m).trim(); });
      if (l2.length > 18) l2 = l2.slice(0, 17) + "…";
      s += `<text x="${lx}" y="${ly - (l2 ? 5 : 0)}" text-anchor="${anc}" dominant-baseline="middle">${esc(l1)}${l2 ? `<tspan x="${lx}" dy="12">${esc(l2)}</tspan>` : ""}</text>`;
    });
    series.forEach(se => {
      s += `<polygon class="forme" points="${se.valeurs.map((v, i) => pt(i, Math.max(.03, v)).join(",")).join(" ")}" fill="${se.couleur}" stroke="${se.couleur}"/>`;
      se.valeurs.forEach((v, i) => { const [x, y] = pt(i, Math.max(.03, v)); s += `<circle class="point" cx="${x}" cy="${y}" r="4" fill="${se.couleur}"/>`; });
    });
    return s + "</svg>";
  }

  /* ---------------- Navigation ---------------- */
  function allerA(vue) {
    etat.vue = vue;
    $$(".etape").forEach(b => { const on = b.dataset.vue === vue; b.classList.toggle("actif", on); b.setAttribute("aria-current", on ? "page" : "false"); });
    $$(".vue").forEach(v => v.hidden = v.id !== vue);
    if (vue === "p-classement") etat.animer = true;
    rendreTout();
    window.scrollTo({ top: 0 });
  }
  $$(".etape").forEach(b => b.addEventListener("click", () => allerA(b.dataset.vue)));
  document.addEventListener("click", e => { const a = e.target.closest("[data-aller]"); if (a) allerA(a.dataset.aller); });

  $("#selPoste").addEventListener("change", e => {
    etat.grilleId = e.target.value; etat.animer = true; etat.filtre = "tous";
    rendreTout(); toast(`Poste sélectionné : ${grille().poste}`);
  });

  function rendreHaut() {
    const g = grille();
    $("#selPoste").innerHTML = etat.grilles.map(x => `<option value="${esc(x.id)}" ${x.id === g.id ? "selected" : ""}>${esc(x.poste)}</option>`).join("");
    const n = etat.candidats.length;
    $("#navCV").textContent = n ? pluriel(n, "CV chargé") : "Aucun CV chargé";
    $("#navPoste").textContent = pluriel(g.criteres.length, "critère");
    const decides = etat.candidats.filter(c => c.decision !== "a-trier").length;
    $("#navClass").textContent = n ? `${decides} sur ${n} décidés` : "Scores et décisions";
    const alertes = etat.registre.filter(r => /^(EXPIRÉ|Sans|Expire)/.test(r.statut)).length;
    $("#navReg").textContent = alertes ? `${pluriel(alertes, "action")} à faire` : "Conservation des CV";
    if (!n) { $("#resumeHaut").innerHTML = ""; return; }
    const cnt = { fort: 0, moyen: 0, faible: 0, manque: 0 };
    etat.candidats.forEach(c => cnt[analyser(c, g).niveau]++);
    $("#resumeHaut").innerHTML = Object.entries(cnt).filter(([, v]) => v)
      .map(([k, v]) => `<span class="puce"><i style="background:${NIVEAUX[k].coul}"></i>${v} ${NIVEAUX[k].lib.toLowerCase()}</span>`).join("");
  }

  /* ---------------- Vue 1 : grille ---------------- */
  function rendreGrille() {
    const g = grille();
    if (document.activeElement !== $("#gPoste")) $("#gPoste").value = g.poste;
    if (document.activeElement !== $("#gContexte")) $("#gContexte").value = g.contexte || "";
    $("#gMinExp").value = g.minExp; $("#oMinExp").textContent = pluriel(g.minExp, "an");
    $("#gPoidsExp").value = g.poidsExp; $("#oPoidsExp").textContent = g.poidsExp;
    $("#gPoidsExp").style.setProperty("--c", COUL_EXP);
    rendreRepartition();
    $("#criteres").innerHTML = g.criteres.map((c, i) => `
      <div class="critere-carte" style="--c:${coul(i)}" data-i="${i}">
        <div class="ligne1">
          <input data-f="nom" value="${esc(c.nom)}" aria-label="Nom du critère">
          <button class="icone" data-suppr="${i}" aria-label="Supprimer le critère ${esc(c.nom)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="ligne2">
          <span class="curseur"><input type="range" min="0" max="50" data-f="poids" value="${c.poids}" style="--c:${coul(i)}" aria-label="Poids"><output>${c.poids}</output></span>
          <label class="interrupteur"><input type="checkbox" data-f="indispensable" ${c.indispensable ? "checked" : ""}><i></i>Indispensable</label>
        </div>
        <div class="puces-mots">
          ${c.motsCles.map((k, j) => `<span class="mot">${esc(k)}<button data-mot="${j}" aria-label="Retirer ${esc(k)}">×</button></span>`).join("")}
          <input data-f="ajoutMot" placeholder="Ajouter un mot-clé puis Entrée" aria-label="Ajouter un mot-clé">
        </div>
      </div>`).join("");
    $("#signauxEdit").innerHTML = (g.signaux || []).map((s, i) => `
      <div class="signal-ligne" data-i="${i}">
        <input data-f="motif" value="${esc(s.motif)}" aria-label="Expressions recherchées">
        <input data-f="message" value="${esc(s.message)}" aria-label="Message affiché">
        <button class="icone" data-suppr-sig="${i}" aria-label="Supprimer ce point d'attention"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>`).join("");
  }
  function rendreRepartition() {
    const g = grille();
    const items = [...g.criteres.map((c, i) => ({ nom: c.nom, p: +c.poids || 0, c: coul(i) })), { nom: "Expérience", p: +g.poidsExp || 0, c: COUL_EXP }];
    const tot = items.reduce((s, x) => s + x.p, 0) || 1;
    $("#repartition").innerHTML = items.map(x => `<span style="flex-grow:${x.p};background:${x.c}" title="${esc(x.nom)} : ${Math.round(x.p / tot * 100)} %"></span>`).join("");
    $("#legendeRep").innerHTML = items.map(x => `<span><i style="background:${x.c}"></i>${esc(x.nom)} <b>${Math.round(x.p / tot * 100)} %</b></span>`).join("");
  }
  const majGrille = () => { cache.clear(); sauverGrilles(); };

  $("#gPoste").addEventListener("input", e => { grille().poste = e.target.value; majGrille(); $("#selPoste").selectedOptions[0].textContent = e.target.value; });
  $("#gContexte").addEventListener("input", e => { grille().contexte = e.target.value; majGrille(); });
  $("#gMinExp").addEventListener("input", e => { grille().minExp = +e.target.value; $("#oMinExp").textContent = pluriel(+e.target.value, "an"); majGrille(); });
  $("#gPoidsExp").addEventListener("input", e => { grille().poidsExp = +e.target.value; $("#oPoidsExp").textContent = e.target.value; majGrille(); rendreRepartition(); });

  $("#criteres").addEventListener("input", e => {
    const carte = e.target.closest(".critere-carte"); if (!carte) return;
    const c = grille().criteres[+carte.dataset.i], f = e.target.dataset.f;
    if (f === "nom") { c.nom = e.target.value; rendreRepartition(); }
    else if (f === "poids") { c.poids = +e.target.value; e.target.nextElementSibling.textContent = e.target.value; rendreRepartition(); }
    else if (f === "indispensable") c.indispensable = e.target.checked;
    else return;
    majGrille();
  });
  $("#criteres").addEventListener("change", e => { if (e.target.dataset.f === "indispensable") { grille().criteres[+e.target.closest(".critere-carte").dataset.i].indispensable = e.target.checked; majGrille(); } });
  $("#criteres").addEventListener("keydown", e => {
    if (e.target.dataset.f !== "ajoutMot" || (e.key !== "Enter" && e.key !== ",")) return;
    e.preventDefault();
    const i = +e.target.closest(".critere-carte").dataset.i, v = e.target.value.trim().replace(/,$/, "");
    if (!v) return;
    const c = grille().criteres[i];
    v.split(",").map(s => s.trim()).filter(Boolean).forEach(m => { if (!c.motsCles.includes(m)) c.motsCles.push(m); });
    majGrille(); rendreGrille();
    $(`.critere-carte[data-i="${i}"] [data-f="ajoutMot"]`).focus();
  });
  $("#criteres").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const i = +b.closest(".critere-carte").dataset.i;
    if (b.dataset.suppr != null) {
      const nom = grille().criteres[i].nom;
      grille().criteres.splice(i, 1); toast(`Critère supprimé : ${nom}`);
    } else if (b.dataset.mot != null) grille().criteres[i].motsCles.splice(+b.dataset.mot, 1);
    else return;
    majGrille(); rendreGrille();
  });
  $("#signauxEdit").addEventListener("input", e => {
    const l = e.target.closest(".signal-ligne"); if (!l) return;
    grille().signaux[+l.dataset.i][e.target.dataset.f] = e.target.value; majGrille();
  });
  $("#signauxEdit").addEventListener("click", e => {
    const b = e.target.closest("[data-suppr-sig]"); if (!b) return;
    grille().signaux.splice(+b.dataset.supprSig, 1); majGrille(); rendreGrille();
  });
  $("#btnAjoutCritere").addEventListener("click", () => {
    grille().criteres.push({ nom: "Nouveau critère", poids: 10, indispensable: false, motsCles: [] });
    majGrille(); rendreGrille();
    $$(".critere-carte").pop().querySelector("input").select();
  });
  $("#btnAjoutSignal").addEventListener("click", () => {
    (grille().signaux ||= []).push({ motif: "expression|variante", message: "Point à vérifier en entretien." });
    majGrille(); rendreGrille();
  });
  $("#btnNouveauPoste").addEventListener("click", () => {
    const id = "poste-" + Date.now();
    etat.grilles.push({ id, poste: "Nouveau poste", contexte: "", minExp: 2, poidsExp: 10,
      criteres: [{ nom: "Compétence principale", poids: 40, indispensable: true, motsCles: [] }], signaux: clone(SIGNAUX_DEFAUT) });
    etat.grilleId = id; majGrille(); rendreTout(); $("#gPoste").select();
  });
  $("#btnDupliquer").addEventListener("click", () => {
    const n = clone(grille()); n.id = "poste-" + Date.now(); n.poste += " (copie)";
    etat.grilles.push(n); etat.grilleId = n.id; majGrille(); rendreTout(); toast("Grille dupliquée.");
  });
  $("#btnSupprPoste").addEventListener("click", () => {
    if (etat.grilles.length < 2) return toast("Gardez au moins un poste.");
    if (!confirm(`Supprimer la grille « ${grille().poste} » ?`)) return;
    etat.grilles = etat.grilles.filter(g => g.id !== etat.grilleId);
    etat.grilleId = etat.grilles[0].id; majGrille(); rendreTout();
  });
  $("#btnReinit").addEventListener("click", () => {
    if (!confirm("Revenir aux 5 grilles CHIFFON d'origine ? Vos modifications seront perdues.")) return;
    etat.grilles = clone(GRILLES_DEFAUT); etat.grilleId = etat.grilles[0].id; majGrille(); rendreTout(); toast("Grilles d'origine rétablies.");
  });
  $("#btnExportGrilles").addEventListener("click", () => telecharger("grilles-postes-chiffon.json", JSON.stringify(etat.grilles, null, 2), "application/json"));
  $("#fImportGrilles").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const g = JSON.parse(await f.text());
      if (!Array.isArray(g) || !g.every(x => x.id && x.poste && Array.isArray(x.criteres))) throw 0;
      etat.grilles = g; etat.grilleId = g[0].id; majGrille(); rendreTout(); toast(`${pluriel(g.length, "grille importée", "grilles importées")}.`);
    } catch { toast("Ce fichier n'est pas un export de grilles valide."); }
    e.target.value = "";
  });

  /* ---------------- Vue 2 : candidatures ---------------- */
  const nouvelleRef = () => `CAND-${aujourdhui().replace(/-/g, "")}-${String(++etat.compteur).padStart(3, "0")}`;
  function ajouterCandidat(nom, texte, ext = "txt") {
    texte = (texte || "").trim();
    if (texte.length < 40) { toast(`${nom} : texte introuvable. S'il s'agit d'un PDF scanné, collez son texte.`); return false; }
    etat.candidats.push({ ref: nouvelleRef(), nom, texte, ext, decision: "a-trier", consentement: false, dernierContact: aujourdhui(), note: "" });
    return true;
  }
  async function lireFichier(f) {
    const ext = f.name.split(".").pop().toLowerCase();
    if (ext === "txt" || ext === "md") return f.text();
    if (ext === "docx") return (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value;
    if (ext === "pdf") {
      const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
      let t = "";
      for (let p = 1; p <= pdf.numPages; p++) {
        const c = await (await pdf.getPage(p)).getTextContent();
        t += c.items.map(i => i.str + (i.hasEOL ? "\n" : " ")).join("") + "\n";
      }
      return t;
    }
    throw new Error("format non pris en charge (PDF, Word .docx ou texte).");
  }
  async function importerFichiers(files) {
    let ok = 0;
    for (const f of files) {
      try { if (ajouterCandidat(f.name.replace(/\.[^.]+$/, ""), await lireFichier(f), f.name.split(".").pop().toLowerCase())) ok++; }
      catch (err) { toast(`${f.name} : ${err.message || "lecture impossible"}`); }
    }
    if (ok) { toast(`${pluriel(ok, "CV importé")}.`); etat.animer = true; }
    rendreTout();
  }
  $("#fCV").addEventListener("change", e => { importerFichiers([...e.target.files]); e.target.value = ""; });
  const zone = $("#zoneDepot");
  ["dragenter", "dragover"].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add("survol"); }));
  ["dragleave", "drop"].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove("survol"); }));
  zone.addEventListener("drop", e => importerFichiers([...e.dataTransfer.files]));
  zone.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#fCV").click(); } });

  $("#btnColler").addEventListener("click", () => {
    const nom = $("#collerNom").value.trim() || `CV collé ${etat.candidats.length + 1}`;
    if (ajouterCandidat(nom, $("#collerTexte").value)) { $("#collerNom").value = ""; $("#collerTexte").value = ""; toast(`CV ajouté : ${nom}`); }
    rendreTout();
  });
  function chargerDemo() {
    let n = 0;
    CANDIDATURES_DEMO.forEach(([nom, t]) => { if (!etat.candidats.some(c => c.nom === nom) && ajouterCandidat(nom, t, "txt")) n++; });
    toast(n ? `${pluriel(n, "candidature chargée", "candidatures chargées")} depuis l'Annexe 2.` : "Les candidatures de l'Annexe 2 sont déjà chargées.");
    etat.animer = true;
  }
  $("#btnDemo").addEventListener("click", () => { chargerDemo(); rendreTout(); });
  $("#btnDemo2").addEventListener("click", () => { chargerDemo(); rendreTout(); });
  $("#btnVersClassement").addEventListener("click", () => allerA("p-classement"));
  $("#btnViderCV").addEventListener("click", () => {
    if (!etat.candidats.length || !confirm("Retirer toutes les candidatures de la page ?")) return;
    etat.candidats = []; etat.comparer.clear(); fermerDetail(); rendreTout();
  });
  $("#listeCV").addEventListener("click", e => {
    const r = e.target.closest("[data-retirer]")?.dataset.retirer; if (!r) return;
    etat.candidats = etat.candidats.filter(c => c.ref !== r); etat.comparer.delete(r); rendreTout();
  });
  function rendreCandidats() {
    $("#nbCV").textContent = etat.candidats.length;
    $("#btnVersClassement").hidden = !etat.candidats.length;
    $("#listeCV").innerHTML = etat.candidats.length ? etat.candidats.map(c => `
      <li><span class="ext ${esc(c.ext)}">${esc(c.ext.toUpperCase())}</span>
        <span class="infos"><b title="${esc(c.nom)}">${esc(c.nom)}</b><small>${esc(c.ref)}, ${c.texte.length.toLocaleString("fr-FR")} caractères</small></span>
        <button class="icone" data-retirer="${esc(c.ref)}" aria-label="Retirer ${esc(c.nom)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`).join("")
      : `<li class="vide">Les CV importés apparaîtront ici.</li>`;
  }

  /* ---------------- Vue 3 : classement ---------------- */
  function lignesClassees() {
    const g = grille();
    let l = etat.candidats.map(c => ({ c, a: analyser(c, g) }));
    l.sort((x, y) => (x.a.niveau === "manque") - (y.a.niveau === "manque") || y.a.score - x.a.score);
    l.forEach((x, i) => x.rang = i + 1);
    if (etat.filtre !== "tous") l = l.filter(x => x.a.niveau === etat.filtre);
    const q = norm(etat.recherche).trim();
    if (q) l = l.filter(x => norm(x.c.nom + " " + x.c.texte).includes(q));
    if (etat.tri === "nom") l.sort((x, y) => x.c.nom.localeCompare(y.c.nom, "fr"));
    if (etat.tri === "signaux") l.sort((x, y) => y.a.signaux.length - x.a.signaux.length);
    return l;
  }

  function rendreClassement() {
    const g = grille();
    $("#titreClassement").textContent = g.poste;
    $("#contexteCourant").textContent = g.contexte || "";
    const vide = !etat.candidats.length;
    $("#vueVide").hidden = !vide; $("#vuePleine").hidden = vide;
    if (vide) return;

    const toutes = etat.candidats.map(c => analyser(c, g));
    const cnt = { fort: 0, moyen: 0, faible: 0, manque: 0 };
    toutes.forEach(a => cnt[a.niveau]++);
    const moy = Math.round(toutes.reduce((s, a) => s + a.score, 0) / toutes.length);
    const decides = etat.candidats.filter(c => c.decision !== "a-trier").length;
    $("#tuiles").innerHTML = `
      <div class="tuile t-indigo"><b>${etat.candidats.length}</b><span>candidatures analysées</span></div>
      <div class="tuile t-vert"><b>${cnt.fort}</b><span>en forte adéquation (70 et plus)</span></div>
      <div class="tuile t-garance"><b>${moy}</b><span>score moyen sur 100</span></div>
      <div class="tuile t-safran"><b>${decides}<small style="font-size:1rem;color:var(--texte-2)"> / ${etat.candidats.length}</small></b><span>décisions prises</span></div>`;

    // Répartition par niveau d'adéquation (cliquable = filtre)
    const tf = ["fort", "moyen", "faible", "manque"];
    const nb = tf.map(k => cnt[k]);
    const max = Math.max(1, ...nb), W = 520, H = 170, bw = 96, gap = (W - 4 * bw) / 5;
    $("#histo").innerHTML = `<svg class="histo-svg" viewBox="0 0 ${W} ${H + 34}" role="img" aria-label="Répartition par niveau d'adéquation">
      <line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="#E2E5EF"/>
      ${nb.map((v, i) => { const h = Math.max(4, v / max * (H - 30)), x = gap + i * (bw + gap), n = NIVEAUX[tf[i]];
        const estompe = etat.filtre !== "tous" && etat.filtre !== tf[i] ? "estompe" : "";
        return `<g class="barre ${estompe}" data-filtre="${tf[i]}" tabindex="0" role="button" aria-label="Afficher : ${n.lib}">
          <rect class="b" x="${x}" y="${H - h}" width="${bw}" height="${h}" rx="8" fill="${n.coul}"/>
          <text class="val" x="${x + bw / 2}" y="${H - h - 8}" text-anchor="middle">${v}</text>
          <text x="${x + bw / 2}" y="${H + 20}" text-anchor="middle">${n.lib}</text></g>`; }).join("")}
    </svg>`;

    // Donut des décisions
    const dc = Object.keys(DECISIONS).map(k => ({ k, v: etat.candidats.filter(c => c.decision === k).length }));
    const tot = etat.candidats.length, r = 52, C = 2 * Math.PI * r; let acc = 0;
    $("#donut").innerHTML = `<svg viewBox="0 0 140 140" role="img" aria-label="Décisions prises">
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="#ECEEF4" stroke-width="18"/>
      ${dc.filter(d => d.v).map(d => { const len = d.v / tot * C; const s = `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${DECISIONS[d.k].coul}" stroke-width="18" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 70 70)"/>`; acc += len; return s; }).join("")}
      <text class="centre-val" x="70" y="72" text-anchor="middle">${Math.round(decides / tot * 100)} %</text>
      <text class="centre-lib" x="70" y="90" text-anchor="middle">décidés</text></svg>
      <div class="donut-legende">${dc.map(d => `<span><i style="background:${DECISIONS[d.k].coul}"></i>${DECISIONS[d.k].lib}<b>${d.v}</b></span>`).join("")}</div>`;

    // Filtres
    const filtres = [["tous", "Toutes", "#1B2559", etat.candidats.length], ...Object.entries(NIVEAUX).map(([k, n]) => [k, n.lib, n.coul, cnt[k]])];
    $("#filtres").innerHTML = filtres.map(([k, lib, c, n]) =>
      `<button class="filtre" role="tab" style="--fc:${c}" data-filtre="${k}" aria-selected="${etat.filtre === k}"><i></i>${lib} <em>${n}</em></button>`).join("");

    // Liste
    const l = lignesClassees();
    const liste = $("#candidats");
    liste.classList.toggle("anim", etat.animer); etat.animer = false;
    liste.innerHTML = l.length ? l.map(({ c, a, rang }, i) => {
      const n = NIVEAUX[a.niveau], d = DECISIONS[c.decision];
      const tot = a.details.reduce((s, x) => s + (+x.poids || 0), 0) || 1;
      return `<li class="cand niv-${a.niveau} ${etat.detail === c.ref ? "ouvert" : ""}" data-ref="${esc(c.ref)}" tabindex="0" aria-label="${esc(c.nom)}, score ${a.score}">
        <span class="rang">${rang}</span>
        ${anneau(a.score, a.niveau, i)}
        <div class="cand-nom"><b>${esc(c.nom)}</b><span class="etiquette n-${a.niveau}">${n.lib}</span></div>
        <div class="mini">
          <div class="mini-criteres">${a.details.map(x => `<span style="flex:${(+x.poids || 0) / tot};--c:${x.couleur};--s:${x.s * 100}%" title="${esc(x.nom)} : ${Math.round(x.s * 100)} %"></span>`).join("")}</div>
          <span class="mini-legende">${a.details.filter(x => x.s === 1).length} critère(s) sur ${a.details.length} pleinement couverts</span>
        </div>
        <span class="cand-alertes ${a.signaux.length ? "" : "zero"}">${a.signaux.length ? pluriel(a.signaux.length, "point") + " d'attention" : "Aucun point d'attention"}</span>
        <div class="cand-fin">
          <span class="decision-pastille" style="--dc:${d.coul};--dc-bg:${d.bg}">${d.lib}</span>
          <label class="case-comparer" title="Ajouter à la comparaison" onclick="event.stopPropagation()"><input type="checkbox" data-comparer="${esc(c.ref)}" ${etat.comparer.has(c.ref) ? "checked" : ""} aria-label="Comparer ${esc(c.nom)}"></label>
        </div>
      </li>`; }).join("")
      : `<li class="vide-liste">Aucune candidature ne correspond. <button class="btn lien" data-reinit-filtres>Afficher toutes les candidatures</button></li>`;
    rendreBarreComparer();
  }

  $("#filtres").addEventListener("click", e => { const b = e.target.closest("[data-filtre]"); if (!b) return; etat.filtre = b.dataset.filtre; rendreClassement(); });
  $("#histo").addEventListener("click", e => { const b = e.target.closest("[data-filtre]"); if (!b) return; etat.filtre = etat.filtre === b.dataset.filtre ? "tous" : b.dataset.filtre; rendreClassement(); });
  $("#histo").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.closest("[data-filtre]")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
  $("#recherche").addEventListener("input", e => { etat.recherche = e.target.value; rendreClassement(); });
  $("#tri").addEventListener("change", e => { etat.tri = e.target.value; rendreClassement(); });
  $("#candidats").addEventListener("click", e => {
    if (e.target.closest("[data-reinit-filtres]")) { etat.filtre = "tous"; etat.recherche = ""; $("#recherche").value = ""; rendreClassement(); return; }
    if (e.target.closest(".case-comparer")) return;
    const li = e.target.closest(".cand"); if (li) ouvrirDetail(li.dataset.ref);
  });
  $("#candidats").addEventListener("keydown", e => { const li = e.target.closest(".cand"); if (li && e.target === li && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ouvrirDetail(li.dataset.ref); } });
  $("#candidats").addEventListener("change", e => {
    const r = e.target.dataset.comparer; if (!r) return;
    if (e.target.checked) {
      if (etat.comparer.size >= 3) { e.target.checked = false; return toast("Comparez au maximum 3 candidatures."); }
      etat.comparer.add(r);
    } else etat.comparer.delete(r);
    rendreBarreComparer();
  });

  /* ---------------- Tiroir de détail ---------------- */
  function ouvrirDetail(ref) {
    etat.detail = ref;
    $("#tiroir").classList.add("ouvert"); $("#tiroir").setAttribute("aria-hidden", "false");
    $("#voile").hidden = false; document.body.style.overflow = "hidden";
    rendreDetail();
    $$(".cand").forEach(li => li.classList.toggle("ouvert", li.dataset.ref === ref));
    setTimeout(() => $("#tFermer").focus(), 50);
  }
  function fermerDetail() {
    if (!etat.detail) return;
    const ref = etat.detail; etat.detail = null;
    $("#tiroir").classList.remove("ouvert"); $("#tiroir").setAttribute("aria-hidden", "true");
    $("#voile").hidden = true; document.body.style.overflow = "";
    $$(".cand").forEach(li => li.classList.remove("ouvert"));
    $(`.cand[data-ref="${CSS.escape(ref)}"]`)?.focus();
  }
  function rendreDetail() {
    const g = grille(), c = etat.candidats.find(x => x.ref === etat.detail);
    if (!c) return fermerDetail();
    const a = analyser(c, g), l = lignesClassees(), pos = l.findIndex(x => x.c.ref === c.ref);
    $("#tPos").textContent = pos >= 0 ? `${pos + 1} sur ${l.length}` : "";
    $("#tPrec").disabled = pos <= 0; $("#tSuiv").disabled = pos < 0 || pos >= l.length - 1;
    const n = NIVEAUX[a.niveau];
    const axes = [...a.details.map(d => d.nom), "Expérience"];
    const vals = [...a.details.map(d => d.s), a.sExp];
    const texteMasque = esc(a.masque.texte).replace(/\[(e-mail|téléphone|profil en ligne|date|naissance|âge|année|situation familiale|nationalité|civilité|adresse|ville)\]/g, '<span class="m">$1</span>');
    $("#tiroirCorps").innerHTML = `
      <div class="fiche-tete">${anneau(a.score, a.niveau)}
        <div><h2 id="tiroirTitre">${esc(c.nom)}</h2>
        <span class="etiquette n-${a.niveau}">${n.lib}</span>
        <p>${esc(c.ref)}, analysé pour le poste ${esc(g.poste)}</p></div></div>
      <div class="fiche-cols">
        <div class="bloc"><h2>Profil par critère</h2>${radar(axes, [{ valeurs: vals, couleur: n.coul }])}</div>
        <div class="bloc"><h2>Détail du score</h2>
          ${a.details.map(d => `<div class="crit-ligne" style="--c:${d.couleur}">
            <div class="haut"><span><i></i>${esc(d.nom)} ${d.indispensable ? '<span class="ind">indispensable</span>' : ""}</span><span>${Math.round(d.s * 100)} %</span></div>
            <div class="barre-c"><span style="width:${d.s * 100}%"></span></div>
            <div class="trouves">${d.hits.length ? d.hits.map(h => `<mark>${esc(h)}</mark>`).join("") : "<em>Aucun mot-clé trouvé</em>"}</div></div>`).join("")}
          <div class="crit-ligne" style="--c:${COUL_EXP}">
            <div class="haut"><span><i></i>Expérience (minimum ${g.minExp} ans)</span><span>${a.exp == null ? "non chiffrée" : pluriel(a.exp, "an")}</span></div>
            <div class="barre-c"><span style="width:${a.sExp * 100}%"></span></div></div>
        </div>
      </div>
      <div class="bloc"><h2>Points d'attention</h2>
        <ul class="liste-alertes">${a.signaux.length ? a.signaux.map(s => `<li class="${s.grave ? "grave" : ""}">${esc(s.message)}</li>`).join("") : '<li class="ok">Aucun point d\'attention détecté.</li>'}</ul></div>
      <div class="bloc"><h2>Questions pour l'entretien</h2><ol class="questions">${questions(a, g).map(q => `<li>${esc(q)}</li>`).join("")}</ol></div>
      <div class="bloc"><h2>Votre décision</h2>
        <div class="decision-choix" role="group" aria-label="Décision">
          ${Object.entries(DECISIONS).map(([k, d]) => `<button style="--dc:${d.coul}" data-decision="${k}" aria-pressed="${c.decision === k}">${d.lib}</button>`).join("")}
        </div>
        <div class="form-decision">
          <label class="case-ligne"><input type="checkbox" data-champ="consentement" ${c.consentement ? "checked" : ""}>Le candidat accepte que son CV soit conservé 1 an pour d'autres postes.</label>
          ${c.decision === "vivier" && !c.consentement ? `<p class="alerte">Sans l'accord du candidat, le CV ne peut pas entrer dans le vivier.</p>` : ""}
          <label class="champ">Date du dernier contact<input type="date" data-champ="dernierContact" value="${c.dernierContact}"></label>
          <label class="champ">Notes (faits liés au poste uniquement)<textarea data-champ="note" rows="3">${esc(c.note)}</textarea></label>
        </div>
      </div>
      <div class="bloc texte-cv"><details><summary>Texte analysé, avec ${pluriel(a.masque.nb, "information masquée", "informations masquées")}</summary><pre>${texteMasque}</pre></details></div>`;
  }
  $("#tiroirCorps").addEventListener("click", e => {
    const b = e.target.closest("[data-decision]"); if (!b) return;
    const c = etat.candidats.find(x => x.ref === etat.detail);
    c.decision = b.dataset.decision;
    rendreDetail(); rendreClassement(); rendreHaut();
    toast(`Décision enregistrée : ${DECISIONS[c.decision].lib}`);
  });
  $("#tiroirCorps").addEventListener("change", e => {
    const champ = e.target.dataset.champ; if (!champ) return;
    const c = etat.candidats.find(x => x.ref === etat.detail);
    c[champ] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (champ === "consentement") rendreDetail();
  });
  $("#tiroirCorps").addEventListener("input", e => {
    if (e.target.dataset.champ !== "note") return;
    etat.candidats.find(x => x.ref === etat.detail).note = e.target.value;
  });
  function naviguer(pas) {
    const l = lignesClassees(), i = l.findIndex(x => x.c.ref === etat.detail), j = i + pas;
    if (i < 0 || j < 0 || j >= l.length) return;
    etat.detail = l[j].c.ref; rendreDetail();
    $$(".cand").forEach(li => li.classList.toggle("ouvert", li.dataset.ref === etat.detail));
    $("#tiroirCorps").scrollTop = 0;
  }
  $("#tPrec").addEventListener("click", () => naviguer(-1));
  $("#tSuiv").addEventListener("click", () => naviguer(1));
  $("#tFermer").addEventListener("click", fermerDetail);
  $("#voile").addEventListener("click", fermerDetail);
  document.addEventListener("keydown", e => {
    if (!etat.detail || $("#dlgComparer").open) return;
    if (e.key === "Escape") fermerDetail();
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); naviguer(1); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); naviguer(-1); }
  });

  /* ---------------- Comparaison ---------------- */
  function rendreBarreComparer() {
    const n = etat.comparer.size;
    $("#barreComparer").hidden = n === 0;
    $("#comparerTexte").textContent = n < 2 ? "Cochez une autre candidature pour comparer" : `${n} candidatures sélectionnées`;
    $("#btnComparer").disabled = n < 2; $("#btnComparer").style.opacity = n < 2 ? .5 : 1;
  }
  $("#btnComparerVider").addEventListener("click", () => { etat.comparer.clear(); rendreClassement(); });
  $("#btnComparer").addEventListener("click", () => {
    const g = grille();
    const sel = [...etat.comparer].map(r => etat.candidats.find(c => c.ref === r)).filter(Boolean).map((c, i) => ({ c, a: analyser(c, g), couleur: COMPARE_COUL[i] }));
    if (sel.length < 2) return;
    const axes = [...g.criteres.map(c => c.nom), "Expérience"];
    const ligne = (lib, vals, fmt = v => v) => {
      const best = Math.max(...vals);
      return `<tr><th scope="row">${esc(lib)}</th>${vals.map(v => `<td class="${v === best && vals.filter(x => x === best).length === 1 ? "meilleur" : ""}">${fmt(v)}</td>`).join("")}</tr>`;
    };
    $("#cmpCorps").innerHTML = `
      <div class="bloc">${radar(axes, sel.map(s => ({ valeurs: [...s.a.details.map(d => d.s), s.a.sExp], couleur: s.couleur })))}</div>
      <table class="cmp-table">
        <thead><tr><th></th>${sel.map(s => `<th><i style="background:${s.couleur}"></i>${esc(s.c.nom)}</th>`).join("")}</tr></thead>
        <tbody>
          ${ligne("Score global", sel.map(s => s.a.score), v => `<b>${v}</b> / 100`)}
          ${g.criteres.map((cr, i) => ligne(cr.nom, sel.map(s => Math.round(s.a.details[i].s * 100)), v => v + " %")).join("")}
          ${ligne("Expérience détectée", sel.map(s => s.a.exp ?? -1), v => v < 0 ? "non chiffrée" : pluriel(v, "an"))}
          <tr><th scope="row">Points d'attention</th>${sel.map(s => `<td>${s.a.signaux.length}</td>`).join("")}</tr>
          <tr><th scope="row">Décision</th>${sel.map(s => `<td>${DECISIONS[s.c.decision].lib}</td>`).join("")}</tr>
        </tbody>
      </table>`;
    $("#cmpTitre").textContent = `Comparaison pour le poste ${g.poste}`;
    $("#dlgComparer").showModal();
  });
  $("#cmpFermer").addEventListener("click", () => $("#dlgComparer").close());
  $("#dlgComparer").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  /* ---------------- Exports du classement ---------------- */
  $("#btnExportClassement").addEventListener("click", () => {
    if (!etat.candidats.length) return toast("Aucune candidature à exporter.");
    const g = grille();
    const rows = etat.candidats.map(c => ({ c, a: analyser(c, g) })).sort((x, y) => y.a.score - x.a.score)
      .map(({ c, a }, i) => [i + 1, c.ref, c.nom, g.poste, a.score, NIVEAUX[a.niveau].lib,
        ...a.details.map(d => Math.round(d.s * 100)), a.exp ?? "", a.signaux.map(s => s.message).join(" | "), DECISIONS[c.decision].lib, c.note]);
    const tete = ["Rang", "Référence", "Candidat", "Poste", "Score /100", "Adéquation", ...g.criteres.map(c => c.nom + " (%)"), "Expérience (ans)", "Points d'attention", "Décision", "Notes"];
    telecharger(`classement-${g.id}-${aujourdhui()}.csv`, csv([tete, ...rows]), "text/csv;charset=utf-8");
    toast("Classement exporté.");
  });
  $("#btnVersRegistre").addEventListener("click", () => {
    const g = grille(); let n = 0;
    etat.candidats.filter(c => c.decision !== "a-trier").forEach(c => {
      const a = analyser(c, g);
      const ligne = ligneRegistre({ ref: c.ref, emplacement: c.nom, poste: g.poste, score: a.score, decision: DECISIONS[c.decision].lib,
        consentement: c.consentement ? "Oui" : "Non", dernierContact: c.dernierContact, notes: c.note });
      const i = etat.registre.findIndex(r => r.ref === c.ref);
      if (i >= 0) etat.registre[i] = ligne; else etat.registre.push(ligne);
      n++;
    });
    toast(n ? `${pluriel(n, "décision reportée", "décisions reportées")} au registre. Pensez à l'exporter.` : "Prenez au moins une décision avant de remplir le registre.");
    rendreTout();
  });

  /* ---------------- Vue 4 : registre ---------------- */
  function ligneRegistre(r) {
    const embauche = /embauch/i.test(r.decision);
    const consent = /^oui$/i.test(String(r.consentement).trim());
    let expiration = "", statut, jours = null;
    if (embauche) statut = "Sortir du vivier, vers le dossier du personnel";
    else if (!consent) statut = "Sans accord : supprimer à la clôture du recrutement";
    else {
      expiration = ajouterJours(r.dernierContact || aujourdhui(), CONSERVATION_JOURS);
      jours = joursAvant(expiration);
      statut = jours < 0 ? "EXPIRÉ : supprimer le CV" : jours <= ALERTE_JOURS ? `Expire dans ${pluriel(jours, "jour")} : relancer` : "Actif";
    }
    return { ...r, consentement: consent ? "Oui" : "Non", expiration, statut, jours };
  }
  const ENTETES_REG = ["Référence", "Emplacement du CV", "Poste", "Score", "Décision", "Consentement vivier", "Date dernier contact", "Date d'expiration", "Statut", "Notes"];
  const CLES_REG = ["ref", "emplacement", "poste", "score", "decision", "consentement", "dernierContact", "expiration", "statut", "notes"];
  const classeStatut = s => s.startsWith("EXPIRÉ") ? "st-expire" : s.startsWith("Expire") ? "st-bientot" : s.startsWith("Sans") ? "st-sans" : s.startsWith("Sortir") ? "st-sortie" : "st-actif";

  function rendreRegistre() {
    etat.registre = etat.registre.map(ligneRegistre);
    const nb = k => etat.registre.filter(r => classeStatut(r.statut) === k).length;
    $("#kActifs").textContent = nb("st-actif") + nb("st-bientot");
    $("#kBientot").textContent = nb("st-bientot");
    $("#kExpires").textContent = nb("st-expire") + nb("st-sans");
    $("#kJournal").textContent = etat.journal.length;
    const ordre = { "st-expire": 0, "st-sans": 1, "st-bientot": 2, "st-sortie": 3, "st-actif": 4 };
    const rows = etat.registre.slice().sort((a, b) => ordre[classeStatut(a.statut)] - ordre[classeStatut(b.statut)] || (a.expiration || "").localeCompare(b.expiration || ""));
    $("#tRegistre tbody").innerHTML = rows.length ? rows.map(r => {
      const cl = classeStatut(r.statut);
      const c = cl === "st-actif" ? "#0E9F8A" : cl === "st-bientot" ? "#E39A0B" : cl === "st-sortie" ? "#2B3A86" : "#E5484D";
      const pct = r.jours == null ? (cl === "st-sortie" ? 100 : 0) : Math.max(0, Math.min(100, r.jours / CONSERVATION_JOURS * 100));
      const lib = r.jours == null ? (cl === "st-sortie" ? "Hors vivier" : "Pas de conservation") : r.jours < 0 ? `Dépassé de ${pluriel(-r.jours, "jour")}` : `${pluriel(r.jours, "jour")}, jusqu'au ${fmtDate(r.expiration)}`;
      return `<tr class="${cl}">
        <td><b>${esc(r.ref)}</b><small>${esc(r.emplacement)}</small></td>
        <td>${esc(r.poste)}<small>${esc(r.decision)}</small></td>
        <td>${esc(r.consentement)}</td>
        <td class="restant" style="--c:${c}"><div class="barre-c"><span style="width:${pct}%"></span></div><small>${lib}</small></td>
        <td><span class="statut-pastille">${esc(r.statut)}</span></td>
        <td class="actions-ligne">
          ${r.consentement === "Oui" && cl !== "st-sortie" ? `<button class="btn lien" data-prolonger="${esc(r.ref)}">Prolonger d'un an</button>` : ""}
          <button class="btn doux" data-purger="${esc(r.ref)}">CV supprimé</button></td></tr>`; }).join("")
      : `<tr><td colspan="6" class="vide">Le registre est vide. Importez votre registre CSV, ou reportez des décisions depuis le classement.</td></tr>`;
  }
  $("#tRegistre").addEventListener("click", e => {
    const p = e.target.closest("[data-prolonger]")?.dataset.prolonger, s = e.target.closest("[data-purger]")?.dataset.purger;
    if (p) {
      if (!confirm(`Le candidat ${p} a-t-il renouvelé son accord ? La conservation repartira pour un an à partir d'aujourd'hui.`)) return;
      etat.registre.find(x => x.ref === p).dernierContact = aujourdhui();
      toast(`${p} : conservé jusqu'au ${fmtDate(ajouterJours(aujourdhui(), CONSERVATION_JOURS))}.`);
    }
    if (s) {
      if (!confirm(`Avez-vous supprimé le CV ${s} de l'espace de stockage, corbeille comprise ?`)) return;
      const r = etat.registre.find(x => x.ref === s);
      etat.journal.push({ ref: s, dateSuppression: aujourdhui(),
        motif: r.statut.startsWith("EXPIRÉ") ? "Durée de conservation atteinte" : r.statut.startsWith("Sans") ? "Absence d'accord du candidat" : r.statut.startsWith("Sortir") ? "Embauche (dossier du personnel)" : "Demande du candidat ou autre motif" });
      etat.registre = etat.registre.filter(x => x.ref !== s);
      toast(`Suppression de ${s} enregistrée dans le journal.`);
    }
    rendreTout();
  });
  $("#fRegistre").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const lignes = parseCSV((await f.text()).replace(/^﻿/, ""));
      const tete = lignes.shift().map(h => norm(h).trim());
      const idx = ENTETES_REG.map(h => tete.indexOf(norm(h)));
      if (idx[0] < 0) throw new Error("la colonne « Référence » est introuvable");
      etat.registre = lignes.filter(l => l.some(x => x.trim())).map(l => {
        const o = {}; CLES_REG.forEach((k, i) => o[k] = idx[i] >= 0 ? (l[idx[i]] || "").trim() : "");
        o.dernierContact = dateISO(o.dernierContact); return ligneRegistre(o);
      });
      toast(`${pluriel(etat.registre.length, "ligne importée", "lignes importées")}.`); rendreTout();
    } catch (err) { toast("Registre illisible : " + err.message); }
    e.target.value = "";
  });
  $("#btnExportRegistre").addEventListener("click", () => {
    const rows = etat.registre.map(r => CLES_REG.map(k => k === "dernierContact" || k === "expiration" ? fmtDate(r[k]) : r[k]));
    telecharger(`registre-vivier-${aujourdhui()}.csv`, csv([ENTETES_REG, ...rows]), "text/csv;charset=utf-8");
    toast("Registre exporté. Rangez-le avec les CV dans l'espace de stockage RH.");
  });
  $("#btnExportJournal").addEventListener("click", () => {
    if (!etat.journal.length) return toast("Aucune suppression enregistrée pendant cette session.");
    telecharger(`journal-suppression-${aujourdhui()}.csv`,
      csv([["Référence", "Date de suppression", "Motif"], ...etat.journal.map(j => [j.ref, fmtDate(j.dateSuppression), j.motif])]), "text/csv;charset=utf-8");
    toast("Journal de suppression exporté.");
  });

  /* ---------------- CSV (séparateur « ; » pour Excel FR) ---------------- */
  function csv(rows) {
    return "﻿" + rows.map(r => r.map(v => { const s = String(v ?? ""); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(";")).join("\r\n");
  }
  function parseCSV(txt) {
    const l1 = txt.split(/\r?\n/)[0];
    const sep = (l1.match(/;/g) || []).length >= (l1.match(/,/g) || []).length ? ";" : ",";
    const out = []; let row = [], cell = "", q = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && txt[i + 1] === "\n") i++; row.push(cell); out.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); out.push(row); }
    return out;
  }
  function dateISO(s) {
    s = (s || "").trim();
    let m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : aujourdhui();
  }

  /* ---------------- Rendu global ---------------- */
  function rendreTout() {
    rendreHaut();
    if (etat.vue === "p-grille") rendreGrille();
    if (etat.vue === "p-cv") rendreCandidats();
    if (etat.vue === "p-classement") rendreClassement();
    if (etat.vue === "p-registre") rendreRegistre();
    if (etat.detail) rendreDetail();
  }
  allerA("p-grille");
})();
