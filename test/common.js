exports.randomInts = [1, 9, 2, 8, 3, 7, 4, 6, 5];

exports.orderedInts = [1, 2, 3, 4, 5, 6, 7, 8, 9];

exports.isEven = function (x) {
    return x % 2 === 0;
};

exports.spy = function (object, method) {
    var func = object[method];

    function spy() {
        ++spy.calls;
        return func.apply(object, arguments);
    }

    spy.calls = 0;
    object[method] = spy;
    return spy;
};
