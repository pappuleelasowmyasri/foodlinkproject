# FoodLink — Real MVP

This version moves FoodLink from a demo into a real multi-user MVP.

## What works after Supabase setup

- Email/password accounts
- Restaurant/hostel provider accounts
- NGO/community organization accounts
- Real PostgreSQL database
- Real surplus-food listings
- Organizations can claim a listing
- Database-level protection against two organizations claiming the same listing
- Pickup deadline
- Provider and organization dashboards
- Listing/claim history
- Row Level Security policies

## Setup (about 10–15 minutes)

1. Create a project at Supabase.
2. Open **SQL Editor**.
3. Paste all of `supabase-schema.sql` and run it.
4. Open **Project Settings → API**.
5. Copy the **Project URL** and the public **anon key**.
6. Open `app.js` and replace:
   `PASTE_YOUR_SUPABASE_URL`
   `PASTE_YOUR_SUPABASE_ANON_KEY`
7. Open `index.html` in a browser or deploy the folder to a static host.

### Important
Never put the Supabase `service_role` key in `app.js`. Only use the public anon key.

## First real-world test

Create:
- one Provider account (restaurant/hostel)
- one Organization account (NGO/community organization)

Log in as the provider and post a listing.
Log in as the organization and claim it.

## Before public launch

Add:
- phone/WhatsApp verification
- organization/provider verification
- exact pickup address + map
- food-safety fields and rules
- pickup confirmation
- cancellation/reporting
- admin moderation
- notifications
- audit logs
- privacy policy and terms
- local legal/food-safety review

This is an MVP, not a certification that food donations are legally or medically safe.
