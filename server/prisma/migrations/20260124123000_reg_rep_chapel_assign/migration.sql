-- Add permission flag for reg-reps to manage chapel assignments
ALTER TABLE "reg_reps"
ADD COLUMN "canAssignChapels" BOOLEAN NOT NULL DEFAULT false;
