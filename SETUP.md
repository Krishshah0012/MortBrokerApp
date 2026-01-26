# 🚀 Supabase Setup Guide - DO THIS NOW!

## Step 1: Create Supabase Project (5 minutes)

1. Go to: https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name**: MortBrokerApp
   - **Database Password**: (Create a strong password - SAVE THIS!)
   - **Region**: Choose closest to you (US East, US West, etc.)
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning...

## Step 2: Get Your Credentials

Once your project is ready:

1. In Supabase dashboard, click **"Settings"** (gear icon in left sidebar)
2. Click **"API"** in settings menu
3. You'll see:
   - **Project URL** - Copy this
   - **anon public** key - Copy this (under "Project API keys")

## Step 3: Update Your .env File

1. Open `/Users/krish/MortBrokerApp/.env` in your editor
2. Replace the placeholder values:

```bash
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

**IMPORTANT**: Use the ACTUAL values you just copied!

## Step 4: Run the Database Schema

1. In Supabase dashboard, click **"SQL Editor"** in left sidebar
2. Click **"New query"**
3. Open the file: `/Users/krish/MortBrokerApp/supabase-schema.sql`
4. Copy ALL the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press Cmd+Enter)
7. You should see: ✅ "Success. No rows returned"

## Step 5: Enable Email Auth

1. In Supabase dashboard, go to **"Authentication"** → **"Providers"**
2. Make sure **Email** is enabled (it should be by default)
3. Scroll down to **"Email Templates"**
4. Click **"Confirm signup"** template
5. You can customize the email, but defaults are fine for MVP

## Step 6: Test It!

1. Stop your dev server (Ctrl+C if running)
2. Start it again:
   ```bash
   npm run dev
   ```
3. Open http://localhost:5173
4. You should see:
   - Navigation bar at top
   - Login/Sign Up buttons
5. Try signing up:
   - Click "Sign Up"
   - Choose "I'm buying a home"
   - Enter email, password, name
   - Submit
6. Check your email for confirmation link
7. Click the link to confirm
8. Log in with your credentials
9. Fill out the calculator
10. Click "Calculate My PP Score"
11. On results page, click "Save Results" button
12. Should see: ✓ "Calculation saved successfully!"

## Step 7: Verify Data Saved

1. Go back to Supabase dashboard
2. Click **"Table Editor"** in left sidebar
3. Click on **"profiles"** table
   - You should see your user profile
4. Click on **"calculator_sessions"** table
   - You should see your saved calculation with PP score!

## 🎉 You're Done!

Your MVP is now working with:
- ✅ User authentication (login/register/logout)
- ✅ Guest mode (calculator works without login)
- ✅ Data persistence (logged-in users can save)
- ✅ Profile management
- ✅ Secure database with Row Level Security

## Next Steps (After Testing):

### Deploy to Vercel:
```bash
npm run build  # Build for production
```

Then:
1. Go to https://vercel.com
2. Import your GitHub repo
3. Add environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

---

## 🆘 Troubleshooting:

**Error: "Missing Supabase environment variables"**
- Check your .env file has actual values (not placeholders)
- Restart dev server after changing .env

**Error: "Invalid API key"**
- Make sure you copied the **anon public** key, not the service_role key
- Check for extra spaces in .env file

**Can't log in after signup**
- Check your email for confirmation link
- Click the link to verify your account
- Then try logging in

**Save button doesn't work**
- Make sure you're logged in (should see your email in nav)
- Check browser console for errors (F12 → Console tab)
- Verify SQL schema ran successfully

---

**Questions? Issues? Let me know and I'll help!**
