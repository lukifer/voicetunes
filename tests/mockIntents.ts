import { MessageBase } from "../types";

export const latestAlbumByNirvana = {
  "text": "play the latest album by nirvana",
  "intent": {
    "name": "PlayArtistAlbumByNumber",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playaction",
      "value": "play",
      "raw_value": "play",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 4,
      "raw_end": 4,
      "tokens": [
        "play"
      ],
      "raw_tokens": [
        "play"
      ]
    },
    {
      "entity": "albumnum",
      "value": "latest",
      "raw_value": "latest",
      "source": "",
      "start": 9,
      "raw_start": 9,
      "end": 15,
      "raw_end": 15,
      "tokens": [
        "latest"
      ],
      "raw_tokens": [
        "latest"
      ]
    },
    {
      "entity": "artist",
      "value": "nirvana",
      "raw_value": "nirvana",
      "source": "",
      "start": 25,
      "raw_start": 25,
      "end": 32,
      "raw_end": 32,
      "tokens": [
        "nirvana"
      ],
      "raw_tokens": [
        "nirvana"
      ]
    }
  ],
  "raw_text": "play the latest album by nirvana",
  "tokens": [
    "play",
    "the",
    "latest",
    "album",
    "by",
    "nirvana"
  ],
  "raw_tokens": [
    "play",
    "the",
    "latest",
    "album",
    "by",
    "nirvana"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playaction": "play",
    "albumnum": "latest",
    "artist": "nirvana"
  }
} as MessageBase;

export const seventhAlbumByAllegaeon = {
  "text": "play seventh album by allegaeon",
  "intent": {
    "name": "PlayArtistAlbumByNumber",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playaction",
      "value": "play",
      "raw_value": "play",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 4,
      "raw_end": 4,
      "tokens": [
        "play"
      ],
      "raw_tokens": [
        "play"
      ]
    },
    {
      "entity": "albumnum",
      "value": "seventh",
      "raw_value": "seventh",
      "source": "",
      "start": 5,
      "raw_start": 5,
      "end": 12,
      "raw_end": 12,
      "tokens": [
        "seventh"
      ],
      "raw_tokens": [
        "seventh"
      ]
    },
    {
      "entity": "artist",
      "value": "allegaeon",
      "raw_value": "allegaeon",
      "source": "",
      "start": 22,
      "raw_start": 22,
      "end": 31,
      "raw_end": 31,
      "tokens": [
        "allegaeon"
      ],
      "raw_tokens": [
        "allegaeon"
      ]
    }
  ],
  "raw_text": "play seventh album by allegaeon",
  "tokens": [
    "play",
    "seventh",
    "album",
    "by",
    "allegaeon"
  ],
  "raw_tokens": [
    "play",
    "seventh",
    "album",
    "by",
    "allegaeon"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playaction": "play",
    "albumnum": "seventh",
    "artist": "allegaeon"
  }
} as MessageBase;

export const bestOfAllegaeon = {
  "text": "play the best of allegaeon",
  "intent": {
    "name": "PlayArtistBest",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playaction",
      "value": "play",
      "raw_value": "play",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 4,
      "raw_end": 4,
      "tokens": [
        "play"
      ],
      "raw_tokens": [
        "play"
      ]
    },
    {
      "entity": "artist",
      "value": "allegaeon",
      "raw_value": "allegaeon",
      "source": "",
      "start": 17,
      "raw_start": 17,
      "end": 26,
      "raw_end": 26,
      "tokens": [
        "allegaeon"
      ],
      "raw_tokens": [
        "allegaeon"
      ]
    }
  ],
  "raw_text": "play the best of allegaeon",
  "tokens": [
    "play",
    "the",
    "best",
    "of",
    "allegaeon"
  ],
  "raw_tokens": [
    "play",
    "the",
    "best",
    "of",
    "allegaeon"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playaction": "play",
    "artist": "allegaeon"
  }
} as MessageBase;

export const startPlaylistDanse = {
  "text": "start playlist danse",
  "intent": {
    "name": "StartPlaylist",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playlistaction",
      "value": "start",
      "raw_value": "start",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 5,
      "raw_end": 5,
      "tokens": [
        "start"
      ],
      "raw_tokens": [
        "start"
      ]
    },
    {
      "entity": "playlist",
      "value": "danse",
      "raw_value": "danse",
      "source": "",
      "start": 15,
      "raw_start": 15,
      "end": 20,
      "raw_end": 20,
      "tokens": [
        "danse"
      ],
      "raw_tokens": [
        "danse"
      ]
    }
  ],
  "raw_text": "start playlist danse",
  "tokens": [
    "start",
    "playlist",
    "danse"
  ],
  "raw_tokens": [
    "start",
    "playlist",
    "danse"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playlistaction": "start",
    "playlist": "danse"
  }
} as MessageBase;

export const shufflePlaylistDanse = {
  "text": "shuffle playlist danse",
  "intent": {
    "name": "StartPlaylist",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playlistaction",
      "value": "shuffle",
      "raw_value": "shuffle",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 7,
      "raw_end": 7,
      "tokens": [
        "shuffle"
      ],
      "raw_tokens": [
        "shuffle"
      ]
    },
    {
      "entity": "playlist",
      "value": "danse",
      "raw_value": "danse",
      "source": "",
      "start": 17,
      "raw_start": 17,
      "end": 22,
      "raw_end": 22,
      "tokens": [
        "danse"
      ],
      "raw_tokens": [
        "danse"
      ]
    }
  ],
  "raw_text": "shuffle playlist danse",
  "tokens": [
    "shuffle",
    "playlist",
    "danse"
  ],
  "raw_tokens": [
    "shuffle",
    "playlist",
    "danse"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playlistaction": "shuffle",
    "playlist": "danse"
  }
} as MessageBase;

export const genreBlues = {
  "text": "play some blues",
  "intent": {
    "name": "PlayGenre",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playaction",
      "value": "play",
      "raw_value": "play",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 4,
      "raw_end": 4,
      "tokens": [
        "play"
      ],
      "raw_tokens": [
        "play"
      ]
    },
    {
      "entity": "genre",
      "value": "blues",
      "raw_value": "blues",
      "source": "",
      "start": 10,
      "raw_start": 10,
      "end": 15,
      "raw_end": 15,
      "tokens": [
        "blues"
      ],
      "raw_tokens": [
        "blues"
      ]
    }
  ],
  "raw_text": "play some blues",
  "tokens": [
    "play",
    "some",
    "blues"
  ],
  "raw_tokens": [
    "play",
    "some",
    "blues"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playaction": "play",
    "genre": "blues"
  }
} as MessageBase;

export const queueAhHa = {
  "text": "queue something by ah ha",
  "intent": {
    "name": "PlayArtist",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playaction",
      "value": "queue",
      "raw_value": "queue",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 5,
      "raw_end": 5,
      "tokens": [
        "queue"
      ],
      "raw_tokens": [
        "queue"
      ]
    },
    {
      "entity": "artist",
      "value": "ah ha",
      "raw_value": "ah ha",
      "source": "",
      "start": 19,
      "raw_start": 19,
      "end": 24,
      "raw_end": 24,
      "tokens": [
        "ah",
        "ha"
      ],
      "raw_tokens": [
        "ah",
        "ha"
      ]
    }
  ],
  "raw_text": "queue something by ah ha",
  "tokens": [
    "queue",
    "something",
    "by",
    "ah",
    "ha"
  ],
  "raw_tokens": [
    "queue",
    "something",
    "by",
    "ah",
    "ha"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playaction": "queue",
    "artist": "ah ha"
  }
} as MessageBase;

export const acesHigh = {
  "text": "play track aces high",
  "intent": {
    "name": "PlayTrack",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playaction",
      "value": "play",
      "raw_value": "play",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 4,
      "raw_end": 4,
      "tokens": [
        "play"
      ],
      "raw_tokens": [
        "play"
      ]
    },
    {
      "entity": "track",
      "value": "aces high",
      "raw_value": "aces high",
      "source": "",
      "start": 11,
      "raw_start": 11,
      "end": 20,
      "raw_end": 20,
      "tokens": [
        "aces",
        "high"
      ],
      "raw_tokens": [
        "aces",
        "high"
      ]
    }
  ],
  "raw_text": "play track aces high",
  "tokens": [
    "play",
    "track",
    "aces",
    "high"
  ],
  "raw_tokens": [
    "play",
    "track",
    "aces",
    "high"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playaction": "play",
    "track": "aces high"
  }
} as MessageBase;

export const acesHighByIronMaiden = {
  "text": "play track aces high by iron maiden",
  "intent": {
    "name": "PlayTrack",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playaction",
      "value": "play",
      "raw_value": "play",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 4,
      "raw_end": 4,
      "tokens": [
        "play"
      ],
      "raw_tokens": [
        "play"
      ]
    },
    {
      "entity": "track",
      "value": "aces high by iron maiden",
      "raw_value": "aces high by iron maiden",
      "source": "",
      "start": 11,
      "raw_start": 11,
      "end": 35,
      "raw_end": 35,
      "tokens": [
        "aces",
        "high",
        "by",
        "iron",
        "maiden"
      ],
      "raw_tokens": [
        "aces",
        "high",
        "by",
        "iron",
        "maiden"
      ]
    }
  ],
  "raw_text": "play track aces high by iron maiden",
  "tokens": [
    "play",
    "track",
    "aces",
    "high",
    "by",
    "iron",
    "maiden"
  ],
  "raw_tokens": [
    "play",
    "track",
    "aces",
    "high",
    "by",
    "iron",
    "maiden"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playaction": "play",
    "track": "aces high by iron maiden"
  }
} as MessageBase;

export const acesHighBySteveAndSeagulls = {
  "text": "play track aces high by steve and seagulls",
  "intent": {
    "name": "PlayTrack",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playaction",
      "value": "play",
      "raw_value": "play",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 4,
      "raw_end": 4,
      "tokens": [
        "play"
      ],
      "raw_tokens": [
        "play"
      ]
    },
    {
      "entity": "track",
      "value": "aces high by steve and seagulls",
      "raw_value": "aces high by steve and seagulls",
      "source": "",
      "start": 11,
      "raw_start": 11,
      "end": 42,
      "raw_end": 42,
      "tokens": [
        "aces",
        "high",
        "by",
        "steve",
        "and",
        "seagulls"
      ],
      "raw_tokens": [
        "aces",
        "high",
        "by",
        "steve",
        "and",
        "seagulls"
      ]
    }
  ],
  "raw_text": "play track aces high by steve and seagulls",
  "tokens": [
    "play",
    "track",
    "aces",
    "high",
    "by",
    "steve",
    "and",
    "seagulls"
  ],
  "raw_tokens": [
    "play",
    "track",
    "aces",
    "high",
    "by",
    "steve",
    "and",
    "seagulls"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playaction": "play",
    "track": "aces high by steve and seagulls"
  }
} as MessageBase;

export const previousTrack = {
  "text": "previous track",
  "intent": {
    "name": "PreviousTrack",
    "confidence": 1
  },
  "entities": [],
  "raw_text": "previous track",
  "tokens": [
    "previous",
    "track"
  ],
  "raw_tokens": [
    "previous",
    "track"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {}
} as MessageBase;

export const progRockSeventySix = {
  "text": "play some progressive rock from nineteen seventy six",
  "intent": {
    "name": "PlayGenre",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playaction",
      "value": "play",
      "raw_value": "play",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 4,
      "raw_end": 4,
      "tokens": [
        "play"
      ],
      "raw_tokens": [
        "play"
      ]
    },
    {
      "entity": "genre",
      "value": "progressive rock",
      "raw_value": "progressive rock",
      "source": "",
      "start": 10,
      "raw_start": 10,
      "end": 26,
      "raw_end": 26,
      "tokens": [
        "progressive",
        "rock"
      ],
      "raw_tokens": [
        "progressive",
        "rock"
      ]
    },
    {
      "entity": "year",
      "value": "nineteen seventy six",
      "raw_value": "nineteen seventy six",
      "source": "",
      "start": 32,
      "raw_start": 32,
      "end": 52,
      "raw_end": 52,
      "tokens": [
        "nineteen",
        "seventy",
        "six"
      ],
      "raw_tokens": [
        "nineteen",
        "seventy",
        "six"
      ]
    }
  ],
  "raw_text": "play some progressive rock from nineteen seventy six",
  "tokens": [
    "play",
    "some",
    "progressive",
    "rock",
    "from",
    "nineteen",
    "seventy",
    "six"
  ],
  "raw_tokens": [
    "play",
    "some",
    "progressive",
    "rock",
    "from",
    "nineteen",
    "seventy",
    "six"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playaction": "play",
    "genre": "progressive rock",
    "year": "nineteen seventy six"
  }
} as MessageBase;

export const fiftiesSwing = {
  "text": "play some swing from the fifties",
  "intent": {
    "name": "PlayGenre",
    "confidence": 1
  },
  "entities": [
    {
      "entity": "playaction",
      "value": "play",
      "raw_value": "play",
      "source": "",
      "start": 0,
      "raw_start": 0,
      "end": 4,
      "raw_end": 4,
      "tokens": [
        "play"
      ],
      "raw_tokens": [
        "play"
      ]
    },
    {
      "entity": "genre",
      "value": "swing",
      "raw_value": "swing",
      "source": "",
      "start": 10,
      "raw_start": 10,
      "end": 15,
      "raw_end": 15,
      "tokens": [
        "swing"
      ],
      "raw_tokens": [
        "swing"
      ]
    },
    {
      "entity": "decade",
      "value": "fifties",
      "raw_value": "fifties",
      "source": "",
      "start": 25,
      "raw_start": 25,
      "end": 32,
      "raw_end": 32,
      "tokens": [
        "fifties"
      ],
      "raw_tokens": [
        "fifties"
      ]
    }
  ],
  "raw_text": "play some swing from the fifties",
  "tokens": [
    "play",
    "some",
    "swing",
    "from",
    "the",
    "fifties"
  ],
  "raw_tokens": [
    "play",
    "some",
    "swing",
    "from",
    "the",
    "fifties"
  ],
  "wav_seconds": null,
  "transcribe_seconds": null,
  "speech_confidence": null,
  "wav_name": null,
  "slots": {
    "playaction": "play",
    "genre": "swing",
    "decade": "fifties"
  }
} as MessageBase;

// FIXME: PlayGenreBest?
// export const albumBannedOnVulcan = {
//   "text": "play album banned on vulcan",
//   "intent": {
//     "name": "PlayGenreBest",
//     "confidence": 1
//   },
//   "entities": [
//     {
//       "entity": "playaction",
//       "value": "play",
//       "raw_value": "play",
//       "source": "",
//       "start": 0,
//       "raw_start": 0,
//       "end": 4,
//       "raw_end": 4,
//       "tokens": [
//         "play"
//       ],
//       "raw_tokens": [
//         "play"
//       ]
//     },
//     {
//       "entity": "album",
//       "value": "banned on vulcan",
//       "raw_value": "banned on vulcan",
//       "source": "",
//       "start": 11,
//       "raw_start": 11,
//       "end": 27,
//       "raw_end": 27,
//       "tokens": [
//         "banned",
//         "on",
//         "vulcan"
//       ],
//       "raw_tokens": [
//         "banned",
//         "on",
//         "vulcan"
//       ]
//     }
//   ],
//   "raw_text": "play album banned on vulcan",
//   "tokens": [
//     "play",
//     "album",
//     "banned",
//     "on",
//     "vulcan"
//   ],
//   "raw_tokens": [
//     "play",
//     "album",
//     "banned",
//     "on",
//     "vulcan"
//   ],
//   "wav_seconds": null,
//   "transcribe_seconds": null,
//   "speech_confidence": null,
//   "wav_name": null,
//   "slots": {
//     "playaction": "play",
//     "album": "banned on vulcan"
//   }
// } as MessageBase;
