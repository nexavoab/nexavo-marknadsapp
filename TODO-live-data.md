# TODO: Replace Mock Data with Live Supabase Data

## Status
- [x] Vercel env-variabler konfigurerade (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Databastabeller skapade i Supabase
- [ ] Mock-data ersatt med riktiga API-anrop

## Filer som använder mock-data

### 1. `src/pages/hq/annual-plan/AnnualPlanPage.tsx`
- Använder `mockAnnualPlan` för testdata
- Behöver kopplas till Supabase `annual_plans` tabell

### 2. `src/pages/hq/annual-plan/CampaignSlotCard.tsx`
- Refererar till mock-strukturer
- Behöver uppdateras när AnnualPlanPage använder live data

### 3. `src/pages/hq/annual-plan/SlotDetailPanel.tsx`
- Refererar till mock-strukturer
- Behöver uppdateras när AnnualPlanPage använder live data

### 4. `src/test/hooks/useAIGateway.test.ts`
- Testfil — mock-data OK att behålla för tester

## Nästa steg
1. Skapa `annual_plans` och `campaign_slots` tabeller i Supabase
2. Migrera mock-strukturen till riktiga tabeller
3. Uppdatera AnnualPlanPage att använda `useQuery` + Supabase client
4. Testa med riktiga credentials

## Issue: WAS-379
