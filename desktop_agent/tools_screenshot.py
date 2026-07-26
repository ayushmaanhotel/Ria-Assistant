"""
Screenshot & screen-reading: capture, save, OCR, and read on-screen text.

  takeScreenshot    -> capture full screen, return metadata (+ small base64)
  saveScreenshot    -> capture & write to a file under the Screenshots folder
  analyzeScreenshot-> capture, run OCR (pytesseract), return extracted text
  readScreen        -> OCR the active window region + name the active window

OCR requires the Tesseract OCR engine + the pytesseract wrapper. If either is
missing, the OCR tools return a graceful 'unavailable' message instead of
crashing; non-OCR capture still works.
"""

from __future__ import annotations

import base64
import io
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional

from .registry import ToolError, register

SCREENSHOTS_DIR = Path(os.path.expanduser("~")) / "Pictures" / "MyraaScreenshots"


def _capture() -> "Any":
    """Capture the full virtual screen as a PIL Image."""
    try:
        from PIL import ImageGrab

        img = ImageGrab.grab(all_screens=True)
        return img
    except Exception as e:  # noqa: BLE001
        raise ToolError(f"Screen capture failed: {e}")


def _capture_region(bbox):
    try:
        from PIL import ImageGrab

        return ImageGrab.grab(bbox=bbox, all_screens=False)
    except Exception as e:  # noqa: BLE001
        raise ToolError(f"Region capture failed: {e}")


def _active_window_bbox():
    """Return (left, top, right, bottom) of the foreground window, or None."""
    try:
        import win32gui

        hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            return None
        rect = win32gui.GetWindowRect(hwnd)  # (l, t, r, b)
        return rect
    except Exception:
        return None


def _active_window_title() -> str:
    try:
        import win32gui

        hwnd = win32gui.GetForegroundWindow()
        return win32gui.GetWindowText(hwnd) if hwnd else ""
    except Exception:
        return ""


def _image_to_b64(img, fmt="PNG", quality=70) -> str:
    buf = io.BytesIO()
    if fmt.upper() == "JPEG":
        img.convert("RGB").save(buf, format="JPEG", quality=quality)
    else:
        img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _image_size_kb(img) -> int:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return len(buf.getvalue()) // 1024


def _run_winsdk_ocr(img) -> str:
    """Run native Windows Media OCR on PIL Image via winsdk."""
    import asyncio
    import tempfile
    import concurrent.futures
    tmp_path = None
    try:
        from winsdk.windows.graphics.imaging import BitmapDecoder
        from winsdk.windows.media.ocr import OcrEngine
        from winsdk.windows.storage import StorageFile, FileAccessMode

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        tmp_path = tmp.name
        img.save(tmp_path, format="PNG")
        tmp.close()

        async def _async_ocr():
            file = await StorageFile.get_file_from_path_async(tmp_path)
            stream = await file.open_async(FileAccessMode.READ)
            decoder = await BitmapDecoder.create_async(stream)
            software_bitmap = await decoder.get_software_bitmap_async()
            engine = OcrEngine.try_create_from_user_profile_languages()
            if not engine:
                return ""
            ocr_result = await engine.recognize_async(software_bitmap)
            return ocr_result.text.strip()

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            with concurrent.futures.ThreadPoolExecutor() as pool:
                text = pool.submit(lambda: asyncio.run(_async_ocr())).result()
        else:
            text = asyncio.run(_async_ocr())

        return text
    except Exception as e:
        print("[WinSDK OCR Error]:", e)
        return ""
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def _run_ocr(img) -> str:
    # 1. Try native Windows Media OCR via winsdk
    win_text = _run_winsdk_ocr(img)
    if win_text:
        return win_text

    # 2. Try pytesseract as fallback
    try:
        import pytesseract
        exe = os.environ.get("TESSERACT_PATH") or _find_tesseract_exe()
        if exe:
            pytesseract.pytesseract.tesseract_cmd = exe
        text = pytesseract.image_to_string(img)
        if text.strip():
            return text
    except Exception:
        pass

    raise ToolError("OCR engine did not detect any readable text on screen.")


def _find_tesseract_exe() -> Optional[str]:
    candidates = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


def _trim_ocr(text: str, max_chars: int = 1500) -> str:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    out = "\n".join(lines)
    if len(out) > max_chars:
        out = out[:max_chars] + "…"
    return out


@register("takeScreenshot")
def take_screenshot(args: Dict[str, Any]) -> Dict[str, Any]:
    img = _capture()
    include_image = bool(args.get("include_image", False))
    result: Dict[str, Any] = {
        "result": f"Captured screen ({img.width}x{img.height}).",
        "width": img.width,
        "height": img.height,
    }
    if include_image:
        # Downscale + JPEG to keep payload small for the WS bridge.
        max_dim = int(args.get("max_dim", 1280))
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            img_small = img.resize(
                (max(1, int(img.width * ratio)), max(1, int(img.height * ratio)))
            )
        else:
            img_small = img
        result["image_base64"] = _image_to_b64(img_small, fmt="JPEG", quality=60)
        result["image_mime"] = "image/jpeg"
    return result


@register("saveScreenshot")
def save_screenshot(args: Dict[str, Any]) -> Dict[str, Any]:
    img = _capture()
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    name = args.get("name")
    fname = f"{name}-{stamp}.png" if name else f"screenshot-{stamp}.png"
    out_path = SCREENSHOTS_DIR / fname
    img.save(out_path, format="PNG")
    return {"result": f"Saved screenshot to {out_path}.", "path": str(out_path)}


@register("analyzeScreenshot")
def analyze_screenshot(args: Dict[str, Any]) -> Dict[str, Any]:
    img = _capture()
    try:
        text = _run_ocr(img)
    except ToolError as e:
        return {"result": f"Screenshot captured, but OCR unavailable: {e.message}"}
    return {
        "result": "Screenshot analyzed via OCR.",
        "text": _trim_ocr(text, int(args.get("max_chars", 1500))),
    }


@register("readScreen")
def read_screen(args: Dict[str, Any]) -> Dict[str, Any]:
    """OCR the active window and report its title + visible text."""
    title = _active_window_title()
    bbox = _active_window_bbox()
    if bbox:
        try:
            img = _capture_region(bbox)
        except ToolError:
            img = _capture()
    else:
        img = _capture()
    try:
        text = _run_ocr(img)
        visible = _trim_ocr(text, int(args.get("max_chars", 1500))) or "(no readable text)"
    except ToolError as e:
        return {
            "result": f"Active window: {title or 'unknown'}. OCR unavailable: {e.message}",
            "active_window": title,
        }
    return {
        "result": f"Active window '{title or 'unknown'}' contains readable text.",
        "active_window": title,
        "text": visible,
    }


__all__ = [
    "take_screenshot",
    "save_screenshot",
    "analyze_screenshot",
    "read_screen",
]
