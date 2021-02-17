class VaccinationSiteModel {
    get state() {
        return this._state;
    }

    set state(s) {
        this._state = s;
    }

    get city() {
        return this._city;
    }

    set city(c) {
        this._city = c;
    }

    get address() {
        return this._address;
    }    

    set address(a) {
        this._address = a;
    }

    get siteName() {
        return this._siteName;
    }

    set siteName(n) {
        this._siteName = n;
    }

    get bookingUrl() {
        return this._bookingUrl;
    }

    set bookingUrl(u) {
        this._bookingUrl = u;
    }

    get availableSlots() {
        return this._availableSlots;
    }

    set availableSlots(a) {
        this._availableSlots = a;
    }

    get hasAppointmentsAvailable() {
        return this._hasAppointmentsAvailable;
    }

    set hasAppointmentsAvailable(a) {
        this._hasAppointmentsAvailable = a;
    }

    get status() {
        return this._status;
    }

    set status(s) {
        this._status = s;
    }
}

module.exports = VaccinationSiteModel;
