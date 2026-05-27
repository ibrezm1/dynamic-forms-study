#!/bin/bash

# Bash script to run both angular-fe and node-be in development mode from the monorepo root
echo -e "\033[0;36mBootstrapping dynamic-forms monorepo dev stack...\033[0m"

# Kill any existing processes on port 3000 (Express backend)
echo -e "\033[0;33mChecking for existing processes on port 3000...\033[0m"
PID_3000=$(lsof -ti tcp:3000)
if [ -n "$PID_3000" ]; then
  echo -e "\033[0;31mKilling existing process on port 3000 (PID: $PID_3000)...\033[0m"
  kill -9 $PID_3000
  sleep 1
fi

# Kill any existing processes on port 4200 (Angular frontend)
echo -e "\033[0;33mChecking for existing processes on port 4200...\033[0m"
PID_4200=$(lsof -ti tcp:4200)
if [ -n "$PID_4200" ]; then
  echo -e "\033[0;31mKilling existing process on port 4200 (PID: $PID_4200)...\033[0m"
  kill -9 $PID_4200
  sleep 1
fi

# Check for node_modules at the monorepo root and trigger installation if missing
if [ ! -d "node_modules" ]; then
    echo -e "\033[0;33mRoot node_modules not found. Installing workspace dependencies...\033[0m"
    npm install
fi

# Start both dev services concurrently
echo -e "\033[0;32mLaunching Express Backend (port 3000) and Angular Frontend (port 4200)...\033[0m"
npm start
