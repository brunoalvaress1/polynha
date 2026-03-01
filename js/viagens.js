import { supabase } from "./supabaseClient.js";
import { setupNavActive, qs, showToast } from "./common.js";

setupNavActive();
if (typeof window.AOS !== "undefined") window.AOS.init({ once: true, offset: 40, duration: 650 });

const grid = qs("#albumsGrid");
const empty = qs("#emptyState");
const search = qs("#search");
const sort = qs("#sort");

const modal = qs("#albumModal");
const modalTitle = qs("#modalTitle");
const modalKicker = qs("#modalKicker");
const modalMeta = qs("#modalMeta");
const modalMasonry = qs("#modalMasonry");
qs("#modalClose").onclick = () => closeAlbum();

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeAlbum();
});

// Lightbox
const lb = qs("#lightbox");
const lbContent = qs("#lbContent");
const lbCaption = qs("#lbCaption");
qs("#lbClose").onclick = () => lb.classList.remove("open");
lb.addEventListener("click", (e)=>{ if(e.target === lb) lb.classList.remove("open"); });

function openLightbox({ type, url, caption }){
  lbCaption.textContent = caption || "";
  lbContent.innerHTML = "";
  if(type === "video"){
    const v = document.createElement("video");
    v.src = url; v.controls = true; v.playsInline = true;
    v.style.maxHeight = "74vh"; v.style.borderRadius = "14px";
    lbContent.appendChild(v);
  }else{
    const img = document.createElement("img");
    img.src = url;
    img.style.maxHeight = "74vh"; img.style.borderRadius = "14px";
    lbContent.appendChild(img);
  }
  lb.classList.add("open");
}

let albums = [];

function fmtDate(iso){
  if(!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

function albumCard(a){
  const cover = a.cover_url
    ? `<img src="${a.cover_url}" alt="capa">`
    : `<div style="height:100%;display:grid;place-items:center;color:#7a1e3a;font-weight:900">Sem capa</div>`;

  const chips = [];
if (a.location) chips.push(`<span class="v-chip">📍 ${a.location}</span>`);
if (a.trip_date) chips.push(`<span class="v-chip">🗓️ ${fmtDate(a.trip_date)}</span>`);

return `
  <article class="v-card" data-id="${a.id}" data-aos="fade-up">
    <div class="v-cover">
      ${cover}
      <div class="v-badge">ÁLBUM</div>
    </div>
    <div class="v-body">
      <h3 class="v-h">${a.title}</h3>
      <div class="v-meta">
        ${chips.length ? chips.join("") : `<span class="small">—</span>`}
      </div>
    </div>
  </article>
`;
}

function applyFilterAndSort(){
  const q = (search.value || "").trim().toLowerCase();
  let list = [...albums];

  if(q){
    list = list.filter(a => {
      const t = (a.title || "").toLowerCase();
      const l = (a.location || "").toLowerCase();
      return t.includes(q) || l.includes(q);
    });
  }

  const mode = sort.value;
  if(mode === "az"){
    list.sort((a,b)=> (a.title||"").localeCompare(b.title||"", "pt-BR"));
  } else if(mode === "old"){
    list.sort((a,b)=> new Date(a.created_at) - new Date(b.created_at));
  } else {
    list.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  }

  grid.innerHTML = list.map(albumCard).join("");
  empty.classList.toggle("show", list.length === 0);

  // click handlers
  [...grid.querySelectorAll(".v-card")].forEach(card => {
    card.onclick = () => openAlbum(Number(card.dataset.id));
  });
}

async function loadAlbums(){
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .order("created_at", { ascending: false });

  if(error){
    console.error(error);
    showToast("Erro carregando álbuns.");
    return;
  }

  albums = data || [];
  applyFilterAndSort();
}

async function openAlbum(albumId){
  const a = albums.find(x => x.id === albumId);
  if(!a) return;

  modalTitle.textContent = a.title || "Álbum";
  modalKicker.textContent = a.location ? a.location : "Viagem";
  modalMeta.textContent = [
    a.trip_date ? `Data: ${fmtDate(a.trip_date)}` : null,
    a.description ? `Descrição: ${a.description}` : null,
  ].filter(Boolean).join(" • ") || "—";

  modalMasonry.innerHTML = `<div class="small">Carregando mídias…</div>`;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  const { data, error } = await supabase
    .from("album_media")
    .select("*")
    .eq("album_id", albumId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if(error){
    console.error(error);
    modalMasonry.innerHTML = `<div class="small">Erro carregando mídias.</div>`;
    return;
  }

  const media = data || [];
  if(!media.length){
    modalMasonry.innerHTML = `<div class="small">Sem fotos/vídeos nesse álbum ainda.</div>`;
    return;
  }

  modalMasonry.innerHTML = media.map(m => `
    <div class="v-item" data-type="${m.type}" data-url="${m.url}" data-caption="${(m.caption||"").replaceAll('"',"&quot;")}">
      ${m.type === "video"
        ? `<video muted playsinline preload="metadata" src="${m.url}"></video>`
        : `<img loading="lazy" src="${m.url}" alt="foto">`
      }
      <div class="cap">${m.caption || "💗"}</div>
    </div>
  `).join("");

  [...modalMasonry.querySelectorAll(".v-item")].forEach(el => {
    el.onclick = () => openLightbox({
      type: el.dataset.type,
      url: el.dataset.url,
      caption: el.dataset.caption || ""
    });
  });
}

function closeAlbum(){
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

search.addEventListener("input", applyFilterAndSort);
sort.addEventListener("change", applyFilterAndSort);

await loadAlbums();