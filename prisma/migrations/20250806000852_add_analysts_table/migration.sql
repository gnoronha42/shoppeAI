-- CreateTable
CREATE TABLE "analysts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),
    "analyses_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,

    CONSTRAINT "analysts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysts_email_key" ON "analysts"("email");

-- AddForeignKey
ALTER TABLE "analysts" ADD CONSTRAINT "analysts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
