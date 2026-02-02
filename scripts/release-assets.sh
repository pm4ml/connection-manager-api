#!/bin/bash
set -eo pipefail

TARGET_DIR="${1:?Usage: release-assets.sh <target_dir>}"
mkdir -p "$TARGET_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMP_DIR=$(mktemp -d)

echo "Building release assets..."

# Build CLI
echo "Building mcm-test-setup CLI..."
cd "$PROJECT_ROOT/test/cli"
npm ci
npm run build
cp dist/mcm-test-setup "$TEMP_DIR/"

# Copy test runner script
echo "Copying mcm-rbac-test.sh..."
cp "$PROJECT_ROOT/scripts/mcm-rbac-test.sh" "$TEMP_DIR/"

# Create tar.gz archive
echo "Creating mcm-test-scripts.tar.gz..."
cd "$TEMP_DIR"
tar czf "$TARGET_DIR/mcm-test-scripts.tar.gz" mcm-test-setup mcm-rbac-test.sh

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "Release assets:"
ls -la "$TARGET_DIR"
