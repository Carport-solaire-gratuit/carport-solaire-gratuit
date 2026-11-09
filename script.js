/* =========================================================
   Carport Solaire Gratuit — logique du simulateur + envoi lead
   ========================================================= */

// --- CONFIG : envoi des leads par email via Web3Forms (https://web3forms.com) ---
// Chaque demande du formulaire arrive par email dans contact@carport-solaire-gratuit.fr.
// (Clé publique, prévue pour être utilisée côté navigateur.)
const WEB3FORMS_KEY = "0cdc34ca-32fc-4e0e-a353-37cb3d28ec31";

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

  // --- Envoi du lead par email (Web3Forms) ---
  const val = (name) => (form.elements[name] ? String(form.elements[name].value).trim() : "");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateStep(steps[current])) return;
    // anti-spam honeypot
    if (form.website.value) return;

    const projets = Array.from(form.querySelectorAll('input[name="projet"]:checked')).map((c) => c.value);

    // Charge utile envoyée à Web3Forms (clés lisibles => email bien présenté)
    const payload = {
      access_key: WEB3FORMS_KEY,
      subject: "Nouveau lead carport solaire : " + val("prenom") + " " + val("nom") + " (" + val("codePostal") + ")",
      from_name: "Site Carport Solaire Gratuit",
      "Projet": projets.join(", "),
      "Prénom": val("prenom"),
      "Nom": val("nom"),
      "Téléphone": val("telephone"),
      "Email": val("email"),
      "Code postal": val("codePostal"),
      "Ville": val("ville"),
      "Statut": val("statut"),
      "Type de bien": val("logement"),
      "Espace extérieur": val("espace"),
      "Facture mensuelle": val("facture"),
      "Consentement RGPD": form.consent.checked ? "oui" : "non",
      "Page": location.pathname,
      replyto: val("email"),
    };

    btnSubmit.disabled = true;
    btnSubmit.textContent = "Envoi en cours…";

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.success) {
        form.style.display = "none";
        if (successBox) successBox.hidden = false;
      } else {
        throw new Error(result.message || "Échec de l'envoi");
      }
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
