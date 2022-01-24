#!/bin/bash
mkdir -p /tmp/ramdisk
sudo mount -t tmpfs -o size=100m tmpfs /tmp/ramdisk
sudo chmod -R 777 /tmp/ramdisk
cp ./sounds/*.wav /tmp/ramdisk/
