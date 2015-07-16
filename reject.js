var ko = require('knockout');

function negate(x) {
    return !x;
}

module.exports = require('./createTransform')(
    'reject',
    ko.utils.extend({getVisibility: negate}, require('./filterOrReject'))
);
