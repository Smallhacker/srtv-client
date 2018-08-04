/**
 * @typedef {string} Guid
 */

/**
 * @typedef {string} Slug
 */

/**
 * @typedef {(Guid|Slug)} GuidOrSlug
 */

/**
 * @typedef {number} Stamp
 */

/**
 * @typedef {number} Duration
 */

/**
 * @typedef {number} ClientStamp
 */

/**
 * @typedef {{}} GuidObject
 * @property {Guid} guid
 */

/**
 * @typedef {GuidObject} SlugObject
 * @property {Slug|null} slug
 */

/**
 * @typedef {{}} RolesList
 * @property {RolesEntry[]} roles
 */

/**
 * @typedef {SlugObject} GameBlurb
 * @property {string} name
 */

/**
 * @typedef {GameBlurb} GameData
 * @property {GameData|null} parent
 * @property {string} description
 * @property {string} rules
 * @property {CategoryData[]} categories
 * @property {string|null} discord
 * @property {string|null} twitch
 * @property {string|null} srcom
 */

/**
 * @typedef {{}} GameRoleData
 * @property {Guid} game
 * @property {UserBlurb|null} user
 * @property {string} role
 */

/**
 * @typedef {RolesList} GameRoles
 * @property {Guid} game
 */

/**
 * @typedef {{}} RolesEntry
 * @property {string} role
 * @property {string} scope
 * @property {UserBlurb} user
 */

/**
 * @typedef {{}} SearchResult
 * @property {number} page
 * @property {number} resultsPerPage
 * @property {number} totalResults
 * @property {Array} results
 */

/**
 * @typedef {SearchResult} GameSearch
 * @property {GameData[]} results
 */

/**
 * @typedef {{}} RaceSearch
 * @property {RaceData[]} results
 */

/**
 * @typedef {SlugObject} CategoryBlurb
 * @property {string} name
 */

/**
 * @typedef {{}} BooleanField
 * @property {boolean} default
 * @property {boolean} locked
 */

/**
 * @typedef {{}} IntField
 * @property {number} default
 * @property {number} max
 */

/**
 * @typedef {CategoryBlurb} CategoryData
 * @property {number} challengePeriod
 * @property {string|null} description
 * @property {GameBlurb} game
 * @property {IntField} lateCutoff
 * @property {boolean} moderated
 * @property {BooleanField} mutedRaces
 * @property {IntField} quitCutoff
 * @property {boolean} ranked
 * @property {BooleanField} rankedRaces
 * @property {string|null} rules
 * @property {{}} startup
 * @property {number} streamSamplingInterval
 * @property {number} streamUptimeRequirement
 * @property {BooleanField} streamedRaces
 * @property {BooleanField} unlistedRaces
 * @property {number} volatility
 */

/**
 * @typedef {CategoryBlurb} CategoryRanksData
 * @property {number} volatility
 * @property {RankData[]|null} ranks
 */

/**
 * @typedef {UserBlurb} RankData
 * @property {number} rating
 */

/**
 * @typedef {{}} CategoryRoleData
 * @property {Guid} category
 * @property {UserBlurb|null} user
 * @property {string} role
 */

/**
 * @typedef {RolesList} CategoryRoles
 * @property {Guid} category
 */

/**
 * @typedef {{GuidObject}} ChatData
 * @property {ChatMessage[]} messages
 */

/**
 * @typedef {{GuidObject}} ChatMessage
 * @property {string|RaceUpdate} message
 * @property {UserBlurb|null} sender
 * @property {Stamp} stamp
 * @property {string} type
 */

/**
 * @typedef {{}} RaceUpdate
 * @property {Guid} race
 * @property {string} status
 * @property {Stamp} stamp
 */

/**
 * @typedef {GuidObject} RaceBlurb
 * @property {string} name
 */

/**
 * @typedef {RaceBlurb} RaceData
 * @property {Guid} announcements
 * @property {Stamp|null} canceled
 * @property {CategoryBlurb} category
 * @property {Stamp} created
 * @property {string} description
 * @property {Stamp|null} ended
 * @property {GameBlurb} game
 * @property {UserBlurb} gatekeeper
 * @property {number} lateCutoff
 * @property {boolean} muted
 * @property {UserBlurb} owner
 * @property {Guid|null} playerChat
 * @property {number} quitCutoff
 * @property {boolean} ranked
 * @property {Stamp|null} recorded
 * @property {Stamp|null} scheduledStart
 * @property {Stamp|null} started
 * @property {number|null} startOffset
 * @property {string} startupType
 * @property {boolean} streamed
 * @property {boolean} unlisted
 * @property {Guid} viewerChat
 */

/**
 * @typedef {RaceData} RaceDataWithRole
 * @property {string} role
 */

/**
 * @typedef {RaceDataWithRole} RaceDataWithEntries
 * @property {EntryData[]} entries
 */

/**
 * @typedef {{}} RaceRolesData
 * @property {Guid} race
 * @property {RoleData[]} roles
 */

/**
 * @typedef {{}} RoleData
 * @property {string} role
 * @property {UserBlurb|null} user
 */

/**
 * @typedef {SlugObject} UserBlurb
 * @property {string} name
 */

/**
 * @typedef {UserBlurb} StreamerBlurb
 * @property {string|null} twitch
 * @property {number|null} rating
 */

/**
 * @typedef {UserBlurb} UserData
 * @property {string|null} email
 * @property {string|null} discord
 * @property {string|null} twitch
 * @property {string|null} srcom
 * @property {boolean} publicEmail
 * @property {boolean} hideFinishes
 */

/**
 * @typedef {UserBlurb} StreamData
 * @property {string} lastSampleStatus
 * @property {StreamerBlurb} player
 * @property {RaceBlurb|null} race
 */

/**
 * @typedef {StreamData} VideoData
 * @property {HydraVideo} video
 */

/**
 * @typedef {GuidObject} StreamList
 * @property {StreamData[]} official
 * @property {StreamData[]} followed
 * @property {StreamData[]} runner
 * @property {StreamData[]} fallback
 */

/**
 * @typedef {GuidObject} RaceEntries
 * @property {EntryData[]} entries
 */

/**
 * @typedef {GuidObject} EntryBlurb
 */

/**
 * @typedef {EntryBlurb} EntryData
 * @property {UserBlurb} player
 * @property {Stamp} stamp
 * @property {string} status
 * @property {string} comment
 * @property {RaceBlurb} race
 */

/**
 * @typedef {{}} TimeData
 * @property {Stamp} stamp
 */

/**
 * @typedef {{}} CreatedMessage
 */

/**
 * @typedef {GuidObject} FlagData
 * @property {GameBlurb} game
 * @property {CategoryBlurb} category
 * @property {Guid} race
 * @property {Guid|null} entry
 * @property {UserBlurb|null} entrant
 * @property {UserBlurb} reporter
 * @property {UserBlurb|null} assignee
 * @property {string} comment
 * @property {string} type
 * @property {Guid} chat
 * @property {Stamp|null} resolved
 */

/**
 * @typedef {{}} RTMessage
 * @property {Guid} channel
 * @property {UserBlurb} sender
 * @property {Stamp} stamp
 * @property {string} type
 * @property {RTPayload} message
 */

/**
 * @typedef {(RTText|RTEntryUpdate)} RTPayload
 */

/**
 * @typedef {string} RTText
 */

/**
 * @typedef {{}} RTEntryUpdate
 * @property {EntryData} entry
 * @property {string} status
 * @property {Stamp} stamp
 * @property {Duration} offset
 * @property {number} parameter
 * @property startupOffset
 */

