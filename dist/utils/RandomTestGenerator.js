"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomTestGenerator = void 0;
var AngleValidator_1 = require("../validators/AngleValidator");
var MaterialValidator_1 = require("../validators/MaterialValidator");
var MaterialConfig_1 = require("../config/MaterialConfig");
var RandomTestGenerator = /** @class */ (function () {
    function RandomTestGenerator() {
        // 使用時間戳確保每次都不同
        this.seed = Date.now();
        this.angleValidator = new AngleValidator_1.AngleValidator();
        this.materialValidator = new MaterialValidator_1.MaterialValidator();
    }
    /**
     * 生成隨機材料
     */
    RandomTestGenerator.prototype.generateRandomMaterials = function (count, lengthRange) {
        if (count <= 0)
            return [];
        var materials = [];
        var availableLengths = __spreadArray([], MaterialConfig_1.STANDARD_MATERIAL_LENGTHS, true);
        if (lengthRange) {
            // 如果有自定義範圍，過濾標準長度
            var filteredLengths = availableLengths.filter(function (length) { return length >= lengthRange.min && length <= lengthRange.max; });
            // 如果過濾後沒有符合的標準長度，使用所有標準長度
            var lengthsToUse = filteredLengths.length > 0 ? filteredLengths : availableLengths;
            for (var i = 0; i < count; i++) {
                // 從可用的標準長度中隨機選擇
                var randomIndex = this.random(0, lengthsToUse.length - 1);
                var length_1 = lengthsToUse[randomIndex];
                materials.push({
                    id: "M".concat(i + 1, "-").concat(Date.now(), "-").concat(i),
                    length: length_1
                });
            }
        }
        else {
            // 使用所有標準長度，循環使用
            for (var i = 0; i < count; i++) {
                // 從標準長度中隨機選擇
                var randomIndex = this.random(0, availableLengths.length - 1);
                var length_2 = availableLengths[randomIndex];
                materials.push({
                    id: "M".concat(i + 1, "-").concat(Date.now(), "-").concat(i),
                    length: length_2
                });
            }
        }
        return materials;
    };
    /**
     * 生成隨機零件
     */
    RandomTestGenerator.prototype.generateRandomParts = function (count) {
        if (count <= 0)
            return [];
        var parts = [];
        for (var i = 0; i < count; i++) {
            var hasAngles = this.random(0, 100) < 40; // 40% 機率有角度
            var length_3 = Math.round(this.random(50, 500)) * 10; // 500-5000, 10的倍數
            var part = {
                id: "P".concat(i + 1, "-").concat(Date.now(), "-").concat(i),
                length: length_3,
                quantity: this.random(1, 10)
            };
            if (hasAngles) {
                part.angles = this.generateRandomAngles();
            }
            parts.push(part);
        }
        return parts;
    };
    /**
     * 生成隨機角度
     */
    RandomTestGenerator.prototype.generateRandomAngles = function () {
        // 使用AngleValidator生成有效的角度組合
        return this.angleValidator.generateValidAngles();
    };
    /**
     * 生成測試場景
     */
    RandomTestGenerator.prototype.generateTestScenario = function (config) {
        var defaultConfig = {
            materialCount: { min: 3, max: 8 },
            partCount: { min: 5, max: 15 },
            materialLength: { min: 3000, max: 12000 },
            partLength: { min: 500, max: 5000 }
        };
        var mergedConfig = this.mergeConfig(defaultConfig, config);
        // 生成材料和零件數量
        var materialCount = this.random(mergedConfig.materialCount.min, mergedConfig.materialCount.max);
        var partCount = this.random(mergedConfig.partCount.min, mergedConfig.partCount.max);
        // 生成材料（使用配置的長度範圍）
        var materials = this.generateRandomMaterials(materialCount, mergedConfig.materialLength);
        // 生成零件，確保長度合理
        var parts = this.generateRandomParts(partCount);
        // 調整零件長度以符合材料範圍和配置
        var maxMaterialLength = Math.max.apply(Math, materials.map(function (m) { return m.length; }));
        parts.forEach(function (part) {
            // 確保零件長度在配置範圍內
            if (part.length < mergedConfig.partLength.min) {
                part.length = mergedConfig.partLength.min;
            }
            if (part.length > mergedConfig.partLength.max) {
                part.length = mergedConfig.partLength.max;
            }
            // 確保零件長度不超過最大材料長度
            if (part.length > maxMaterialLength) {
                part.length = Math.floor(maxMaterialLength * 0.8 / 10) * 10;
            }
        });
        // 如果不是自定義配置，才進行平衡調整
        if (!config) {
            // 平衡材料和零件總長度
            var totalPartLength = parts.reduce(function (sum, p) { return sum + p.length * p.quantity; }, 0);
            var totalMaterialLength = materials.reduce(function (sum, m) { return sum + m.length; }, 0);
            // 如果材料不足，增加材料
            if (totalMaterialLength < totalPartLength * 0.7) {
                var additionalMaterialsNeeded = Math.ceil((totalPartLength * 0.8 - totalMaterialLength) / mergedConfig.materialLength.max);
                for (var i = 0; i < additionalMaterialsNeeded; i++) {
                    materials.push({
                        id: "M".concat(materials.length + 1, "-").concat(Date.now(), "-extra-").concat(i),
                        length: mergedConfig.materialLength.max
                    });
                }
            }
        }
        return { materials: materials, parts: parts };
    };
    /**
     * 生成預設測試場景
     */
    RandomTestGenerator.prototype.generatePresetScenarios = function () {
        var scenarios = [];
        // 簡單場景
        scenarios.push({
            name: '簡單場景',
            description: '少量材料和零件，無角度',
            scenario: {
                materials: [
                    { id: 'M1-simple', length: 6000 },
                    { id: 'M2-simple', length: 6000 },
                    { id: 'M3-simple', length: 12000 }
                ],
                parts: [
                    { id: 'P1-simple', length: 2000, quantity: 3 },
                    { id: 'P2-simple', length: 3000, quantity: 2 },
                    { id: 'P3-simple', length: 1500, quantity: 4 },
                    { id: 'P4-simple', length: 4000, quantity: 1 }
                ]
            }
        });
        // 複雜角度場景（符合新規則）
        scenarios.push({
            name: '複雜角度場景',
            description: '包含多種角度配置，測試共刀優化',
            scenario: {
                materials: [
                    { id: 'M1-complex', length: 6000 },
                    { id: 'M2-complex', length: 9000 },
                    { id: 'M3-complex', length: 12000 },
                    { id: 'M4-complex', length: 10000 } // 使用標準長度
                ],
                parts: [
                    {
                        id: 'P1-complex',
                        length: 2000,
                        quantity: 3,
                        angles: { topLeft: 33, topRight: 33, bottomLeft: 0, bottomRight: 0 }
                    },
                    {
                        id: 'P2-complex',
                        length: 2500,
                        quantity: 2,
                        angles: { topLeft: 35, topRight: 0, bottomLeft: 0, bottomRight: 0 } // 修正：左側不能同時有上下角度
                    },
                    {
                        id: 'P3-complex',
                        length: 3000,
                        quantity: 2,
                        angles: { topLeft: 45, topRight: 45, bottomLeft: 0, bottomRight: 0 } // 修正：只有頂部角度
                    },
                    {
                        id: 'P4-complex',
                        length: 1800,
                        quantity: 4,
                        angles: { topLeft: 0, topRight: 33, bottomLeft: 0, bottomRight: 0 } // 修正：右側只有上角度
                    },
                    {
                        id: 'P5-complex',
                        length: 2200,
                        quantity: 3,
                        angles: { topLeft: 60, topRight: 60, bottomLeft: 0, bottomRight: 0 }
                    },
                    {
                        id: 'P6-complex',
                        length: 1500,
                        quantity: 2,
                        angles: { topLeft: 0, topRight: 0, bottomLeft: 45, bottomRight: 45 } // 底部斜切
                    }
                ]
            }
        });
        // 大規模場景
        var largeMaterials = this.generateRandomMaterials(15);
        var largeParts = this.generateRandomParts(30);
        scenarios.push({
            name: '大規模場景',
            description: '大量材料和零件，測試性能',
            scenario: {
                materials: largeMaterials,
                parts: largeParts
            }
        });
        // 混合場景
        scenarios.push({
            name: '混合場景',
            description: '結合各種情況的綜合測試',
            scenario: this.generateTestScenario({
                materialCount: { min: 5, max: 10 },
                partCount: { min: 10, max: 20 }
            })
        });
        return scenarios;
    };
    /**
     * 合併配置
     */
    RandomTestGenerator.prototype.mergeConfig = function (defaultConfig, userConfig) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7;
        if (!userConfig)
            return defaultConfig;
        return {
            materialCount: {
                min: Math.max(1, Math.min((_b = (_a = userConfig.materialCount) === null || _a === void 0 ? void 0 : _a.min) !== null && _b !== void 0 ? _b : defaultConfig.materialCount.min, (_d = (_c = userConfig.materialCount) === null || _c === void 0 ? void 0 : _c.max) !== null && _d !== void 0 ? _d : defaultConfig.materialCount.max)),
                max: Math.max(1, Math.max((_f = (_e = userConfig.materialCount) === null || _e === void 0 ? void 0 : _e.min) !== null && _f !== void 0 ? _f : defaultConfig.materialCount.min, (_h = (_g = userConfig.materialCount) === null || _g === void 0 ? void 0 : _g.max) !== null && _h !== void 0 ? _h : defaultConfig.materialCount.max))
            },
            partCount: {
                min: Math.max(1, Math.min((_k = (_j = userConfig.partCount) === null || _j === void 0 ? void 0 : _j.min) !== null && _k !== void 0 ? _k : defaultConfig.partCount.min, (_m = (_l = userConfig.partCount) === null || _l === void 0 ? void 0 : _l.max) !== null && _m !== void 0 ? _m : defaultConfig.partCount.max)),
                max: Math.max(1, Math.max((_p = (_o = userConfig.partCount) === null || _o === void 0 ? void 0 : _o.min) !== null && _p !== void 0 ? _p : defaultConfig.partCount.min, (_r = (_q = userConfig.partCount) === null || _q === void 0 ? void 0 : _q.max) !== null && _r !== void 0 ? _r : defaultConfig.partCount.max))
            },
            materialLength: {
                min: Math.max(100, Math.min((_t = (_s = userConfig.materialLength) === null || _s === void 0 ? void 0 : _s.min) !== null && _t !== void 0 ? _t : defaultConfig.materialLength.min, (_v = (_u = userConfig.materialLength) === null || _u === void 0 ? void 0 : _u.max) !== null && _v !== void 0 ? _v : defaultConfig.materialLength.max)),
                max: Math.min(20000, Math.max((_x = (_w = userConfig.materialLength) === null || _w === void 0 ? void 0 : _w.min) !== null && _x !== void 0 ? _x : defaultConfig.materialLength.min, (_z = (_y = userConfig.materialLength) === null || _y === void 0 ? void 0 : _y.max) !== null && _z !== void 0 ? _z : defaultConfig.materialLength.max))
            },
            partLength: {
                min: Math.max(10, Math.min((_1 = (_0 = userConfig.partLength) === null || _0 === void 0 ? void 0 : _0.min) !== null && _1 !== void 0 ? _1 : defaultConfig.partLength.min, (_3 = (_2 = userConfig.partLength) === null || _2 === void 0 ? void 0 : _2.max) !== null && _3 !== void 0 ? _3 : defaultConfig.partLength.max)),
                max: Math.min(20000, Math.max((_5 = (_4 = userConfig.partLength) === null || _4 === void 0 ? void 0 : _4.min) !== null && _5 !== void 0 ? _5 : defaultConfig.partLength.min, (_7 = (_6 = userConfig.partLength) === null || _6 === void 0 ? void 0 : _6.max) !== null && _7 !== void 0 ? _7 : defaultConfig.partLength.max))
            }
        };
    };
    /**
     * 簡單的隨機數生成器
     */
    RandomTestGenerator.prototype.random = function (min, max) {
        // 使用線性同餘生成器
        this.seed = (this.seed * 1664525 + 1013904223) % 2147483647;
        var normalized = this.seed / 2147483647;
        return Math.floor(normalized * (max - min + 1)) + min;
    };
    return RandomTestGenerator;
}());
exports.RandomTestGenerator = RandomTestGenerator;
