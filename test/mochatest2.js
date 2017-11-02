"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var spectron_1 = require("spectron");
var assert = require('assert');
var BrowserWindow = require('electron');
describe('application launch', function () {
    var _this = this;
    this.timeout(10000);
    var app;
    beforeEach(function () {
        app = new spectron_1.Application({
            path: '/usr/bin/code',
            args: ['./testfile/testfile.js', '--skip-getting-started']
        });
        return app.start();
    });
    afterEach(function () {
        if (app && app.isRunning()) {
            return app.stop();
        }
        return null;
    });
    it('finds and prints text in current vscode file', function () { return __awaiter(_this, void 0, void 0, function () {
        var text, windows, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    app.electron.clipboard.writeText('hello');
                    return [4 /*yield*/, app.electron.clipboard.readText()];
                case 1:
                    text = _a.sent();
                    return [4 /*yield*/, BrowserWindow.getAllWindows()];
                case 2:
                    windows = _a.sent();
                    console.log(windows);
                    for (i = 0; i < 10000000000; i++) {
                        continue;
                    }
                    return [2 /*return*/];
            }
        });
    }); });
});
