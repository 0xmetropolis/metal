"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.doNotCommunicateWithPreviewService = exports.PREVIEW_WEB_URL = exports.PREVIEW_SERVICE_URL = exports.SUPPORTED_CHAINS = void 0;
const types_1 = require("./types");
exports.SUPPORTED_CHAINS = Object.values(types_1.Network);
exports.PREVIEW_SERVICE_URL = (_a = process.env.PREVIEW_SERVICE_URL) !== null && _a !== void 0 ? _a : 'http://localhost:1234';
exports.PREVIEW_WEB_URL = (_b = process.env.PREVIEW_WEB_URL) !== null && _b !== void 0 ? _b : 'http://localhost:3000';
exports.doNotCommunicateWithPreviewService = !!process.env.NO_PREVIEW_SERVICE;
//# sourceMappingURL=constants.js.map