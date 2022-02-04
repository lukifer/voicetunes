#!/bin/bash
cd /home/pi/voicetunes; if ! pgrep -x "node" > /dev/null; then sudo npm run start >> log.txt 2>&1; fi
