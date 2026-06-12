#!/bin/bash
LOG_FILE="/home/dell/Documents/claw/logs/mesh5x5_$(date +%Y%m%d_%H%M%S).log"
echo "Running 5x5 Mesh with Event Router..."
echo "Log: $LOG_FILE"
cd /home/dell/Documents/claw/booksim/src
./booksim /home/dell/Documents/claw/logs/mesh5x5_event.cfg > "$LOG_FILE" 2>&1
echo "Done. Results:"
tail -30 "$LOG_FILE"
