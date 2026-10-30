# e-Cutter

ID card (Aadhaar, PAN, Voter, Ayushman…) PDF se front/back crop karke sahi
size (CR-80, 85.6 × 54 mm @ 300 DPI) mein print karne ka tool. Saara kaam
browser ke andar hota hai – koi file server par upload nahi hoti.

## Chalana

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # dist/ – kisi bhi static host (Cloudflare Pages) par daalo
npm run samples    # samples/ ke synthetic PDFs dobara banao
```

## Abhi kya hai (Phase 1)

- PDF / JPG / PNG upload, ek saath kai files
- Password wale PDF (e-Aadhaar, e-PAN) – card type ke hisaab se hint
- Auto front/back detection (card ke border se), na mile to mouse se box banao
- Front / Back / Both PNG download
- Smart Print: A4 (4 card per sheet), 4x6, 4x6 double-side glossy, trim line
- Exact-size print PDF (print dialog mein Scale 100% rakho)

## Code

| File | Kaam |
|---|---|
| `src/lib/source.ts` | PDF/image ko 300 DPI canvas mein render (pdf.js) |
| `src/lib/detect.ts` | Card-shaped border dhoondhna (connected components) |
| `src/lib/crop.ts` | Crop + CR-80 size mein fit |
| `src/lib/layouts.ts` | A4 / 4x6 / duplex placement (mm mein, pure math) |
| `src/lib/exportPdf.ts` | Print PDF banana (pdf-lib) |

## Samples

`samples/` mein sirf **synthetic SPECIMEN** files hain (nakli data, koi sarkari
logo nahi) aur `sample-checklist.pdf` – asli samples jama karne ki list.
Asli documents `samples/real/` mein rakho; ye folder git-ignored hai, kabhi
commit mat karna.

## Aage (Phase 2+)

Login (Supabase + Google), wallet / plans (Razorpay), crop history + bulk
print, state-wise card list, passport photo, resume builder.
