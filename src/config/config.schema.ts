import * as Joi from 'joi';

// ─────────────────────────────────────────────────────────────
//  CONFIG SCHEMA
//
//  Joi validates every environment variable when the app boots.
//  If anything is missing or wrong format → app refuses to start.
// ─────────────────────────────────────────────────────────────

export const configValidationSchema = Joi.object({
  // ─────────────────────────────────────────────────────────
  //  SERVER  ✅ active now
  // ─────────────────────────────────────────────────────────

    PORT: Joi.number().integer().min(1024).max(65536).default(3001),
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    ENABLE_SWAGGER: Joi.string().valid('true','false').default('true'),

  // ─────────────────────────────────────────────────────────
  //  JWT  ✅ active now
  // ─────────────────────────────────────────────────────────

    JWT_SECRET: Joi.string().min(32).required().messages({
        'string.min':  'JWT_SECRET must be at least 32 characters long',
        'any.required': 'JWT_SECRET is required',
    }),

     // ─────────────────────────────────────────────────────────
  //  ENCRYPTION KEYS  ✅ active now
  //
  //  Both must be EXACTLY 32 characters — AES-256 requirement
  //  Must be different from each other
  // ─────────────────────────────────────────────────────────
 
  ENCRYPTION_KEY: Joi.string()
    .length(32)
    .required()
    .messages({
      'string.length': 'ENCRYPTION_KEY must be exactly 32 characters (generate with: node -e "console.log(require(\'crypto\').randomBytes(16).toString(\'hex\'))")',
      'any.required':  'ENCRYPTION_KEY is required',
    }),
 
  MESSAGE_KEY: Joi.string()
    .length(32)
    .required()
    .messages({
      'string.length': 'MESSAGE_KEY must be exactly 32 characters (generate with: node -e "console.log(require(\'crypto\').randomBytes(16).toString(\'hex\'))")',
      'any.required':  'MESSAGE_KEY is required',
    }),

    // ─────────────────────────────────────────────────────────
  //  CLIENT URL  ✅ active now
  // ─────────────────────────────────────────────────────────
 
  CLIENT_URL: Joi.string()
    .uri()
    .default('http://localhost:5173')
    .messages({
      'string.uri': 'CLIENT_URL must be a valid URL (e.g. http://localhost:5173)',
    }),
 
 

})