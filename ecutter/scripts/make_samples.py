"""Generate synthetic SPECIMEN test PDFs and the real-sample checklist.

The specimens only imitate the *geometry* of e-card PDFs (a bordered
CR-80 sized panel for each side). They contain fake data, no government
names or emblems, and are watermarked so they can never pass as an ID.

Run:  python3 scripts/make_samples.py
"""

from pathlib import Path

from reportlab.lib.colors import Color, black, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.pdfencrypt import StandardEncryption
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

OUT = Path(__file__).resolve().parent.parent / "samples"
CARD_W, CARD_H = 85.6 * mm, 54 * mm
LIGHT = Color(0.88, 0.88, 0.88)
MID = Color(0.55, 0.55, 0.55)
NOTICE = "SPECIMEN - SOFTWARE TEST FILE - NOT A VALID ID"


def watermark(c, x, y, w, h):
    c.saveState()
    c.setFillColor(LIGHT)
    c.setFont("Helvetica-Bold", 18)
    c.translate(x + w / 2, y + h / 2)
    c.rotate(20)
    c.drawCentredString(0, -6, "SPECIMEN")
    c.restoreState()


def card_front(c, x, y, name):
    c.setStrokeColor(black)
    c.setLineWidth(1.2)
    c.roundRect(x, y, CARD_W, CARD_H, 3 * mm)
    watermark(c, x, y, CARD_W, CARD_H)
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 5 * mm, y + CARD_H - 9 * mm, "DEMO IDENTITY CARD")
    # photo placeholder (kept inside the border, not touching it)
    c.setFillColor(MID)
    c.rect(x + 5 * mm, y + 12 * mm, 20 * mm, 24 * mm, stroke=0, fill=1)
    c.setFillColor(black)
    c.setFont("Helvetica", 8)
    c.drawString(x + 29 * mm, y + 32 * mm, f"Name: {name}")
    c.drawString(x + 29 * mm, y + 27 * mm, "DOB: 01/01/1990")
    c.drawString(x + 29 * mm, y + 22 * mm, "Gender: -")
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(x + CARD_W / 2, y + 5 * mm, "TEST 0000 0000")


def card_back(c, x, y):
    c.setStrokeColor(black)
    c.setLineWidth(1.2)
    c.roundRect(x, y, CARD_W, CARD_H, 3 * mm)
    watermark(c, x, y, CARD_W, CARD_H)
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 5 * mm, y + CARD_H - 9 * mm, "DEMO CARD - BACK SIDE")
    c.setFont("Helvetica", 8)
    for i, line in enumerate(["Address: 1 Test Street,", "Sample Nagar, Demo City", "PIN 000000"]):
        c.drawString(x + 5 * mm, y + 32 * mm - i * 5 * mm, line)
    # QR placeholder
    c.setFillColor(MID)
    c.rect(x + CARD_W - 27 * mm, y + 8 * mm, 20 * mm, 20 * mm, stroke=0, fill=1)


def page_header(c, title):
    w, h = A4
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(w / 2, h - 20 * mm, title)
    c.setFont("Helvetica", 9)
    c.setFillColor(Color(0.7, 0.1, 0.1))
    c.drawCentredString(w / 2, h - 27 * mm, NOTICE)
    c.setFillColor(black)
    c.setFont("Helvetica", 9)
    y = h - 40 * mm
    for line in [
        "This page imitates the layout of a downloaded e-card PDF so the cutter",
        "can be tested without using anybody's real document. All data is fake.",
    ]:
        c.drawString(20 * mm, y, line)
        y -= 5 * mm


def side_by_side(path, encrypt=None):
    c = canvas.Canvas(str(path), pagesize=A4, encrypt=encrypt)
    page_header(c, "Specimen e-card (front and back side by side)")
    w, _ = A4
    gap = 8 * mm
    x0 = (w - 2 * CARD_W - gap) / 2
    card_front(c, x0, 40 * mm, "TEST USER")
    card_back(c, x0 + CARD_W + gap, 40 * mm)
    c.showPage()
    c.save()


def stacked(path):
    c = canvas.Canvas(str(path), pagesize=A4)
    page_header(c, "Specimen e-card (front above back)")
    w, h = A4
    x0 = (w - CARD_W) / 2
    card_front(c, x0, h - 120 * mm, "SAMPLE PERSON")
    card_back(c, x0, h - 185 * mm)
    c.showPage()
    c.save()


def checklist(path):
    rows = [
        ("Aadhaar (e-Aadhaar)", "myaadhaar.uidai.gov.in", "Pwd: naam ke 4 akshar CAPS + birth year"),
        ("PAN - NSDL e-PAN", "onlineservices.proteantech.in", "Password: DOB (DDMMYYYY)"),
        ("PAN - UTI e-PAN", "pan.utiitsl.com", "Password: DOB (DDMMYYYY)"),
        ("PAN - Income Tax e-PAN", "eportal.incometax.gov.in", "Password: DOB (DDMMYYYY)"),
        ("Voter ID (e-EPIC)", "voters.eci.gov.in", "Usually no password"),
        ("Ayushman (PMJAY)", "beneficiary.nha.gov.in", "Card PDF/image"),
        ("ABHA card", "abha.abdm.gov.in", "Card PDF"),
        ("Driving Licence / RC", "DigiLocker", "DigiLocker PDF"),
        ("Ration card (apne state ka)", "State food portal / Mera Ration", "Har state ka layout alag"),
    ]
    c = canvas.Canvas(str(path), pagesize=A4)
    w, h = A4
    c.setFont("Helvetica-Bold", 16)
    c.drawString(20 * mm, h - 22 * mm, "e-Cutter: Real Sample Checklist")
    c.setFont("Helvetica", 9.5)
    y = h - 32 * mm
    intro = [
        "Har card type ke liye 2-3 asli PDF chahiye (apne ya family ke, unki permission se).",
        "Inse sirf layout (front/back kahan hai) tune hoga. Data kahin store ya commit nahi hoga.",
        "Files ko  ecutter/samples/real/  folder mein rakho - ye folder git mein ignore hai.",
    ]
    for line in intro:
        c.drawString(20 * mm, y, line)
        y -= 5.5 * mm
    y -= 4 * mm
    c.setFont("Helvetica-Bold", 10)
    for x, t in [(20, "Card"), (75, "Kahan se download"), (130, "Note")]:
        c.drawString(x * mm, y, t)
    y -= 2.5 * mm
    c.line(20 * mm, y, w - 20 * mm, y)
    y -= 6 * mm
    c.setFont("Helvetica", 9)
    for card, src, note in rows:
        c.rect(14 * mm, y - 1 * mm, 3.5 * mm, 3.5 * mm)
        c.drawString(20 * mm, y, card)
        c.drawString(75 * mm, y, src)
        c.drawString(130 * mm, y, note[:42])
        y -= 8 * mm
    y -= 4 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "Har sample ke saath ye bhi likh do (notes.txt):")
    c.setFont("Helvetica", 9)
    for line in [
        "1. File ka source (portal) aur download ki date",
        "2. Password (agar hai) - sirf local notes mein, chat ya git mein nahi",
        "3. Ek photo ya scan bhi ho to accha (image upload test ke liye)",
        "Priority: pehle Aadhaar + PAN (NSDL/UTI), phir baaki.",
    ]:
        y -= 6 * mm
        c.drawString(24 * mm, y, line)
    c.setFillColor(Color(0.7, 0.1, 0.1))
    c.drawString(20 * mm, 20 * mm, "Kisi bhi sample ko public jagah (GitHub, Telegram group) par share mat karna.")
    c.showPage()
    c.save()


def main():
    OUT.mkdir(exist_ok=True)
    side_by_side(OUT / "specimen-side-by-side.pdf")
    side_by_side(
        OUT / "specimen-locked-TEST1990.pdf",
        encrypt=StandardEncryption("TEST1990", canPrint=1),
    )
    stacked(OUT / "specimen-stacked.pdf")
    checklist(OUT / "sample-checklist.pdf")
    for p in sorted(OUT.glob("*.pdf")):
        print(p.relative_to(OUT.parent), p.stat().st_size)


if __name__ == "__main__":
    main()
