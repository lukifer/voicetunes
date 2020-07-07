export type StringReplaceTuple = [string | RegExp, string];

export interface iTunesAlbumTrack {
  Name:            string;
  Artist?:         string | null;
  Album?:          string | null;
  "Album Artist"?: string;
  Location:        string | undefined;
  "Disc Number"?:  number | null;
  "Track Number"?: number | null;
}

export interface iTunesAlbum {
  Name:     string;
  Artist:   string;
  Location: string;
  Tracks?:  iTunesAlbumTrack[] | null;
}

export interface iTunesArtist {
  Name:          string;
  "Track Count": number;
  "Play Count":  number;
}

export interface iTunesTrack extends iTunesAlbumTrack {
  "Track ID":               number;
  Size:                     number;
  "Total Time":             number;
  "Disc Count"?:            number | null;
  "Track Count"?:           number | null;
  Year?:                    number | null;
  "Date Modified"?:         string | null;
  "Date Added"?:            string | null;
  "Play Count"?:            number | null;
  "Release Date"?:          string | null;
  "Artwork Count"?:         number | null;
  Season?:                  number | null;
  "Episode Order"?:         number | null;
  "Persistent ID":          string;
  "Track Type":             string;
  Purchased?:               string | null;
  "TV Show"?:               string | null;
  "Has Video"?:             string | null;
  Genre?:                   string | null;
  Kind:                     string;
  "Sort Name"?:             string | null;
  "Sort Album"?:            string | null;
  "Sort Artist"?:           string | null;
  "Content Rating"?:        string | null;
  Series?:                  string | null;
  Episode?:                 string | null;
  "Bit Rate"?:              number | null;
  "Sample Rate"?:           number | null;
  Protected?:               string | null;
  "File Folder Count"?:     number | null;
  "Library Folder Count"?:  number | null;
  Composer?:                string | null;
  "Sort Album Artist"?:     string | null;
  Explicit?:                string | null;
  Movie?:                   string | null;
  "Skip Count"?:            number | null;
  "Skip Date"?:             string | null;
  Rating?:                  number | null;
  "Rating Computed"?:       string | null;
  "Album Rating"?:          number | null;
  "Album Rating Computed"?: string | null;
  "Play Date"?:             number | null;
  "Play Date UTC"?:         string | null;
  "Sort Series"?:           string | null;
  Compilation?:             string | null;
  Comments?:                string | null;
  Clean?:                   string | null;
  "Music Video"?:           string | null;
  Grouping?:                string | null;
  Work?:                    string | null;
  Disabled?:                string | null;
  "Start Time"?:            number | null;
  "Stop Time"?:             number | null;
  "Sort Composer"?:         string | null;
  BPM?:                     number | null;
  "Volume Adjustment"?:     number | null;
  "Part Of Gapless Album"?: string | null;
}

export interface iTunesPlaylist {
  Master?:                  string | null;
  "Playlist ID":            number;
  "Playlist Persistent ID": string;
  "All Items":              string;
  Visible?:                 string | null;
  Name:                     string;
  Tracks?:                  (iTunesTrack | null)[] | null;
  "Distinguished Kind"?:    number | null;
  "Smart Info"?:            string | null;
  "Smart Criteria"?:        string | null;
  Folder?:                  string | null;
  "Parent Persistent ID"?:  string | null;
}

export interface iTunesSubstitutions {
  "itunesBasePath": string;
  "albums":         Record<string, string>;
  "artists":        Record<string, string>;
  "playlists":      Record<string, string>;
  "tracks":         Record<string, string>;
}

export type Artist         = string;
export type ArtistAndAlbum = string;

export type ArtistSentence         = string;
export type AlbumByArtistSentence  = string;
export type AlbumSentence          = string;
export type PlaylistSentence       = string;
export type TrackSentence          = string;
export type TrackByArtistSentence  = string;

export type ArtistMap         = Record<ArtistSentence,        Artist >;
export type ArtistAlbumsMap   = Record<ArtistSentence,        Album[]>;
export type AlbumsMap         = Record<AlbumSentence,         Album[]>;
export type AlbumByArtistMap  = Record<AlbumSentence,         Album  >;
export type PlaylistTracksMap = Record<PlaylistSentence,      Track[]>;
export type TracksMap         = Record<TrackSentence,         Track[]>;
export type TrackByArtistMap  = Record<TrackByArtistSentence, Track  >;

export type Track = {
  name:         string;
  artist:       Artist;
  album:        string;
  albumArtist?: Artist;
  file:         string;
  number?:      number;
  disc?:        number;
};

export type Album = {
  name:   string;
  artist: Artist;
  path:   string;
  tracks: Track[];
};

export type iTunesEntity = iTunesAlbum | iTunesArtist | iTunesPlaylist | iTunesTrack;
export type EntityFilterType = "albums" | "artists" | "playlists" | "tracks";
export type EntityFilter = Required<Record<EntityFilterType, string[]>>

export type OutputEntity = "albums"
                         | "albumByArtist"
                         | "artist"
                         | "artistAlbums"
                         | "playlistTracks"
                         | "tracks"
                         | "trackByArtist"
                         ;
export type OutputMaps = ArtistMap
                       | ArtistAlbumsMap
                       | AlbumsMap
                       | AlbumByArtistMap
                       | PlaylistTracksMap
                       | TracksMap
                       | TrackByArtistMap
                       ;
