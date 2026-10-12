const SUPPORTED_ENVIRONMENTS = ['development', 'staging', 'production', 'test'] as const;

type SupportedEnvironment = (typeof SUPPORTED_ENVIRONMENTS)[number];

function normalizeEnvironment(value: string | undefined): SupportedEnvironment {
  if (SUPPORTED_ENVIRONMENTS.includes(value as SupportedEnvironment)) {
    return value as SupportedEnvironment;
  }
  return 'development';
}

export function getEnvironmentFilePaths(environment = process.env.NODE_ENV): string[] {
  const name = normalizeEnvironment(environment);

  return [
    `.env.${name}.local`,
    `.env.${name}`,
    '.env.local',
    '.env',
    `../../.env.${name}.local`,
    `../../.env.${name}`,
    '../../.env.local',
    '../../.env',
  ];
}
