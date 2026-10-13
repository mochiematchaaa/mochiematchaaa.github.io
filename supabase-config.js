/* Live sync between the website and the ResidentHub app (Supabase).

   1. Create a free project at https://supabase.com and run supabase-shared-records.sql
      in its SQL Editor.
   2. In Project Settings > API, copy the Project URL and the "anon public" key
      and paste them below. The anon key is meant to be public, so it is safe here.
      Never paste the "service_role" key or the database password.

   While both stay empty the website works on its own, saving data in this browser only. */
window.RH_SUPABASE = {
  url: "https://iexsitqmmhokmffmmaed.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlleHNpdHFtbWhva21mZm1tYWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4OTgzNDEsImV4cCI6MjEwNzQ3NDM0MX0.g1-1z0XOp0RpFot_OP06_1_6nPPvueyqArVtP3qYcwc"
};
