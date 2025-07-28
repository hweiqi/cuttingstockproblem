/**
 * 母材管理系統
 * 根據需求：僅需設定長度，可有複數種長度但不可重複，無數量限制
 */

import { Material } from '../types/core';

export class MaterialManager {
  private materials: Map<string, Material> = new Map();
  private lengthToIdMap: Map<number, string> = new Map();
  private currentId = 1;

  /**
   * 新增母材
   * @param length 母材長度
   * @returns 新增的母材
   * @throws {Error} 當長度無效或重複時
   */
  addMaterial(length: number): Material {
    this.validateLength(length);
    
    if (this.hasMaterialWithLength(length)) {
      throw new Error('母材長度不可重複');
    }

    const material: Material = {
      id: `material-${this.currentId++}`,
      length
    };

    this.materials.set(material.id, material);
    this.lengthToIdMap.set(length, material.id);

    return material;
  }

  /**
   * 移除母材
   * @param id 母材ID
   * @returns 是否成功移除
   */
  removeMaterial(id: string): boolean {
    const material = this.materials.get(id);
    if (!material) {
      return false;
    }

    this.materials.delete(id);
    this.lengthToIdMap.delete(material.length);
    return true;
  }

  /**
   * 根據ID獲取母材
   * @param id 母材ID
   * @returns 母材或undefined
   */
  getMaterialById(id: string): Material | undefined {
    return this.materials.get(id);
  }

  /**
   * 檢查是否存在指定長度的母材
   * @param length 長度
   * @returns 是否存在
   */
  hasMaterialWithLength(length: number): boolean {
    return this.lengthToIdMap.has(length);
  }

  /**
   * 獲取所有母材
   * @returns 母材列表的副本
   */
  getAllMaterials(): Material[] {
    return Array.from(this.materials.values()).map(material => ({ ...material }));
  }

  /**
   * 清空所有母材
   */
  clearAll(): void {
    this.materials.clear();
    this.lengthToIdMap.clear();
  }

  /**
   * 獲取母材數量
   * @returns 母材數量
   */
  getCount(): number {
    return this.materials.size;
  }

  /**
   * 更新母材長度
   * @param id 母材ID
   * @param newLength 新長度
   * @returns 是否成功更新
   * @throws {Error} 當新長度無效或重複時
   */
  updateMaterial(id: string, newLength: number): boolean {
    const material = this.materials.get(id);
    if (!material) {
      return false;
    }

    this.validateLength(newLength);

    // 如果新長度與現有長度相同，則不需要更新
    if (material.length === newLength) {
      return true;
    }

    // 檢查新長度是否已存在（排除當前母材）
    if (this.hasMaterialWithLength(newLength)) {
      throw new Error('母材長度不可重複');
    }

    // 更新映射
    this.lengthToIdMap.delete(material.length);
    this.lengthToIdMap.set(newLength, id);

    // 更新母材
    material.length = newLength;

    return true;
  }

  /**
   * 根據長度獲取母材
   * @param length 長度
   * @returns 母材或undefined
   */
  getMaterialByLength(length: number): Material | undefined {
    const id = this.lengthToIdMap.get(length);
    return id ? this.materials.get(id) : undefined;
  }

  /**
   * 獲取所有母材長度列表（排序後）
   * @returns 長度列表
   */
  getAllLengths(): number[] {
    return Array.from(this.lengthToIdMap.keys()).sort((a, b) => b - a); // 降序排列
  }

  /**
   * 驗證長度的有效性
   * @param length 長度
   * @throws {Error} 當長度無效時
   */
  private validateLength(length: number): void {
    if (!Number.isFinite(length)) {
      throw new Error('母材長度必須為有效數字');
    }

    if (length <= 0) {
      throw new Error('母材長度必須大於0');
    }
  }

  /**
   * 獲取最長的母材
   * @returns 最長的母材或undefined
   */
  getLongestMaterial(): Material | undefined {
    if (this.materials.size === 0) {
      return undefined;
    }

    let longestMaterial: Material | undefined;
    let maxLength = 0;

    for (const material of this.materials.values()) {
      if (material.length > maxLength) {
        maxLength = material.length;
        longestMaterial = material;
      }
    }

    return longestMaterial;
  }

  /**
   * 獲取最短的母材
   * @returns 最短的母材或undefined
   */
  getShortestMaterial(): Material | undefined {
    if (this.materials.size === 0) {
      return undefined;
    }

    let shortestMaterial: Material | undefined;
    let minLength = Infinity;

    for (const material of this.materials.values()) {
      if (material.length < minLength) {
        minLength = material.length;
        shortestMaterial = material;
      }
    }

    return shortestMaterial;
  }

  /**
   * 獲取適合指定長度的母材列表
   * @param requiredLength 所需長度
   * @returns 適合的母材列表（按長度排序）
   */
  getSuitableMaterials(requiredLength: number): Material[] {
    return this.getAllMaterials()
      .filter(material => material.length >= requiredLength)
      .sort((a, b) => a.length - b.length); // 升序排列，優先使用較短的母材
  }
}