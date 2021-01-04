#!/bin/bash
if [[ $# -eq 0 ]] ; then
    echo 'enter one or more ssh targets, eg: pi@raspberry.local:/home/pi/voicetunes'
    exit 0
fi

npm i
./mkjson.sh
ts-node itunes.ts
ts-node sentences.ini.ts
touch sounds_like.txt

for ssh in "$@"
do
    url="$(cut -d':' -f1 <<<$ssh)"
    echo "url $url $ssh"

    ssh "$url" 'touch ~/.config/voice2json/sentences.base.ini'
    scp sentences.ini "$url":~/.config/voice2json/sentences.music.ini
    scp sounds_like.txt "$url":~/.config/voice2json/sounds_like.txt
    ssh "$url" 'cd ~/.config/voice2json/ && cat sentences.base.ini sentences.music.ini > sentences.ini'

    scp maps/albums.json            "$ssh"/itunes/maps/albums.json
    scp maps/artist.json            "$ssh"/itunes/maps/artist.json
    scp maps/artistAlbums.json      "$ssh"/itunes/maps/artistAlbums.json
    scp maps/artistTracks.json      "$ssh"/itunes/maps/artistTracks.json
    scp maps/playlistTracks.json    "$ssh"/itunes/maps/playlistTracks.json
    scp maps/tracks.json            "$ssh"/itunes/maps/tracks.json

    # FIXME: figure out how to add this PATH remotely on MacOS's SSH environment
    ssh "$url" 'export PATH=/usr/local/bin:$PATH; voice2json train-profile'
done
