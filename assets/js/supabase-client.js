/* ============================================
   ZatraMart — Supabase client bootstrap
   Loaded after the @supabase/supabase-js CDN script, before common.js.
   The anon/public key is meant to be public — safe to ship in frontend code.
   Real data access is protected by Row Level Security policies in Supabase, not by hiding this key.
   ============================================ */

(function () {
  const SUPABASE_URL = 'https://foxntotashidwizyfbte.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZveG50b3Rhc2hpZHdpenlmYnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzQ3MjMsImV4cCI6MjEwMjcxMDcyM30.ag1htMt20PxOSZVlWfh7h5eVXnYAMOPS1v7zB-qzLeA';

  window.KM_SUPABASE = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
