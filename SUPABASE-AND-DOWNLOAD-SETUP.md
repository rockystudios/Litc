# Lost In The Cosmos site setup

## Connect Supabase

1. The site is pointed at project `pqpzqynozxcizyorklmu` (`https://pqpzqynozxcizyorklmu.supabase.co`).
2. In **Project Settings → API**, copy the publishable key (or legacy anon key) and put it in `supabase-config.js`. Do not use or share the service_role key.
3. In the project, open **SQL Editor**, create a query, paste in `supabase-setup.sql`, and run it. This creates a `profiles` table linked to Supabase Auth.
4. In **Authentication → URL Configuration**, set the Site URL to https://litc.space and add https://litc.space to Redirect URLs.
5. Redeploy the contents of this Website folder to the existing Netlify project. The new files auth.js, supabase-config.js, and supabase-setup.sql must be deployed with index.html.

The site supports email/password signup and login, username profiles, name changes, and logout. If email confirmation is enabled, users must click the confirmation link before logging in. For a production launch, configure a reliable SMTP provider in Supabase; the default mailer is rate limited.

### Important: the `Users` table screenshot

Do not use the `password` column in the `Users` table for account passwords. Supabase Auth must create and securely manage passwords; the website must never write or read them from a normal table. The site uses Supabase Auth plus the separate `profiles` table created above. Your current `Users` table also has an integer `id`, so it does not match the Auth user's UUID relationship the site expects. If you already entered real passwords into that table, remove those values and change any reused passwords. Turn on Row Level Security for `Users` and do not expose its rows through public policies.

## Add the Windows download

The packaged Windows build is about 550 MB. Keep it hosted separately from the Netlify website. Upload the build to a game distribution service such as itch.io, then paste its public download or project URL into the downloadUrl value in supabase-config.js, and redeploy the site. The download button stays disabled until a real URL is configured.

Do not share the original Windows folder as a local file path: website visitors cannot access files on your computer.
