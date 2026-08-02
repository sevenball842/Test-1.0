#!/bin/bash
# Good Morning Skill Executor
# Detects Windows and runs PowerShell script

OS=$(uname -s)

if [[ "$OS" == "MINGW64"* ]] || [[ "$OS" == "CYGWIN"* ]] || [[ "$OS" == "MSYS"* ]]; then
    # Windows detected
    powershell -NoProfile -ExecutionPolicy Bypass -File "scripts/goodmorning.ps1"
elif [[ "$OS" == "Darwin" ]]; then
    # macOS - can adapt if needed
    echo "Good morning, Tim. Initializing systems..."
    sleep 1
    echo "Weapons navigation systems check...."
    sleep 1
    echo "initializing ...."
    sleep 1
    echo "Alpha protocol approved...."
    sleep 1
    echo "Weapons hot....."
    sleep 1
    echo "Welcome Tim, how may I serve you..."
elif [[ "$OS" == "Linux" ]]; then
    # Linux - can adapt if needed
    echo "Good morning, Tim. Initializing systems..."
    sleep 1
    echo "Weapons navigation systems check...."
    sleep 1
    echo "initializing ...."
    sleep 1
    echo "Alpha protocol approved...."
    sleep 1
    echo "Weapons hot....."
    sleep 1
    echo "Welcome Tim, how may I serve you..."
else
    echo "Unsupported OS: $OS"
    exit 1
fi
