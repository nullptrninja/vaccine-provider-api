class ProcessorResult {
    get timestamp() {
        return this._timestamp;
    }

    set timestamp(ts) {
        this._timestamp = ts;
    }

    get siteData() {
        return this._siteData;
    }

    set siteData(d) {
        this._siteData = d;
    }
}

module.exports = ProcessorResult;
