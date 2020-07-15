#!/bin/bash
if [[ $# -eq 0 ]] ; then
    echo 'enter one or more ssh targets, eg: pi@raspberry.local:/home/pi'
    exit 0
fi

npm i
./mkjson.sh
ts-node itunes.ts
ts-node sentences.ini.ts

for ssh in "$@"
do
    scp sentences.ini               "$ssh"/.config/voice2json/sentences.ini
    scp maps/albums.json            "$ssh"/voicetunes/itunes/maps/albums.json
    scp maps/artist.json            "$ssh"/voicetunes/itunes/maps/artist.json
    scp maps/artistAlbums.json      "$ssh"/voicetunes/itunes/maps/artistAlbums.json
    scp maps/artistTracks.json      "$ssh"/voicetunes/itunes/maps/artistTracks.json
    scp maps/playlistTracks.json    "$ssh"/voicetunes/itunes/maps/playlistTracks.json
    scp maps/tracks.json            "$ssh"/voicetunes/itunes/maps/tracks.json

    url="$(cut -d':' -f1 <<<$ssh)"
    echo "url $url $ssh"
    ssh "$url" 'voice2json train-profile'
done
