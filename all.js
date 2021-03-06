var ko = require('knockout');

module.exports = require('./createTransform')(
    'all',
    ko.utils.extend({
        getTruthiness: function () {
            return this.truthinessCount === this.mappedItems.length;
        }
    }, require('./allOrAny'))
);
