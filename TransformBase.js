var ko = require('knockout');

function TransformBase() {}

TransformBase.prototype.init = function (original, callback, options) {
    this.mappedItems = [];
    this.original = original;
    this.callback = callback;
    this.state = this.getInitialState(options);

    var state = this.state;
    if (ko.isObservable(state) && state.cacheDiffForKnownOperation) {
        // Disallow knockout to call trackChanges() on this array
        // Writing to it normally isn't support anyway
        if (ko.version >= '3.3.0') {
            state.beforeSubscriptionAdd = ko.observableArray.fn.beforeSubscriptionAdd;
            state.afterSubscriptionRemove = ko.observableArray.fn.afterSubscriptionRemove;
        } else {
            state.subscribe = ko.observableArray.fn.subscribe;
        }
        this.previousState = this.state.peek().concat();
    }
};

TransformBase.prototype.applyChanges = function (changes) {
    var self = this;
    var mappedItems = this.mappedItems;
    var moves = Object.create(null);
    var minIndex = 0;
    var offset = 0;

    changes.forEach(function (change) {
        if (change.status === 'retained') {
            return;
        }

        var index = change.index;
        var isMove = change.moved !== undefined;
        var item = null;
        var from;

        minIndex = Math.min(minIndex, index);

        if (change.status === 'added') {
            from = change.moved + offset;

            if (isMove) {
                item = moves[index];

                if (!item) {
                    item = moves[index] = mappedItems[from];
                    mappedItems[from] = null;
                }
            } else {
                item = Object.create(null);
                item.index = ko.observable(index);
                item.index.isDifferent = isDifferent;
                item.value = change.value;
                self.mapValue(item);
            }

            mappedItems.splice(index, 0, item);
            self.valueAdded(change.value, index, item.mappedValue, item, isMove);
            offset++;
        } else if (change.status === 'deleted') {
            from = index + offset;

            if (isMove) {
                item = moves[change.moved] || (moves[change.moved] = mappedItems[from]);
            } else {
                item = mappedItems[from];
                if (item.computed) {
                    item.computed.dispose();
                }
            }

            mappedItems.splice(from, 1);
            self.valueDeleted(change.value, from, item.mappedValue, item, isMove);
            offset--;
        }
    });

    for (var i = minIndex, len = mappedItems.length; i < len; i++) {
        mappedItems[i].index(i);
    }

    this.notifyChanges();
};

TransformBase.prototype.notifyChanges = function () {
    var state = this.state.peek();

    if (state) {
        var changes = ko.utils.compareArrays(this.previousState, state, {sparse: true});
        if (changes.length) {
            this.previousState = state.concat();

            var original = this.original;
            var notifySubscribers = original.notifySubscribers;
            var previousOriginalArray = original.peek().concat();
            var pendingArrayChange = false;

            original.notifySubscribers = function (valueToNotify, event) {
                if (event === 'arrayChange') {
                    pendingArrayChange = true;
                } else {
                    notifySubscribers.apply(original, arguments);
                }
            };

            this.state.notifySubscribers(state);
            this.state.notifySubscribers(changes, 'arrayChange');

            original.notifySubscribers = notifySubscribers;
            if (pendingArrayChange) {
                changes = ko.utils.compareArrays(previousOriginalArray, original.peek(), {sparse: true});
                if (changes.length) {
                    original.notifySubscribers(changes, 'arrayChange');
                }
            }
        }
    }
};

TransformBase.prototype.mapValue = function (item) {
    var callback = this.callback;

    if (callback === undefined) {
        item.mappedValue = item.value;
        return;
    }

    var owner = this;
    var method = 'callback';

    if (typeof callback !== 'function') {
        owner = item.value;
        method = callback;
        callback = owner[method];

        if (typeof callback !== 'function') {
            item.mappedValue = callback;
            return;

        } else if (ko.isObservable(callback)) {
            this.watchItem(item, callback);
            return;
        }
    }

    var computedValue = ko.computed(function () {
        return owner[method](item.value, item.index);
    });

    if (computedValue.isActive()) {
        computedValue.equalityComparer = isEqual;

        this.watchItem(item, computedValue);
        item.computed = computedValue;

        return computedValue;
    }

    item.mappedValue = computedValue.peek();
};

TransformBase.prototype.watchItem = function (item, observable) {
    var self = this;

    item.mappedValue = observable.peek();

    observable.subscribe(function (newValue) {
        self.valueMutated(item.value, newValue, item.mappedValue, item);

        // Must be updated after valueMutated because sortBy/filter/etc.
        // expect/need the old mapped value
        item.mappedValue = newValue;

        self.notifyChanges();
    });
};

function isEqual(a, b) {
    return a === b;
}

function isDifferent(a, b) {
    return a !== b;
}

module.exports = TransformBase;
