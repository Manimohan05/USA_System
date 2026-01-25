-- Add is_closed column to attendance_sessions table for temporary session closing functionality
ALTER TABLE attendance_sessions 
ADD COLUMN is_closed BOOLEAN NOT NULL DEFAULT FALSE;

-- Add ended_at column to track when sessions are permanently ended
ALTER TABLE attendance_sessions 
ADD COLUMN ended_at TIMESTAMP;

-- Add index for better query performance when filtering by closed status
CREATE INDEX idx_attendance_sessions_is_closed ON attendance_sessions(is_closed);

-- Add index for better query performance when filtering by ended_at (for recovery window)
CREATE INDEX idx_attendance_sessions_ended_at ON attendance_sessions(ended_at);

-- Add comments for documentation
COMMENT ON COLUMN attendance_sessions.is_closed IS 'Indicates if session is temporarily closed (paused) without ending permanently';
COMMENT ON COLUMN attendance_sessions.ended_at IS 'Timestamp when session was permanently ended (for 10-minute recovery window calculation)';