#!/bin/bash
echo "Starting local server for dist folder..."
echo "Open http://localhost:8080 in your browser"
python3 -m http.server 8080 --directory dist
