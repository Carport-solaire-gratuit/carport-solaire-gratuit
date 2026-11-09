/* Annuaire des installateurs RGE vérifiés
   Source : API open data ADEME (entreprises RGE) — CORS ouvert. */

const API = "https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines";
const form = document.getElementById("annuForm");
const input = document.getElementById("cp");
const resultsEl = document.getElementById("annuResults");
const statusEl = document.getElementById("annuStatus");
const noteEl = document.getElementById("annuNote");

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function dept(cp) {
  cp = (cp || "").trim();
  return cp.startsWith("97") || cp.startsWith("98") ? cp.slice(0, 3) : cp.slice(0, 2);
}

async function search(cp) {
  const d = dept(cp);
  if (!/^[0-9]{2,3}$/.test(d)) {
    statusEl.hidden = false;
    statusEl.textContent = "Entrez un code postal ou un numéro de département valide.";
    resultsEl.innerHTML = "";
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = "Recherche des installateurs RGE…";
  resultsEl.innerHTML = "";
  noteEl.hidden = true;

  const params = new URLSearchParams();
  params.set("qs", "domaine:(*photovolta* OR *solaires*) AND code_postal:" + d + "*");
  params.set("size", "200");
  params.set("select", "nom_entreprise,siret,code_postal,commune,telephone,site_internet,email,domaine,lien_date_fin");
  params.set("sort", "commune");

  let data;
  try {
    const res = await fetch(API + "?" + params.toString());
    data = await res.json();
  } catch (e) {
    statusEl.textContent = "La recherche est momentanément indisponible. Réessayez plus tard.";
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const list = (data.results || [])
    .filter((e) => (e.domaine || "").toLowerCase().includes("panneaux solaires photovolta"))
    .filter((e) => !e.lien_date_fin || e.lien_date_fin >= today)
    .filter((e) => { if (seen.has(e.siret)) return false; seen.add(e.siret); return true; });

  if (!list.length) {
    statusEl.textContent = "Aucun installateur RGE photovoltaïque trouvé pour « " + esc(cp) + " ». Essayez un département voisin, ou faites votre simulation pour qu'on vous en trouve un.";
    return;
  }

  statusEl.innerHTML = "<strong>" + list.length + "</strong> installateur(s) RGE vérifié(s) dans le département " + esc(d) + " :";
  noteEl.hidden = false;
  resultsEl.innerHTML = list.map((e) => {
    const tel = (e.telephone || "").trim();
    const site = (e.site_internet || "").trim();
    return (
      '<article class="installer">' +
        '<div class="installer-top"><h3>' + esc(e.nom_entreprise || "Installateur") + "</h3>" +
        '<span class="rge-badge"><svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg> RGE vérifié</span></div>' +
        '<div class="meta"><svg class="icon" aria-hidden="true"><use href="#i-pin"></use></svg> ' + esc(e.commune || "") + " (" + esc(e.code_postal || "") + ")</div>" +
        '<div class="meta"><svg class="icon" aria-hidden="true"><use href="#i-panel"></use></svg> Panneaux solaires photovoltaïques (QualiPV)</div>' +
        (tel ? '<div class="meta"><svg class="icon" aria-hidden="true"><use href="#i-phone"></use></svg> <a href="tel:' + esc(tel.replace(/\s/g, "")) + '">' + esc(tel) + "</a></div>" : "") +
        (site ? '<div class="meta"><svg class="icon" aria-hidden="true"><use href="#i-link"></use></svg> <a href="' + esc(site) + '" target="_blank" rel="noopener">Vérifier la certification ↗</a></div>' : "") +
        '<div class="inst-cta"><a href="index.html#simulateur" class="btn btn-primary btn-sm">Demander un devis gratuit</a></div>' +
      "</article>"
    );
  }).join("");
}

if (form) {
  form.addEventListener("submit", (e) => { e.preventDefault(); search(input.value); });
  // pré-remplissage via ?cp=
  const q = new URLSearchParams(location.search).get("cp");
  if (q) { input.value = q; search(q); }
}
