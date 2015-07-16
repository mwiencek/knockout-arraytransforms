var ko = require('knockout');

module.exports = {
    getInitialState: function () {
        this.truthinessCount = 0;
        return ko.observable(this.getTruthiness());
    },
    valueAdded: function (value, index, truthiness) {
        this.valueMutated(null, truthiness, false);
    },
    valueDeleted: function (value, index, truthiness) {
        this.valueMutated(null, false, truthiness);
    },
    valueMutated: function (value, newTruthiness, oldTruthiness) {
        if (newTruthiness && !oldTruthiness) {
            this.truthinessCount++;
        } else if (oldTruthiness && !newTruthiness) {
            this.truthinessCount--;
        }
        this.state(this.getTruthiness());
    }
};
