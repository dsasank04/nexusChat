// ─────────────────────────────────────────────────────────────
//  VALIDATION PIPE
//
//  Applied globally in main.ts via app.useGlobalPipes()
//  Automatically validates every incoming request body
//  against its DTO class using class-validator decorators.
//
//  Security settings explained:
//
//  whitelist: true
//    Strips any fields not declared in the DTO
//    e.g. if DTO has { email, password } and request sends
//    { email, password, isAdmin: true } → isAdmin is stripped
//    Prevents clients injecting unexpected fields
//
//  forbidNonWhitelisted: true
//    Goes further than whitelist — throws 400 error if
//    unknown fields are sent instead of silently stripping
//    Makes clients aware they're sending wrong data
//
//  transform: true
//    Auto-converts plain objects to DTO class instances
//    Also converts primitive types: "5" → 5 for @IsNumber()
//    Enables @Type() decorators to work properly
//
//  stopAtFirstError: false
//    Returns ALL validation errors at once not just the first
//    Better UX — user sees all problems in one response
// ─────────────────────────────────────────────────────────────
import { ValidationPipe as NestValidationPipe } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

export const validationPipe = new NestValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,

    transformOptions:{
        enableImplicitConversion: true, // allows auto-conversion of primitive types (e.g. "5" → 5)
    },

    exceptionFactory: (erros) =>{
        const message = erros.map(error => {
            const constraints = Object.values(error.constraints || {});
            return `${error.property}: ${constraints.join(', ')}`;
        })

        return new BadRequestException({
            statusCode: 400,
            message,
            error: 'Validation Failed',
        })
    }

})