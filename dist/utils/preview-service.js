"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMetropolisFork = void 0;
const constants_1 = require("../constants");
const _1 = require(".");
const assert = require("node:assert");
const createMetropolisFork = (chainId) => __awaiter(void 0, void 0, void 0, function* () {
    const createUrl = `${constants_1.PREVIEW_SERVICE_URL}/create`;
    try {
        const response = yield fetch(createUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chainId, initializeDefaultAccounts: true }),
        });
        assert(response.status === 200, `${response.status} ${response.statusText}`);
        const data = yield response.json();
        return data;
    }
    catch (e) {
        (0, _1.logError)(`
    Error creating fork with chainId ${chainId}
    ==BEGIN ERROR==
    ${createUrl}
    ${e.message}
    `);
        (0, _1.exit)();
    }
});
exports.createMetropolisFork = createMetropolisFork;
//# sourceMappingURL=preview-service.js.map