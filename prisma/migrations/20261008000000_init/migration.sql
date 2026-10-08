-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('email', 'google', 'github');

-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('user', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "ai_provider" AS ENUM ('openai', 'anthropic', 'gemini', 'deepseek');

-- CreateEnum
CREATE TYPE "switch_reason" AS ENUM ('manual', 'token_limit', 'error', 'cost');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "provider" "auth_provider" NOT NULL DEFAULT 'email',
    "provider_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "active_provider" "ai_provider",
    "active_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "model_used" TEXT,
    "provider" "ai_provider",
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "ai_provider" NOT NULL,
    "encrypted_key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_models" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "ai_provider" NOT NULL,
    "model_name" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_switch_log" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "from_provider" "ai_provider" NOT NULL,
    "to_provider" "ai_provider" NOT NULL,
    "from_model" TEXT NOT NULL,
    "to_model" TEXT NOT NULL,
    "reason" "switch_reason" NOT NULL DEFAULT 'manual',
    "switched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_switch_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_tracking" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "ai_provider" NOT NULL,
    "model_name" TEXT NOT NULL,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "messages_cnt" INTEGER NOT NULL DEFAULT 0,
    "tracked_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "ai_provider" NOT NULL,
    "model_name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "rated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_provider_id_key" ON "users"("provider", "provider_id");

-- CreateIndex
CREATE INDEX "conversations_user_id_updated_at_idx" ON "conversations"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_user_id_provider_key" ON "user_credentials"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "user_models_user_id_provider_model_name_key" ON "user_models"("user_id", "provider", "model_name");

-- CreateIndex
CREATE INDEX "model_switch_log_conversation_id_switched_at_idx" ON "model_switch_log"("conversation_id", "switched_at" DESC);

-- CreateIndex
CREATE INDEX "model_switch_log_user_id_switched_at_idx" ON "model_switch_log"("user_id", "switched_at" DESC);

-- CreateIndex
CREATE INDEX "usage_tracking_user_id_tracked_date_idx" ON "usage_tracking"("user_id", "tracked_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "usage_tracking_user_id_provider_model_name_tracked_date_key" ON "usage_tracking"("user_id", "provider", "model_name", "tracked_date");

-- CreateIndex
CREATE INDEX "model_ratings_user_id_provider_idx" ON "model_ratings"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_models" ADD CONSTRAINT "user_models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_switch_log" ADD CONSTRAINT "model_switch_log_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_switch_log" ADD CONSTRAINT "model_switch_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_ratings" ADD CONSTRAINT "model_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ratings must be 1–5 (Prisma can't express CHECK constraints in the schema)
ALTER TABLE "model_ratings" ADD CONSTRAINT "model_ratings_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
