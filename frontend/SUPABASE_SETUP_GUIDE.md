# Supabase Setup Guide for WeatherSight

This guide will help you connect your WeatherSight application to your Supabase database.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in the project details:
   - **Name**: WeatherSight (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Free tier is perfect for development
5. Click "Create new project" and wait for it to initialize (2-3 minutes)

## Step 2: Get Your Project Credentials

1. Once your project is ready, go to **Project Settings** (gear icon in the sidebar)
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (a long JWT token starting with `eyJ...`)
4. Keep this page open, you'll need these values in the next step

## Step 3: Configure Environment Variables

1. Open your terminal in the project directory
2. Navigate to the `frontend` folder
3. Create or update the `.env.local` file with your actual credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** Replace the placeholder values with your actual credentials from Step 2!

## Step 4: Set Up the Database Schema

1. In your Supabase dashboard, click on **SQL Editor** (in the left sidebar)
2. Click "New query"
3. Open the file `frontend/supabase-setup.sql` from your project
4. Copy all the SQL code from that file
5. Paste it into the Supabase SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned" - this means it worked!

This script will:
- Create a `users` table to store user profiles
- Set up Row Level Security (RLS) policies
- Create triggers to automatically create user profiles when someone signs up
- Add the subscription_tier field for handling different user tiers

## Step 5: Configure Email Authentication

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. Scroll down to **Email Auth Configuration**
4. Configure your email settings:
   - For development: Use the default settings (Supabase will send emails)
   - For production: Set up your own SMTP server

### Optional: Email Templates

You can customize the email templates:
1. Go to **Authentication** > **Email Templates**
2. Customize templates for:
   - Confirm signup
   - Magic link
   - Reset password
   - etc.

## Step 6: Restart Your Development Server

1. Stop your current development server (Ctrl+C)
2. Restart it with:
   ```bash
   npm run dev
   ```
3. The server should now start without errors

## Step 7: Test Your Setup

1. Open your browser to `http://localhost:3000`
2. Navigate to `/sign-up`
3. Try creating a new account with a real email address
4. You should:
   - Receive a confirmation email from Supabase
   - See the user created in your Supabase dashboard (Authentication > Users)
   - See the user profile in your database (Database > Tables > users)

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure `.env.local` exists in the `frontend` folder
- Check that the file has the correct variable names (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
- Restart your development server after creating/updating .env.local

### Error: "Failed to fetch"
- Check that your Supabase project is running (not paused)
- Verify your credentials are correct
- Make sure you have internet connection
- Check browser console for more detailed error messages

### Error: "relation 'public.users' does not exist"
- Run the SQL setup script from Step 4
- Make sure the script completed successfully

### Users can sign up but no profile is created
- Check the trigger was created: `on_auth_user_created`
- Verify the function exists: `handle_new_user`
- Check Supabase logs for any errors

### Email confirmation not arriving
- Check your spam folder
- For development, go to Authentication > Users in Supabase dashboard
- Click on the user and manually confirm their email
- Or disable email confirmation: Authentication > Settings > Enable email confirmations (toggle off)

## Database Schema

The setup creates the following structure:

### public.users table
```sql
- id (UUID, Primary Key, references auth.users)
- email (TEXT, UNIQUE, NOT NULL)
- full_name (TEXT)
- avatar_url (TEXT)
- subscription_tier (VARCHAR, default: 'basic')
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

## Security

- Row Level Security (RLS) is enabled on all tables
- Users can only view and modify their own data
- Policies are automatically enforced by Supabase
- Use the anon key for client-side code (safe to expose)
- NEVER expose your service_role key in client-side code

## Next Steps

After setup is complete:
1. Test user registration and login
2. Configure OAuth providers (Google, GitHub) if needed
3. Set up email templates
4. Configure password requirements
5. Set up MFA (Multi-Factor Authentication) for enhanced security

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Discord Community](https://discord.supabase.com)

