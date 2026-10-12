import { getEnvironmentFilePaths } from './environment-files';

describe('getEnvironmentFilePaths', () => {
  it('prioritizes the environment-specific local file', () => {
    expect(getEnvironmentFilePaths('staging').slice(0, 4)).toEqual([
      '.env.staging.local',
      '.env.staging',
      '.env.local',
      '.env',
    ]);
  });

  it('falls back to development for an unknown environment', () => {
    expect(getEnvironmentFilePaths('invalid')[0]).toBe('.env.development.local');
  });
});
