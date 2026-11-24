CREATE DATABASE IF NOT EXISTS skill_exchange CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE skill_exchange;
CREATE TABLE IF NOT EXISTS students (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, name VARCHAR(80) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 bio VARCHAR(1000) NOT NULL DEFAULT '', department VARCHAR(100) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS skills (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL UNIQUE,
 category VARCHAR(80) NOT NULL, INDEX idx_skill_category(category)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS student_skills (
 student_id BIGINT UNSIGNED NOT NULL, skill_id BIGINT UNSIGNED NOT NULL,
 kind ENUM('offer','learn') NOT NULL, level TINYINT NOT NULL CHECK(level BETWEEN 1 AND 5),
 PRIMARY KEY(student_id,skill_id,kind),
 FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
 FOREIGN KEY(skill_id) REFERENCES skills(id), INDEX idx_skill_match(skill_id,kind,level)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS availability (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, student_id BIGINT UNSIGNED NOT NULL,
 day TINYINT NOT NULL CHECK(day BETWEEN 0 AND 6),
 start_hour TINYINT NOT NULL CHECK(start_hour BETWEEN 0 AND 23),
 end_hour TINYINT NOT NULL CHECK(end_hour BETWEEN 1 AND 24), CHECK(end_hour>start_hour),
 UNIQUE KEY uq_availability(student_id,day,start_hour,end_hour),
 FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sessions (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, teacher_id BIGINT UNSIGNED NOT NULL,
 learner_id BIGINT UNSIGNED NOT NULL, skill_id BIGINT UNSIGNED NOT NULL,
 starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL,
 status ENUM('pending','accepted','completed','cancelled') NOT NULL DEFAULT 'pending',
 note VARCHAR(500) NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(teacher_id<>learner_id), CHECK(ends_at>starts_at),
 FOREIGN KEY(teacher_id) REFERENCES students(id), FOREIGN KEY(learner_id) REFERENCES students(id),
 FOREIGN KEY(skill_id) REFERENCES skills(id),
 INDEX idx_teacher_schedule(teacher_id,status,starts_at,ends_at),
 INDEX idx_learner_schedule(learner_id,status,starts_at,ends_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS reviews (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, session_id BIGINT UNSIGNED NOT NULL UNIQUE,
 reviewer_id BIGINT UNSIGNED NOT NULL, rating TINYINT NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment VARCHAR(1000) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(session_id) REFERENCES sessions(id), FOREIGN KEY(reviewer_id) REFERENCES students(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS session_audit (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, session_id BIGINT UNSIGNED NOT NULL,
 old_status VARCHAR(20) NOT NULL, new_status VARCHAR(20) NOT NULL,
 changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(session_id) REFERENCES sessions(id)
) ENGINE=InnoDB;
CREATE OR REPLACE VIEW teacher_ratings AS
 SELECT s.teacher_id,COUNT(r.id) review_count,ROUND(AVG(r.rating),2) average_rating
 FROM sessions s JOIN reviews r ON r.session_id=s.id GROUP BY s.teacher_id;
CREATE OR REPLACE VIEW skill_popularity AS
 SELECT k.id,k.name,k.category,COUNT(CASE WHEN ss.kind='offer' THEN 1 END) teachers,
 COUNT(CASE WHEN ss.kind='learn' THEN 1 END) learners
 FROM skills k LEFT JOIN student_skills ss ON ss.skill_id=k.id GROUP BY k.id,k.name,k.category;