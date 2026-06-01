import 'dotenv/config';

interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
  allowedOrigins: string[];
}

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
};

const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
};

const parseOrigins = (origins: string): string[] => {
  return origins
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
};

export const config: AppConfig = {
  port: getEnvNumber('PORT', 3001),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  databaseUrl: getEnv('DATABASE_URL', 'postgresql://user:password@localhost:5432/eduportal'),
  jwtSecret: getEnv('JWT_SECRET', 'dev-only-secret-change-in-production'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
  cloudinary: {
    cloudName: getEnv('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: getEnv('CLOUDINARY_API_KEY', ''),
    apiSecret: getEnv('CLOUDINARY_API_SECRET', ''),
  },
  allowedOrigins: parseOrigins(
    getEnv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001')
  ),
};
