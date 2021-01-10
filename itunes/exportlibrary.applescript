tell application "Finder"
	if exists (alias ((path to home folder as text) & "Music:iTunes:Library.xml")) then
		delete (alias ((path to home folder as text) & "Music:iTunes:Library.xml"))
	end if
end tell
tell application "System Events"
	tell its process "Music"
		click menu item "Export Library…" of menu "Library" of menu item "Library" of menu "File" of menu bar 1
		delay 0.1
		click button "Save" of window "Save"
	end tell
end tell