// js/admin.js
import { supabase } from "./supabaseClient.js";
import { qs, qsa, getContent } from "./common.js";

/* =========================
   Toast UI
   ========================= */
function toast(title, text, kind = "ok") {
  const t = qs("#toast");
  const tt = qs("#toastTitle");
  const tx = qs("#toastText");
  if (!t || !tt || !tx) {
    console.log(title, text);
    return;
  }
  t.classList.remove("danger", "ok");
  t.classList.add(kind === "danger" ? "danger" : "ok");
  tt.textContent = title;
  tx.textContent = text;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 5500);
}

function setStatus(title, msg, ok = true) {
  const box = qs("#statusBox");
  if (!box) return;
  box.className = "box " + (ok ? "ok" : "danger");
  box.innerHTML = `<b>${title}</b><div class="small">${msg}</div>`;
}

/* =========================
   Tabs
   ========================= */
function setupTabs() {
  const tabs = qsa(".tab");
  tabs.forEach(btn => {
    btn.onclick = () => {
      tabs.forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.dataset.tab;
      qsa("[id^='tab-']").forEach(sec => sec.classList.add("hidden"));
      qs(`#tab-${key}`)?.classList.remove("hidden");
    };
  });
}

/* =========================
   Dates
   ========================= */
function brDateTimeToISO(input) {
  const m = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const dd = m[1], mm = m[2], yyyy = m[3];
  const HH = m[4], MI = m[5], SS = (m[6] ?? "00");
  return `${yyyy}-${mm}-${dd}T${HH}:${MI}:${SS}-03:00`;
}
function isoToBR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
}

/* =========================
   Storage upload
   ========================= */
async function uploadToBucket(bucket, file, folder, maxMB = 300) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  if (!file || file.size === 0) throw new Error("Arquivo inválido (0 bytes).");

  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(`Arquivo muito grande. Limite: ${maxMB}MB.`);

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (upErr) {
    const msg = (upErr.message || String(upErr)).toLowerCase();
    if (msg.includes("row-level security")) {
      throw new Error(
        `Upload falhou: new row violates row-level security policy. ` +
        `Crie policies no bucket "${bucket}" (INSERT/UPLOAD para public).`
      );
    }
    throw new Error(`Upload falhou: ${upErr.message || String(upErr)}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Não consegui gerar publicUrl do arquivo.");
  return data.publicUrl;
}

/* =========================
   Storage check (opcional)
   ========================= */
async function checkStorage() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      setStatus(
        "Storage: checagem parcial",
        "Não deu para listar buckets via API. Verifique no painel se 'albums' e 'blog' existem e estão Public + Policies liberadas.",
        true
      );
      toast("Storage", "Checagem parcial. Se upload falhar, é policies do bucket (RLS).", "ok");
      return;
    }

    const albums = buckets?.find(b => b.name === "albums");
    const blog = buckets?.find(b => b.name === "blog");

    setStatus(
      "Storage OK",
      `Buckets: ${buckets.map(b => `${b.name}${b.public ? " (public)" : ""}`).join(", ")}`,
      !!albums
    );

    if (!albums) toast("Atenção", "Bucket 'albums' não existe. Crie no painel Storage.", "danger");
    if (!blog) toast("Atenção", "Bucket 'blog' não existe. Crie no painel Storage.", "danger");
  } catch (e) {
    console.error(e);
    setStatus("Storage: erro", e.message || "Erro desconhecido", false);
    toast("Erro", e.message || "Falha na checagem do storage", "danger");
  }
}

/* =========================
   HOME settings (site_content)
   ========================= */
async function loadHomeSettings() {
  const home = await getContent("home_texts");
  const rel = await getContent("relationship_start");

  qs("#heroTitle").value = home?.heroTitle || "";
  qs("#heroSubtitle").value = home?.heroSubtitle || "";
  qs("#about").value = home?.about || "";
  qs("#miniTitle1").value = home?.miniTitle1 || "";
  qs("#miniText1").value = home?.miniText1 || "";
  qs("#miniTitle2").value = home?.miniTitle2 || "";
  qs("#miniText2").value = home?.miniText2 || "";
  qs("#startBR").value = isoToBR(rel?.date || "2025-10-27T15:00:10-03:00");

  qs("#fillExample").onclick = () => (qs("#startBR").value = "27/10/2025 15:00:10");

  qs("#saveTexts").onclick = async () => {
    try {
      const startISO = brDateTimeToISO(qs("#startBR").value);
      if (!startISO) return toast("Data inválida", "Use: DD/MM/AAAA HH:MM:SS", "danger");

      const home_texts = {
        heroTitle: qs("#heroTitle").value.trim(),
        heroSubtitle: qs("#heroSubtitle").value.trim(),
        about: qs("#about").value.trim(),
        miniTitle1: qs("#miniTitle1").value.trim(),
        miniText1: qs("#miniText1").value.trim(),
        miniTitle2: qs("#miniTitle2").value.trim(),
        miniText2: qs("#miniText2").value.trim(),
      };

      const a = await supabase.from("site_content").upsert({ key: "home_texts", value: home_texts });
      const b = await supabase.from("site_content").upsert({ key: "relationship_start", value: { date: startISO } });
      if (a.error || b.error) throw (a.error || b.error);

      toast("Salvo", "Home atualizada com sucesso.", "ok");
    } catch (e) {
      console.error(e);
      toast("Erro ao salvar", e.message || "Falha desconhecida", "danger");
    }
  };
}

/* =========================
   Albums (Viagens)
   ========================= */
async function loadAlbumsIntoSelect() {
  const sel = qs("#albumSelect");
  if (!sel) return;

  const { data, error } = await supabase
    .from("albums")
    .select("id,title")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    toast("Erro", "Erro carregando álbuns.", "danger");
    return;
  }

  sel.innerHTML = (data || []).map(a => `<option value="${a.id}">${a.title}</option>`).join("");
  if (data?.length) await loadMediaList();
}

function setupCoverPreview() {
  const inp = qs("#aCover");
  const prev = qs("#coverPreview");
  if (!inp || !prev) return;

  inp.onchange = () => {
    const file = inp.files?.[0];
    if (!file) {
      prev.innerHTML = `<span class="tag">CAPA</span>Selecione uma imagem`;
      return;
    }
    const url = URL.createObjectURL(file);
    prev.innerHTML = `<span class="tag">CAPA</span><img src="${url}" alt="preview"/>`;
  };
}

async function createAlbum() {
  const btn = qs("#createAlbum");
  try {
    const title = qs("#aTitle").value.trim();
    if (!title) return toast("Faltou o título", "Preencha o título do álbum.", "danger");

    const coverFile = qs("#aCover").files?.[0] || null;
    if (!coverFile) return toast("Faltou a capa", "Selecione uma imagem de capa.", "danger");

    if (btn) btn.disabled = true;
    toast("Enviando capa…", "Aguarde.", "ok");

    const cover_url = await uploadToBucket("albums", coverFile, "covers", 30);

    toast("Criando álbum…", "Salvando no banco.", "ok");

    const payload = {
      title,
      location: qs("#aLocation").value.trim() || null,
      trip_date: qs("#aDate").value || null,
      description: qs("#aDesc").value.trim() || null,
      cover_url,
    };

    const { error } = await supabase.from("albums").insert(payload);
    if (error) throw new Error(`DB insert falhou: ${error.message}`);

    toast("Álbum criado!", "Agora você pode enviar as mídias.", "ok");

    qs("#aTitle").value = "";
    qs("#aLocation").value = "";
    qs("#aDate").value = "";
    qs("#aDesc").value = "";
    qs("#aCover").value = "";
    qs("#coverPreview").innerHTML = `<span class="tag">CAPA</span>Selecione uma imagem`;

    await loadAlbumsIntoSelect();
  } catch (e) {
    console.error(e);
    toast("Erro ao criar álbum", e.message || "Falha desconhecida", "danger");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function deleteSelectedAlbum() {
  const btn = qs("#deleteAlbum");
  const albumId = Number(qs("#albumSelect").value || 0);
  if (!albumId) return toast("Selecione um álbum", "Escolha um álbum para excluir.", "danger");

  const ok = confirm("Tem certeza que deseja excluir este álbum?\n\nIsso irá remover todas as mídias vinculadas.");
  if (!ok) return;

  try {
    if (btn) btn.disabled = true;

    // Apaga mídias do banco
    const { error: mediaErr } = await supabase.from("album_media").delete().eq("album_id", albumId);
    if (mediaErr) throw mediaErr;

    // Apaga álbum do banco
    const { error: albumErr } = await supabase.from("albums").delete().eq("id", albumId);
    if (albumErr) throw albumErr;

    toast("Álbum excluído", "Removido com sucesso.", "ok");

    // refresh
    await loadAlbumsIntoSelect();
    const mediaList = qs("#mediaList");
    if (mediaList) mediaList.innerHTML = "";
  } catch (e) {
    console.error(e);
    toast("Erro ao excluir", e.message || "Falha desconhecida", "danger");
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* =========================
   Album media
   ========================= */
async function uploadAlbumMedia() {
  const btn = qs("#uploadMedia");
  try {
    const albumId = Number(qs("#albumSelect").value || 0);
    if (!albumId) return toast("Selecione um álbum", "Escolha um álbum na lista.", "danger");

    const files = [...(qs("#mediaFiles").files || [])];
    if (!files.length) return toast("Sem arquivos", "Selecione fotos/vídeos.", "danger");

    const caption = qs("#caption").value.trim() || null;

    if (btn) btn.disabled = true;
    toast("Enviando mídias…", "Isso pode demorar um pouco.", "ok");

    for (const file of files) {
      const isVideo = (file.type || "").startsWith("video/");
      const folder = isVideo ? `videos/${albumId}` : `images/${albumId}`;
      const url = await uploadToBucket("albums", file, folder, 300);

      const { error } = await supabase.from("album_media").insert({
        album_id: albumId,
        type: isVideo ? "video" : "image",
        url,
        caption,
        position: 0,
      });

      if (error) throw new Error(`DB album_media falhou: ${error.message}`);
    }

    toast("Pronto!", "Mídias enviadas.", "ok");
    qs("#mediaFiles").value = "";
    qs("#caption").value = "";
    await loadMediaList();
  } catch (e) {
    console.error(e);
    toast("Erro no upload", e.message || "Falha desconhecida", "danger");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadMediaList() {
  const albumId = Number(qs("#albumSelect").value || 0);
  const wrap = qs("#mediaList");
  if (!wrap) return;

  wrap.innerHTML = "";
  if (!albumId) {
    wrap.innerHTML = `<div class="small">Selecione um álbum para ver as mídias.</div>`;
    return;
  }

  const { data, error } = await supabase
    .from("album_media")
    .select("*")
    .eq("album_id", albumId)
    .order("created_at", { ascending: false })
    .limit(90);

  if (error) {
    console.error(error);
    wrap.innerHTML = `<div class="small">Erro carregando mídias.</div>`;
    return;
  }

  if (!data?.length) {
    wrap.innerHTML = `<div class="small">Sem mídias nesse álbum ainda.</div>`;
    return;
  }

  wrap.innerHTML = data.map(m => `
    <div class="mediaTile">
      ${m.type === "video"
        ? `<video controls playsinline preload="metadata" src="${m.url}"></video>`
        : `<img loading="lazy" src="${m.url}" alt="media">`
      }
      <div class="cap">
        <b>${m.type === "video" ? "Vídeo" : "Foto"}</b>
        <div class="small">${m.caption || ""}</div>
        <div class="row" style="margin-top:10px">
          <button class="btn ghost" data-del="${m.id}" type="button">Excluir</button>
        </div>
      </div>
    </div>
  `).join("");

  qsa("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.del);
      const { error: delErr } = await supabase.from("album_media").delete().eq("id", id);
      if (delErr) return toast("Erro", "Erro ao excluir.", "danger");
      toast("Excluído", "Mídia removida.", "ok");
      await loadMediaList();
    };
  });
}

/* =========================
   Blog (capa + legenda + vídeo até 300MB) + Listar + Excluir
   ========================= */
async function createBlogPost() {
  const btn = qs("#createPost");
  try {
    const title = qs("#bTitle").value.trim();
    const body = qs("#bBody").value.trim() || null;

    const videoFile = qs("#bVideo").files?.[0] || null;
    const coverFile = qs("#bCover")?.files?.[0] || null;
    const cover_caption = (qs("#bCoverCaption")?.value || "").trim() || null;

    if (!title) return toast("Faltou título", "Preencha o título.", "danger");
    if (!videoFile) return toast("Faltou vídeo", "Selecione um vídeo.", "danger");
    if (!coverFile) return toast("Faltou capa", "Selecione uma imagem de capa.", "danger");

    const MAX_MB = 300;
    if (videoFile.size > MAX_MB * 1024 * 1024) {
      return toast("Vídeo grande demais", `Limite: ${MAX_MB}MB`, "danger");
    }

    if (btn) btn.disabled = true;

    toast("Enviando capa…", "Aguarde.", "ok");
    const cover_url = await uploadToBucket("blog", coverFile, "covers", 30);

    toast("Enviando vídeo…", "Pode demorar dependendo do tamanho.", "ok");
    const video_url = await uploadToBucket("blog", videoFile, "videos", 300);

    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("blog_posts")
      .insert({ title, body, video_url, expires_at, cover_url, cover_caption });

    if (error) throw new Error(`DB blog_posts falhou: ${error.message}`);

    toast("Publicado!", "Post criado com sucesso.", "ok");
    qs("#bTitle").value = "";
    qs("#bBody").value = "";
    qs("#bVideo").value = "";
    if (qs("#bCover")) qs("#bCover").value = "";
    if (qs("#bCoverCaption")) qs("#bCoverCaption").value = "";

    await loadBlogList();
  } catch (e) {
    console.error(e);
    toast("Erro no blog", e.message || "Falha desconhecida", "danger");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadBlogList() {
  const wrap = qs("#blogList");
  if (!wrap) return;

  wrap.innerHTML = `<div class="small">Carregando posts…</div>`;

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    wrap.innerHTML = `<div class="small">Erro carregando posts.</div>`;
    return;
  }

  if (!data?.length) {
    wrap.innerHTML = `<div class="small">Nenhum post publicado ainda.</div>`;
    return;
  }

  wrap.innerHTML = data.map(p => `
    <div class="blogItem">
      ${p.cover_url
        ? `<img src="${p.cover_url}" alt="capa" style="width:100%;height:220px;object-fit:cover;display:block">`
        : `<div style="height:220px;display:grid;place-items:center;background:rgba(255,45,85,.06);font-weight:900;color:#7a1e3a">Sem capa</div>`
      }
      <div class="top">
        <div>
          <b>${p.title || "Sem título"}</b>
          <div class="meta">
            ${p.created_at ? `Publicado: ${fmtDateTime(p.created_at)}` : ""}
            ${p.expires_at ? `<br>Expira: ${fmtDateTime(p.expires_at)}` : ""}
            ${p.cover_caption ? `<br>Legenda: ${p.cover_caption}` : ""}
            ${p.body ? `<br>${p.body}` : ""}
          </div>
        </div>
        <button class="btn ghost" data-del-post="${p.id}" type="button">Excluir</button>
      </div>
    </div>
  `).join("");

  qsa("[data-del-post]").forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.delPost);
      try {
        const { error: delErr } = await supabase.from("blog_posts").delete().eq("id", id);
        if (delErr) throw delErr;
        toast("Excluído", "Post removido com sucesso.", "ok");
        await loadBlogList();
      } catch (e) {
        console.error(e);
        toast("Erro", e.message || "Não foi possível excluir.", "danger");
      }
    };
  });
}

/* =========================
   Init
   ========================= */
async function setUserLabel() {
  const { data: { user } } = await supabase.auth.getUser();
  const who = qs("#who");
  if (who) who.textContent = user?.email || "modo aberto";
}

function bindUI() {
  setupTabs();
  setupCoverPreview();

  const logoutBtn = qs("#logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabase.auth.signOut();
      location.href = "index.html";
    };
  }

  const checkBtn = qs("#checkStorage");
  if (checkBtn) checkBtn.onclick = checkStorage;

  const createAlbumBtn = qs("#createAlbum");
  if (createAlbumBtn) createAlbumBtn.onclick = createAlbum;

  const deleteAlbumBtn = qs("#deleteAlbum");
  if (deleteAlbumBtn) deleteAlbumBtn.onclick = deleteSelectedAlbum;

  const uploadMediaBtn = qs("#uploadMedia");
  if (uploadMediaBtn) uploadMediaBtn.onclick = uploadAlbumMedia;

  const reloadBtn = qs("#reload");
  if (reloadBtn) {
    reloadBtn.onclick = async () => {
      await loadAlbumsIntoSelect();
      toast("Ok", "Recarregado.", "ok");
    };
  }

  const albumSelect = qs("#albumSelect");
  if (albumSelect) albumSelect.onchange = loadMediaList;

  const createPostBtn = qs("#createPost");
  if (createPostBtn) createPostBtn.onclick = createBlogPost;
}

(async function main() {
  bindUI();
  await setUserLabel();
  await loadHomeSettings();
  await loadAlbumsIntoSelect();
  await loadBlogList();
})();