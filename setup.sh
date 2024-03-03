#!/bin/bash

# Install core dependencies
wget -q -O - https://apt.mopidy.com/mopidy.gpg | sudo apt-key add -
sudo wget -q -O /etc/apt/sources.list.d/mopidy.list https://apt.mopidy.com/buster.list
curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -
sudo apt-get install -y nodejs libusb-1.0-0-dev libudev1 libudev-dev swig libatlas-base-dev portaudio19-dev mopidy flite ffmpeg mosquitto
sudo npm install -g typescript ts-node nodemon
npm i

# Install voice2json
arch="$([[ $(uname -m) = "aarch64" ]] && echo "arm64" || echo "armhf")"
wget "https://github.com/synesthesiam/voice2json/releases/download/v2.1/voice2json_2.1_$arch.deb"
sudo apt install "./voice2json_2.1_$arch.deb"

# 64-bit installs may need this:
# sudo ln -s /usr/lib/aarch64-linux-gnu/libffi.so.7 /usr/lib/aarch64-linux-gnu/libffi.so.6

# https://gitlab.ethz.ch/aweichbrodt/seeed-voicecard/-/tree/linux-4.19-or-less/pulseaudio

touch log.txt && chmod 777 log.txt
[ ! -f cache.local.json ]  && echo "{}" > cache.local.json
[ ! -f config.local.json ] && echo "{}" > config.local.json

# Install voice profile
git clone https://github.com/synesthesiam/en-us_kaldi-zamia.git
mkdir -p ~/.config
mv en-us_kaldi-zamia ~/.config/voice2json
chmod 777 ~/.config/voice2json/slot_programs/rhasspy/number
sudo ln -s ~/.config/voice2json/ /root/.config/voice2json

# Start mopidy on boot
sudo systemctl enable mopidy

# For reference
# systemctl --user restart pipewire
# sudo apt-get remove apparmor
