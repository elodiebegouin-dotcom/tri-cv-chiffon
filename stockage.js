/* =====================================================================
   STOCKAGE LOCAL (option A) – les CV restent sur l'ordinateur du recruteur
   IndexedDB dans le navigateur. Rien n'est envoyé sur GitHub.
   Suppression automatique à l'échéance (365 jours par défaut).
   Pour passer en mode partagé (option B), voir supabase/LISEZ-MOI.md.
   ===================================================================== */
(function (root) {
  "use strict";
  var DB_NOM = "chiffon-tri-cv", DB_VERSION = 1, db = null;
  var JOUR = 24 * 3600 * 1000;

  function ouvrir() {
    if (db) return Promise.resolve(db);
    return new Promise(function (ok, ko) {
      var req = indexedDB.open(DB_NOM, DB_VERSION);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains("candidats")) d.createObjectStore("candidats", { keyPath: "id" });
        if (!d.objectStoreNames.contains("postes")) d.createObjectStore("postes", { keyPath: "id" });
      };
      req.onsuccess = function () { db = req.result; ok(db); };
      req.onerror = function () { ko(req.error); };
    });
  }

  function tx(store, mode, fn) {
    return ouvrir().then(function (d) {
      return new Promise(function (ok, ko) {
        var t = d.transaction(store, mode), s = t.objectStore(store), res;
        res = fn(s);
        t.oncomplete = function () { ok(res && res.result !== undefined ? res.result : res); };
        t.onerror = function () { ko(t.error); };
      });
    });
  }

  var S = {
    tous: function (store) { return tx(store, "readonly", function (s) { return s.getAll(); }); },
    enregistrer: function (store, obj) { return tx(store, "readwrite", function (s) { s.put(obj); }); },
    enregistrerPlusieurs: function (store, objs) { return tx(store, "readwrite", function (s) { objs.forEach(function (o) { s.put(o); }); }); },
    supprimer: function (store, id) { return tx(store, "readwrite", function (s) { s.delete(id); }); },
    vider: function (store) { return tx(store, "readwrite", function (s) { s.clear(); }); },

    /* Purge RGPD : supprime définitivement tout CV dont l'échéance est dépassée */
    purger: function () {
      var maintenant = Date.now();
      return S.tous("candidats").then(function (liste) {
        var expires = liste.filter(function (c) { return new Date(c.dateExpiration).getTime() <= maintenant; });
        if (!expires.length) return [];
        return tx("candidats", "readwrite", function (s) { expires.forEach(function (c) { s.delete(c.id); }); })
          .then(function () { return expires; });
      });
    },

    reglages: function () {
      var def = { dureeJours: 365, anonyme: false, iaCle: "", iaModele: "claude-sonnet-5-5", journalPurges: [] };
      try { return Object.assign(def, JSON.parse(localStorage.getItem("chiffon-reglages") || "{}")); }
      catch (e) { return def; }
    },
    sauverReglages: function (r) {
      try { localStorage.setItem("chiffon-reglages", JSON.stringify(r)); } catch (e) { /* stockage indisponible */ }
    },
    JOUR: JOUR
  };

  root.CHIFFON_STOCKAGE = S;
})(window);
