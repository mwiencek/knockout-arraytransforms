var ko = require('knockout');
var TransformBase = require('./TransformBase');

var methodNames = {};
if (typeof requireJsModule === 'object' && requireJsModule) {
    var requireJsConfig = requireJsModule.config();
    if (requireJsConfig && requireJsConfig.methodNames) {
        methodNames = requireJsConfig.methodNames;
    }
}

function applyChanges(changes) {
    if (this.original._shouldPropagateChanges !== false) {
        this.applyChanges(changes);
    }
}

module.exports = function createTransform(name, proto) {
    function Transform() {}

    Transform.prototype = new TransformBase();
    ko.utils.extend(Transform.prototype, proto);

    if (methodNames.hasOwnProperty(name)) {
        name = methodNames[name];
    }

    ko.observableArray.fn[name] = function (callback, options) {
        var transform = new Transform();
        transform.init(this, callback, options);

        var initialState = this.peek();
        this.subscribe(applyChanges, transform, 'arrayChange');

        transform.applyChanges(
            initialState.map(function (value, index) {
                return {status: 'added', value: value, index: index};
            })
        );

        return transform.state;
    };

    return Transform;
};
