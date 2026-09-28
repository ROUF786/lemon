# Bagawan Brothers — website

Mobile-first, bright-colour website for the lemon business — **4 pages**:

| Page | File | Kya hai |
|---|---|---|
| Home | `site/index.html` | Colour badalne wala lemon slider, 4 lemon cards, hum kisko supply karte hain, Lemon City |
| Lemons | `site/lemons.html` | Saari varieties ke cards (har card par "Ask rate" WhatsApp button), size & packing |
| About | `site/about.html` | Indi / Lemon City, numbers, Why Bagawan, farm se counter tak |
| Order | `site/order.html` | 3 steps + enquiry form (email + WhatsApp) |

---

## Roz ke kaam (sirf ye yaad rakho)

| Kaam | Kya karna hai |
|---|---|
| Nayi lemon photo daalni hai | Photo ko **Desktop → Image** folder mein daalo. File ka naam = variety ka naam, jaise `Kagzi.jpg`. Phir **`update-lemons.bat`** par double-click. |
| Website dekhni hai | **`preview.bat`** par double-click. Computer par browser khulega, aur window mein phone ka link bhi dikhega (same Wi-Fi par phone mein kholo). |
| Tagline / order / badge badalna hai | **`lemons.json`** kholo (Notepad), badlo, save karo, phir `update-lemons.bat`. |
| Menu / footer badalna hai | Sirf **`site/index.html`** mein badlo — `update-lemons.bat` baaki teeno pages mein apne-aap copy kar deta hai. |
| WhatsApp number, email form key, website address | **`site/assets/js/config.js`** kholo (Notepad), value badlo, phir `update-lemons.bat`. |

> Pehli baar `update-lemons.bat` chalane par 1–2 minute setup hota hai (internet chahiye). Uske baad har baar kuch seconds.

---

## Achhi photo kaise lein (slider isi ke liye bana hai)

- **Ek hi rang ka background** — chart paper, kapda ya deewar (peela, hara, neela, gulabi…). Website us rang ko pehchaan kar poore slider ka background wahi bana deti hai, photo ke kinare mil jaate hain.
- Din ki roshni, khidki ke paas. Flash nahi.
- 3 poore nimbu + 1 kata hua + 2–3 patte, beech mein. Aas-paas thodi khali jagah chhodo.
- Phone ka normal (1x) camera. Photo kam se kam **1200px** chaudi ho (aajkal ka har phone isse badi deta hai).
- Transparent PNG (background hata hua) bhi chalti hai.
- Order badalna ho to naam ke aage number: `1 Kagzi.jpg`, `2 Eureka.jpg`.
- `update-lemons.bat` chhoti ya kharab photo ke baare mein khud bata deta hai.

**Doosre ki photo** (Google, Wikimedia, stock) sirf tab use karo jab license allow kare. CC BY / CC BY-SA photo ho to website par photographer ka naam + license link dena zaroori hai.

---

## Enquiry form kaise kaam karta hai

- **Send enquiry** → message aapke email par aata hai (Web3Forms se — key `config.js` mein hai; email wahi jo Web3Forms par diya tha). Email mein customer ka WhatsApp link bhi hota hai — ek tap mein reply.
- **Send on WhatsApp** → customer ka WhatsApp khulta hai, sab details pehle se likhi hoti hain, message seedha aapke number par.
- Web3Forms dashboard mein agar "allowed domains" set karo, to apna website address (jaise `bagawan.rouf.in`) zaroor daalo.

---

## Website ko internet par daalna (free)

1. `update-lemons.bat` chalao.
2. **https://app.netlify.com/drop** kholo aur poora **`site`** folder wahan drag karo. Link mil jaayega (jaise `something.netlify.app`).
3. Apna address (jaise **`bagawan.rouf.in`**) jodne ke liye: Netlify → *Domain settings* → *Add custom domain*. Phir jahan `rouf.in` ka DNS hai, wahan ek **CNAME** record: `bagawan` → `something.netlify.app`.
4. Baad mein update: dobara `update-lemons.bat`, phir Netlify par naya `site` folder drag karo (*Deploys* tab).

> ⚠️ `maktaba.rouf.in` mat use karna — woh aapka Maktaba app hai. Lemon site ke liye alag address (jaise `bagawan.rouf.in`) rakho aur wahi `config.js` ke `SITE_URL` mein likho.

---

## Dhyan rakhne wali baatein

- **GI tag:** "GI-tagged Indi lime" tabhi likhein jab aap GI ke registered/authorised user hon (Karnataka State Lemon Development Board / GI registry se confirm karein). Nahi to `lemons.json` mein Kagzi ka `"badge": ""` kar do aur `site/index.html` mein "GI" wala box badal do.
- Jo varieties aap bechte nahi, unki photo Image folder se hata do — slider aur Lemons page sirf wahi dikhayein jo aap supply karte ho.
- Colours bright hi rakhne hain — dark sections nahi.

---

## Folder mein kya hai

```
bagawan-brothers/
├─ update-lemons.bat      ← photos daalne ke baad double-click
├─ preview.bat            ← website dekhne ke liye
├─ lemons.json            ← tagline / order / badge
├─ site/                  ← YAHI folder internet par jaata hai
│  ├─ index.html  lemons.html  about.html  order.html
│  └─ assets/  (css, js, fonts, images)
│     └─ js/config.js     ← number, form key, website address
├─ scripts/               ← photo process karne wala code (chhedne ki zaroorat nahi)
└─ AGENTS.md              ← Codex / AI helpers ke liye notes
```
