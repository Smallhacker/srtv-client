'use strict';
import FormModal from "./formModal";
import FlagType from "../flagType";

export default class FlagModal extends FormModal {
    /**
     * @param {Context} parentContext
     * @param {HydraApi} api
     */
    constructor(parentContext, api) {
        super(parentContext, "Submit Flag", "Report", 'danger');

        /**
         * @type {HydraApi}
         * @private
         */
        this._api = api;

        /**
         * @type {jQuery}
         * @private
         */
        this._typeField = this.form.select("Report Type", FlagType.external.map(f => f.toSelectValue()));

        /**
         * @type {jQuery}
         * @private
         */
        this._commentField = this.form.textArea("Details");

        /**
         * @type {RaceBlurb|null}
         * @private
         */
        this._race = null;

        /**
         * @type {EntryBlurb|null}
         * @private
         */
        this._entry = null;
    }

    _submit() {
        let entryGuid = (this._entry && this._entry.guid) || null;
        return this._api.reportFlag(this._race.guid, this._commentField.val(), this._typeField.val(), entryGuid)
            .catch(() => Promise.reject("Failed to submit flag."));
    }

    _opening(params) {
        this._typeField.val('OTHER_MISC');
        this._commentField.val("");
        this._race = params.race;
        this._entry = params.entry || null;
    }

    /**
     * @param {string|null} icon
     * @param {string|null} label
     * @param {RaceBlurb} raceBlurb
     * @returns {jQuery}
     */
    raceButton(icon, label, raceBlurb) {
        return this.openButton(icon, label, 'danger', {race: raceBlurb});
    }

    /**
     * @param {string|null} icon
     * @param {string|null} label
     * @param {RaceBlurb} raceBlurb
     * @param {EntryBlurb} entryBlurb
     * @returns {jQuery}
     */
    entryButton(icon, label, raceBlurb, entryBlurb) {
        return this.openButton(icon, label, 'danger', {race: raceBlurb, entry: entryBlurb});
    }
}