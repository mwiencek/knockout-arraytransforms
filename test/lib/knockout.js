var version = process.env.KNOCKOUT_VERSION;
if (!version) {
    version = '3.4.0';
}
module.exports = require('./knockout-' + version);
