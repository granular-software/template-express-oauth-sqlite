#!/bin/bash

# Script to copy generated GraphQL schema files from awmt-os-core/sdk to awmt-sdk/api

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Source and destination directories
SOURCE_DIR="$PROJECT_ROOT/apps/awmt-os-core/sdk"
DEST_DIR="$PROJECT_ROOT/packages/awmt-sdk/api"

# Files to copy
FILES_TO_COPY=("schema.graphql" "schema.ts" "typeMap.json")

echo "Copying GraphQL schema files from $SOURCE_DIR to $DEST_DIR..."

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory $SOURCE_DIR does not exist"
    exit 1
fi

# Check if destination directory exists
if [ ! -d "$DEST_DIR" ]; then
    echo "Error: Destination directory $DEST_DIR does not exist"
    exit 1
fi

# Copy each file
for file in "${FILES_TO_COPY[@]}"; do
    source_file="$SOURCE_DIR/$file"
    dest_file="$DEST_DIR/$file"
    
    if [ -f "$source_file" ]; then
        echo "Copying $file..."
        cp "$source_file" "$dest_file"
        if [ $? -eq 0 ]; then
            echo "✓ Successfully copied $file"
        else
            echo "✗ Failed to copy $file"
            exit 1
        fi
    else
        echo "Warning: Source file $source_file does not exist"
    fi
done

echo "Schema files copy completed successfully!" 