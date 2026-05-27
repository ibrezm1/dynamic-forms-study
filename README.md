# FlexForm - Dynamic Multi-Step Onboarding Monorepo

A modern, highly visual multi-step dynamic onboarding forms application. The system is architected as a professional monorepo containing a frontend client (`angular-fe` in Angular 19+ Standalone) and a validation backend service (`node-be` in Express.js).

The backend serves as the single source of truth for all schemas and registered profiles, and executes stateful validation logic via real HTTP API endpoints utilizing transparent dev-server proxy redirection.

---

## 1. System Architecture Overview

The monorepo operates on a **reverse-proxied data-driven architecture**. There are no hard-coded forms or hard-coded user profiles; all wizards and identities are fetched dynamically from the Node.js backend:

```mermaid
graph TD
    A[Angular Client (angular-fe)] -->|1. Request /profiles.json| B[Angular Dev Server]
    A -->|2. Request /form-schema-*.json| B
    A -->|3. POST /api/validate/*| B
    B -->|4. Reverse Proxy Config| C[Express Backend (node-be)]
    C -->|5. Streams Data Files| D[(data/ profiles & schemas)]
    C -->|6. Processes Validation Rules| C
    C -->|7. Simulates 800ms Latency| B
    B -->|8. Delivers Response payload| A
```

- **`angular-fe`**: The frontend UI dashboard. It dynamically constructs Reactive Forms subgroups from the retrieved schema, handles client-side constraints (minLength, pattern, required), and renders a vertical animated timeline stepper.
- **`node-be`**: The Express.js backend. It owns and serves the static JSON databases and runs stateful server-side validation checks (e.g. email availability, blocked domain lists, reserved usernames, role constraints) with realistic network latency.
- **Reverse Proxy**: A transparent proxy configured inside the Angular development server redirections. Calls made by the client to local paths are transparently forwarded to `http://localhost:3000` to eliminate CORS issues.

---

## 2. Directory Structure

```
/Users/ibrezmm/Gravity-projects/Dynamic-forms
├── package.json (Monorepo root package manager & workspaces config)
├── angular-fe/ (Angular 19+ standalone app)
│   ├── src/
│   │   ├── app/ (Core Angular components & services)
│   │   │   ├── components/ (Dynamic form fields & stateful stepper UI)
│   │   │   ├── app.config.ts (Standalone configurations)
│   │   │   └── app.ts (State orchestrator & dashboard view)
│   │   └── styles.css (Global design tokens & dark-theme variables)
│   ├── angular.json (Build configs updated with proxyConfig)
│   ├── package.json (Frontend test/build scripts)
│   └── proxy.conf.json (Local reverse-proxy rules)
└── node-be/ (Express.js validation & data server)
    ├── package.json
    ├── server.js (Express endpoints & validation middlewares)
    └── data/ (Single source-of-truth configurations)
        ├── form-schema-1.json (Standard form schema)
        ├── form-schema-2.json (Professional form schema with extra fields)
        └── profiles.json (Default completed profiles registry)
```

---

## 3. Operational Command Reference

You can manage, build, and test the entire monorepo from the root directory using the native workspace scripts:

### Quick Start (Start Both Front-End & Back-End in Parallel)
Run the following command at the monorepo root directory. This will boot the Express server and the Angular dev server concurrently in a single terminal session:
```bash
npm start
```

#### Alternative: Bash Run Script (macOS / Linux)
On macOS or Linux, you can execute the pre-configured startup script (which checks dependencies and concurrently starts both servers):
```bash
./run-dev.sh
```

#### Alternative: PowerShell Run Script (Windows)
On environments utilizing PowerShell, you can boot the monorepo via:
```powershell
./run-dev.ps1
```

- **Express Backend**: Listening on [http://localhost:3000](http://localhost:3000)
- **Angular Frontend**: Active and accessible at [http://localhost:4200/](http://localhost:4200/)

---

### Running Services Separately

If you prefer to start or debug either component individually:

#### Start the Node.js Express Backend
```bash
npm run start:be
```
The server starts listening dynamically on port `3000`.

#### Start the Angular Development Server
```bash
npm run start:fe
```
Starts the Angular builder on port `4200`, automatically applying the reverse proxy rules.

---

### Running Tests & Building

#### Run Frontend Unit Tests
Execute the Vitest test runner inside the Angular client workspace:
```bash
npm run test:fe
```

#### Compile Frontend for Production
Compile the optimized production bundles:
```bash
npm run build:fe
```
The compiled static assets will be output to `angular-fe/dist/dynamic-forms/browser`.

---

## 4. Development Verification Guide

Verify the backend integration is functioning as expected by running these interactive checks:

- **Static Constraints check**: Fill inputs with invalid parameters (e.g. single character names) and notice custom red alerts appear instantly under the fields based on the static validations.
- **Server Verification Delays**: When clicking "Next Step", notice the "Verifying Page..." loader and spinning stepper status. The Express server introduces an artificial `800ms` delay to simulate real-world API gateway latency.
- **Email Conflict & Restriction Checks**: In Step 1, enter `taken@domain.com` or any email ending with `@blocked.com` to see live API-driven validation errors handled by the backend Express server.
- **Username Conflict Checks**: In Step 2, enter reserved keywords like `admin`, `root`, or `system` to trigger backend username conflict exceptions.
- **Error States Mocking**: Click "Next Step" while using the testing error endpoints configured in the JSON files to verify that backend validation rejections display gracefully with shaking warnings on the stepper.
