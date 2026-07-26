"""
Physical OS Keyboard & Mouse Input Automation.

Provides real hardware-level typing, key presses, mouse clicks, and window writing
for real applications running on Ayush's physical Windows PC.
"""

from __future__ import annotations

import time
import subprocess
from typing import Any, Dict

from .registry import ToolError, register
from .tools_applications import open_application
from .tools_windows import _find_window_by_title, _focus

try:
    import pyautogui
    pyautogui.FAILSAFE = False
except ImportError:
    pyautogui = None


def _ensure_gui():
    if pyautogui is None:
        raise ToolError(
            "Physical desktop automation requires the 'pyautogui' package. "
            "Please install it via: pip install pyautogui"
        )


@register("typeText")
def type_text(args: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_gui()
    text = args.get("text") or args.get("content") or args.get("value")
    if not text:
        raise ToolError("Parameter 'text' is required.")
    
    # Optional target window focus
    target = args.get("window") or args.get("target")
    if target:
        hwnd = _find_window_by_title(str(target))
        if hwnd:
            _focus(hwnd)
            time.sleep(0.3)

    text_str = str(text)
    
    # Use clipboard copy + paste for fast & 100% reliable typing of multi-line text, symbols, & Unicode
    try:
        escaped_val = text_str.replace("'", "''")
        ps_cmd = f"Set-Clipboard -Value '{escaped_val}'"
        subprocess.run(["powershell", "-Command", ps_cmd], check=True, capture_output=True)
        time.sleep(0.1)
        pyautogui.hotkey('ctrl', 'v')
        return {"result": f"Typed/Pasted '{text_str}' on real Windows screen.", "text": text_str}
    except Exception:
        # Fallback to direct pyautogui typing
        interval = float(args.get("interval", 0.01))
        pyautogui.write(text_str, interval=interval)
        return {"result": f"Typed '{text_str}' on real Windows screen.", "text": text_str}


@register("pressKey")
def press_key(args: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_gui()
    key = args.get("key") or args.get("name")
    if not key:
        raise ToolError("Parameter 'key' (e.g. 'enter', 'tab', 'backspace', 'esc') is required.")
    
    key_str = str(key).lower().strip()
    if "+" in key_str:
        parts = [k.strip() for k in key_str.split("+")]
        pyautogui.hotkey(*parts)
        return {"result": f"Pressed hotkey combo '{key_str}' on real Windows screen."}
    else:
        pyautogui.press(key_str)
        return {"result": f"Pressed key '{key_str}' on real Windows screen."}


@register("writeToNotepad")
def write_to_notepad(args: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_gui()
    text = args.get("text") or args.get("content") or ""
    text_str = str(text)
    
    # 1. Open / Focus Notepad
    hwnd = _find_window_by_title("notepad")
    if hwnd:
        _focus(hwnd)
        time.sleep(0.3)
    else:
        open_application({"name": "notepad"})
        time.sleep(1.0)
        hwnd = _find_window_by_title("notepad")
        if hwnd:
            _focus(hwnd)
            time.sleep(0.3)

    # 2. Type/Paste text directly into Notepad window
    if text_str:
        try:
            escaped_val = text_str.replace("'", "''")
            ps_cmd = f"Set-Clipboard -Value '{escaped_val}'"
            subprocess.run(["powershell", "-Command", ps_cmd], check=True, capture_output=True)
            time.sleep(0.2)
            pyautogui.hotkey('ctrl', 'v')
        except Exception:
            pyautogui.write(text_str, interval=0.01)

    return {
        "result": f"Opened Notepad and wrote text: '{text_str[:100]}...'",
        "text": text_str
    }


@register("clickOnScreen")
def click_on_screen(args: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_gui()
    x = args.get("x")
    y = args.get("y")
    
    if x is not None and y is not None:
        pyautogui.click(int(x), int(y))
        return {"result": f"Clicked at real screen coordinates ({x}, {y})."}
    else:
        pyautogui.click()
        return {"result": "Clicked at current cursor position on real Windows screen."}


__all__ = ["type_text", "press_key", "write_to_notepad", "click_on_screen"]
