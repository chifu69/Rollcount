ROLL COUNT v7.3.2 — GITHUB + MICROSOFT TEAMS / SHAREPOINT

WHAT THIS PACKAGE IS
- Flat GitHub Pages/PWA package: upload the files in this ZIP to the ROOT of the Rollcount repository.
- Preserves the stable Windows v7.3.1 Roll Count behavior: automatic A/B/C/D Viejito shift rotation, Save separate from New Day/Clear, extruder detection/order, compact Roll Consumption report, shared history filters, rich report copy/share fallbacks.
- Adds Microsoft Graph support so a GitHub/mobile/browser copy can use the SAME Teams/SharePoint Shared Data folder as the Windows installed version.

SHARED DATA LAYOUT
Shared Data/
  Roll Count History/
    RollCount-YYYY-MM-DD-Shift-A.json
  Roll Consumption History/
    RollConsumption-YYYY-MM.json

FIRST-TIME MICROSOFT SETUP REQUIRED FOR GITHUB/MOBILE
Microsoft requires a registered Entra application before a webpage can write to SharePoint/Teams. This cannot be safely bypassed or hardcoded with somebody else's credentials.

1. IT / Microsoft 365 admin creates a Single-page application (SPA) registration for the GitHub Pages URL.
2. Add delegated Microsoft Graph permissions:
   - User.Read
   - Files.ReadWrite.All
   Your organization's consent policy may require IT/admin approval.
3. Copy the Application (Client) ID.
4. In Teams/SharePoint, on the Shared Data folder, choose Copy link.
5. Open Roll Count from GitHub Pages, click Connect Teams, paste the Client ID and Shared Data folder link, then sign in with the Republic Plastics account.

WINDOWS INSTALLED VERSION
- The Windows v7.3.1 installed app continues to use the local OneDrive/Teams bridge and does NOT need the Graph setup above.
- Both modes write the same snapshot/monthly JSON design.

GITHUB FILES
index.html
styles.css
app.js
sw.js
manifest.webmanifest
icon-192.png
icon-512.png
teams-config.js
teams-graph.js
README-GITHUB-TEAMS.txt

NOTES
- Do not publish a password, Microsoft access token, secret, or SharePoint edit token in GitHub.
- This is a browser/PWA, so native Outlook HTML draft injection remains a Windows-installed feature. GitHub/mobile uses the rich-copy + email fallback.
