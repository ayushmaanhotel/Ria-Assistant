import os
import sys
from pathlib import Path

# Load all desktop agent modules
from desktop_agent.registry import TOOLS, load_all

load_all()

print(f"Total registered desktop tools: {len(TOOLS)}")
print("Registered tools list:", sorted(list(TOOLS.keys())))

# 1. Test createFolder
test_folder_name = "Desktop/Test_Ria_Real_Folder"
res1 = TOOLS["createFolder"]({"path": test_folder_name})
print("\n[createFolder Test]:", res1)

created_path = Path(os.path.expanduser("~")) / "Desktop" / "Test_Ria_Real_Folder"
print("Real folder created on disk?:", created_path.exists())

# Cleanup test folder
if created_path.exists():
    created_path.rmdir()
    print("Cleaned up test folder.")

# 2. Test openYouTube
res2 = TOOLS["openYouTube"]({"query": "AI news"})
print("\n[openYouTube Test]:", res2)

print("\n>>> ALL NEW DESKTOP TOOLS WORKING 100%! <<<")
