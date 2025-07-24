"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBevelAngle = isBevelAngle;
exports.getBevelAngles = getBevelAngles;
/**
 * 判斷角度是否為斜切角度
 */
function isBevelAngle(angle) {
    return angle > 0 && angle < 90;
}
/**
 * 獲取零件的所有斜切角度
 */
function getBevelAngles(part) {
    const angles = [];
    if (isBevelAngle(part.angles.topLeft))
        angles.push(part.angles.topLeft);
    if (isBevelAngle(part.angles.topRight))
        angles.push(part.angles.topRight);
    if (isBevelAngle(part.angles.bottomLeft))
        angles.push(part.angles.bottomLeft);
    if (isBevelAngle(part.angles.bottomRight))
        angles.push(part.angles.bottomRight);
    return angles;
}
