-- Stores the tenant-wide default for front-of-pack nutritional labeling.
-- Per-table overrides remain inside GeneratedTable.uiState.
ALTER TABLE "Organization" ADD COLUMN "lupaStyleConfig" JSONB;
