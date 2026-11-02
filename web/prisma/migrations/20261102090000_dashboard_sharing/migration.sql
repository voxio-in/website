-- Shared dashboards: access level, public slug and brand; viewer logins (user id + password) and their sessions.
ALTER TABLE "dashboards" ADD COLUMN "access" TEXT NOT NULL DEFAULT 'private';
ALTER TABLE "dashboards" ADD COLUMN "slug" TEXT;
ALTER TABLE "dashboards" ADD COLUMN "signup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dashboards" ADD COLUMN "brand" JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX "dashboards_slug_key" ON "dashboards"("slug");

CREATE TABLE "dashboard_viewers" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dashboard_viewers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dashboard_viewers_dashboard_id_username_key" ON "dashboard_viewers"("dashboard_id", "username");
ALTER TABLE "dashboard_viewers" ADD CONSTRAINT "dashboard_viewers_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dashboard_viewer_sessions" (
    "token_hash" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dashboard_viewer_sessions_pkey" PRIMARY KEY ("token_hash")
);
CREATE INDEX "dashboard_viewer_sessions_viewer_id_idx" ON "dashboard_viewer_sessions"("viewer_id");
ALTER TABLE "dashboard_viewer_sessions" ADD CONSTRAINT "dashboard_viewer_sessions_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "dashboard_viewers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
