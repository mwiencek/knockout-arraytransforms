var ko = require('knockout');

module.exports = require('./createTransform')(
    'filter',
    ko.utils.extend({getVisibility: Boolean}, require('./filterOrReject'))
);
