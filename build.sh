#!/bin/bash
if [[ $# -eq 0 ]] ; then
    echo 'enter one or more ssh targets, eg: pi@raspberry.local:/home/pi/voicetunes'
    exit 0
fi

npm i
ts-node itunes-to-sql.ts --overwrite
ts-node itunes.ts
ts-node sentences.ini.ts

touch data/sounds_like.txt

for ssh in "$@"
do
    url="$(cut -d':' -f1 <<<$ssh)"
    echo "url $url $ssh"

    scp itunes.sqlite3 "$ssh/itunes.sqlite3"

    ssh "$url" 'touch ~/.config/voice2json/sentences.base.ini'
    scp data/sentences.ini "$url":~/.config/voice2json/sentences.music.ini
    scp data/sounds_like.txt "$url":~/.config/voice2json/sounds_like.txt
    ssh "$url" 'cd ~/.config/voice2json/ && cat sentences.base.ini sentences.music.ini > sentences.ini'

    # FIXME: figure out how to add this PATH remotely on MacOS's SSH environment
    ssh "$url" 'export PATH=/usr/local/bin:$PATH; voice2json train-profile'
done
