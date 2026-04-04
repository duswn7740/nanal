CREATE USER 'nanal_user'@'localhost' IDENTIFIED BY 'mariadb';

GRANT ALL PRIVILEGES ON nanal.* TO 'nanal_user'@'localhost';
FLUSH PRIVILEGES;

SELECT user, host FROM mysql.user;
SHOW GRANTS FOR 'nanal_user'@'localhost';



USE nanal;
SHOW TABcharactersLES;

DESCRIBE characters;
DESCRIBE user_characters;
DESCRIBE user_exp_logs;




INSERT INTO characters (name, description, unlock_condition, is_limited) VALUES
('꽃',   '기본 캐릭터 새싹이! 매일 함께해요 🌱', NULL,        0),
('장미', '7일 연속 달성으로 해금! 🌹',           '7일 연속',  0),
('병아리','30일 달성으로 해금! 🐣',              '30일 달성', 0),
('토끼', '50일 달성으로 해금! 🐰',              '50일 달성', 0),
('붉은말','2026년 한정 시즌 캐릭터 🐎',          '시즌 한정', 1);



-- 기존 유저 확인
SELECT id, nickname FROM users;

-- 해당 id로 기본 캐릭터 지급 (id를 실제 값으로 바꿔줘요)
INSERT INTO user_characters (user_id, character_id, level, exp, is_active)
VALUES (1, 1, 1, 0, 1);