const SUPABASE_URL = "https://qmoyahucqccrfvywaupf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtb3lhaHVjcWNjcmZ2eXdhdXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNjcxMjUsImV4cCI6MjA5Njk0MzEyNX0.VRNB4C3ildbBdbS4WR5kqgSbSME0gZEJ2p52DRkod6I";

const STUDENT_EMAIL_DOMAIN = "students.englishwithlittledreamers.com";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

function studentCodeToEmail(studentCode) {
  return `${studentCode.trim().toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
}
