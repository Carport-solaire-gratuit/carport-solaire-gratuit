/* =========================================================
   Carport Solaire Gratuit — logique du simulateur + envoi lead
   ========================================================= */

// --- CONFIG -------------------------------------------------
// Collez ici l'URL de votre Web App Google Apps Script (voir GUIDE-GOOGLE-SHEET.md)
// Tant que ce champ est vide, le formulaire fonctionne en mode démo (aucun envoi réel).
const CONFIG = {
  sheetEndpoint: "https://script.google.com/macros/s/AKfycbxXJpM4fMaUmCSdSRt_FRkDaKsLNdA8Qzy__luoloV9-4C1xC_re81xTexW0bA95bjC/exec", // ex: "https://script.google.com/macros/s/AKfy.../exec"
  secret: "19b7374181178bf7e9b6fef0edb1781b", // doit être identique au SECRET du script Apps Script
};

const form = document.getElementById("leadForm");

if (form) {
  const steps = Array.from(form.querySelectorAll(".quiz-step"));
  const total = steps.length;
  const progressBar = document.getElementById("progressBar");
  const stepLabel = document.getElementById("stepLabel");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnSubmit = document.getElementById("btnSubmit");
  const successBox = document.getElementById("quizSuccess");
  let current = 0;

  function render() {
    steps.forEach((s, i) => s.classList.toggle("is-active", i === current));
    progressBar.style.width = ((current + 1) / total) * 100 + "%";
    stepLabel.textContent = "Étape " + (current + 1) + " / " + total;
    btnPrev.hidden = current === 0;
    btnNext.hidden = current === total - 1;
    btnSubmit.hidden = current !== total - 1;
  }

  function clearErrors(step) {
    step.querySelectorAll(".field-error").forEach((e) => (e.textContent = ""));
  }

  function validateStep(step) {
    clearErrors(step);
    const radios = step.querySelectorAll('input[type="radio"]');
    if (radios.length) {
      const name = radios[0].name;
      if (!step.querySelector('input[name="' + name + '"]:checked')) {
        // affiche une erreur sous la question
        return false;
      }
    }
    // choix multiple obligatoire (ex. "projet"), hors case de consentement
    const checks = step.querySelectorAll('input[type="checkbox"]:not(#consent)');
    if (checks.length) {
      const cname = checks[0].name;
      if (!step.querySelector('input[type="checkbox"][name="' + cname + '"]:checked')) {
        const cerr = step.querySelector('[data-error-for="' + cname + '"]');
        if (cerr) cerr.textContent = "Choisissez au moins une option.";
        return false;
      }
    }
    let ok = true;
    step.querySelectorAll("input[required]").forEach((input) => {
      if (input.type === "radio" || input.type === "checkbox") return;
      const err = step.querySelector('[data-error-for="' + input.id + '"]');
      const val = input.value.trim();
      if (!val) {
        if (err) err.textContent = "Ce champ est obligatoire.";
        ok = false;
      } else if (input.id === "codePostal" && !/^[0-9]{5}$/.test(val)) {
        if (err) err.textContent = "Code postal invalide (5 chiffres).";
        ok = false;
      } else if (input.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
        if (err) err.textContent = "Email invalide.";
        ok = false;
      } else if (input.type === "tel" && val.replace(/\D/g, "").length < 9) {
        if (err) err.textContent = "Numéro de téléphone invalide.";
        ok = false;
      }
    });
    // consentement (dernière étape)
    const consent = step.querySelector("#consent");
    if (consent && !consent.checked) {
      const err = form.querySelector('[data-error-for="consent"]');
      if (err) err.textContent = "Vous devez accepter pour continuer.";
      ok = false;
    }
    return ok;
  }

  btnNext.addEventListener("click", () => {
    if (!validateStep(steps[current])) return;
    if (current < total - 1) { current++; render(); }
  });
  btnPrev.addEventListener("click", () => {
    if (current > 0) { current--; render(); }
  });

  // auto-avance quand on choisit une réponse (étapes à choix)
  steps.forEach((step) => {
    step.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        if (current < total - 1 && step.querySelectorAll('input[type="radio"]').length) {
          setTimeout(() => { if (validateStep(step)) { current++; render(); } }, 180);
        }
      });
    });
  });

  render();

  // --- Envoi du lead ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateStep(steps[current])) return;
    // anti-spam honeypot
    if (form.website.value) return;

    const data = Object.fromEntries(new FormData(form).entries());
    // projet : choix multiple -> toutes les cases cochees
    const projets = Array.from(form.querySelectorAll('input[name="projet"]:checked')).map((c) => c.value);
    data.projet = projets.join(", ");
    data.consent = form.consent.checked ? "oui" : "non";
    data.date = new Date().toISOString();
    data.source = "carport-solaire-gratuit.fr";
    data.page = location.pathname;
    data.secret = CONFIG.secret;

    btnSubmit.disabled = true;
    btnSubmit.textContent = "Envoi en cours…";

    try {
      if (CONFIG.sheetEndpoint) {
        await fetch(CONFIG.sheetEndpoint, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(data),
        });
      } else {
        // mode démo : aucun endpoint configuré
        await new Promise((r) => setTimeout(r, 600));
        console.info("[DÉMO] Lead capturé (non envoyé) :", data);
      }
      form.style.display = "none";
      if (successBox) successBox.hidden = false;
    } catch (err) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Recevoir mon étude gratuite →";
      alert("Une erreur est survenue. Merci de réessayer dans un instant.");
    }
  });
}

// --- Année du footer ---
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// --- Modale légale (mentions + RGPD) ---
const LEGAL = {
  mentions: {
    title: "Mentions légales",
    html:
      "<h3>Mentions légales</h3>" +
      "<p><strong>Éditeur du site :</strong> [Raison sociale] — [SIRET] — [Adresse].</p>" +
      "<p><strong>Directeur de la publication :</strong> [Nom].</p>" +
      "<p><strong>Hébergeur :</strong> [Nom de l'hébergeur, adresse].</p>" +
      "<p>Ce site est un service de mise en relation entre particuliers/professionnels et installateurs partenaires certifiés RGE. Les offres présentées sont soumises à conditions d'éligibilité.</p>" +
      "<p><em>À compléter avant la mise en ligne.</em></p>",
  },
  rgpd: {
    title: "Politique de confidentialité",
    html:
      "<h3>Politique de confidentialité (RGPD)</h3>" +
      "<p>Les données que vous transmettez via le formulaire (nom, prénom, téléphone, email, code postal et informations sur votre projet) sont collectées dans le seul but de traiter votre demande d'étude et de vous recontacter.</p>" +
      "<h4>Base légale</h4><p>Votre consentement, recueilli lors de l'envoi du formulaire.</p>" +
      "<h4>Destinataires</h4><p>Nos conseillers et, le cas échéant, un installateur partenaire certifié RGE de votre région. Vos données ne sont jamais revendues à des tiers.</p>" +
      "<h4>Durée de conservation</h4><p>Vos données sont conservées [X mois] après le dernier contact, puis supprimées.</p>" +
      "<h4>Vos droits</h4><p>Vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition. Pour l'exercer : [email de contact]. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>" +
      "<p><em>À compléter avant la mise en ligne.</em></p>",
  },
};

const modal = document.getElementById("legalModal");
const modalContent = document.getElementById("modalContent");

function openModal(key) {
  const item = LEGAL[key];
  if (!item || !modal) return;
  modalContent.innerHTML = item.html;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-open]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    openModal(el.getAttribute("data-open"));
  });
});
if (modal) {
  modal.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", closeModal)
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}
