#/bin/bash

mkdir -p data
mkdir -p out

itunes-data --artists --format json ~/Music/iTunes/iTunes\ Music\ Library.xml > data/artists_.json
tail -n +2 data/artists_.json | sed -e 's/^.\[6n\[/\[/' > data/artists.json
rm data/artists_.json

# FIXME: albums aren't working
#itunes-data --format json --albums data/albums_.json ~/Music/iTunes/iTunes\ Music\ Library.xml
#tail -n +2 data/albums_.json | sed -e 's/^.\[6n\[/\[/' > data/albums.json
#rm data/albums_.json

itunes-data --tracks --format json ~/Music/iTunes/iTunes\ Music\ Library.xml > data/tracks_.json
tail -n +2 data/tracks_.json | sed -e 's/^.\[6n\[/\[/' > data/tracks.json
rm data/tracks_.json

itunes-data --playlists --format json ~/Music/iTunes/iTunes\ Music\ Library.xml > data/playlists_.json
tail -n +2 data/playlists_.json | sed -e 's/^.\[6n\[/\[/' > data/playlists.json
rm data/playlists_.json
