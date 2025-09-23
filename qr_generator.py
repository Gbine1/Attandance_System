import qrcode
from PIL import Image
import os
from datetime import datetime

# Ensure QR code directory exists relative to app.py
QR_CODE_DIR = 'static/qr_codes'
os.makedirs(QR_CODE_DIR, exist_ok=True)


def generate_qr_code(data: str, filename_prefix: str = "qr_code", logo_path: str = None) -> str:
    """
    Generates a QR code for the given data and saves it to a file.
    Optionally embeds a logo in the center.

    Args:
        data (str): The data to encode in the QR code (usually a URL).
        filename_prefix (str): A prefix for the filename. Defaults to "qr_code".
        logo_path (str): Optional path to a logo image to embed in the QR.

    Returns:
        str: The relative path to the generated QR code image (e.g., 'qr_codes/my_qr_code.png').
    """
    try:
        # 1️⃣ Create the QR Code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,  # High for logo overlay
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

        # 2️⃣ Optional: Embed logo
        if logo_path and os.path.exists(logo_path):
            try:
                logo = Image.open(logo_path)

                # Resize logo to 20% of QR code size
                qr_width, qr_height = qr_img.size
                logo_size = int(qr_width * 0.2)
                logo.thumbnail((logo_size, logo_size))

                # Compute center position
                pos = ((qr_width - logo.width) // 2, (qr_height - logo.height) // 2)
                qr_img.paste(logo, pos, mask=logo if logo.mode == "RGBA" else None)
            except Exception as e:
                print(f"[WARNING] Logo embedding failed: {e}")

        # 3️⃣ Save QR Code with unique filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        filename = f"{filename_prefix}_{timestamp}.png"
        filepath = os.path.join(QR_CODE_DIR, filename)

        qr_img.save(filepath)
        print(f"[QR_GENERATOR] QR code saved to: {filepath}")

        # Return relative path for Flask static serving
        return os.path.join('qr_codes', filename)

    except Exception as e:
        print(f"[ERROR] generate_qr_code failed: {e}")
        raise
