import { describe, test, expect, beforeEach } from '@jest/globals';
import { PartService } from '../../../services/PartService';

describe('PartService - ID生成測試', () => {
  let service: PartService;

  beforeEach(() => {
    service = new PartService();
  });

  test('應該生成簡單的遞增ID格式 P1, P2, P3...', () => {
    const part1 = service.addPart(2000, 1);
    const part2 = service.addPart(3000, 2);
    const part3 = service.addPart(1500, 1);

    expect(part1.id).toBe('P1');
    expect(part2.id).toBe('P2');
    expect(part3.id).toBe('P3');
  });

  test('清除所有零件後，ID計數應該重置', () => {
    // 添加一些零件
    service.addPart(2000, 1);
    service.addPart(3000, 2);
    
    // 清除所有零件
    service.clearAllParts();
    
    // 添加新零件
    const newPart = service.addPart(1500, 1);
    
    expect(newPart.id).toBe('P1');
  });

  test('ID應該持續遞增，不受刪除操作影響', () => {
    const part1 = service.addPart(2000, 1);
    const part2 = service.addPart(3000, 2);
    const part3 = service.addPart(1500, 1);
    
    // 刪除第二個零件
    service.removePart(part2.id);
    
    // 添加新零件
    const part4 = service.addPart(2500, 1);
    
    expect(part4.id).toBe('P4');
  });

  test('應該能夠處理大量零件ID生成', () => {
    const parts = [];
    for (let i = 0; i < 100; i++) {
      parts.push(service.addPart(1000 + i * 100, 1));
    }
    
    expect(parts[0].id).toBe('P1');
    expect(parts[49].id).toBe('P50');
    expect(parts[99].id).toBe('P100');
  });
});