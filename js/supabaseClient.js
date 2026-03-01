import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://aaqsuojravnoksapclwz.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcXN1b2pyYXZub2tzYXBjbHd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDg5MzMsImV4cCI6MjA4Nzg4NDkzM30.sMP58J6zGHzum_7YLhNu21LN57gvpD7Rc7rYbsQvCpc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);