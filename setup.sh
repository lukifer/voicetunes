#!/bin/bash

# Install core dependencies
wget -q -O - https://apt.mopidy.com/mopidy.gpg | sudo apt-key add -
sudo wget -q -O /etc/apt/sources.list.d/mopidy.list https://apt.mopidy.com/buster.list
curl -sL https://deb.nodesource.com/setup_12.x | sudo bash -
sudo apt-get install -y nodejs libusb-1.0-0-dev libudev1 libudev-dev swig libatlas-base-dev portaudio19-dev mopidy flite ffmpeg mosquitto
sudo npm install -g typescript ts-node nodemon
npm i

# Install voice2json
wget https://github.com/synesthesiam/voice2json/releases/download/v2.1/voice2json_2.1_armhf.deb
sudo apt install ./voice2json_2.1_armhf.deb

touch log.txt && chmod 777 log.txt
[ ! -f cache.local.json ]  && echo "{}" > cache.local.json
[ ! -f config.local.json ] && echo "{}" > config.local.json

# Install voice profile
git clone https://github.com/synesthesiam/en-us_kaldi-zamia.git
mkdir -p ~/.config
mv en-us_kaldi-zamia ~/.config/voice2json
chmod 777 /home/pi/.config/voice2json/slot_programs/rhasspy/number
sudo ln -s ~/.config/voice2json/ /root/.config/voice2json

# Start mopidy on boot
sudo systemctl enable mopidy
