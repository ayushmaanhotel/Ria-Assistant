import asyncio
import tempfile
import os
from PIL import ImageGrab
from winsdk.windows.graphics.imaging import BitmapDecoder
from winsdk.windows.media.ocr import OcrEngine
from winsdk.windows.storage import StorageFile, FileAccessMode

async def main():
    img = ImageGrab.grab()
    tmp = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    tmp_path = tmp.name
    img.save(tmp_path)
    tmp.close()

    try:
        f = await StorageFile.get_file_from_path_async(tmp_path)
        s = await f.open_async(FileAccessMode.READ)
        d = await BitmapDecoder.create_async(s)
        sb = await d.get_software_bitmap_async()
        engine = OcrEngine.try_create_from_user_profile_languages()
        if not engine:
            print("Language engine not available")
            return
        res = await engine.recognize_async(sb)
        text = res.text.strip()
        print("OCR SUCCESS! Extracted Text Length:", len(text))
        print("Sample Text:\n", text[:400])
    except Exception as e:
        print("Error during OCR:", e)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == '__main__':
    asyncio.run(main())
