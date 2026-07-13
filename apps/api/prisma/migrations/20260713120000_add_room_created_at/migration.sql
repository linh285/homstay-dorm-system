-- Add creation timestamp to rooms (used only for ordering, not shown in the UI).
ALTER TABLE "phong" ADD COLUMN "ngay_them" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
