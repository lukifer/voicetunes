#!/bin/bash
if [[ $# -eq 0 ]] ; then
    echo 'enter one or more ssh targets, eg: pi@raspberry.local:/home/pi/voicetunes'
    exit 0
fi

npm i
./mkjson.sh
ts-node itunes.ts
ts-node sentences.ini.ts

for ssh in "$@"
do
    url="$(cut -d':' -f1 <<<$ssh)"
    echo "url $url $ssh"

    scp sentences.ini               "$url":/home/pi/.config/voice2json/sentences.ini
    scp maps/albums.json            "$ssh"/itunes/maps/albums.json
    scp maps/artist.json            "$ssh"/itunes/maps/artist.json
    scp maps/artistAlbums.json      "$ssh"/itunes/maps/artistAlbums.json
    scp maps/artistTracks.json      "$ssh"/itunes/maps/artistTracks.json
    scp maps/playlistTracks.json    "$ssh"/itunes/maps/playlistTracks.json
    scp maps/tracks.json            "$ssh"/itunes/maps/tracks.json

    ssh "$url" 'voice2json train-profile'
done
