var ko = require('knockout');
var TransformBase = require('./TransformBase');

function GroupByFilterTransform(original, groupKey, mappedItems) {
    this.init(original);
    this.groupKey = groupKey;
    this.mappedItems = mappedItems;
    this.mappedIndexProp = 'mappedIndex.' + groupKey;
}

GroupByFilterTransform.prototype = new (require('./filter'))();

GroupByFilterTransform.prototype.getVisibility = function (groupKey) {
    return String(groupKey) === this.groupKey;
};

module.exports = require('./createTransform')('groupBy', {
    getInitialState: function () {
        this.groups = Object.create(null);
        return ko.observableArray([]);
    },
    applyChanges: function (changes) {
        var groups = this.groups;
        var deletions = false;
        var key;

        TransformBase.prototype.applyChanges.call(this, changes);

        for (key in groups) {
            groups[key].notifyChanges();

            if (!groups[key].state.peek().length) {
                this.deleteGroup(key);
                deletions = true;
            }
        }

        if (deletions) {
            this.notifyChanges();
        }
    },
    valueAdded: function (value, index, groupKey, item) {
        groupKey = String(groupKey);

        var groups = this.groups;
        var key;

        if (!groups[groupKey]) {
            var group = new GroupByFilterTransform(this.original, groupKey, this.mappedItems);
            groups[groupKey] = group;

            var object = Object.create(null);
            object.key = groupKey;
            object.values = group.state;

            this.state.peek().push(object);
        }

        for (key in groups) {
            groups[key].valueAdded(value, index, groupKey, item);
        }
    },
    valueDeleted: function (value, index, groupKey, item) {
        var groups = this.groups;
        var key;

        for (key in groups) {
            groups[key].valueDeleted(value, index, groupKey, item);
        }
    },
    valueMutated: function (value, newGroupKey, oldGroupKey, item) {
        var groups = this.groups;
        var index = this.mappedItems.indexOf(item);
        var group;
        var key;

        this.valueDeleted(value, index, oldGroupKey, item);
        this.valueAdded(value, index, newGroupKey, item);

        for (key in groups) {
            group = groups[key];

            group.notifyChanges();

            if (!group.state.peek().length) {
                this.deleteGroup(key);
            }
        }
    },
    deleteGroup: function (groupKey) {
        var state = this.state.peek();

        delete this.groups[groupKey];

        for (var i = 0, len = state.length; i < len; i++) {
            if (state[i].key === groupKey) {
                return state.splice(i, 1);
            }
        }
    }
});
