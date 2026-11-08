# AGENTS.md – Ruttplaneraren

Håll den här filen uppdaterad när projektet ändras.

## Arbetsregler
1. **Språk:** svenska i chatt, kommentarer och dokumentation.
2. **Köra projektet:** `npm run dev` (port 5173). Förhandsvisning: http://localhost:5173. Berätta alltid för användaren vad som körs.
3. **Git:** jobba på branch (nu `feature/ruttplanerare`), aldrig direkt på `main`. Committa och pusha bara när användaren ber om det.
4. **Kod:** korta, konkreta kommentarer så att koden går att läsa och lära sig av.
5. **Design:** modern och futuristisk. Använd skills Frontend Design och UI/UX Pro Max.
6. **Intervju:** fråga först om information saknas eller förbättringar finns.
7. **Plan:** gör en plan som visar vad som ska göras.
8. **Godkännande:** skriv ingen kod förrän användaren har granskat och godkänt planen.
9. **Undantag:** små ändringar, t.ex. stavfel, görs direkt.

## Nyckelhantering
- Mapbox-nyckeln läses från `MAPBOX_API_KEY` (Vite `envPrefix` tillåter `MAPBOX_`).
- Lokalt: `.env.local` (git-ignorerad). Användaren fyller i själv. **Läs aldrig `.env.local` eller `TOKEN.secret`** och be aldrig om nyckeln i chatten.
- Publicering: repo-secret `MAPBOX_API_KEY` i GitHub. Använd en publik `pk.`-token med URL-begränsning.
- Saknas eller fungerar inte nyckeln visar appen ett tydligt meddelande (`keyMissing` / `keyInvalid` i `src/i18n.js`).

## Teknik
React + Vite (JavaScript), `mapbox-gl`, `base: './'` för GitHub Pages. Data sparas i `localStorage`.

## Struktur
- `src/App.jsx` – tillstånd, rutthämtning, panel och toppfält
- `src/components/MapView.jsx` – Mapbox-kartan, markörer och ruttlinje
- `src/components/AddressInput.jsx` – adressfält med förslag och favoritstjärna
- `src/mapbox.js` – Geocoding och Directions
- `src/i18n.js` – svenska/engelska texter
- `src/storage.js` – localStorage-hjälpare
- `src/styles.css` – design (tokens överst)
- `.github/workflows/deploy.yml` – bygger och publicerar till GitHub Pages

## Favoriter (beteende)
- Hela adressraden i favoritlistan är en knapp. Den fyller det aktiva fältet (`activeField` i `App.jsx`).
- Aktivt fält = det senast klickade (lysande kant). Startvärde: Från.
- Efter ett tryck på en favorit byter markeringen alltid till det andra fältet (Från → Till, Till → Från).
- Efter val av adressförslag flyttas markeringen till nästa tomma fält; är båda fyllda ligger den kvar.
- Kryss-knappen till höger tar bort favoriten.
- Ordning: upp/ned-pilar och dra-och-släpp (HTML5 drag, `moveFav` i `App.jsx`). Ordningen sparas i `localStorage`; nya favoriter läggs sist. Dra och släpp fungerar inte på tryckskärm, där används pilarna.

## Status
- [x] Grund, karta, adresser, klick, färdsätt, rutt, favoriter, språk, design
- [ ] Granska i webbläsare (kräver nyckel i `.env.local`)
- [ ] Skapa publikt GitHub-repo `RuttPlaneraren` och publicera (när användaren ber om det)
