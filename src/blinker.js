const FADE_DURATION = 300;
let active = false;

class Blinker {
    constructor(color, count, callback = null) {
        let totalCount = count;
        let currentCount = 0;
        let node = $('<div class="blink-overlay">')
            .css('background-color', color)
            .appendTo(document.body);

        let lighten = () => {
            node.addClass('blink-overlay-light');
            setTimeout(darken, FADE_DURATION);
        };

        let darken = () => {
            node.removeClass('blink-overlay-light');
            currentCount++;
            if (currentCount < totalCount) {
                setTimeout(lighten, FADE_DURATION);
            } else {
                setTimeout(() => {
                    node.remove();
                    if (callback) {
                        callback();
                    }
                }, FADE_DURATION);
            }
        };

        setTimeout(lighten, 10);
    }
}

export function blinkOverlay(color, count) {
    if (!active) {
        active = true;
        new Blinker(color, count, () => {
            active = false;
        });
    }
}