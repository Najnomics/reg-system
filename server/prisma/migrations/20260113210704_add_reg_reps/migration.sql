-- CreateTable
CREATE TABLE "reg_reps" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "reg_reps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reg_reps_email_key" ON "reg_reps"("email");

-- CreateIndex
CREATE INDEX "reg_reps_email_idx" ON "reg_reps"("email");

-- CreateIndex
CREATE INDEX "reg_reps_created_by_idx" ON "reg_reps"("created_by");
