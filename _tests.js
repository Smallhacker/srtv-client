UnitTests.addTests(function (testing) {
    'use strict';

    testing.get("Get User", 'users/a73df1d6-c887-40f9-be6a-3d009f3ecba5', null,
        {
            "guid": "a73df1d6-c887-40f9-be6a-3d009f3ecba5",
            "name": "Smallhacker",
            "slug": "smalls",
            "email": null,
            "discord": "Smallhacker#6608",
            "twitch": "SpeedGaming",
            "srcom": "Smallhacker"
        }
    );

    testing.get("Get Game", 'games/e84f2418-e089-4c94-9394-ea11f473d18e', null,
        {
            "guid": "e84f2418-e089-4c94-9394-ea11f473d18e",
            "name": "ALTTP Randomizer",
            "slug": "alttpr",
            "discord": "https://discord.gg/48sauwx",
            "parent": {
                "guid": "595abdf2-647f-4753-9ada-90fafaf3f6a0",
                "name": "The Legend of Zelda - A Link to the Past",
                "slug": "alttp"
            },
            "categories": [
                {
                    "guid": "a5296745-69cf-11e7-ae0a-109836a52851",
                    "name": "Standard No-Glitches Normal"
                },
                {
                    "guid": "6eb73e65-ebd4-4512-9863-dffa9c666e12",
                    "name": "Open Glitched Expert"
                }
            ]
        }
    );

    testing.get("Get Race", 'races/23ba72db-d319-466f-befb-c6f1696aba3d', null,
        {
            "guid": "23ba72db-d319-466f-befb-c6f1696aba3d",
            "created": 1503410032,
            "started": null,
            "ended": null,
            "recorded": null,
            "canceled": null,
            "name": "Test Race 1",
            "description": "",
            "startupType": "READY_UP",
            "lateCutoff": 0,
            "quitCutoff": 0,
            "scheduledStart": 1503521499,
            "ranked": false,
            "unlisted": true,
            "muted": false,
            "streamed": true,
            "viewerChat": "c7cda03c-c9c4-4f85-8e19-1023f3629084",
            "playerChat": "c05ee5d3-3c09-40de-8cb3-7ab2b16006cd",
            "announcements": "78e53613-a3af-4505-8e14-9034e5f9cd42",
            "game": {
                "guid": "e84f2418-e089-4c94-9394-ea11f473d18e",
                "name": "ALTTP Randomizer",
                "slug": "alttpr"
            },
            "category": {
                "guid": "a5296745-69cf-11e7-ae0a-109836a52851",
                "name": "Standard No-Glitches Normal"
            },
            "owner": {
                "guid": "63431f0c-a5d6-49de-aadf-a667ed3834a7",
                "name": "Karkat",
                "slug": null
            },
            "gatekeeper": {
                "guid": "63431f0c-a5d6-49de-aadf-a667ed3834a7",
                "name": "Karkat",
                "slug": null
            }
        }
    );

    testing.get("Get Race Entries", 'races/23ba72db-d319-466f-befb-c6f1696aba3d/entries', null,
        {
            "guid": "23ba72db-d319-466f-befb-c6f1696aba3d",
            "entries": [
                {
                    "guid": "d592de3f-d684-44e0-a13c-95da69b84f0b",
                    "stamp": 1503410632,
                    "status": "JOINED",
                    "player": {"guid": "63431f0c-a5d6-49de-aadf-a667ed3834a7", "name": "Karkat", "slug": null}
                },
                {
                    "guid": "fcf5c420-ddc3-4f4f-a17e-087090e3bb24",
                    "stamp": 1503410832,
                    "status": "DONE",
                    "player": {"guid": "a73df1d6-c887-40f9-be6a-3d009f3ecba5", "name": "Smallhacker", "slug": "smalls"}
                }
            ]
        }
    );

    testing.get("Get Category", 'categories/a5296745-69cf-11e7-ae0a-109836a52851', null,
        {
            "challengePeriod": 7200,
            "streamSamplingInterval": 0,
            "guid": "a5296745-69cf-11e7-ae0a-109836a52851",
            "name": "Standard No-Glitches Normal",
            "slug": null,
            "description": "",
            "rules": "",
            "volatility": 0.6,
            "moderated": false,
            "ranked": true,
            "streamUptimeRequirement": 0.9,
            "unlistedRaces": {
                "default": true,
                "locked": false
            },
            "mutedRaces": {
                "default": false,
                "locked": false
            },
            "streamedRaces": {
                "default": false,
                "locked": false
            },
            "game": {
                "guid": "e84f2418-e089-4c94-9394-ea11f473d18e",
                "name": "ALTTP Randomizer",
                "slug": "alttpr"
            },
            "lateCutoff": {
                "default": 0,
                "max": 0
            },
            "quitCutoff": {
                "default": 0,
                "max": 0
            },
            "startup": {
                "default": "READY_UP",
                "allowed": ["READY_UP", "SCHEDULED"],
                "allowedAlways": ["READY_UP"]
            }
        }
    );

    function rtApi(url) {
        return new Promise((resolve, reject) => {
            let error = "Connection timed out";
            let socket;

            let timer = setTimeout(() => {
                reject(error);
                if (socket) {
                    socket.close();
                }
            }, 5000);

            try {
                socket = new WebSocket(url);
            } catch (e) {
                reject("new WebSocket(...) threw exception");
                clearTimeout(timer);
                return;
            }


            socket.addEventListener('open', function () {
                error = "Subscription timed out";

                try {
                    socket.send('{"subscribe":["c7cda03c-c9c4-4f85-8e19-1023f3629084"],"requestId":1234}');
                } catch (e) {
                    reject("socket.send(...) threw exception");
                    clearTimeout(timer);
                }

                //socket.close();
            });

            socket.addEventListener('message', function (event) {
                let m = event.data;
                if (m === '{"requestId":1234,"status":"SUCCESS"}') {
                    resolve();
                    clearTimeout(timer);
                } else {
                    reject("Unexpected message returned: " + m);
                    clearTimeout(timer);
                }
            });

        });
    }

    testing.runTest("RTAPI (wss://api.speedracing.tv/rtapi/)", rtApi('wss://api.speedracing.tv/rtapi/'), x => []);

    testing.runTest("RTAPI (wss://api.speedracing.tv:45108/)", rtApi('wss://api.speedracing.tv:45108/'), x => []);
});