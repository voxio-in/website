-- CreateTable
CREATE TABLE "Workspace" (
    "userId" TEXT NOT NULL,
    "account" JSONB NOT NULL,
    "overlays" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DashFlow" (
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "doc" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashFlow_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "DashSession" (
    "id" TEXT NOT NULL,
    "flowKey" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "doc" JSONB NOT NULL,

    CONSTRAINT "DashSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashFlow_userId_idx" ON "DashFlow"("userId");

-- CreateIndex
CREATE INDEX "DashSession_flowKey_startTime_idx" ON "DashSession"("flowKey", "startTime");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashFlow" ADD CONSTRAINT "DashFlow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashSession" ADD CONSTRAINT "DashSession_flowKey_fkey" FOREIGN KEY ("flowKey") REFERENCES "DashFlow"("key") ON DELETE CASCADE ON UPDATE CASCADE;

