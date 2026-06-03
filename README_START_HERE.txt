LODESTAR CV NEXT.JS APP

This zip is packaged with package.json at the top level.

After extracting, open the folder that directly contains package.json.

Quick check on Windows:

  dir package.json

If it says File Not Found, you are in the wrong folder. Run:

  dir

Then cd into the folder that contains package.json.

Run:

  npm install
  npm run dev

Open:

  http://localhost:3000

Environment setup:

Copy .env.example to .env.local and add Stripe, Supabase, and OpenAI keys when ready.

MVP pages:

  /        landing page and order flow
  /success checkout success page
  /admin   admin instructions
  /api/orders?key=change-me admin JSON submissions endpoint

No Tailwind is used. Styling lives in app/globals.css.
