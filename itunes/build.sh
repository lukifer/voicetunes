#!/bin/bash
if [[ $# -eq 0 ]] ; then
    echo 'enter one or more ssh targets, eg: pi@raspberry.local:/home/pi'
    exit 0
fi

./mkjson.sh
node itunes.js
node sentences.ini.js

for ssh in "$@"
do
    scp sentences.ini               "$ssh":/home/pi/.config/voice2json/sentences.ini
    scp out/albums.map.json         "$ssh":/home/pi/voicetunes/data/albums.map.json
    scp out/albumsByArtist.map.json "$ssh":/home/pi/voicetunes/data/albumsByArtist.map.json
    scp out/artists.map.json        "$ssh":/home/pi/voicetunes/data/artists.map.json
    scp out/playlists.map.json      "$ssh":/home/pi/voicetunes/data/playlists.map.json
    scp out/tracks.map.json         "$ssh":/home/pi/voicetunes/data/tracks.map.json

    ssh "$ssh" 'voice2json train-profile'
done
