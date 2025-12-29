#!/bin/sh
set -e

echo "🚀 Entrypoint starting..."

# Initialize node_modules volume if empty
# The volume mount may override the built node_modules, so we need to copy them
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "📦 node_modules volume is empty, initializing..."
  
  # Create node_modules directory if it doesn't exist
  mkdir -p node_modules
  
  # Try to copy from a backup location if it exists (from build)
  if [ -d "/app/.node_modules_backup" ] && [ -n "$(ls -A /app/.node_modules_backup 2>/dev/null)" ]; then
    echo "📦 Copying node_modules from backup (this may take a moment)..."
    cp -r /app/.node_modules_backup/. node_modules/ 2>&1 | head -20 || echo "⚠️  Copy had some issues, continuing..."
    echo "✅ Copy completed"
  else
    echo "⚠️  Backup not found at /app/.node_modules_backup"
  fi
  
  # Verify copy worked
  if [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "❌ node_modules still empty after copy attempt"
    echo "📦 Attempting npm install (may fail due to network issues)..."
    npm install --include=dev --prefer-offline --legacy-peer-deps 2>&1 | head -30 || echo "⚠️  npm install failed, but continuing..."
  else
    echo "✅ node_modules initialized successfully"
  fi
else
  echo "✅ node_modules already exists"
fi

# Execute the command passed to the entrypoint
echo "🚀 Executing: $@"
# Always use sh -c to handle npm scripts properly
exec sh -c "$*"

