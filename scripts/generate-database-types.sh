#!/bin/sh

set -eu

raw_file=$(mktemp)
formatted_file=$(mktemp)
trap 'rm -f "$raw_file" "$formatted_file"' EXIT

supabase gen types typescript --local > "$raw_file"
prettier --config .prettierrc --parser typescript "$raw_file" > "$formatted_file"
mv "$formatted_file" src/lib/database.types.ts
