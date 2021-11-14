# voicetunes
Voice-controlled car audio player, powered by Raspberry Pi, [voice2json](https://voice2json.org), and [Mopidy](https://mopidy.com). Also supports a plaintext listener, via MQTT.

Rather than using a wake-word (which has a delay, and might result in false positives from music), this project uses a Bluetooth media controller, in "walkie-talkie" mode (press to talk, release to execute).

## Example Voice Commands

- "Play something by \<artist\>"
- "Play some \<genre\>"
- "Play song \<trackname\>"
- "Play track \<trackname\> by \<artist\>"
- "Play album \<album\>"
- "Play album \<album\> by \<artist\>"
- "Play the \<nth\> album by \<artist\>"
- "Start playlist \<playlist\>"
- "Shuffle playlist \<playlist\>"

See `sentences.ini.ts` for the full list of grammars, in the simplified [JSGF](https://voice2json.org/sentences.html) format.

# Raspberry Pi Install

```
cd ~
git clone https://github.com/lukifer/voicetunes
cd voicetunes
sudo ./setup.sh
```

To run at startup (and auto-restart on a fatal error), run `sudo crontab -e` and add:

```
@reboot cd /home/pi/voicetunes/; ./ramdisk.sh; sudo npm run start
* * * * * cd /home/pi/voicetunes/; sudo npm run start
```

I use the [Respeaker 4-Mic HAT](https://wiki.seeedstudio.com/ReSpeaker_4_Mic_Array_for_Raspberry_Pi/), but any ALSA or Pulse mic input should work. If not using the Respeaker, set `{ "USE_LED": false }` in `config.local.json`.

While the Pi's built-in audio works, its quality is thoroughly mediocre. I recommend a USB DAC; I use the [Fiio Q1](https://www.fiio.com/q1), and I'm quite happy with it.

# Bluetooth button

I use a [Tunia Media Button](https://www.tunai-creative.com/button/), but this could hypothetically work with any Bluetooth LTE media controller. You may have to change the values for `KEY_DOWN`, etc, in `config.local.json` (you can experiment with `bt.ts` to find the right values).

Alternately, you can set up an MQTT listener to receive voice (or text) commands over a network:

```
cd /home/pi/voicetunes
npm run mqtt
```

```
mosquitto_pub -h raspberrypi.local -t "text2json" -m "play something by nirvana"
```

### Optional: UPS

Unless you have another plan for power management, I recommend the [LiFePO4wered](https://lifepo4wered.com/) UPS. It can ensure a safe, smooth shutdown, and is highly configurable.

### Optional: log2ram

Not strictly needed, but micro SD's have a limited lifespan, and by moving all [system-level logging to RAM](https://github.com/azlux/log2ram), that lifespan can be extended. (voicetunes keeps its own log of all commands, at `~/voicetunes/log.txt`, which can be useful for debugging).

```
echo "deb http://packages.azlux.fr/debian/ buster main" | sudo tee /etc/apt/sources.list.d/azlux.list
wget -qO - https://azlux.fr/repo.gpg.key | sudo apt-key add -
apt update
apt install log2ram
```

## iTunes / Music.app Library

This was built to export from a iTunes/Music.app library, and has a script to convert the iTunes XML to JSON maps. See `maps_example` and `types.ts` for the file formats, if you want to compile music from a different source.

Music.app in Catalina / Big Sur no longer exports the Library XML automatically. You can hand-export from `File -> Library -> Export Library`, or run the included AppleScript:

```
osascript exportlibrary.applescript
```

To sync music to your Pi (after this package has been installed and setup), run the following:

```
git clone https://github.com/lukifer/voicetunes.git
cd voicetunes
./build.sh pi@raspberrypi.local:/home/pi/voicetunes

rsync -az ~/Music/iTunes/iTunes\ Media/Music/ pi@raspberrypi.local:/home/pi/music/
```

https://voice2json.org/formats.html#sounds-like-pronunciations`

# TODO

- Command: "Clear queue"
- Command to identify current track
- Command: "Jump to track \<N\>"
- Command: "Play the \<Nth\> track from \<album\>"
- Command: "Play something/\<album\> from \<year\>/\<decade\>"
- Command: "Play the latest album by \<artist>\"
- Local test database
- Replace `exec` calls with Node sockets and pipes
- Option to use [mopidy local](https://mopidy.com/ext/local/) library and native M3U playlists
- Option to cache entire voice2json profile to RAM disk
- Option to cache entire SQLite db to RAM disk
- Option to restore previous state on startup
- Your suggestion here!
