export default class FileDrop {
    /**
     * @param {HTMLElement} node
     * @param {function} callback
     * @param {string|null} hoverClass
     * @param {boolean} allowMultiple
     */
    constructor(node, callback, hoverClass = null, allowMultiple = false) {
        function readFile(file) {
            let fileReader = new FileReader();
            fileReader.onload = function () {
                let result = fileReader.result;
                callback(result, file);
            };
            fileReader.readAsDataURL(file);
        }

        function showHover() {
            if (hoverClass) {
                $(node).addClass(hoverClass);
            }
        }

        function hideHover(ev) {
            if (hoverClass && ev.currentTarget === node) {
                $(node).removeClass(hoverClass);
            }
        }

        $(node)
            .on('drop', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();

                let files = ev.originalEvent.dataTransfer.files;
                let fileCount = files.length;
                if (!allowMultiple && fileCount > 1) {
                    fileCount = 1;
                }
                for (let i = 0; i < fileCount; i++) {
                    readFile(files[i]);
                }
                hideHover(ev);

            })
            .on('dragover', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                showHover(ev);
            })
            .on('dragend', hideHover)
            .on('dragleave', hideHover)
            .on('dragexit', hideHover);
    };
}