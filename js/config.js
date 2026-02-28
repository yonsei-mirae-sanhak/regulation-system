const SUPABASE_URL = process.env.SUPABASE_URL || null;
const SUPABASE_KEY = process.env.SUPABASE_KEY || null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase credentials are not set in the environment variables.');
    process.exit(1);
}

// Your existing code that uses Supabase credentials goes here...