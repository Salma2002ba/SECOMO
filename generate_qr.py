"""
Générateur de QR code SECOMO
=============================
Génère l'image QR code à imprimer et coller sur une machine ESP32.

Installation (une seule fois) :
    pip install qrcode[pil]

Usage :
    python generate_qr.py
"""

import json
import os
import re
import sys
from datetime import datetime

try:
    import qrcode
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Dépendances manquantes. Lance : pip install qrcode[pil]")
    sys.exit(1)


def valider_mac(mac: str) -> bool:
    return bool(re.match(r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$", mac))


def main():
    print("\n=== Générateur de QR code SECOMO ===\n")
    print("L'adresse MAC s'affiche dans le moniteur série au 1er démarrage de l'ESP32.")
    print("Format attendu : AA:BB:CC:DD:EE:FF\n")

    while True:
        mac = input("Adresse MAC de l'ESP32 : ").strip().upper()
        if valider_mac(mac):
            break
        print("  Format invalide. Exemple : A4:CF:12:3B:00:F1\n")

    nom = input("Nom de la machine (ex: Bac-Tomates-A1) : ").strip() or "SECOMO-device"
    diminutif = input("Diminutif court pour le nom de fichier (ex: tom-A1) : ").strip() or nom[:10]

    # Données encodées dans le QR
    data = json.dumps({"mac": mac}, separators=(",", ":"))
    print(f"\n  Données QR : {data}")

    # Générer le QR code
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img_qr = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_w, qr_h = img_qr.size

    # Ajouter légende
    legende_h = 60
    img_final = Image.new("RGB", (qr_w, qr_h + legende_h), "white")
    img_final.paste(img_qr, (0, 0))

    draw = ImageDraw.Draw(img_final)
    try:
        font_titre = ImageFont.truetype("arial.ttf", 18)
        font_mac   = ImageFont.truetype("arial.ttf", 13)
    except OSError:
        font_titre = ImageFont.load_default()
        font_mac   = font_titre

    draw.text((qr_w // 2, qr_h + 8),  nom, fill="black",   font=font_titre, anchor="mt")
    draw.text((qr_w // 2, qr_h + 35), mac, fill="#555555", font=font_mac,   anchor="mt")

    # Dossier de sortie
    dossier = os.path.join(os.path.dirname(os.path.abspath(__file__)), "QRcode")
    os.makedirs(dossier, exist_ok=True)

    date_str = datetime.now().strftime("%Y%m%d")
    diminutif_safe = re.sub(r"[^A-Za-z0-9_-]", "_", diminutif)
    fichier = os.path.join(dossier, f"{date_str}_{diminutif_safe}.png")
    img_final.save(fichier)

    print(f"\n  QR code généré : {fichier}")
    print("  Imprime ce fichier et colle-le sur la machine.\n")


if __name__ == "__main__":
    main()
