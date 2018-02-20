var version = process.env.KNOCKOUT_VERSION;
if (!version) {
    version = '3.4.0';
}
var ko = require('./knockout-' + version);
ko['@global'] = true;
ko['@noCallThru'] = true;
module.exports = ko;
