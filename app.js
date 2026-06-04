// Supabase Client Initialization
const SUPABASE_URL = "https://lnymzxrlacdwwybhpfde.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxueW16eHJsYWNkd3d5YmhwZmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzQ1NzYsImV4cCI6MjA5NjE1MDU3Nn0.1sFo0eeWB9omkl2F9QfwqvVjtlCN4eez0QnGotHxOLI";

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const opportunityForm = document.getElementById("opportunity-form");
const oppNameInput = document.getElementById("opp-name");
const oppCityInput = document.getElementById("opp-city");
const oppCountryInput = document.getElementById("opp-country");
const oppCategorySelect = document.getElementById("opp-category");
const oppPotentialSelect = document.getElementById("opp-potential");
const oppProblemInput = document.getElementById("opp-problem");
const oppAiSolutionInput = document.getElementById("opp-ai-solution");
const submitBtn = document.getElementById("submit-btn");

const filterCityInput = document.getElementById("filter-city");
const filterCountryInput = document.getElementById("filter-country");
const filterCategorySelect = document.getElementById("filter-category");
const clearFiltersBtn = document.getElementById("clear-filters-btn");

const opportunitiesContainer = document.getElementById("opportunities-container");
const toastContainer = document.getElementById("toast-container");

// Application State
let opportunities = [];
let likedOpportunities = JSON.parse(localStorage.getItem("liked_opps") || "[]");

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  fetchOpportunities();
  setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
  // Form submission
  opportunityForm.addEventListener("submit", handleFormSubmit);

  // Filters inputs
  filterCityInput.addEventListener("input", renderFilteredOpportunities);
  filterCountryInput.addEventListener("input", renderFilteredOpportunities);
  filterCategorySelect.addEventListener("change", renderFilteredOpportunities);

  // Clear filters
  clearFiltersBtn.addEventListener("click", () => {
    filterCityInput.value = "";
    filterCountryInput.value = "";
    filterCategorySelect.value = "";
    renderFilteredOpportunities();
    showToast("Filtros limpiados");
  });
}

// Fetch all opportunities from Supabase
async function fetchOpportunities() {
  showLoading();
  try {
    const { data, error } = await _supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    opportunities = data || [];
    renderFilteredOpportunities();
  } catch (err) {
    console.error("Error fetching opportunities:", err);
    opportunitiesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>Error al cargar las oportunidades desde Supabase.</p>
        <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.5rem;">${err.message}</p>
        <button onclick="fetchOpportunities()" class="btn-clear" style="margin-top: 1rem; display: inline-block;">Reintentar</button>
      </div>
    `;
    showToast("Error al conectar con la base de datos", "error");
  }
}

// Handle opportunity publication
async function handleFormSubmit(e) {
  e.preventDefault();

  const name = oppNameInput.value.trim();
  const city = oppCityInput.value.trim();
  const country = oppCountryInput.value.trim();
  const category = oppCategorySelect.value;
  const potential = oppPotentialSelect.value;
  const problem = oppProblemInput.value.trim();
  const ai_solution = oppAiSolutionInput.value.trim();

  if (!name || !city || !country || !category || !potential || !problem || !ai_solution) {
    showToast("Por favor rellena todos los campos", "error");
    return;
  }

  setSubmittingState(true);

  try {
    const newOpportunity = {
      name,
      city,
      country,
      category,
      potential,
      problem,
      ai_solution,
      likes: 0
    };

    const { data, error } = await _supabase
      .from("opportunities")
      .insert([newOpportunity]);

    if (error) throw error;

    // Reset Form
    opportunityForm.reset();
    showToast("¡Oportunidad publicada con éxito!", "success");
    
    // Reload opportunities list
    await fetchOpportunities();
  } catch (err) {
    console.error("Error inserting opportunity:", err);
    showToast("Error al publicar la oportunidad", "error");
  } finally {
    setSubmittingState(false);
  }
}

// Handle liking an opportunity
async function likeOpportunity(id, currentLikes, element) {
  // Check if already liked in this session/browser to avoid spamming
  if (likedOpportunities.includes(id)) {
    showToast("Ya has dado like a esta oportunidad", "default");
    return;
  }

  // Visual feedback before reload
  element.classList.add("liked");
  const countSpan = element.querySelector(".like-count");
  if (countSpan) {
    countSpan.textContent = parseInt(countSpan.textContent) + 1;
  }

  try {
    const { error } = await _supabase
      .from("opportunities")
      .update({ likes: currentLikes + 1 })
      .eq("id", id);

    if (error) throw error;

    // Add to local liked list
    likedOpportunities.push(id);
    localStorage.setItem("liked_opps", JSON.stringify(likedOpportunities));

    showToast("¡Te gusta esta oportunidad!");

    // Reload list to synchronize with other users' updates
    await fetchOpportunities();
  } catch (err) {
    console.error("Error updating likes:", err);
    showToast("Error al procesar el like", "error");
    // Revert visual representation
    element.classList.remove("liked");
    if (countSpan) {
      countSpan.textContent = currentLikes;
    }
  }
}

// Filter and render opportunities list
function renderFilteredOpportunities() {
  const cityFilter = filterCityInput.value.toLowerCase().trim();
  const countryFilter = filterCountryInput.value.toLowerCase().trim();
  const categoryFilter = filterCategorySelect.value;

  const filtered = opportunities.filter(opp => {
    const matchesCity = !cityFilter || opp.city.toLowerCase().includes(cityFilter);
    const matchesCountry = !countryFilter || opp.country.toLowerCase().includes(countryFilter);
    const matchesCategory = !categoryFilter || opp.category === categoryFilter;
    return matchesCity && matchesCountry && matchesCategory;
  });

  if (filtered.length === 0) {
    opportunitiesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No se encontraron oportunidades con los filtros seleccionados.</p>
      </div>
    `;
    return;
  }

  opportunitiesContainer.innerHTML = filtered.map(opp => {
    const isLiked = likedOpportunities.includes(opp.id);
    const potentialClass = `badge-potential-${opp.potential.toLowerCase()}`;
    const timeFormatted = formatTimeAgo(new Date(opp.created_at));

    return `
      <article class="opportunity-card" id="opp-${opp.id}">
        <div class="card-badges">
          <span class="badge badge-category">${escapeHTML(opp.category)}</span>
          <span class="badge badge-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${escapeHTML(opp.city)}, ${escapeHTML(opp.country)}
          </span>
          <span class="badge ${potentialClass}">Potencial: ${escapeHTML(opp.potential)}</span>
        </div>

        <div class="card-header-row">
          <h3 class="card-title">${escapeHTML(opp.name)}</h3>
        </div>

        <div class="problem-box">
          <div class="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            Problema detectado
          </div>
          <p>${escapeHTML(opp.problem)}</p>
        </div>

        <div class="solution-box">
          <div class="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            Solución con Inteligencia Artificial
          </div>
          <p>${escapeHTML(opp.ai_solution)}</p>
        </div>

        <div class="card-footer">
          <span class="publish-time" title="${new Date(opp.created_at).toLocaleString()}">${timeFormatted}</span>
          <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="likeOpportunity(${opp.id}, ${opp.likes}, this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>Likes: <strong class="like-count">${opp.likes}</strong></span>
          </button>
        </div>
      </article>
    `;
  }).join("");
}

// UI State Helpers
function showLoading() {
  opportunitiesContainer.innerHTML = `
    <div class="loading-indicator">
      <div class="loading-spinner"></div>
      <p>Cargando oportunidades desde Supabase...</p>
    </div>
  `;
}

function setSubmittingState(isSubmitting) {
  if (isSubmitting) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <div class="loading-spinner" style="width: 1.1rem; height: 1.1rem; border-width: 2px; margin: 0;"></div>
      Publicando...
    `;
  } else {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      Publicar en el Mapa
    `;
  }
}

// Toast Notifications Helper
function showToast(message, type = 'default') {
  const toast = document.createElement("div");
  toast.className = `toast ${type === 'success' ? 'toast-success' : ''}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Remove toast after 3.5s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Time formatting helper (e.g. "Hace 5 minutos", "Hace 2 horas")
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 5) return "Ahora mismo";
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `Hace ${interval} ${interval === 1 ? 'año' : 'años'}`;
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `Hace ${interval} ${interval === 1 ? 'mes' : 'meses'}`;
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `Hace ${interval} ${interval === 1 ? 'día' : 'días'}`;
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `Hace ${interval} ${interval === 1 ? 'hora' : 'horas'}`;
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `Hace ${interval} ${interval === 1 ? 'minuto' : 'minutos'}`;
  
  return `Hace ${seconds} segundos`;
}

// Simple HTML escaping helper to prevent XSS
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
