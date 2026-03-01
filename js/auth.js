import { supabase } from "./supabaseClient.js";
import { qs, showToast } from "./common.js";

qs("#btn").onclick = async () => {
  const email = qs("#email").value.trim();
  const password = qs("#pass").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if(error){ showToast(error.message); return; }

  location.href = "admin.html";
};