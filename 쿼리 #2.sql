CREATE DATABASE nanal
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE nanal;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname      VARCHAR(50)  NOT NULL,
  sprout_state  TINYINT      NOT NULL DEFAULT 0,
  timezone      VARCHAR(50)  NOT NULL DEFAULT 'Asia/Seoul',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE challenges (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT          NOT NULL,
  category       VARCHAR(50)  NOT NULL,
  title          VARCHAR(100) NOT NULL,
  current_streak INT          NOT NULL DEFAULT 0,
  best_streak    INT          NOT NULL DEFAULT 0,
  started_at     DATE         NOT NULL,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE challenge_alarms (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  challenge_id INT     NOT NULL,
  alarm_time   TIME    NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
);

CREATE TABLE logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  challenge_id INT          NOT NULL,
  log_date     DATE         NOT NULL,
  is_done      BOOLEAN      NOT NULL DEFAULT FALSE,
  done_at      DATETIME     NULL,
  memo         VARCHAR(255) NULL,
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
  UNIQUE KEY uq_challenge_date (challenge_id, log_date)
);

CREATE TABLE monthly_stats (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT          NOT NULL,
  stat_year_month VARCHAR(7)  NOT NULL,
  done_days      INT          NOT NULL DEFAULT 0,
  total_days     INT          NOT NULL DEFAULT 0,
  rate           DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_month (user_id, stat_year_month)
);



ALTER TABLE logs ADD COLUMN is_doubled BOOLEAN NOT NULL DEFAULT FALSE;
-- 오늘 XP 2배 사용 여부

CREATE TABLE characters (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(50)  NOT NULL,
  description       VARCHAR(100) NULL,
  unlock_condition  VARCHAR(100) NULL,
  is_limited        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE user_characters (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT     NOT NULL,
  character_id INT     NOT NULL,
  level        TINYINT NOT NULL DEFAULT 1,
  exp          INT     NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id),
  UNIQUE KEY uq_user_character (user_id, character_id)
);


CREATE TABLE user_exp_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT         NOT NULL,
  character_id INT         NOT NULL,
  exp_amount   INT         NOT NULL,
  reason       VARCHAR(50) NOT NULL,
  -- 'daily_checkin', 'streak_bonus', 'ad_reward',
  -- 'milestone_50', 'milestone_100', 'lottery'
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
#경험치 획득 이력 저장, 어뷰징 잡을떄 필요

CREATE TABLE lottery_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT      NOT NULL,
  exp_gained INT      NOT NULL,
  log_date   DATE     NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_lottery_date (user_id, log_date)
  -- 하루 1번만 룰렛 가능
);


ALTER TABLE users ADD COLUMN total_days    INT NOT NULL DEFAULT 0;
-- 전체 누적 달성일 (50일, 100일 마일스톤 체크용)
ALTER TABLE users ADD COLUMN fcm_token     VARCHAR(255) NULL;
-- 푸시 알림 토큰




USE nanal;

ALTER TABLE logs ADD COLUMN is_doubled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users ADD COLUMN total_days INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN fcm_token VARCHAR(255) NULL;

CREATE TABLE characters (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(50)  NOT NULL,
  description      VARCHAR(100) NULL,
  unlock_condition VARCHAR(100) NULL,
  is_limited       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_characters (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT     NOT NULL,
  character_id INT     NOT NULL,
  level        TINYINT NOT NULL DEFAULT 1,
  exp          INT     NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id),
  UNIQUE KEY uq_user_character (user_id, character_id)
);

CREATE TABLE user_exp_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT         NOT NULL,
  character_id INT         NOT NULL,
  exp_amount   INT         NOT NULL,
  reason       VARCHAR(50) NOT NULL,
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE lottery_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT  NOT NULL,
  exp_gained INT  NOT NULL,
  log_date   DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_lottery_date (user_id, log_date)
);

SHOW TABLES;





-- challenge_alarms 테이블 DROP
DROP TABLE challenge_alarms;

-- challenges 테이블에 컬럼 3개 추가
ALTER TABLE challenges ADD COLUMN habit_time     TIME    NULL;
ALTER TABLE challenges ADD COLUMN alarm_lead_min TINYINT NULL;
ALTER TABLE challenges ADD COLUMN display_order  INT     NOT NULL DEFAULT 0;
```

---

**정렬 로직도 명확해요:**
```
홈 화면 정렬 순서:
1. habit_time 있는 것 → 시간 오름차순 (7:00 → 15:00)
2. habit_time 없는 것 → display_order 순서대로
3. 완료한 것 → 맨 아래로