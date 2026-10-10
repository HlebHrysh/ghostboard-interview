#!/usr/bin/env python3
"""
Ghostboard Multi-Resolution Cross-Platform Icon Asset Pipeline
Generates all required icon formats from a single master SVG or 1024x1024 PNG:
- Windows: Multi-layer .ico (16, 24, 32, 48, 64, 128, 256 px)
- macOS: Apple Icon Image .icns with Retina @2x scales (up to 1024x1024)
- Linux: FreeDesktop/XDG Hicolor icon theme directory tree (16..512 + SVG scalable)
- Web/PWA: Standard PNGs (192, 512), Maskable PNGs (safe-zone padded), Apple Touch Icon
"""

import os
import sys
import shutil
import struct
import argparse
import subprocess
from pathlib import Path

# Apple ICNS OSType definitions for PNG-encoded icon chunks
ICNS_OSTYPES = {
    16: [b'icp4'],
    32: [b'icp5', b'ic11'],      # 32x32 standard, 16x16@2x
    64: [b'icp6', b'ic12'],      # 64x64 standard, 32x32@2x
    128: [b'ic07'],              # 128x128
    256: [b'ic08', b'ic13'],     # 256x256 standard, 128x128@2x
    512: [b'ic09', b'ic14'],     # 512x512 standard, 256x256@2x
    1024: [b'ic10'],             # 1024x1024 / 512x512@2x
}

def check_imagemagick():
    """Verify ImageMagick is available via `magick` or `convert`."""
    for cmd in ['magick', 'convert']:
        if shutil.which(cmd):
            return cmd
    raise RuntimeError("ImageMagick is required (magick or convert not found in PATH).")

def generate_png(magick_cmd, input_file, output_path, width, height, background=None):
    """Generate a single PNG at exact dimensions."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cmd = [magick_cmd]
    if background:
        cmd.extend(['-background', background])
    else:
        cmd.extend(['-background', 'none'])
    cmd.extend([str(input_file), '-resize', f"{width}x{height}", str(output_path)])
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def generate_maskable_png(magick_cmd, input_file, output_path, size, bg_hex='#040406', padding_ratio=0.20):
    """Generate Android adaptive maskable icon with safe zone padding."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    inner_size = int(size * (1.0 - padding_ratio))
    cmd = [
        magick_cmd,
        '-size', f"{size}x{size}", f"xc:{bg_hex}",
        '(', '-background', 'none', str(input_file), '-resize', f"{inner_size}x{inner_size}", ')',
        '-gravity', 'center', '-composite',
        str(output_path)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def generate_windows_ico(magick_cmd, master_png_512, output_path):
    """Generate a multi-resolution Windows .ico with 7 embedded mipmaps."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cmd = [
        magick_cmd,
        str(master_png_512),
        '-define', 'icon:auto-resize=256,128,64,48,32,24,16',
        str(output_path)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def generate_macos_icns(magick_cmd, input_file, output_path, temp_dir):
    """Pack PNG chunks into an Apple .icns binary container."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    chunks = []
    
    for size, tags in ICNS_OSTYPES.items():
        tmp_png = temp_dir / f"icon_{size}.png"
        generate_png(magick_cmd, input_file, tmp_png, size, size)
        with open(tmp_png, 'rb') as f:
            png_bytes = f.read()
        for tag in tags:
            chunk_length = len(png_bytes) + 8
            chunks.append(tag + struct.pack('>I', chunk_length) + png_bytes)

    total_file_size = sum(len(c) for c in chunks) + 8
    icns_binary = b'icns' + struct.pack('>I', total_file_size) + b''.join(chunks)

    with open(output_path, 'wb') as f:
        f.write(icns_binary)

def generate_all_assets(input_file, project_root):
    """Main pipeline execution."""
    magick = check_imagemagick()
    input_path = Path(input_file).resolve()
    root = Path(project_root).resolve()
    
    if not input_path.exists():
        raise FileNotFoundError(f"Source icon not found at {input_path}")

    public_dir = root / "public"
    tauri_icons_dir = root / "desktop" / "src-tauri" / "icons"
    electron_build_dir = root / "desktop" / "build"
    linux_hicolor_dir = root / "desktop" / "icons" / "hicolor"
    temp_dir = Path("/tmp/ghostboard_icon_gen")
    
    for d in [public_dir, tauri_icons_dir, electron_build_dir, linux_hicolor_dir, temp_dir]:
        d.mkdir(parents=True, exist_ok=True)

    print(f"[*] Reading source graphic from: {input_path}")
    print(f"[*] Using ImageMagick CLI: {magick}")

    # Generate master 1024x1024 PNG
    master_1024 = temp_dir / "master_1024.png"
    master_512 = temp_dir / "master_512.png"
    generate_png(magick, input_path, master_1024, 1024, 1024)
    generate_png(magick, input_path, master_512, 512, 512)

    # 1. PWA Standard & Maskable Icons
    print("[1/5] Generating Web & PWA assets...")
    generate_png(magick, master_1024, public_dir / "icon-192.png", 192, 192)
    generate_png(magick, master_1024, public_dir / "icon-512.png", 512, 512)
    generate_png(magick, master_1024, public_dir / "apple-touch-icon.png", 180, 180)
    generate_png(magick, master_1024, public_dir / "favicon-32x32.png", 32, 32)
    generate_png(magick, master_1024, public_dir / "favicon-16x16.png", 16, 16)
    generate_maskable_png(magick, input_path, public_dir / "icon-maskable-192.png", 192)
    generate_maskable_png(magick, input_path, public_dir / "icon-maskable-512.png", 512)

    # 2. Windows Multi-Layer ICO
    print("[2/5] Generating Windows .ico assets (16..256px)...")
    generate_windows_ico(magick, master_512, public_dir / "favicon.ico")
    shutil.copy2(public_dir / "favicon.ico", tauri_icons_dir / "icon.ico")
    shutil.copy2(public_dir / "favicon.ico", electron_build_dir / "icon.ico")

    # 3. macOS ICNS
    print("[3/5] Generating macOS .icns containers...")
    generate_macos_icns(magick, master_1024, public_dir / "icon.icns", temp_dir)
    shutil.copy2(public_dir / "icon.icns", tauri_icons_dir / "icon.icns")
    shutil.copy2(public_dir / "icon.icns", electron_build_dir / "icon.icns")

    # 4. Linux XDG Hicolor Theme Structure
    print("[4/5] Generating Linux XDG Hicolor icon tree...")
    linux_sizes = [16, 24, 32, 48, 64, 128, 256, 512]
    for s in linux_sizes:
        size_dir = linux_hicolor_dir / f"{s}x{s}" / "apps"
        size_dir.mkdir(parents=True, exist_ok=True)
        generate_png(magick, master_1024, size_dir / "ghostboard.png", s, s)

    scalable_dir = linux_hicolor_dir / "scalable" / "apps"
    scalable_dir.mkdir(parents=True, exist_ok=True)
    if input_path.suffix.lower() == '.svg':
        shutil.copy2(input_path, scalable_dir / "ghostboard.svg")
    else:
        shutil.copy2(master_1024, scalable_dir / "ghostboard.png")

    # 5. Tauri Specific Sizing
    print("[5/5] Generating Tauri application icons...")
    generate_png(magick, master_1024, tauri_icons_dir / "32x32.png", 32, 32)
    generate_png(magick, master_1024, tauri_icons_dir / "128x128.png", 128, 128)
    generate_png(magick, master_1024, tauri_icons_dir / "128x128@2x.png", 256, 256)
    shutil.copy2(master_512, electron_build_dir / "icon.png")

    print("\n[SUCCESS] All multi-resolution assets generated flawlessly!")
    print(f"  • PWA Manifest Icons:   {public_dir}")
    print(f"  • Tauri Bundle Icons:   {tauri_icons_dir}")
    print(f"  • Electron Build Icons: {electron_build_dir}")
    print(f"  • Linux XDG Theme:      {linux_hicolor_dir}\n")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Ghostboard Multi-Resolution Icon Asset Generator")
    parser.add_argument(
        '--input', '-i',
        default="/mnt/storage_d/ghostboard-interview/public/icon.svg",
        help="Path to source 1024x1024 PNG or vector SVG"
    )
    parser.add_argument(
        '--root', '-r',
        default="/mnt/storage_d/ghostboard-interview",
        help="Root workspace path of the project"
    )
    args = parser.parse_args()
    generate_all_assets(args.input, args.root)
