/* =====================================================================
   ANALYSE APPROFONDIE PAR IA (optionnelle)
   Appelle l'API Claude d'Anthropic avec la clé saisie dans Paramètres.
   - Le CV est ANONYMISÉ avant envoi (e-mail, téléphone, liens, âge).
   - La clé reste dans ce navigateur (jamais dans le code GitHub).
   - L'IA propose ; le recruteur décide.
   ===================================================================== */
(function (root) {
  "use strict";

  function construirePrompt(texteCV, poste, entreprise) {
    var crits = poste.criteres.map(function (c) {
      return "- id=" + c.id + " | " + c.label + " | poids " + c.poids +
        (c.type === "experience" ? " | attendu " + c.min + " à " + c.idealMax + " ans" : "");
    }).join("\n");
    return [
      "Tu es un(e) chargé(e) de recrutement expérimenté(e) et rigoureux(se). Tu aides à présélectionner un CV pour un poste.",
      "Règles : ne tiens AUCUN compte de l'âge, du genre, de l'origine, du nom, de la situation familiale ou du handicap. ",
      "Ne pénalise pas un diplôme ancien. Note les compétences et l'expérience démontrées. Repère les incohérences factuelles.",
      "Tu ne décides pas : tu éclaires la décision humaine.",
      "",
      "ENTREPRISE : " + entreprise.contexte,
      "",
      "POSTE : " + poste.titre + " (rattaché à " + poste.rattachement + ")",
      "MISSION : " + poste.mission,
      "CRITÈRES :",
      crits,
      "",
      "CV (anonymisé) :",
      '"""', texteCV, '"""',
      "",
      "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format :",
      '{"criteres":[{"id":"<id du critère>","score":<0-100>,"justification":"<1 phrase>"}],',
      '"points_forts":["..."],"vigilance":["..."],"questions_entretien":["..."],',
      '"synthese":"<3 phrases max>","autre_poste_suggere":"<intitulé ou vide>"}'
    ].join("\n");
  }

  function analyser(texteCV, poste, entreprise, reglages) {
    if (!reglages.iaCle) return Promise.reject(new Error("Aucune clé d'API renseignée (onglet Paramètres)."));
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": reglages.iaCle,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: reglages.iaModele || "claude-sonnet-5-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: construirePrompt(texteCV, poste, entreprise) }]
      })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error((j.error && j.error.message) || ("Erreur " + r.status));
        var txt = (j.content || []).map(function (b) { return b.text || ""; }).join("");
        var m = txt.match(/\{[\s\S]*\}/);
        if (!m) throw new Error("Réponse de l'IA illisible.");
        var res = JSON.parse(m[0]);
        var somme = 0, total = 0;
        poste.criteres.forEach(function (c) {
          var x = (res.criteres || []).filter(function (k) { return k.id === c.id; })[0];
          if (x) { somme += (Number(x.score) || 0) * c.poids; total += c.poids; }
        });
        res.score = total ? Math.round(somme / total) : null;
        res.date = new Date().toISOString();
        res.modele = reglages.iaModele;
        return res;
      });
    });
  }

  root.CHIFFON_IA = { analyser: analyser };
})(window);
