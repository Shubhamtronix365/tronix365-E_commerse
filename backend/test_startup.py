import traceback
import sys

try:
    print("Testing imports...")
    import main

    print("Imports successful!")
except Exception as e:
    print("CRASH DETECTED!")
    traceback.print_exc()
    sys.exit(1)
