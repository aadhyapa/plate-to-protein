import { describe, expect, it } from 'vitest';
import { STAGES, nextStage, stageForPath } from './stages';

describe('stages', () => {
  it('runs Plate → Gut → Cell → Structure → Wrap-up', () => {
    expect(STAGES.map((stage) => stage.id)).toEqual(['plate', 'gut', 'cell', 'structure', 'wrap-up']);
  });

  it('finds the stage for a path', () => {
    expect(stageForPath('/gut')?.id).toBe('gut');
    expect(stageForPath('/structure/4HHB')?.id).toBe('structure');
    expect(stageForPath('/')).toBeUndefined();
    expect(stageForPath('/plateau')).toBeUndefined();
  });

  it('knows what comes next', () => {
    expect(nextStage('plate')?.id).toBe('gut');
    expect(nextStage('structure')?.id).toBe('wrap-up');
    expect(nextStage('wrap-up')).toBeUndefined();
  });
});
