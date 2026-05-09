import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configValidationSchema } from './config.schema';
import { ConfigService } from './config.service';
import e from 'express';

// ─────────────────────────────────────────────────────────────
//  CONFIG MODULE
//
//  isGlobal: true means you can inject ConfigService
//  into ANY module without importing ConfigModule again.
//
//  Import this ONCE in app.module.ts — that's it.
// ─────────────────────────────────────────────────────────────

@Module({
    imports:[
        NestConfigModule.forRoot({
            //Load .env from project
            envFilePath: '.env',

            // isGloabal: true - ConfigService available everywhere without importing ConfigModule again
            isGlobal: true,

            //Joi schema validates all env vars on startup. If anything is missing or wrong format → app refuses to start.
            validationSchema: configValidationSchema,

            validationOptions: {
                // Show all missing/invalid vars at once
                abortEarly: false,

                //Dont throw on extra vars like system PATH,HOME, etc
                allowUnkown:true,
            },

            //Dont expand varaiblaes like ${OTHER_VAR} in values
            //Keep values predictable 
            expandVariables: false,
        })
    ],
    providers:[ConfigService],
    exports:[ConfigService],
})

export class ConfigModule {}