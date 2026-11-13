Mwalimu Planner: pilot version
An installable web app (PWA) that drafts schemes of work and lesson plans in the Tanzanian TIE format using the Claude API.
This pilot build has teacher sign-in by phone number + access code, a draft allowance per teacher, in-app feedback and an admin page. It has no payments yet.
What is in this folder
File	What it does
`server.js`	The server. Holds the Claude API key, signs teachers in, builds prompts, enforces allowances, logs usage and feedback. No dependencies.
`public/`	The app teachers see (`index.html`, `app.js`, `core.js`), offline support (`sw.js`, `manifest.webmanifest`), the Word export library (`vendor/docx.js`) and the admin page (`admin.html`).
`test/e2e.js`	Automated test that runs everything against a fake Claude API.
`Dockerfile`, `.env.example`	For deployment.
Try it on your own computer (5 minutes, no API key needed)
Install Node.js 20 or newer from nodejs.org.
In this folder run: `npm run dev`
Open http://localhost:3000/admin, password `admin`. Add yourself as a teacher and note the access code.
Open http://localhost:3000 and sign in.
`npm run dev` uses mock mode: drafts are placeholder text and nothing is sent to Claude. To use real AI locally:
```
ANTHROPIC_API_KEY=sk-ant-... ADMIN_PASSWORD=something node server.js
```
Put it online
You need three things:
An Anthropic API key. Create an account in the Anthropic Console (console.anthropic.com), add credit, and create a key. Set a monthly spend limit there as a second safety net.
A host that runs Node.js or Docker and gives you a persistent disk. The server keeps everything in one file, `data.json`, so the disk must survive restarts. Hosts such as Render, Railway or Fly.io offer this, as does any small VPS. Free tiers usually wipe the disk on restart, which would delete your teachers and feedback, so pick a plan with a disk or volume.
HTTPS. Installing the app on a phone and offline mode only work over HTTPS. The hosts above provide it automatically.
Steps (the same on most hosts):
Put this folder in a private GitHub repository, or upload it to the host directly.
Create a new web service from it. If asked: build command is empty, start command is `node server.js`. Or let the host use the `Dockerfile`.
Attach a persistent disk or volume and mount it at `/data`.
Set the environment variables from `.env.example`: at minimum `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD` and `DATA_DIR=/data`.
Deploy, then open `https://your-address/admin`. The status line must say the API key is set.
Add each pilot teacher. Send them the app link, their phone number as you typed it, and their 6-digit code.
Teachers install it from the browser menu: "Add to Home screen" in Chrome on Android, or Share then "Add to Home Screen" in Safari on iPhone.
Running the pilot
Admin page (`/admin`): add teachers, see each one's code, drafts used, last sign-in, every draft's subject and class, and all feedback. "Copy all pilot data as JSON" gives you the raw data for analysis.
Allowance: each new teacher gets `DEFAULT_QUOTA` drafts (30). One scheme of work, one lesson plan and one AI rewrite each count as one draft. Raise a teacher's allowance by saving them again with a higher number.
Daily cap: `MAX_DAILY_DRAFTS` (300) limits total spend per day whatever happens.
Model: `CLAUDE_MODEL` defaults to `claude-sonnet-5-5`. Try `claude-haiku-5-5` on a few Kiswahili and English drafts; if teachers cannot tell the difference, use it, because it costs less per draft.
Back up `data.json` from the disk before you redeploy or change hosts.
What this pilot does not do yet
No mobile-money payments or subscriptions.
No text-message login; you hand out access codes yourself.
Teachers' documents are saved on their own phone only. The server keeps a log line per draft (subject, class, lesson title), not the document.
One server process and one data file: fine for tens of teachers, not for thousands. The paid version needs a real database.
The official TIE syllabus content is not built in. The Syllabus tab links to TIE's website.
Privacy note for teachers
The server stores each teacher's name, phone number, school, a log of what they drafted and any feedback they send. Tell pilot teachers this when you invite them. What they type into the forms is sent to Anthropic's API to produce the draft.
Tests
`npm test` starts the server against a fake Claude API and checks sign-in, drafting, allowances, feedback, the admin page and file serving. If `jsdom` is installed (`npm i -D jsdom`) it also drives the app page itself.
