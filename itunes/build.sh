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
    scp sentences.ini                  "$ssh"/.config/voice2json/sentences.ini
    scp out/albums.map.json            "$ssh"/voicetunes/data/albums.map.json
    scp out/albumByArtist.map.json     "$ssh"/voicetunes/data/albumByArtist.map.json
    scp out/artist.map.json            "$ssh"/voicetunes/data/artist.map.json
    scp out/artistAlbums.map.json      "$ssh"/voicetunes/data/artistAlbums.map.json
    scp out/playlistTracks.map.json    "$ssh"/voicetunes/data/playlistTracks.map.json
    scp out/tracks.map.json            "$ssh"/voicetunes/data/tracks.map.json

    url="$(cut -d':' -f1 <<<$ssh)"
    echo "url $url $ssh"
    ssh "$url" 'voice2json train-profile'
done
