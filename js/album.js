import { supabase } from "./supabaseClient.js";
import { qs, getParam, fmtDate, showToast } from "./common.js";

const id = Number(getParam("id"));
const gallery = qs("#gallery");

const lb = qs("#lightbox");
const lbContent = qs("#lbContent");
const lbCaption = qs("#lbCaption");
qs("#lbClose").onclick = () => lb.classList.remove("open");
lb.addEventListener("click", (e)=>{ if(e.target === lb) lb.classList.remove("open"); });

function openLightbox(m){
  lbCaption.textContent = m.caption || "";
  lbContent.innerHTML = "";
  if(m.type === "video"){
    const v = document.createElement("video");
    v.src = m.url;
    v.controls = true;
    v.playsInline = true;
    v.style.maxHeight = "74vh";
    lbContent.appendChild(v);
  }else{
    const img = document.createElement("img");
    img.src = m.url;
    img.style.maxHeight = "74vh";
    img.style.borderRadius = "14px";
    lbContent.appendChild(img);
  }
  lb.classList.add("open");
}

async function load(){
  if(!id){ showToast("Álbum inválido."); location.href="viagens.html"; return; }

  const { data: album, error: e1 } = await supabase.from("albums").select("*").eq("id", id).single();
  if(e1){ console.error(e1); showToast("Erro carregando álbum."); return; }

  qs("#albumTitle").textContent = album.title;
  qs("#albumH2").textContent = album.title;
  qs("#albumDesc").textContent = album.description || "";
  qs("#albumMeta").textContent = [album.location, album.trip_date ? fmtDate(album.trip_date) : ""].filter(Boolean).join(" • ");

  const { data: media, error: e2 } = await supabase
    .from("album_media")
    .select("*")
    .eq("album_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if(e2){ console.error(e2); showToast("Erro carregando mídias."); return; }

  gallery.innerHTML = (media?.length ? media : []).map(m => `
    <div class="media-tile" data-id="${m.id}">
      ${m.type === "video"
        ? `<video muted playsinline preload="metadata" src="${m.url}"></video>`
        : `<img loading="lazy" src="${m.url}">`
      }
      ${m.caption ? `<div class="cap">${m.caption}</div>` : ""}
    </div>
  `).join("");

  [...gallery.querySelectorAll(".media-tile")].forEach(tile=>{
    const mid = Number(tile.dataset.id);
    const m = media.find(x=>x.id===mid);
    tile.onclick = ()=> openLightbox(m);
  });
}

await load();