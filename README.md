# Nexavo Marknadsapp

AI-driven franchise marketing platform. HQ skapar kampanjer, franchisetagare hämtar material.

## Stack

- React 18 + TypeScript + Vite
- Supabase (Postgres + Edge Functions + Storage)
- shadcn/ui + Tailwind CSS
- Vercel (deploy)

## Komma igång

1. Klona repot
2. `npm install`
3. Kopiera `.env.example` till `.env.local` och fyll i Supabase-credentials
4. Kör `supabase/schema.sql` mot ditt Supabase-projekt
5. Kör `supabase/storage.sql` för Storage-buckets
6. `npm run dev`

## Supabase Setup

Skapa ett Supabase-projekt på supabase.com och kopiera URL + anon key.
Kör migrations i Supabase SQL Editor:

1. `supabase/schema.sql` — Tabeller + RLS
2. `supabase/storage.sql` — Storage buckets

## Roller

- `hq_admin` — Skapar kampanjer, styr varumärket, publicerar material
- `franchisee` — Loggar in på portal, laddar ner material

## Edge Functions

10 AI-funktioner i `supabase/functions/`:

- `get-brand-context` — Hämtar brand DNA
- `check-brand-guardrails` — Brand compliance
- `generate-concept` — Kampanjkoncept
- `generate-campaign-pack` — Kampanjpaket (alla format)
- `copy-engine` — Kanalanpassad copy
- `generate-image` — DALL-E bildgenerering
- `composite-images` — Bildkompositing
- `generate-template-layout` — Template-design
- `export-brand-assets` — Asset-export
- `reflow-template` — Format-anpassning

## Projektstruktur

```
src/
  components/   UI-komponenter
  contexts/     React contexts (Auth, Brand)
  hooks/        Custom hooks
  lib/          Utilities (supabase, storage, adCompositor, brandContextAdapter)
  pages/
    hq/         HQ-vyer (dashboard, kampanjer, brand, kalender, settings)
    franchise/  Franchisee-portal
  types/        TypeScript-typer
```

## Scripts

- `npm run dev` — Starta utvecklingsserver
- `npm run build` — Bygg för produktion
- `npm run preview` — Förhandsvisa produktionsbygge
- `npx tsc --noEmit` — Typkontroll

## Features

### HQ Portal
- **Dashboard** — Översikt med statistik och senaste kampanjer
- **Kampanjer** — Skapa, redigera och hantera kampanjer
- **Varumärke** — Sätt upp brand DNA (färger, typografi, ton)
- **Kalender** — Månadsvy med kampanjdatum
- **Franchisetagare** — Lista över franchisetagare
- **Inställningar** — Profilinställningar

### Franchisee Portal
- **Kampanjvy** — Se tillgängliga kampanjer
- **Material** — Ladda ner assets organiserade per kanal
- **Filter** — Filtrera efter kategori (sociala medier, print, etc.)

## Utvecklat med 🤖

Byggt under 6 sprints med AI-assisterad utveckling.
