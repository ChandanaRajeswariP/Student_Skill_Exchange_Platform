USE skill_exchange;
DELIMITER $$
DROP TRIGGER IF EXISTS validate_review$$
CREATE TRIGGER validate_review BEFORE INSERT ON reviews FOR EACH ROW
BEGIN
 IF NOT EXISTS(SELECT 1 FROM sessions WHERE id=NEW.session_id AND learner_id=NEW.reviewer_id AND status='completed') THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only the learner of a completed session can review';
 END IF;
END$$
DROP TRIGGER IF EXISTS audit_session_status$$
CREATE TRIGGER audit_session_status AFTER UPDATE ON sessions FOR EACH ROW
BEGIN
 IF OLD.status<>NEW.status THEN
 INSERT INTO session_audit(session_id,old_status,new_status) VALUES(NEW.id,OLD.status,NEW.status);
 END IF;
END$$
DROP PROCEDURE IF EXISTS student_summary$$
CREATE PROCEDURE student_summary(IN p_student_id BIGINT UNSIGNED)
BEGIN
 SELECT st.id,st.name,
 (SELECT COUNT(*) FROM student_skills ss WHERE ss.student_id=st.id AND ss.kind='offer') AS skills_offered,
 (SELECT COUNT(*) FROM sessions s WHERE (s.teacher_id=st.id OR s.learner_id=st.id) AND s.status='completed') AS completed_sessions
 FROM students st WHERE st.id=p_student_id;
END$$
DELIMITER ;