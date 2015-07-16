var ko = require('knockout');

module.exports = require('./createTransform')('map', {
    getInitialState: function () {
        return ko.observableArray([]);
    },
    valueAdded: function (value, index, mappedValue) {
        this.state.peek().splice(index, 0, mappedValue);
    },
    valueDeleted: function (value, index) {
        this.state.peek().splice(index, 1);
    },
    valueMutated: function (value, newMappedValue, oldMappedValue, item) {
        this.state.peek()[this.mappedItems.indexOf(item)] = newMappedValue;
    }
});
