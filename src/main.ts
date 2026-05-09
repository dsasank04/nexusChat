import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder} from '@nestjs/swagger';
import { ConfigService} from '@nestjs/config';
import * as helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter} from './common/filters/http-exception.filter';
import { LoggingInterceptor} from './common/interceptors/logging.interceptor';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug'], // Suppress default NestJS logs — our LoggingInterceptor handles it
    bufferLogs: true, // Buffer logs until the app is ready or untill we attach out custome logger
  });
  // ─────────────────────────────────────────────────────────────
  //  CONFIG SERVICE
  //  Used to read validated env variables
  // ─────────────────────────────────────────────────────────────
  const configService = app.get(ConfigService);

  const PORT = configService.get<number>('PORT') ?? 3001;
  const CLIENT_URL = configService.get<string>('CLIENT_URL');
  const NODE_ENV = configService.get<string>('NODE_ENV') ?? 'development';
  const isProd = NODE_ENV === 'production';

  // ─────────────────────────────────────────────────────────────
  //  SECURITY — HELMET
  //  Sets 14 HTTP security headers automatically
  //  Must be applied BEFORE CORS and routes
  // ─────────────────────────────────────────────────────────────
  app.use(
    helmet.default({
      // Content-Security-Policy — prevent XSS attacks
      contentSecurityPolicy: isProd ? {
        directives: {
          defultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'","'unsafe-inline'"],
          imgSrc: ["'self'","data:",'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      }: false,

      hsts : isProd ? {maxAge: 31536000, includeSubDomains: true, preload: true} : false, // Enforce HTTPS in production
      noSniff: true, // Prevent MIME type sniffing
      frameguard: { action: 'deny' }, // Prevent clickjacking
      hidePoweredBy: true, // Hide X-Powered-By header : Express Headers
      xssFilter: true, // Enable X-XSS-Protection header or XSS protection (legacy browsers)
      ieNoOpen: true, // Prevent IE from opening downloads in site context
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Don't send referrer to other domains
      crossOriginEmbedderPolicy: false //false — allows Swagger CDN assets
    })
  )
   // ─────────────────────────────────────────────────────────────
  //  CORS
  //  Only allow requests from your frontend URL
  //  In dev: also allow localhost:5173
  // ─────────────────────────────────────────────────────────────

  const allowedOrigins = isProd ? [CLIENT_URL] : [CLIENT_URL,'http://localhost:5173'];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) =>{
      if(!origin) return callback(null,true);
      if(allowedOrigins.includes(origin)){
        callback(null,true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials :true,
    methods:['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
    allowedHeaders:['Content-Type','Authorization']
    
  })
  // ─────────────────────────────────────────────────────────────
  //  GLOBAL PREFIX
  //  All routes prefixed with /api
  //  e.g. /api/auth/login, /api/chat/stream
  // ─────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api', {
    // Exclude /api/docs so Swagger works at root /api/docs not /api/api/docs
    exclude: ['health'],
  });
 
  // ─────────────────────────────────────────────────────────────
  //  GLOBAL VALIDATION PIPE
  //  Automatically validates every incoming request body
  //  against its DTO class using class-validator decorators
  // ─────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      // Strip any fields not declared in the DTO
      // Prevents clients sending extra unwanted fields
      whitelist: true,
 
      // Throw 400 if unknown fields are sent (instead of silently stripping)
      forbidNonWhitelisted: true,
 
      // Auto-convert plain JS objects to DTO class instances
      // e.g. "5" → 5 for @IsNumber() fields
      transform: true,
 
      transformOptions: {
        // Allow class-transformer to run implicitly
        enableImplicitConversion: true,
      },
 
      // Show ALL validation errors at once, not just the first one
      // e.g. if email AND password are both wrong, return both errors
      stopAtFirstError: false,
    }),
  );
 
  // ─────────────────────────────────────────────────────────────
  //  GLOBAL EXCEPTION FILTER
  //  Catches all unhandled exceptions and formats them consistently
  //  Never exposes stack traces or internal details in production
  // ─────────────────────────────────────────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalFilters(new HttpExceptionFilter(reflector));
 
  // ─────────────────────────────────────────────────────────────
  //  GLOBAL INTERCEPTOR
  //  Logs every request: method + url + userId + duration
  //  Skips logging request body of sensitive endpoints
  // ─────────────────────────────────────────────────────────────
  app.useGlobalInterceptors(new LoggingInterceptor());
 
  // ─────────────────────────────────────────────────────────────
  //  BODY SIZE LIMIT
  //  Prevents huge payload attacks
  //  10kb is plenty for a chat message
  // ─────────────────────────────────────────────────────────────
  app.use(require('express').json({ limit: '10kb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '10kb' }));
 
  // ─────────────────────────────────────────────────────────────
  //  SWAGGER — AUTO API DOCUMENTATION
  //  Visit: http://localhost:3001/api/docs
  //  Every controller and DTO self-documents using decorators
  //  Only enabled in development — disable in production optionally
  // ─────────────────────────────────────────────────────────────
  if (!isProd || configService.get('ENABLE_SWAGGER') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NexusChat API')
      .setDescription(
        `
## Universal AI Chat Client API
 
One platform to chat with **GPT-4o, Claude, Gemini, DeepSeek** and more.
Switch models mid-conversation with full context preserved.
 
### Key Features
- 🔐 JWT Authentication + Google/GitHub OAuth
- 🤖 Multiple AI provider support
- ⚡ Real-time streaming via Server-Sent Events (SSE)
- 🔄 Mid-conversation model switching
- 📊 Usage tracking and dashboard
 
### Authentication
All protected endpoints require a **Bearer token** in the Authorization header.
Get your token from \`POST /api/auth/login\` or \`POST /api/auth/register\`.
 
\`\`\`
Authorization: Bearer your_jwt_token_here
\`\`\`
        `.trim(),
      )
      .setVersion('1.0')
      .setContact('NexusChat', 'https://nexuschat.dev', 'support@nexuschat.dev')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
 
      // Adds a padlock icon to protected endpoints in Swagger UI
      // After clicking "Authorize" and pasting your JWT,
      // all protected requests automatically include the Bearer token
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Paste your JWT token here (without "Bearer " prefix)',
          in: 'header',
        },
        'JWT',  // this name is referenced in @ApiBearerAuth('JWT') on controllers
      )
 
      // Tag descriptions shown in Swagger sidebar
      .addTag('Auth',          'Register, login, OAuth, logout')
      .addTag('Users',         'User profile management')
      .addTag('Models',        'AI model selection and API key management')
      .addTag('Conversations', 'Chat conversation management')
      .addTag('Messages',      'Message history retrieval')
      .addTag('Chat',          'AI streaming and model switching')
      .addTag('Dashboard',     'Usage statistics and analytics')
 
      .build();
 
    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      // Include all DTOs even if not directly referenced in controllers
      deepScanRoutes: true,
 
      // Extra models to include in schema (response types)
      extraModels: [],
    });
 
    SwaggerModule.setup('api/docs', app, document, {
      // Swagger UI customization
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        defaultModelsExpandDepth: 2,
        tryItOutEnabled: true,
        showResponseHeaders: true,
        operationsSorter: 'alpha',
        filter: true, // Enable search/filter bar
      },

      customSiteTitle: 'NexusChat API Docs',

      // Custom CSS for a Postman-inspired modern look
      customCss: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body, .swagger-ui {
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          background: #181a20;
        }
        .swagger-ui .topbar {
          background: #1e2235;
          border-bottom: 2px solid #ff6c37;
          min-height: 60px;
        }
        .swagger-ui .topbar .topbar-wrapper {
          display: flex;
          align-items: center;
        }
        .swagger-ui .topbar .topbar-wrapper img {
          content: url('https://raw.githubusercontent.com/postmanlabs/postman-app-support/develop/app/resources/images/logo.png');
          width: 40px;
          height: 40px;
          margin-right: 16px;
        }
        .swagger-ui .topbar .topbar-wrapper::before {
          content: 'NexusChat API';
          color: #ff6c37;
          font-size: 24px;
          font-weight: 700;
          margin-right: 24px;
        }
        .swagger-ui .info .title {
          color: #ff6c37;
          font-size: 2.2em;
          font-weight: 700;
        }
        .swagger-ui .info .base-url {
          color: #7c6af7;
        }
        .swagger-ui .scheme-container {
          background: #23263a;
          border-radius: 8px;
        }
        .swagger-ui .opblock {
          border-radius: 10px;
          border: 1.5px solid #23263a;
          margin-bottom: 18px;
          box-shadow: 0 2px 8px 0 #0002;
        }
        .swagger-ui .opblock .opblock-summary {
          background: #23263a;
          border-radius: 10px 10px 0 0;
        }
        .swagger-ui .opblock .opblock-summary-method {
          border-radius: 6px;
          font-weight: 700;
        }
        .swagger-ui .opblock .opblock-summary-path {
          color: #ff6c37;
          font-weight: 600;
        }
        .swagger-ui .btn {
          background: linear-gradient(90deg, #ff6c37 0%, #ffb86c 100%);
          color: #fff !important;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          box-shadow: 0 2px 8px 0 #ff6c3722;
          transition: background 0.2s;
        }
        .swagger-ui .btn:hover {
          background: linear-gradient(90deg, #ffb86c 0%, #ff6c37 100%);
        }
        .swagger-ui .scheme-container .schemes {
          color: #ff6c37;
        }
        .swagger-ui .opblock-tag {
          background: #23263a;
          color: #ffb86c;
          border-radius: 6px;
          font-size: 1.1em;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .swagger-ui .opblock-tag small {
          color: #7c6af7;
        }
        .swagger-ui .opblock-description-wrapper, .swagger-ui .markdown {
          color: #e0e0e0;
        }
        .swagger-ui .parameters-col_description, .swagger-ui .response-col_description {
          color: #bdbdbd;
        }
        .swagger-ui .responses-inner {
          background: #23263a;
          border-radius: 8px;
        }
        .swagger-ui .tab li {
          color: #ff6c37;
        }
        .swagger-ui .tab li.active {
          background: #ff6c37;
          color: #fff;
        }
        .swagger-ui .sidebar {
          background: #181a20;
          border-right: 2px solid #23263a;
        }
        .swagger-ui .sidebar .sidebar-section {
          color: #ffb86c;
        }
        .swagger-ui .sidebar .sidebar-section .sidebar-section-title {
          color: #ff6c37;
          font-weight: 700;
        }
        .swagger-ui .markdown code, .swagger-ui pre {
          background: #23263a;
          color: #ffb86c;
          border-radius: 4px;
        }
        .swagger-ui .responses-table td, .swagger-ui .responses-table th {
          background: #23263a;
        }
        .swagger-ui .responses-table th {
          color: #ff6c37;
        }
        .swagger-ui .responses-table td {
          color: #e0e0e0;
        }
        .swagger-ui .parameter__name, .swagger-ui .parameter__type {
          color: #ffb86c;
        }
        .swagger-ui .parameter__in {
          color: #7c6af7;
        }
        .swagger-ui .response-col_status {
          color: #ff6c37;
          font-weight: 700;
        }
        .swagger-ui .info .description {
          color: #e0e0e0;
        }
      `,
    });
 
    console.log(`📚  Swagger docs: http://localhost:${PORT}/api/docs`);
  }
 
  // ─────────────────────────────────────────────────────────────
  //  HEALTH CHECK ENDPOINT
  //  Simple route to verify the server is running
  //  Used by Docker, Render, and load balancers
  // ─────────────────────────────────────────────────────────────
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
    });
  });
 
  // ─────────────────────────────────────────────────────────────
  //  START SERVER
  // ─────────────────────────────────────────────────────────────
  await app.listen(PORT, '0.0.0.0');  // 0.0.0.0 required for Docker
 
  console.log(`\n🚀  NexusChat API is running`);
  console.log(`🌍  Environment  : ${NODE_ENV}`);
  console.log(`🔗  API Base URL : http://localhost:${PORT}/api`);
  console.log(`❤️   Health check : http://localhost:${PORT}/health`);
  if (!isProd) {
    console.log(`📚  Swagger docs : http://localhost:${PORT}/api/docs\n`);
  }
 
  // ─────────────────────────────────────────────────────────────
  //  GRACEFUL SHUTDOWN
  //  When Render/Docker sends SIGTERM (deploy/restart signal),
  //  finish in-flight requests before shutting down
  //  NestJS handles this automatically when enableShutdownHooks is called
  // ─────────────────────────────────────────────────────────────
  app.enableShutdownHooks();
 
  // Handle unhandled promise rejections — log and exit cleanly
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('❌  Unhandled Promise Rejection:', reason);
    // Don't exit — NestJS will handle cleanup via shutdown hooks
  });
 
  // Handle uncaught synchronous exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('❌  Uncaught Exception:', error.message);
    process.exit(1);  // must exit — process state is unknown after this
  });
}
 
// ─────────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────────
bootstrap().catch((error: Error) => {
  console.error('❌  Failed to start NexusChat API:', error.message);
  process.exit(1);
});
 