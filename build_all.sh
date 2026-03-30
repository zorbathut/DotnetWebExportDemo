#!/bin/bash
set -euo pipefail

# Full build script for C# Web Export Demo
# Builds everything from scratch: editor, web template, and C# web export

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GODOT_DIR="$SCRIPT_DIR/godot"
CSHARP_DIR="$SCRIPT_DIR/csharp_project"
NUGET_DIR="$SCRIPT_DIR/.nuget_local"

# ─── Activate environments ───────────────────────────────────────────────────

echo "=== Activating environments ==="

source "$SCRIPT_DIR/.venv/bin/activate"
echo "  venv: $VIRTUAL_ENV"

source "$HOME/emsdk/emsdk_env.sh"
echo "  emsdk: $EMSDK"

# ─── Prerequisites ───────────────────────────────────────────────────────────

echo ""
echo "=== Checking prerequisites ==="

for cmd in scons dotnet emcc; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "ERROR: '$cmd' not found in PATH"
        exit 1
    fi
done

EMCC_VERSION="$(emcc --version | head -1)"
if ! echo "$EMCC_VERSION" | grep -q "3.1.56"; then
    echo "WARNING: Expected Emscripten 3.1.56, got: $EMCC_VERSION"
    echo "  The build may fail. See README for details."
fi

echo "  scons:  $(scons --version 2>&1 | grep 'SCons:' | head -1)"
echo "  dotnet: $(dotnet --version)"
echo "  emcc:   $EMCC_VERSION"

# ─── Submodules ──────────────────────────────────────────────────────────────

echo ""
echo "=== Initializing git submodules ==="
git submodule update --init --recursive

# ─── Step 1: Build Godot editor (native, with mono) ─────────────────────────

echo ""
echo "=== Step 1/4: Building Godot editor (native, mono) ==="
cd "$GODOT_DIR"

scons target=editor \
    library_type=executable \
    extra_suffix=executable \
    production=yes \
    debug_symbols=yes \
    compiledb=yes \
    disable_path_overrides=no \
    module_mono_enabled=yes

# ─── Step 2: Generate mono glue and build C# assemblies ─────────────────────

echo ""
echo "=== Step 2/4: Generating mono glue and building C# assemblies ==="

EDITOR_BIN="$(find ./bin -name 'godot.*.editor.*executable.mono*' -type f | head -1)"
if [ -z "$EDITOR_BIN" ]; then
    echo "ERROR: Could not find built editor binary in godot/bin/"
    exit 1
fi
echo "  Using editor: $EDITOR_BIN"

"$EDITOR_BIN" --generate-mono-glue ./modules/mono/glue --headless

mkdir -p "$NUGET_DIR"
./modules/mono/build_scripts/build_assemblies.py \
    --godot-output-dir ./bin \
    --push-nupkgs-local "$NUGET_DIR"

# ─── Step 3: Build Godot web template (static, mono) ────────────────────────

echo ""
echo "=== Step 3/4: Building Godot web template_release (static, mono) ==="

scons target=template_release \
    platform=web \
    library_type=static_library \
    extra_suffix=static \
    production=yes \
    compiledb=yes \
    disable_path_overrides=no \
    module_mono_enabled=yes \
    disable_crash_handler=yes \
    import_env_vars=EMSDK

cd "$SCRIPT_DIR"

# ─── Step 4: Build C# project for web ───────────────────────────────────────

echo ""
echo "=== Step 4/4: Building C# web export ==="
cd "$CSHARP_DIR"

dotnet build
dotnet publish -v:d -c ExportRelease -r browser-wasm \
    -p:GodotType=static \
    -p:GodotArch=wasm32

cd "$SCRIPT_DIR"

# ─── Done ────────────────────────────────────────────────────────────────────

echo ""
echo "=== Build complete ==="

EXPORT_DIR="$CSHARP_DIR/export/Web_static_release"
if [ ! -d "$EXPORT_DIR" ]; then
    echo "ERROR: Expected export directory not found at $EXPORT_DIR"
    exit 1
fi

echo "Output is in: $EXPORT_DIR"
echo ""
echo "=== Serving with emrun ==="
emrun "$EXPORT_DIR/"
