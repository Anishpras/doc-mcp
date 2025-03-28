#!/bin/bash
echo "Running TypeScript compiler with skipLibCheck..."
npx tsc --skipLibCheck
if [ $? -eq 0 ]; then
  echo "TypeScript compilation completed successfully."
else
  echo "TypeScript compilation failed."
  exit 1
fi
