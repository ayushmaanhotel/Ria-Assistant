import os
import subprocess
import tempfile
from pathlib import Path
from PIL import Image

def run_windows_ocr(img: Image.Image) -> str:
    """Run OCR on PIL Image. Tries pytesseract first, then native Windows Media OCR via PowerShell."""
    # 1. Try pytesseract if available
    try:
        import pytesseract
        exe = os.environ.get("TESSERACT_PATH")
        if not exe:
            for c in [r"C:\Program Files\Tesseract-OCR\tesseract.exe", r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"]:
                if os.path.exists(c):
                    exe = c
                    break
        if exe:
            pytesseract.pytesseract.tesseract_cmd = exe
        text = pytesseract.image_to_string(img).strip()
        if text:
            return text
    except Exception:
        pass

    # 2. Fallback to Native Windows Media OCR via PowerShell
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
            img.save(tmp_path, format="PNG")

        clean_path = tmp_path.replace("\\", "/")
        ps_script = f"""
$ErrorActionPreference = 'SilentlyContinue'
[void][System.Reflection.Assembly]::LoadWithPartialName("System.Drawing")
[Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null

$filePath = "{clean_path}"
$fileTask = [Windows.Storage.StorageFile]::GetFileFromPathAsync($filePath)
$file = $fileTask.GetResults()
if (-not $file) {{
    $file = [System.Threading.Tasks.TaskExtensions]::Unwrap([Windows.Storage.StorageFile]::GetFileFromPathAsync($filePath)).Result
}}
$stream = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read).GetResults()
$decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetResults()
$softwareBitmap = $decoder.GetSoftwareBitmapAsync().GetResults()

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguage()
if (-not $engine) {{
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("en-US"))
}}
$result = $engine.RecognizeAsync($softwareBitmap).GetResults()
Write-Output $result.Text
"""
        ps_file = Path(tempfile.gettempdir()) / "run_win_ocr.ps1"
        ps_file.write_text(ps_script, encoding="utf-8")

        res = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps_file)],
            capture_output=True,
            text=True,
            timeout=10
        )

        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            if os.path.exists(ps_file):
                os.remove(ps_file)
        except Exception:
            pass

        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip()
    except Exception as e:
        print("[Win OCR Fallback Error]:", e)

    return ""
