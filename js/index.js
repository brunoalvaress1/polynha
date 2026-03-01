import { supabase } from "./supabaseClient.js";
import { getContent, setupNavActive, qs, showToast } from "./common.js";

setupNavActive();

const hasAOS = typeof window.AOS !== "undefined";
const hasSwiper = typeof window.Swiper !== "undefined";
if (hasAOS) window.AOS.init({ once: true, offset: 40, duration: 650 });

let swiperInstance = null;

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
    v.src = url;
    v.controls = true;
    v.playsInline = true;
    v.style.maxHeight = "74vh";
    v.style.borderRadius = "14px";
    lbContent.appendChild(v);
  }else{
    const img = document.createElement("img");
    img.src = url;
    img.style.maxHeight = "74vh";
    img.style.borderRadius = "14px";
    lbContent.appendChild(img);
  }

  lb.classList.add("open");
}

// Contador único (texto)
function plural(n, s, p){ return n === 1 ? s : p; }

function startCounterText(startISO){
  const start = new Date(startISO);
  const sinceBadge = qs("#sinceBadge");
  const counterEl = qs("#counterText");

  const tick = () => {
    const now = new Date();
    const diff = Math.max(0, now - start);

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    // texto “bonito”
counterEl.textContent = `Juntos há ${days} ${plural(days,"dia","dias")}, ${hours} ${plural(hours,"hora","horas")} e ${minutes} ${plural(minutes,"minuto","minutos")} ❤️`;

    sinceBadge.textContent = `desde ${start.toLocaleDateString("pt-BR")}`;
  };

  tick();
  setInterval(tick, 1000);
}

// Swiper (controlado)
function buildSlides(media){
  const slidesWrap = qs("#swiperSlides");
  slidesWrap.innerHTML = "";

  media.slice(0, 8).forEach((m) => {
    slidesWrap.insertAdjacentHTML("beforeend", `
      <div class="swiper-slide">
        ${m.type === "video"
          ? `<video muted playsinline preload="metadata" src="${m.url}"></video>`
          : `<img src="${m.url}" alt="foto">`
        }
      </div>
    `);
  });
}

function initOrResetSwiper(){
  if(!hasSwiper) return;
  if(swiperInstance){
    swiperInstance.destroy(true, true);
    swiperInstance = null;
  }

  swiperInstance = new window.Swiper("#homeSwiper", {
    loop: false,
    slidesPerView: "auto",
    centeredSlides: true,
    spaceBetween: 14,
    grabCursor: true,
    speed: 600
  });

  const prev = qs("#prevSlide");
  const next = qs("#nextSlide");
  if(prev && next){
    prev.onclick = () => swiperInstance.slidePrev();
    next.onclick = () => swiperInstance.slideNext();
  }
}

function bindSwiperClick(media){
  const slides = [...document.querySelectorAll("#homeSwiper .swiper-slide")];
  slides.forEach((slide, idx) => {
    slide.style.cursor = "pointer";
    slide.onclick = () => openLightbox(media[idx]);
  });
}

async function loadTexts(){
  try{
    const rel = await getContent("relationship_start");
    const home = await getContent("home_texts");

    qs("#heroTitle").innerHTML = home?.heroTitle || 'Nós, do nosso jeito. <span class="grad">Sempre.</span>';
    qs("#heroSubtitle").textContent = home?.heroSubtitle || "Um espaço para guardar memórias, viagens e vídeos especiais.";
    qs("#aboutText").textContent = home?.about || "";

    qs("#miniTitle1").textContent = home?.miniTitle1 || "Carta do dia";
    qs("#miniText1").textContent  = home?.miniText1  || "“Te escolher é fácil.”";
    qs("#miniTitle2").textContent = home?.miniTitle2 || "Próximo destino";
    qs("#miniText2").textContent  = home?.miniText2  || "“Pra onde a gente vai?”";

    // ✅ data controlada pelo admin
    startCounterText(rel?.date || "2025-10-27T15:00:10-03:00");
  }catch(e){
    console.error(e);
    showToast("Erro ao carregar textos do site.");
  }
}

async function loadHomeMedia(){
  // placeholders (se ainda não tiver álbum Home)
  const placeholders = [
    "https://images.unsplash.com/photo-1520975958225-6f927b1f02a4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1520975869018-8a6485c06ad5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1520975759669-35a4d719d59d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1520975901234-6b2c9e9b2e32?auto=format&fit=crop&w=1200&q=80"
  ];

  const { data: album } = await supabase
    .from("albums").select("*").ilike("title", "home").limit(1).maybeSingle();

  let media = [];
  if(album){
    const res = await supabase
      .from("album_media")
      .select("*")
      .eq("album_id", album.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(30);

    if(res.error) console.error(res.error);
    media = res.data || [];
  }

  const use = media.length
    ? media
    : placeholders.map(url => ({ type:"image", url, caption:"Adicione suas fotos no álbum Home 😊" }));

  buildSlides(use);
  initOrResetSwiper();
  bindSwiperClick(use);

  qs("#openMemories").onclick = () => openLightbox(use[0]);
}

await loadTexts();
await loadHomeMedia();