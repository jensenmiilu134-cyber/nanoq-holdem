# Nanoq Hold'em – online

Grønlandsk Texas Hold'em, som du og vennerne kan spille fra hver jeres telefon eller computer. Ingen konti, kun et link. Chipsene er fiktive.

## Sådan spiller I

1. Åbn siden og tryk **Opret nyt bord**. Du er nu leder af bordet.
2. Tryk **Bord XXXXX · Kopiér link** øverst, og send linket til vennerne. De kan også skrive bordkoden på forsiden.
3. Alle skriver et kaldenavn og vælger en karakter. Tryk **Del kort**.

Lederpanelet ser kun den, der oprettede bordet: giv og tag chips, godkend genkøb, ændr blinds, kaffemik-pause, smid ud og nulstil. Du forbliver leder, så længe du bruger den samme browser.

## Læg spillet online gratis (ca. 10 minutter)

Spillet skal køre på en server. Render.com har en gratis plan, der passer.

### 1. Læg filerne på GitHub
1. Opret en gratis konto på **github.com**.
2. Tryk **+** øverst til højre → **New repository**. Kald det `nanoq-holdem`, og tryk **Create repository**.
3. Tryk på linket **uploading an existing file**.
4. Pak zip-filen ud. Træk **indholdet** af mappen (filerne og mappen `public`) over i browservinduet.
5. Tryk **Commit changes**.

### 2. Start serveren på Render
1. Opret en gratis konto på **render.com**. Log ind med din GitHub-konto, så er det nemmest.
2. Tryk **New** → **Web Service**, og vælg dit `nanoq-holdem`-repository.
3. Udfyld:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Region:** Frankfurt (tættest på Danmark, så der er mindst forsinkelse)
   - **Instance Type:** Free
4. Tryk **Deploy Web Service**. Efter et par minutter står der **Live**, og du får en adresse som `https://nanoq-holdem.onrender.com`.

Det er linket, I spiller på.

### Godt at vide om den gratis plan
- Serveren går i dvale efter ca. 15 minutter uden besøg. Første besøg derefter kan tage op til et minut.
- Borde findes kun, mens serveren kører. Går den i dvale eller genstarter, skal du oprette et nyt bord.
- En spiller har 40 sekunder til sin tur. Derefter checker eller folder serveren automatisk.

## Kør det på din egen computer (valgfrit)
Kræver Node.js 18 eller nyere. Kør `npm install` og derefter `npm start`, og åbn http://localhost:3000.
