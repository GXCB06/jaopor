# Turning on Google Analytics as a visitor source

Founders verify their visitor numbers by adding **JaoPor's Google service account** as a Viewer on
their GA4 property. That account has to exist first. Until it does, the Google Analytics option is
hidden in Add Startup and on the edit page (`VerifyPanel` `isOffered`).

You do these steps yourself. The key is a secret, so Claude never creates, sees or pastes it.

## What JaoPor does with it

- It signs short-lived tokens with **only** the `analytics.readonly` scope (`src/lib/traffic/ga4.ts`).
  Whatever role a founder grants, JaoPor can only read.
- Ownership check: one of the property's web data streams must point at the project's website.
- Number shown: GA4 **Total users** for the last 30 days. It's labelled "counted by Google
  Analytics", never "verified".

## 1. Google Cloud: create the service account

1. Open <https://console.cloud.google.com/> and create a project, e.g. `jaopor`. An existing one
   works too.
2. **APIs & Services → Library**. Enable both:
   - **Google Analytics Data API** (reads the numbers)
   - **Google Analytics Admin API** (reads the property's web streams for the ownership check)
3. **IAM & Admin → Service Accounts → Create service account**
   - Name: `jaopor-ga4-reader`.
   - Skip "Grant this service account access to project". It needs no Cloud roles: access comes
     from each founder adding it in GA4.
4. Open the new account → **Keys → Add key → Create new key → JSON**. A `.json` file downloads.
   - If Google says key creation is disabled, your organisation has the policy
     `iam.disableServiceAccountKeyCreation` on. An org admin must allow it for this project.
   - Keep the file private. Don't commit it, paste it in chat, or share it.

## 2. Vercel: add two environment variables

In Vercel → project **jaopor** → **Settings → Environment Variables** (Production; add Preview too
if you test there):

| Name                            | Value                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GA4_SERVICE_ACCOUNT_JSON`      | the **whole contents** of the downloaded `.json` file, pasted as is (one JSON object)            |
| `NEXT_PUBLIC_GA4_SERVICE_EMAIL` | the `client_email` value from that file, e.g. `jaopor-ga4-reader@jaopor.iam.gserviceaccount.com` |

The email is public on purpose: founders copy it into GA4. The JSON key is secret and only the
server reads it.

## 3. Redeploy

`NEXT_PUBLIC_*` values are built into the page, so redeploy production (Vercel → Deployments →
latest → Redeploy) after saving the variables. Google Analytics then appears in Add Startup step 2
under "ผู้เข้าชม".

## 4. Test once with a real GA4 property

1. In **Google Analytics → Admin → Property access management**, add the service account email as
   **Viewer**.
2. In **Admin → Property details**, copy the **Property ID**: numbers only, e.g. `123456789`.
   - Not the **Measurement ID** (`G-…`). JaoPor now says so if you paste that.
3. In JaoPor, open a project whose website is the one this property measures. Choose
   **ผู้เข้าชม → Google Analytics**, paste the Property ID and connect.
4. Compare the 30-day number with GA4 **Reports → Total users** for the same 30 days. It should be
   within about ±5%. If it isn't, tell Claude both numbers and the date range.

### Errors you might see

- **"ไม่พบโปรเจค…" (not_found):** the Property ID is wrong, or the service account isn't a Viewer on
  that property yet. It can take a few minutes after adding it.
- **domain_mismatch:** none of the property's web streams use the project's website. Check the
  stream URL in GA4 → Admin → Data streams.
- **"Google Analytics isn't available on JaoPor yet":** the server can't read
  `GA4_SERVICE_ACCOUNT_JSON`. Check it's set for Production and redeploy.
