/**
 * Created by Adam on 8/13/2014.
 * Enhancements to Storage
 *
 * Storager is a wrapper around HTML5's localStorage. It supplies a centralized system for cross-window/tab data
 * storage. A key feature of Storager is the ability to listen on any key.
 *
 * TODO: Add TTL?
 */

var _setItem = Storage.prototype.setItem;
var _getItem = Storage.prototype.getItem;

Storage.prototype.setItem = function (key, value) {
    if (this === window.localStorage) {
        _setItem.apply(this, [key, JSON.stringify(value)]);
    } else
        _setItem.apply(this, arguments);
};

Storage.prototype.getItem = function (key) {
    if (this === window.localStorage) {
        var value = JSON.parse(_getItem.apply(this, arguments));
        return value;
    } else
        _getItem.apply(this, arguments);
};

var data = {
    _initialized: false,
    _app_name: "app",
    init: function (vars) {
        /**
         * vars should be an obj containing the elements global or local.
         *
         * global variables will be initialized in localStorage and will be accessible from different windows.
         * local variables will be initialized in a local data structure and will not be accessible from different windows.
         *
         * both should be an array of objects in the following format:
         * [{name: "name", value: "value"}, {name: "version", value: "1.1.4"}]
         * name must be string
         * value can be any native JS type, null, undefined, boolean, integer, string, array, object
         *
         * Example:
         * {
         *     global: [
         *         { name: "global_var", value: 56 }
         *     ],
         *     local: [
         *         { name: "local_var1", value: "cool_value" },
         *         { name: "local_var2", value: "this is sweet" }
         *     ]
         * }
         */
        if (this._initialized) return;
        this._initialized = true;
        window.addEventListener("storage", this._handle_storage, false);
        if ("server" in window.localStorage) return;
        vars.forEach(function (val) {
            data.set(val.name, val.value);
        });
    },
    reset: function (wipe) {
        if (wipe)
            window.localStorage.clear();
        this.set("server", null);
        this.set("channels", null);
        this.set("clients", {});
        this.set("current_window", null);
    },
    _check_if_init: function () {
        if (!this._initialized) throw "Data structure not initialized. Call data.init() first. data.init() should only be called once!";
        return true;
    },
    _handle_storage: function (e) {
        var type = e.key;
        var event = new CustomEvent("speakeasy." + type, {
            "detail": {
                "from": e.oldValue,
                "to": e.newValue,
                "page": e.url
            },
            "cancelable": true
        });
        window.dispatchEvent(event);
    },
    get: function (key) {
        // Should add caching to this so I am not parsing over and over.
        // Probably have internal data structure and use _handle_storage to update it.
        // Then have this function just return the internal data structure data
        console.log("data module still needs caching...");
        this._check_if_init();
        return window.localStorage.getItem(key);
    },
    set: function (key, value) {
        this._check_if_init();
        window.localStorage.setItem(key, value)
    },
    delete: function (key) {
        // Could add TTL to this method
        delete window.localStorage[key];
    },
    push: function (key, value) {
        this._check_if_init();
        this.set(key, this.get(key).push(value));
    },
    pop: function (key) {
        var data = this.get(key);
        var ret_val = data.pop();
        this.set(key, data);
        return ret_val;
    },
    dequeue: function (key) {
        var data = this.get(key);
        var ret_val = data.shift();
        this.set(key, data);
        return ret_val;
    },
    addToObj: function (obj_key, key, value) {
        this._check_if_init();
        var obj = this.get(obj_key);
        obj[key] = value;
        this.set(key, obj);
    },
    listenTo: function (key, callback) {
        window.addEventListener("speakeasy." + key, callback);
    },
    addToQueue: function (window, method, data) {
        this._check_if_init();
        var queue = this.get(window + "_queue") || {};
//        if (!(window in queue)) queue[window] = {};
        if (!(method in queue)) queue[method] = [];
        queue[method].push(data);
        this.set(window + "_queue", queue);
    },
    getQueue: function (window, method) {
        this._check_if_init();
        return this.get(window + "_queue")[method];
    }
};