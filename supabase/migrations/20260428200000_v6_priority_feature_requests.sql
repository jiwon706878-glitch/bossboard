-- V6 Group 11: extend feedback.type to allow priority_feature_request.
-- Business plan users can submit pre-prioritised feature asks; the
-- frontend gates the type via plan-gate (priority_feature_requests
-- feature gate). Existing rows are unaffected.

ALTER TABLE feedback
  DROP CONSTRAINT IF EXISTS feedback_type_check;

ALTER TABLE feedback
  ADD CONSTRAINT feedback_type_check
  CHECK (type IN ('bug', 'feature', 'question', 'other', 'priority_feature_request'));
