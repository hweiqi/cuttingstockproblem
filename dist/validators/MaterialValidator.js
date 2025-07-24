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
exports.MaterialValidator = void 0;
var MaterialValidator = /** @class */ (function () {
    function MaterialValidator() {
        this.MIN_LENGTH = 100;
        this.MAX_LENGTH = 20000;
        this.STANDARD_LENGTHS = [3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000];
    }
    /**
     * 驗證單個材料
     */
    MaterialValidator.prototype.validateSingleMaterial = function (material) {
        // 檢查ID
        if (!material.id || material.id.trim() === '') {
            return { isValid: false, error: '材料必須有有效的ID' };
        }
        // 檢查長度是否為有效數字
        if (isNaN(material.length) || !isFinite(material.length)) {
            return { isValid: false, error: '材料長度必須是有效數字' };
        }
        // 檢查負數
        if (material.length < 0) {
            return { isValid: false, error: '材料長度不能為負數' };
        }
        // 檢查長度為0
        if (material.length === 0) {
            return { isValid: false, error: '材料長度必須大於0' };
        }
        // 檢查最小長度
        if (material.length < this.MIN_LENGTH) {
            return { isValid: false, error: "\u6750\u6599\u9577\u5EA6\u5FC5\u9808\u81F3\u5C11\u70BA".concat(this.MIN_LENGTH, "mm") };
        }
        // 檢查最大長度
        if (material.length > this.MAX_LENGTH) {
            return { isValid: false, error: "\u6750\u6599\u9577\u5EA6\u4E0D\u80FD\u8D85\u904E".concat(this.MAX_LENGTH, "mm") };
        }
        // 檢查是否為整數
        if (!Number.isInteger(material.length)) {
            return { isValid: false, error: '材料長度必須是整數' };
        }
        return { isValid: true };
    };
    /**
     * 驗證材料列表
     */
    MaterialValidator.prototype.validateMaterialList = function (materials) {
        var _this = this;
        var errors = [];
        // 驗證每個材料
        materials.forEach(function (material) {
            var result = _this.validateSingleMaterial(material);
            if (!result.isValid) {
                errors.push("\u6750\u6599 ".concat(material.id, ": ").concat(result.error));
            }
        });
        // 檢查重複長度
        var duplicates = this.checkDuplicateLengths(materials);
        duplicates.forEach(function (dup) {
            errors.push("\u6750\u6599\u9577\u5EA6 ".concat(dup.length, "mm \u91CD\u8907\u51FA\u73FE\uFF08").concat(dup.materialIds.join(', '), "\uFF09"));
        });
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    };
    /**
     * 檢查重複長度
     */
    MaterialValidator.prototype.checkDuplicateLengths = function (materials) {
        var lengthMap = new Map();
        // 收集每個長度對應的材料ID
        materials.forEach(function (material) {
            if (!lengthMap.has(material.length)) {
                lengthMap.set(material.length, []);
            }
            lengthMap.get(material.length).push(material.id);
        });
        // 找出重複的長度
        var duplicates = [];
        lengthMap.forEach(function (ids, length) {
            if (ids.length > 1) {
                duplicates.push({ length: length, materialIds: ids });
            }
        });
        return duplicates;
    };
    /**
     * 檢查是否為生產可用的標準長度
     */
    MaterialValidator.prototype.isValidForProduction = function (material) {
        // 檢查是否為標準長度
        return this.STANDARD_LENGTHS.includes(material.length);
    };
    /**
     * 生成不重複的材料長度
     */
    MaterialValidator.prototype.generateUniqueLengths = function (count) {
        if (count <= 0)
            return [];
        var availableLengths = __spreadArray([], this.STANDARD_LENGTHS, true);
        var result = [];
        // 如果請求數量超過標準長度數量，需要生成額外的長度
        if (count > availableLengths.length) {
            // 添加一些非標準但合理的長度（100的倍數）
            for (var i = 3500; i <= 11500; i += 500) {
                if (!availableLengths.includes(i)) {
                    availableLengths.push(i);
                }
            }
        }
        // 隨機選擇不重複的長度
        var shuffled = __spreadArray([], availableLengths, true).sort(function () { return Math.random() - 0.5; });
        return shuffled.slice(0, Math.min(count, shuffled.length));
    };
    /**
     * 驗證材料是否可以被添加到現有列表
     */
    MaterialValidator.prototype.canAddToList = function (newMaterial, existingMaterials) {
        // 首先驗證材料本身
        var singleValidation = this.validateSingleMaterial(newMaterial);
        if (!singleValidation.isValid) {
            return singleValidation;
        }
        // 檢查長度是否已存在
        var duplicateLength = existingMaterials.find(function (m) { return m.length === newMaterial.length; });
        if (duplicateLength) {
            return {
                isValid: false,
                error: "\u9577\u5EA6 ".concat(newMaterial.length, "mm \u5DF2\u5B58\u5728\uFF08").concat(duplicateLength.id, "\uFF09")
            };
        }
        return { isValid: true };
    };
    /**
     * 獲取建議的材料長度（不與現有材料重複）
     */
    MaterialValidator.prototype.getSuggestedLengths = function (existingMaterials, count) {
        if (count === void 0) { count = 5; }
        var existingLengths = new Set(existingMaterials.map(function (m) { return m.length; }));
        var suggestions = this.STANDARD_LENGTHS.filter(function (length) { return !existingLengths.has(length); });
        return suggestions.slice(0, count);
    };
    return MaterialValidator;
}());
exports.MaterialValidator = MaterialValidator;
