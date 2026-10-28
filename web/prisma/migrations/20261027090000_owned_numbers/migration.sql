-- CreateTable
CREATE TABLE "owned_numbers" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "assigned_user_id" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'plivo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owned_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owned_numbers_phone_number_key" ON "owned_numbers"("phone_number");

-- CreateIndex
CREATE INDEX "owned_numbers_assigned_user_id_idx" ON "owned_numbers"("assigned_user_id");

-- AddForeignKey
ALTER TABLE "owned_numbers" ADD CONSTRAINT "owned_numbers_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
