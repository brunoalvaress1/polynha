import { supabase } from "./supabaseClient.js";
import { setupNavActive, qs } from "./common.js";

setupNavActive();

const grid = qs("#postsGrid");
const empty = qs("#emptyState");

const modal = qs("#videoModal");
const mClose = qs("#mClose");
const mTitle = qs("#mTitle");
const mCaption = qs("#mCaption");
const mPlayer = qs("#mPlayer");

mClose.onclick = closeModal;
modal.addEventListener("click", (e)=>{ if(e.target === modal) closeModal(); });

function closeModal(){
  modal.classList.remove("open");
  mPlayer.innerHTML = "";
}

function openModal(post){
  mTitle.textContent = post.title || "Vídeo";
  mCaption.textContent = post.cover_caption || post.body || "";
  mPlayer.innerHTML = "";

  const v = document.createElement("video");
  v.src = post.video_url;
  v.controls = true;
  v.playsInline = true;
  v.autoplay = true;
  mPlayer.appendChild(v);

  modal.classList.add("open");
}

function card(post){
  const cover = post.cover_url
    ? `<img src="${post.cover_url}" alt="capa">`
    : `<div style="height:100%;display:grid;place-items:center;font-weight:900;color:#7a1e3a">Sem capa</div>`;

  const cap = post.cover_caption || post.body || "Clique para assistir 💗";

  return `
    <article class="b-card" data-id="${post.id}">
      <div class="b-cover">
        ${cover}
        <div class="b-play"><div class="btnplay">▶</div></div>
      </div>
      <div class="b-body">
        <h3 class="b-h">${post.title || "Sem título"}</h3>
        <div class="b-cap">${cap}</div>
      </div>
    </article>
  `;
}

async function loadPosts(){
  // opcional: esconder expirados
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .gt("expires_at", now)     // se você quiser mostrar todos, remova esta linha
    .order("created_at", { ascending: false })
    .limit(100);

  if(error){
    console.error(error);
    grid.innerHTML = "";
    empty.classList.add("show");
    return;
  }

  const posts = data || [];
  grid.innerHTML = posts.map(card).join("");
  empty.classList.toggle("show", posts.length === 0);

  [...grid.querySelectorAll(".b-card")].forEach(el => {
    const id = Number(el.dataset.id);
    const p = posts.find(x => x.id === id);
    el.onclick = () => openModal(p);
  });
}

await loadPosts();