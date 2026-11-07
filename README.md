# Területfoglaló — Európa Hadszíntér

Valós idejű, multiplayer területfoglalós stratégiai játék Európa térképén.

**Élő prototípus:** `npm run dev` → http://localhost:5173

## Játékmenet a te elképzelésed alapján

- **Szerverlista:** játékosok által létrehozott szerverek (nem kamu), pinggel, férőhellyel
- **Országválasztó:** csak a még nem választott / nem őrzött országok közül lehet választani, OK gombbal belépés, spawn a fővárosban
- **Erőforrás sáv (felső bar):** $ (pénz), Manpower (toborozható emberek), Political Points (PP háború indításához, 50PP / háború)
  - Alaptőke: ~$2B (méretfüggő), 80k manpower (1 városra elég), 100 PP (2 háborúra elég)
  - Mindhárom növekszik passzívan, fejlesztésekkel gyorsítva
- **Háború indítása:** kétlépcsős — első háború 10s + 10s megerősítés (gyorsított), utána 30s + 30s, hivatalos megerősítő kell
- **Város szintek I-X:**
  - **Védelem:** 20k MP + $700M alap (I. szint), szintezés sokszorozva → erősebb város, több katona + hosszabb ostrom, bónusz manpower termelésre
  - **Gazdaság:** $700M / szint / város átlag, **Ctrl+LMB** több város kijelölés (csak saját zöld), 5+ városnál -200M kedvezmény / város

## Tech

React + Vite + SVG Európa térkép. Jelenleg lokális szimuláció (bot ellenfelek), backend Socket.io-ra előkészítve.

## Futtatás

```bash
npm install
npm run dev
npm run build
```

## Következő lépések

- Valódi WebSocket multiplayer (Node + Socket.io)
- Mentés / ranglista / diplomácia
- Mobil optimalizálás + hangok
