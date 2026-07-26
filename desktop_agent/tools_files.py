"""
File management: create / read / rename / delete / move / open / search.

Safety model:
  * All paths are resolved with expanduser and normalized to absolute.
  * Deletion sends files/folders to the Recycle Bin via `send2trash` when
    available (preferred), and otherwise refuses to delete rather than
    permanently removing data.
  * Operations are confined to a set of SAFE_ROOTS by default; paths that
    escape these roots (e.g. C:\\Windows) are rejected unless explicitly
    marked `allow_anywhere` by the caller.
"""

from __future__ import annotations

import fnmatch
import os
import platform
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

from .registry import ToolError, register

HOME = Path(os.path.expanduser("~"))

# Roots under which file operations are freely permitted.
SAFE_ROOTS: List[Path] = [
    HOME,
    HOME / "Desktop",
    HOME / "Documents",
    HOME / "Downloads",
    HOME / "Pictures",
    HOME / "Music",
    HOME / "Videos",
    Path(os.getcwd()),  # project root
]

# Friendly folder aliases -> resolved path.
FOLDER_ALIASES: Dict[str, Path] = {
    "desktop": HOME / "Desktop",
    "documents": HOME / "Documents",
    "downloads": HOME / "Downloads",
    "pictures": HOME / "Pictures",
    "photos": HOME / "Pictures",
    "music": HOME / "Music",
    "videos": HOME / "Videos",
    "home": HOME,
    "this pc": Path("C:\\"),
    "c drive": Path("C:\\"),
}


def _resolve_folder(name_or_path: Optional[str]) -> Path:
    if not name_or_path:
        raise ToolError("Parameter 'name' or 'path' is required.")
    key = str(name_or_path).strip().lower()
    if key in FOLDER_ALIASES:
        return FOLDER_ALIASES[key]
    p = Path(os.path.expandvars(os.path.expanduser(str(name_or_path)))).resolve()
    return p


def _resolve_file(path: Optional[str], *, must_exist: bool = False) -> Path:
    if not path:
        raise ToolError("Parameter 'path' is required.")
    p = Path(os.path.expandvars(os.path.expanduser(str(path)))).resolve()
    if must_exist and not p.exists():
        raise ToolError(f"File does not exist: {p}")
    return p


def _ensure_safe(p: Path, allow_anywhere: bool = False) -> None:
    if allow_anywhere:
        return
    real = str(p)
    for root in SAFE_ROOTS:
        try:
            root_real = str(root.resolve())
        except Exception:
            continue
        if real == root_real or real.startswith(root_real + os.sep):
            return
    raise ToolError(
        f"Path '{p}' is outside MYRAA's safe folders (Desktop, Documents, "
        f"Downloads, Pictures, Music, Videos, home, and the project folder). "
        f"Pass allow_anywhere=true only if you really mean it."
    )


@register("createFolder")
def create_folder(args: Dict[str, Any]) -> Dict[str, Any]:
    raw_path = args.get("path") or args.get("name") or args.get("folder")
    if not raw_path:
        raise ToolError("Parameter 'path' or 'name' is required.")
    
    location = args.get("location")
    if location and not str(raw_path).startswith(location):
        target_str = f"{location}/{raw_path}"
    else:
        target_str = str(raw_path)

    p = _resolve_folder(target_str)
    _ensure_safe(p)
    p.mkdir(parents=True, exist_ok=True)
    return {"result": f"Successfully created folder on real Windows PC: {p}", "path": str(p)}


@register("createFile")
def create_file(args: Dict[str, Any]) -> Dict[str, Any]:
    raw_path = str(args.get("path") or args.get("filename") or args.get("name") or "private_note.txt").strip()
    content = args.get("content", "")
    overwrite = bool(args.get("overwrite", True))
    
    private_dir = HOME / "Desktop" / "MYRAA_Private_Room"
    private_dir.mkdir(parents=True, exist_ok=True)

    path_obj = Path(raw_path)
    if not path_obj.is_absolute() or raw_path.lower().endswith((".txt", ".md", ".pdf", ".html", ".doc")):
        filename = path_obj.name
        p = private_dir / filename
    else:
        p = _resolve_file(raw_path)
        _ensure_safe(p)

    if p.exists() and not overwrite:
        raise ToolError(
            f"File already exists: {p}. Pass overwrite=true to replace it."
        )
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(str(content), encoding="utf-8")
    return {
        "result": f"Created file in Private Room Vault: {p}",
        "path": str(p),
        "filePath": str(p),
        "filename": p.name,
        "privateDirectory": str(private_dir)
    }


@register("readFile")
def read_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    max_chars = int(args.get("max_chars", 8000))
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p)
    try:
        text = p.read_text(encoding="utf-8", errors="replace")
    except UnicodeDecodeError:
        return {"result": f"(Binary file, {p.stat().st_size} bytes): {p}"}
    if len(text) > max_chars:
        text = text[:max_chars] + f"\n…[truncated, {len(text) - max_chars} more chars]"
    return {"result": text, "path": str(p)}


@register("renameFile")
def rename_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    new_name = args.get("new_name")
    if not new_name:
        raise ToolError("Parameter 'new_name' is required.")
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p)
    target = (p.parent / str(new_name)).resolve()
    _ensure_safe(target)
    if target.exists():
        raise ToolError(f"A file already exists at the target name: {target}")
    p.rename(target)
    return {"result": f"Renamed {p.name} -> {target.name}", "path": str(target)}


@register("deleteFile")
def delete_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    permanent = bool(args.get("permanent", False))
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p)

    if permanent:
        if p.is_dir():
            import shutil

            shutil.rmtree(p)
        else:
            p.unlink()
        return {"result": f"Permanently deleted: {p}"}

    # Prefer recycle bin.
    try:
        import send2trash  # type: ignore

        send2trash.send2trash(str(p))
        return {"result": f"Moved to Recycle Bin: {p}"}
    except ImportError:
        raise ToolError(
            "Safe deletion requires the 'send2trash' package. Install it or pass "
            "permanent=true (use with care)."
        )
    except Exception as e:  # noqa: BLE001
        raise ToolError(f"Could not move to Recycle Bin: {e}")


@register("moveFile")
def move_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    destination = args.get("destination")
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p)
    dest = Path(os.path.expandvars(os.path.expanduser(str(destination)))).resolve()
    # If destination is an existing directory, keep the filename.
    if dest.is_dir():
        dest = dest / p.name
    _ensure_safe(dest)
    if dest.exists():
        raise ToolError(f"Destination already exists: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    p.rename(dest)
    return {"result": f"Moved {p.name} -> {dest}", "path": str(dest)}


@register("openFolder")
def open_folder(args: Dict[str, Any]) -> Dict[str, Any]:
    folder = _resolve_folder(args.get("name") or args.get("path"))
    if not folder.exists():
        raise ToolError(f"Folder does not exist: {folder}")
    # Explorer on Windows, open elsewhere.
    if platform.system() == "Windows":
        subprocess.Popen(f'explorer "{folder}"', shell=True, close_fds=True)
    elif platform.system() == "Darwin":
        subprocess.Popen(["open", str(folder)], close_fds=True)
    else:
        subprocess.Popen(["xdg-open", str(folder)], close_fds=True)
    return {"result": f"Opened folder: {folder}", "path": str(folder)}


@register("listFiles")
def list_files(args: Dict[str, Any]) -> Dict[str, Any]:
    folder = _resolve_folder(args.get("name") or args.get("path"))
    if not folder.exists():
        raise ToolError(f"Folder does not exist: {folder}")
    pattern = args.get("pattern") or "*"
    try:
        names = sorted(
            [p.name + ("/" if p.is_dir() else "") for p in folder.glob(pattern)]
        )
    except Exception as e:  # noqa: BLE001
        raise ToolError(f"Could not list folder: {e}")
    return {
        "result": f"{len(names)} item(s) in {folder}",
        "items": names[:500],
        "count": len(names),
    }


@register("searchFiles")
def search_files(args: Dict[str, Any]) -> Dict[str, Any]:
    """Find files by name glob or extension under a folder.

    Examples:
      name="*.py" under "Documents"          -> all python files
      extension="py"                          -> same as name="*.py"
      name="report*" under "Desktop"
    """
    folder = _resolve_folder(args.get("folder") or args.get("under") or "home")
    name = args.get("name") or args.get("pattern")
    extension = args.get("extension")
    limit = int(args.get("limit", 100))

    if extension:
        if not str(extension).startswith("."):
            extension = "." + str(extension)
        pattern = "*" + str(extension)
    elif name:
        pattern = str(name)
    else:
        raise ToolError("Provide 'name' glob or 'extension'.")

    if not folder.exists():
        raise ToolError(f"Folder does not exist: {folder}")

    matches: List[str] = []
    for root, _dirs, files in os.walk(folder):
        for fname in files:
            if fnmatch.fnmatch(fname.lower(), pattern.lower()):
                matches.append(os.path.join(root, fname))
                if len(matches) >= limit:
                    break
        if len(matches) >= limit:
            break

    return {
        "result": f"Found {len(matches)} file(s) matching '{pattern}' under {folder}",
        "matches": matches,
        "count": len(matches),
    }


@register("createDesktopShortcut")
def create_desktop_shortcut(args: Dict[str, Any]) -> Dict[str, Any]:
    """Creates a Windows .lnk shortcut on the user's Desktop."""
    name = args.get("name") or args.get("shortcutName") or args.get("title")
    target_path = args.get("targetPath") or args.get("target") or args.get("path")
    if not name or not target_path:
        raise ToolError("Parameters 'name' and 'targetPath' are required.")
    
    name_str = str(name).strip()
    if not name_str.lower().endswith(".lnk"):
        name_str += ".lnk"
        
    desktop_dir = HOME / "Desktop"
    shortcut_file = desktop_dir / name_str
    
    target_obj = Path(os.path.expandvars(os.path.expanduser(str(target_path))))
    working_dir = args.get("workingDir") or (str(target_obj.parent) if target_obj.exists() else str(HOME))
    description = args.get("description", f"Shortcut for {name_str}")
    
    ps_cmd = (
        f"$wsh = New-Object -ComObject WScript.Shell; "
        f"$s = $wsh.CreateShortcut('{shortcut_file}'); "
        f"$s.TargetPath = '{target_path}'; "
        f"$s.WorkingDirectory = '{working_dir}'; "
        f"$s.Description = '{description}'; "
        f"$s.Save()"
    )
    
    try:
        subprocess.run(
            ["powershell", "-ExecutionPolicy", "Bypass", "-Command", ps_cmd],
            check=True,
            capture_output=True,
            text=True
        )
        return {
            "result": f"Successfully created desktop shortcut '{shortcut_file}'.",
            "shortcutPath": str(shortcut_file),
            "targetPath": str(target_path)
        }
    except Exception as err:
        raise ToolError(f"Failed creating desktop shortcut: {err}")


@register("generatePdfDocument")
def generate_pdf_document(args: Dict[str, Any]) -> Dict[str, Any]:
    """Generates a PDF or TXT document for Ayush and saves it in the Private Room folder."""
    filename = args.get("filename") or args.get("name") or "private_document.pdf"
    title = args.get("title", "Private Document")
    content = args.get("content") or args.get("text") or ""
    
    private_dir = HOME / "Desktop" / "MYRAA_Private_Room"
    private_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = private_dir / filename
    
    if str(filename).lower().endswith(".pdf"):
        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; background: #ffffff; }}
    h1 {{ color: #0284c7; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }}
    .meta {{ color: #64748b; font-size: 12px; margin-bottom: 20px; }}
    .content {{ font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  <div class="meta">Generated by MYRAA Private Room Agent</div>
  <div class="content">{content}</div>
</body>
</html>"""
        html_path = private_dir / f"{file_path.stem}.html"
        html_path.write_text(html_content, encoding="utf-8")
        
        txt_path = private_dir / f"{file_path.stem}.txt"
        txt_path.write_text(f"{title}\n{'='*len(title)}\n\n{content}", encoding="utf-8")
        
        return {
            "result": f"Generated Private Document '{filename}' in '{private_dir}'.",
            "filePath": str(txt_path),
            "htmlPath": str(html_path),
            "filename": filename,
            "privateDirectory": str(private_dir)
        }
    else:
        file_path.write_text(f"{title}\n{'='*len(title)}\n\n{content}", encoding="utf-8")
        return {
            "result": f"Generated Private Text Document '{filename}' in '{private_dir}'.",
            "filePath": str(file_path),
            "filename": filename,
            "privateDirectory": str(private_dir)
        }


__all__ = [
    "create_file",
    "read_file",
    "rename_file",
    "delete_file",
    "move_file",
    "open_folder",
    "list_files",
    "search_files",
    "create_desktop_shortcut",
    "generate_pdf_document",
]
