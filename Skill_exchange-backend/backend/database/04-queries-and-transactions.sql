USE skill_exchange;
-- JOIN: all offered skills and their teachers.
SELECT st.name,k.name AS skill,ss.level FROM students st
JOIN student_skills ss ON ss.student_id=st.id JOIN skills k ON k.id=ss.skill_id
WHERE ss.kind='offer' ORDER BY st.name,k.name;
-- GROUP BY, aggregate, HAVING: categories with at least one teacher.
SELECT k.category,COUNT(*) AS offerings,ROUND(AVG(ss.level),2) AS average_level
FROM skills k JOIN student_skills ss ON ss.skill_id=k.id AND ss.kind='offer'
GROUP BY k.category HAVING COUNT(*)>=1;
-- Correlated subquery: teachers offering above-average experience for their skill.
SELECT st.name,k.name,ss.level FROM student_skills ss
JOIN students st ON st.id=ss.student_id JOIN skills k ON k.id=ss.skill_id
WHERE ss.kind='offer' AND ss.level>=(SELECT AVG(other.level) FROM student_skills other WHERE other.skill_id=ss.skill_id AND other.kind='offer');
-- LEFT JOIN and COUNT including unused skills.
SELECT * FROM skill_popularity ORDER BY learners DESC,teachers DESC;
SELECT * FROM teacher_ratings;
CALL student_summary(1);
-- DML and transaction demonstration: rollback means this change is not persisted.
START TRANSACTION;
SELECT id,name FROM students WHERE id=1 FOR UPDATE;
UPDATE students SET bio='Temporary transaction demonstration' WHERE id=1;
SELECT id,bio FROM students WHERE id=1;
ROLLBACK;
SELECT id,bio FROM students WHERE id=1;
-- Pending booking conflicts use half-open intervals: adjacent sessions are allowed.
SELECT id FROM sessions WHERE status IN ('pending','accepted')
AND (teacher_id IN (1,2) OR learner_id IN (1,2))
AND starts_at<'2027-01-01 11:00:00' AND ends_at>'2027-01-01 10:00:00';
-- Explain the matching lookup index.
EXPLAIN SELECT student_id,level FROM student_skills WHERE skill_id=1 AND kind='offer' AND level>=3;