#!/bin/bash

# Kill Firebase Emulator Processes
# This script terminates all processes running on Firebase emulator ports

echo "🔥 Killing Firebase Emulator Processes..."

# Firebase emulator ports
PORTS=(
  9099  # Auth Emulator
  8080  # Firestore Emulator
  5001  # Functions Emulator
  5000  # Hosting Emulator
  8085  # Pub/Sub Emulator
  9199  # Storage Emulator
  9000  # Realtime Database Emulator
  4000  # Emulator UI
  4400  # Emulator Hub
  4500  # Logging
)

# Kill processes on each port
for port in "${PORTS[@]}"; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✓ Killed processes on port $port"
  fi
done

# Kill any remaining Firebase processes
pkill -f "firebase.*emulators" 2>/dev/null
if [ $? -eq 0 ]; then
  echo "✓ Killed remaining Firebase emulator processes"
fi

echo "✅ Firebase emulator cleanup complete!"
echo ""
echo "To verify, run: lsof -ti:9099,8080,5001,5000,8085,9199,9000,4000,4400,4500"
