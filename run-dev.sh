#!/bin/bash

# Bash script to run both angular-fe and node-be in development mode from the monorepo root
echo -e "\033[0;36mBootstrapping dynamic-forms monorepo dev stack...\033[0m"

# Check for node_modules at the monorepo root and trigger installation if missing
if [ ! -d "node_modules" ]; then
    echo -e "\033[0;33mRoot node_modules not found. Installing workspace dependencies...\033[0m"
    npm install
fi

# Start both dev services concurrently
echo -e "\033[0;32mLaunching Express Backend (port 3000) and Angular Frontend (port 4200)...\033[0m"
npm start
