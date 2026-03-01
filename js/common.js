import { supabase } from "./supabaseClient.js";

export function qs(sel, el=document){ return el.querySelector(sel); }
export function qsa(sel, el=document){ return [...el.querySelectorAll(sel)]; }

export function fmtDate(dateStr){
  if(!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { year:"numeric", month:"short", day:"2-digit" });
}

export function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

export async function getContent(key){
  const { data, error } = await supabase.from("site_content").select("value").eq("key", key).single();
  if(error) throw error;
  return data?.value;
}

export function showToast(msg){
  alert(msg);
}

export function setupNavActive(){
  const path = location.pathname.split("/").pop();
  qsa('a[data-page]').forEach(a=>{
    if(a.dataset.page === path) a.style.borderColor = "rgba(255,255,255,.12)";
  });
}