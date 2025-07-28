/**
 * 零件管理系統
 * 根據需求：設定長度、數量、斜切角度，可有複數支零件
 */

import { Part, PartAngles, validatePartAngles } from '../types/core';

interface PartUpdateData {
  length?: number;
  quantity?: number;
  angles?: PartAngles;
  thickness?: number;
}

export class PartManager {
  private parts: Map<string, Part> = new Map();
  private currentId = 1;

  /**
   * 新增零件
   * @param length 零件長度
   * @param quantity 零件數量
   * @param angles 零件角度
   * @param thickness 零件厚度，預設10mm
   * @returns 新增的零件
   * @throws {Error} 當參數無效時
   */
  addPart(length: number, quantity: number, angles: PartAngles, thickness: number = 10): Part {
    this.validateLength(length);
    this.validateQuantity(quantity);
    this.validateThickness(thickness);
    
    // 驗證角度
    const angleValidation = validatePartAngles(angles);
    if (!angleValidation.isValid) {
      throw new Error(`角度設定無效: ${angleValidation.errors.join(', ')}`);
    }

    const part: Part = {
      id: `part-${this.currentId++}`,
      length,
      quantity,
      angles: { ...angles }, // 深拷貝角度對象
      thickness
    };

    this.parts.set(part.id, part);
    return { ...part, angles: { ...part.angles } }; // 返回副本
  }

  /**
   * 移除零件
   * @param id 零件ID
   * @returns 是否成功移除
   */
  removePart(id: string): boolean {
    return this.parts.delete(id);
  }

  /**
   * 根據ID獲取零件
   * @param id 零件ID
   * @returns 零件的副本或undefined
   */
  getPartById(id: string): Part | undefined {
    const part = this.parts.get(id);
    return part ? { ...part, angles: { ...part.angles } } : undefined;
  }

  /**
   * 更新零件
   * @param id 零件ID
   * @param updateData 更新資料
   * @returns 是否成功更新
   * @throws {Error} 當更新資料無效時
   */
  updatePart(id: string, updateData: PartUpdateData): boolean {
    const part = this.parts.get(id);
    if (!part) {
      return false;
    }

    // 驗證更新資料
    if (updateData.length !== undefined) {
      this.validateLength(updateData.length);
    }
    if (updateData.quantity !== undefined) {
      this.validateQuantity(updateData.quantity);
    }
    if (updateData.thickness !== undefined) {
      this.validateThickness(updateData.thickness);
    }
    if (updateData.angles) {
      const angleValidation = validatePartAngles(updateData.angles);
      if (!angleValidation.isValid) {
        throw new Error(`角度設定無效: ${angleValidation.errors.join(', ')}`);
      }
    }

    // 更新零件
    if (updateData.length !== undefined) {
      part.length = updateData.length;
    }
    if (updateData.quantity !== undefined) {
      part.quantity = updateData.quantity;
    }
    if (updateData.angles) {
      part.angles = { ...updateData.angles };
    }
    if (updateData.thickness !== undefined) {
      part.thickness = updateData.thickness;
    }

    return true;
  }

  /**
   * 獲取所有零件
   * @returns 零件列表的副本
   */
  getAllParts(): Part[] {
    return Array.from(this.parts.values()).map(part => ({
      ...part,
      angles: { ...part.angles }
    }));
  }

  /**
   * 清空所有零件
   */
  clearAll(): void {
    this.parts.clear();
  }

  /**
   * 獲取零件類型數量
   * @returns 零件類型數量
   */
  getCount(): number {
    return this.parts.size;
  }

  /**
   * 獲取零件實例總數（考慮每個零件的數量）
   * @returns 零件實例總數
   */
  getTotalPartInstances(): number {
    let total = 0;
    for (const part of this.parts.values()) {
      total += part.quantity;
    }
    return total;
  }

  /**
   * 獲取有斜切角度的零件列表
   * @returns 有斜切角度的零件列表
   */
  getPartsWithBevelAngles(): Part[] {
    return this.getAllParts().filter(part => {
      const { angles } = part;
      return angles.topLeft > 0 || angles.topRight > 0 || 
             angles.bottomLeft > 0 || angles.bottomRight > 0;
    });
  }

  /**
   * 獲取沒有斜切角度的零件列表
   * @returns 沒有斜切角度的零件列表
   */
  getPartsWithoutBevelAngles(): Part[] {
    return this.getAllParts().filter(part => {
      const { angles } = part;
      return angles.topLeft === 0 && angles.topRight === 0 && 
             angles.bottomLeft === 0 && angles.bottomRight === 0;
    });
  }

  /**
   * 根據長度範圍獲取零件列表
   * @param minLength 最小長度
   * @param maxLength 最大長度
   * @returns 符合長度範圍的零件列表
   */
  getPartsByLengthRange(minLength: number, maxLength: number): Part[] {
    return this.getAllParts().filter(part => 
      part.length >= minLength && part.length <= maxLength
    );
  }

  /**
   * 根據厚度獲取零件列表
   * @param thickness 厚度
   * @returns 符合厚度的零件列表
   */
  getPartsByThickness(thickness: number): Part[] {
    return this.getAllParts().filter(part => part.thickness === thickness);
  }

  /**
   * 獲取零件總長度（考慮數量）
   * @returns 零件總長度
   */
  getTotalLength(): number {
    let total = 0;
    for (const part of this.parts.values()) {
      total += part.length * part.quantity;
    }
    return total;
  }

  /**
   * 獲取最長的零件
   * @returns 最長的零件或undefined
   */
  getLongestPart(): Part | undefined {
    if (this.parts.size === 0) {
      return undefined;
    }

    let longestPart: Part | undefined;
    let maxLength = 0;

    for (const part of this.parts.values()) {
      if (part.length > maxLength) {
        maxLength = part.length;
        longestPart = part;
      }
    }

    return longestPart ? { ...longestPart, angles: { ...longestPart.angles } } : undefined;
  }

  /**
   * 獲取最短的零件
   * @returns 最短的零件或undefined
   */
  getShortestPart(): Part | undefined {
    if (this.parts.size === 0) {
      return undefined;
    }

    let shortestPart: Part | undefined;
    let minLength = Infinity;

    for (const part of this.parts.values()) {
      if (part.length < minLength) {
        minLength = part.length;
        shortestPart = part;
      }
    }

    return shortestPart ? { ...shortestPart, angles: { ...shortestPart.angles } } : undefined;
  }

  /**
   * 驗證長度的有效性
   * @param length 長度
   * @throws {Error} 當長度無效時
   */
  private validateLength(length: number): void {
    if (!Number.isFinite(length)) {
      throw new Error('零件長度必須為有效數字');
    }

    if (length <= 0) {
      throw new Error('零件長度必須大於0');
    }
  }

  /**
   * 驗證數量的有效性
   * @param quantity 數量
   * @throws {Error} 當數量無效時
   */
  private validateQuantity(quantity: number): void {
    if (!Number.isFinite(quantity)) {
      throw new Error('零件數量必須為有效數字');
    }

    if (quantity <= 0) {
      throw new Error('零件數量必須大於0');
    }

    if (!Number.isInteger(quantity)) {
      throw new Error('零件數量必須為整數');
    }
  }

  /**
   * 驗證厚度的有效性
   * @param thickness 厚度
   * @throws {Error} 當厚度無效時
   */
  private validateThickness(thickness: number): void {
    if (!Number.isFinite(thickness)) {
      throw new Error('零件厚度必須為有效數字');
    }

    if (thickness <= 0) {
      throw new Error('零件厚度必須大於0');
    }
  }

  /**
   * 根據角度位置獲取有該角度的零件列表
   * @param position 角度位置
   * @returns 有該角度位置斜切角度的零件列表
   */
  getPartsByAnglePosition(position: keyof PartAngles): Part[] {
    return this.getAllParts().filter(part => part.angles[position] > 0);
  }

  /**
   * 獲取統計資訊
   * @returns 統計資訊
   */
  getStatistics() {
    const parts = this.getAllParts();
    const totalInstances = this.getTotalPartInstances();
    const totalLength = this.getTotalLength();
    const bevelParts = this.getPartsWithBevelAngles();
    
    return {
      totalPartTypes: parts.length,
      totalInstances,
      totalLength,
      averageLength: totalInstances > 0 ? totalLength / totalInstances : 0,
      partsWithBevelAngles: bevelParts.length,
      partsWithoutBevelAngles: parts.length - bevelParts.length,
      longestPart: this.getLongestPart(),
      shortestPart: this.getShortestPart()
    };
  }
}