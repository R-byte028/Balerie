# Balerie RSVP admin setup

The public invitation submits to Supabase table `public.wedding_rsvps`. Guests can insert RSVP records but cannot read the guest list. The private dashboard is available at `/admin.html`.

## Authorise the dashboard administrator

1. In Supabase, open **Authentication → Users**.
2. Add the administrator's email address and set a password (or invite the user and complete the password setup).
3. Open **SQL Editor** and run the statement below, replacing the email with the exact administrator email:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = lower('ADMIN_EMAIL_HERE');
```

4. The administrator signs in at `https://YOUR-WEBSITE-DOMAIN/admin.html`.

The dashboard checks the trusted `app_metadata.role` claim and the database RLS policies enforce the same role. Do not set this role in user-editable metadata. Do not expose a service-role or secret key in the website.

## WhatsApp

After a successful database save, the RSVP page opens WhatsApp with a prefilled summary for the primary RSVP contact configured in `supabase-config.js`. The guest must press **Send** in WhatsApp. The database save happens first, so the response is retained even if the guest closes WhatsApp.
