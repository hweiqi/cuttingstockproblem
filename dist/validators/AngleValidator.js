"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AngleValidator = void 0;
var AngleValidator = /** @class */ (function () {
    function AngleValidator() {
        this.MIN_ANGLE = 0;
        this.MAX_ANGLE = 89;
        this.NO_CUT_ANGLE = 90;
        this.MIN_PRODUCTION_ANGLE = 15; // 最小可生產角度
    }
    /**
     * 驗證單個角度值
     */
    AngleValidator.prototype.validateSingleAngle = function (angle) {
        // 檢查是否為有效數字
        if (isNaN(angle) || !isFinite(angle)) {
            return { isValid: false, error: '角度必須是有效數字' };
        }
        // 檢查負數
        if (angle < 0) {
            return { isValid: false, error: '角度不能為負數' };
        }
        // 90度不應該被輸入
        if (angle >= this.NO_CUT_ANGLE) {
            return { isValid: false, error: '角度必須在0-89度之間' };
        }
        // 檢查範圍
        if (angle > this.MAX_ANGLE) {
            return { isValid: false, error: '角度必須在0-89度之間' };
        }
        return { isValid: true };
    };
    /**
     * 驗證零件的所有角度
     */
    AngleValidator.prototype.validatePartAngles = function (angles) {
        var errors = [];
        // 如果沒有角度資訊，視為全部90度（有效）
        if (!angles) {
            return { isValid: true, errors: [] };
        }
        // 驗證每個角度值
        var positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
        for (var _i = 0, positions_1 = positions; _i < positions_1.length; _i++) {
            var position = positions_1[_i];
            var angle = angles[position];
            var result = this.validateSingleAngle(angle);
            if (!result.isValid) {
                errors.push("".concat(this.getPositionName(position), ": ").concat(result.error));
            }
        }
        // 檢查左側是否同時有上下角度（0度表示無角度）
        if (angles.topLeft > 0 && angles.bottomLeft > 0) {
            errors.push('左側不能同時有上下斜切角度');
        }
        // 檢查右側是否同時有上下角度（0度表示無角度）
        if (angles.topRight > 0 && angles.bottomRight > 0) {
            errors.push('右側不能同時有上下斜切角度');
        }
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    };
    /**
     * 標準化角度值
     */
    AngleValidator.prototype.normalizeAngles = function (angles) {
        if (!angles) {
            return {
                topLeft: 0,
                topRight: 0,
                bottomLeft: 0,
                bottomRight: 0
            };
        }
        return {
            topLeft: this.normalizeAngle(angles.topLeft),
            topRight: this.normalizeAngle(angles.topRight),
            bottomLeft: this.normalizeAngle(angles.bottomLeft),
            bottomRight: this.normalizeAngle(angles.bottomRight)
        };
    };
    /**
     * 檢查角度組合是否適合生產
     */
    AngleValidator.prototype.isValidForProduction = function (angles) {
        // 檢查是否有太小的角度
        var positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
        for (var _i = 0, positions_2 = positions; _i < positions_2.length; _i++) {
            var position = positions_2[_i];
            var angle = angles[position];
            if (angle > 0 && angle < this.MIN_PRODUCTION_ANGLE) {
                return false;
            }
        }
        // 檢查是否有太多不同的角度（複雜度）
        var uniqueAngles = new Set([
            angles.topLeft,
            angles.topRight,
            angles.bottomLeft,
            angles.bottomRight
        ]);
        // 移除0度（無角度）
        uniqueAngles.delete(0);
        // 如果有超過2個不同的角度，可能太複雜
        if (uniqueAngles.size > 2) {
            return false;
        }
        return true;
    };
    /**
     * 生成有效的隨機角度組合
     */
    AngleValidator.prototype.generateValidAngles = function () {
        var angleOptions = [0, 30, 45, 60, 75]; // 0表示無角度
        var patterns = [
            // 無斜切
            { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
            // 單邊斜切
            { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 },
            { topLeft: 0, topRight: 45, bottomLeft: 0, bottomRight: 0 },
            { topLeft: 0, topRight: 0, bottomLeft: 45, bottomRight: 0 },
            { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 45 },
            // 頂部斜切
            { topLeft: 45, topRight: 45, bottomLeft: 0, bottomRight: 0 },
            // 底部斜切
            { topLeft: 0, topRight: 0, bottomLeft: 45, bottomRight: 45 },
            // 對角斜切
            { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
            { topLeft: 0, topRight: 45, bottomLeft: 45, bottomRight: 0 }
        ];
        var randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
        // 替換角度值
        var result = __assign({}, randomPattern);
        var positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
        for (var _i = 0, positions_3 = positions; _i < positions_3.length; _i++) {
            var position = positions_3[_i];
            if (result[position] > 0) {
                // 從非零角度中隨機選擇
                var nonZeroOptions = angleOptions.filter(function (a) { return a > 0; });
                var randomAngle = nonZeroOptions[Math.floor(Math.random() * nonZeroOptions.length)];
                result[position] = randomAngle;
            }
        }
        return result;
    };
    /**
     * 標準化單個角度
     */
    AngleValidator.prototype.normalizeAngle = function (angle) {
        if (angle < 0)
            return 0;
        if (angle >= this.NO_CUT_ANGLE)
            return this.MAX_ANGLE; // 90度或以上限制為89度
        return angle;
    };
    /**
     * 獲取位置的中文名稱
     */
    AngleValidator.prototype.getPositionName = function (position) {
        var names = {
            topLeft: '左上',
            topRight: '右上',
            bottomLeft: '左下',
            bottomRight: '右下'
        };
        return names[position] || position;
    };
    return AngleValidator;
}());
exports.AngleValidator = AngleValidator;
