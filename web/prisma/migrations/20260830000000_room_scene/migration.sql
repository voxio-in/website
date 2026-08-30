-- Scene beats for the avatar roleplays: face changes, physical actions and the
-- running score, appended as the voice server posts each turn back.
-- Additive and nullable, so existing rows and any older deploy still reading
-- this table are unaffected.
ALTER TABLE "RoomSession" ADD COLUMN "scene" JSONB;
