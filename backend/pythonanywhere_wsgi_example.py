# PythonAnywhere WSGI config — copy-paste helper (free hosting, no card needed)
#
# 1. On PythonAnywhere: Web tab → your app → "WSGI configuration file" link.
# 2. Delete everything in that file, paste the 3 lines below.
# 3. Replace YOURUSERNAME with your PythonAnywhere username.
# 4. Save, then hit the green Reload button.

import sys

sys.path.insert(0, "/home/YOURUSERNAME/Minco-Web/backend")

from app import app as application  # noqa: E402
