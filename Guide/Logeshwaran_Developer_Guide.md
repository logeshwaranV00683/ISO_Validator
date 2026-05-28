# 👨‍💻 Logeshwaran — Developer Guide
### ISO 8583 Validator | Sprint 1 & 2 | 10 Days

> **Your Role:** Dev B — DB Schema architect · Docker Compose · Profile Service · Validation Engine (integrations: Feign clients, cache, MQ consumers)

---

## 🗂️ What You Own

| Module | Port | Your Responsibility |
|---|---|---|
| `schema.sql` | — | All 16 tables for the entire system |
| `docker-compose.yml` | — | MySQL, Redis, RabbitMQ infra |
| `profile-service` | 8082 | Switch profiles + message formats + versioning |
| `validation-engine` | 8084 | Feign clients + Caffeine cache + cache invalidation MQ consumer + run_reference (Redis) + /validate/build |

---

## 🛠️ Laptop Setup (Do This First)

```bash
# 1. Install Docker Desktop — must be running before anything
docker --version  # should work

# 2. Verify ports are free:
lsof -i :3306  # MySQL
lsof -i :6379  # Redis
lsof -i :5672  # RabbitMQ

# 3. Start infra
docker-compose up -d

# 4. Verify all containers are healthy:
docker ps
# You should see: mysql, redis, rabbitmq all as "Up"

# 5. Test MySQL connection
docker exec -it iso8583-mysql mysql -uroot -proot iso8583_db
# Should open MySQL prompt
```

---

## 📅 Day-by-Day Tasks

---

### Day 1 — Database Schema + Docker Compose

**This day you are unblocking EVERYONE. Your docker-compose.yml and schema.sql must be done by EOD.**

#### `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: iso8583-mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: iso8583_db
    volumes:
      - ./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    container_name: iso8583-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  rabbitmq:
    image: rabbitmq:3-management
    container_name: iso8583-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:
```

---

#### `schema.sql` — All 16 Tables

```sql
-- ================================================================
-- ALL 16 TABLES in iso8583_db
-- One schema, service boundaries enforced in code only
-- ================================================================

-- ==================== AUTH SERVICE TABLES ====================

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_initials VARCHAR(5),
    role ENUM('ADMIN', 'ANALYST', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    active BOOLEAN DEFAULT TRUE,
    failed_login_count INT DEFAULT 0,
    locked_until DATETIME NULL,
    password_changed_at DATETIME NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

CREATE TABLE user_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    jti VARCHAR(36) NOT NULL UNIQUE,   -- JWT ID (UUID)
    issued_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    revoke_reason VARCHAR(50) NULL,    -- LOGOUT, PASSWORD_CHANGED, ADMIN_REVOKE
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_sessions_jti ON user_sessions(jti);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);

CREATE TABLE system_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description VARCHAR(255),
    updated_by VARCHAR(50),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==================== PROFILE SERVICE TABLES ====================

CREATE TABLE switch_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    profile_name VARCHAR(100) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL
);

CREATE TABLE message_formats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    profile_id BIGINT NOT NULL,
    format_name VARCHAR(100) NOT NULL,
    mti VARCHAR(4) NOT NULL,
    xml_content LONGTEXT NOT NULL,      -- jPOS packager XML
    current_version INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (profile_id) REFERENCES switch_profiles(id)
);
CREATE INDEX idx_formats_profile_mti ON message_formats(profile_id, mti);

CREATE TABLE message_format_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    format_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    xml_content LONGTEXT NOT NULL,
    created_by VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (format_id) REFERENCES message_formats(id)
);

-- ==================== RULES SERVICE TABLES ====================

CREATE TABLE validation_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    profile_id BIGINT NOT NULL,
    mti VARCHAR(4) NOT NULL,
    field_id INT NOT NULL,              -- DE number (1–128)
    rule_type ENUM('MANDATORY','REGEX','ALLOWED_VALUES','MAX_LENGTH','MIN_LENGTH') NOT NULL,
    rule_pattern VARCHAR(500) NULL,     -- For REGEX type
    max_length INT NULL,
    min_length INT NULL,
    error_code VARCHAR(50),
    error_message VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL
);
CREATE INDEX idx_rules_profile_mti ON validation_rules(profile_id, mti);

CREATE TABLE rule_allowed_values (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_id BIGINT NOT NULL,
    allowed_value VARCHAR(255) NOT NULL,
    FOREIGN KEY (rule_id) REFERENCES validation_rules(id)
);
CREATE INDEX idx_allowed_values_rule ON rule_allowed_values(rule_id);

CREATE TABLE field_definitions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    profile_id BIGINT NOT NULL,
    mti VARCHAR(4) NOT NULL,
    field_number INT NOT NULL,          -- DE number
    field_name VARCHAR(100) NOT NULL,
    data_type ENUM('NUMERIC','ALPHA','ALPHANUMERIC','BINARY','LLVAR','LLLVAR') NOT NULL,
    max_length INT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    is_builder_visible BOOLEAN DEFAULT TRUE,  -- hide bitmap DE1 etc.
    description VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL
);

-- ==================== AI SERVICE TABLES ====================

CREATE TABLE ai_prompt_templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    scope ENUM('GLOBAL', 'PROFILE') NOT NULL DEFAULT 'GLOBAL',
    profile_id BIGINT NULL,             -- NULL for GLOBAL scope
    prompt_template TEXT NOT NULL,      -- Variables: {mti} {profile} {errors} {fields}
    current_version INT DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL
);

CREATE TABLE ai_prompt_template_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    prompt_content TEXT NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES ai_prompt_templates(id)
);

CREATE TABLE ai_run_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    run_reference VARCHAR(30) NOT NULL,
    template_id BIGINT NULL,
    prompt_sent LONGTEXT,
    response_received LONGTEXT,
    duration_ms BIGINT,
    status ENUM('SUCCESS','FAILED','SKIPPED','CB_OPEN') NOT NULL,
    retry_count INT DEFAULT 0,
    http_status_code INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ai_logs_run_ref ON ai_run_logs(run_reference);

CREATE TABLE ollama_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value VARCHAR(500),
    description VARCHAR(255)
);

-- ==================== HISTORY SERVICE TABLES ====================

CREATE TABLE validation_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    run_reference VARCHAR(30) NOT NULL UNIQUE,  -- VLD-YYYYMMDD-00001
    profile_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    username_snapshot VARCHAR(50) NOT NULL,     -- snapshot at time of run
    mti VARCHAR(4),
    status ENUM('VALID','INVALID','ERROR') NOT NULL,
    hex_message_hash VARCHAR(64),               -- SHA-256 of hex (not raw)
    ai_explanation TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_runs_reference ON validation_runs(run_reference);
CREATE INDEX idx_runs_profile_status ON validation_runs(profile_id, status);
CREATE INDEX idx_runs_created ON validation_runs(created_at);

CREATE TABLE validation_run_fields (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    run_id BIGINT NOT NULL,
    field_number INT NOT NULL,
    field_value VARCHAR(1000),           -- PAN must be masked before saving here
    FOREIGN KEY (run_id) REFERENCES validation_runs(id)
);

CREATE TABLE validation_run_errors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    run_id BIGINT NOT NULL,
    field_number INT NOT NULL,
    error_code VARCHAR(50),
    error_message VARCHAR(500),
    FOREIGN KEY (run_id) REFERENCES validation_runs(id)
);

CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,           -- e.g. auth.login, profile.create
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    user_id BIGINT NULL,
    username_snapshot VARCHAR(50),
    correlation_id VARCHAR(36),
    ip_address VARCHAR(45),
    old_value JSON NULL,
    new_value JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    -- NO updated_at, NO deleted_at — audit logs are IMMUTABLE
);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

---

#### `seed.sql` — Required Seed Data

```sql
-- ollama_config seed (9 rows)
INSERT INTO ollama_config (config_key, config_value, description) VALUES
('ollama.enabled', 'true', 'Enable/disable Ollama AI integration'),
('ollama.endpoint', 'http://localhost:11434', 'Ollama API base URL'),
('ollama.model', 'mistral:7b', 'Model to use for explanations'),
('ollama.timeout.ms', '20000', 'Request timeout in milliseconds'),
('ollama.max.tokens', '500', 'Max tokens in response'),
('ollama.temperature', '0.3', 'Model temperature'),
('ollama.retry.count', '2', 'Number of retries on failure'),
('ollama.prompt.language', 'en', 'Response language'),
('ollama.log.prompts', 'false', 'Log full prompts (disable in prod)');

-- system_config seed
INSERT INTO system_config (config_key, config_value, description) VALUES
('jwt.expiry.minutes', '60', 'JWT token expiry in minutes'),
('login.max.failures', '5', 'Max failed attempts before lock'),
('account.lock.minutes', '15', 'Lock duration in minutes'),
('pagination.default.size', '20', 'Default page size for list APIs');

-- Default admin user (password: admin123 BCrypt hash)
INSERT INTO users (username, password_hash, full_name, avatar_initials, role, active)
VALUES ('admin', '$2a$10$...', 'System Admin', 'SA', 'ADMIN', true);
```

#### ✅ Day 1 Verification:
```sql
-- Run these queries to verify schema is correct:
SHOW TABLES;                           -- Should show all 16 tables
SELECT COUNT(*) FROM ollama_config;    -- Should return 9
SELECT COUNT(*) FROM system_config;    -- Should return 4
DESCRIBE validation_runs;             -- Verify run_reference column exists
SHOW INDEX FROM validation_runs;      -- Verify idx_runs_reference exists
```

---

### Day 2 — Auth Service: Login / Logout / Sessions

Coordinate with Bala — you're building the Login/Logout while he builds Users CRUD.

```java
@RestController
@RequestMapping("/auth")
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @RequestBody LoginRequest req) {

        // 1. Find user by username
        User user = userRepo.findByUsername(req.getUsername())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        // 2. Check if locked
        if (user.getLockedUntil() != null &&
                user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new ForbiddenException("Account locked until " + user.getLockedUntil());
        }

        // 3. Verify BCrypt password
        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            // Increment failure counter
            user.setFailedLoginCount(user.getFailedLoginCount() + 1);
            if (user.getFailedLoginCount() >= 5) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
            }
            userRepo.save(user);
            throw new UnauthorizedException("Invalid credentials");
        }

        // 4. Reset failure counter on success
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        userRepo.save(user);

        // 5. Build JWT (RS256)
        String jti = UUID.randomUUID().toString();
        String token = buildJwt(user, jti);  // uses private key

        // 6. Save session
        UserSession session = UserSession.builder()
                .userId(user.getId())
                .jti(jti)
                .issuedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(60))
                .build();
        sessionRepo.save(session);

        return ResponseEntity.ok(ApiResponse.success(
                new LoginResponse(token), "Login successful"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader("Authorization") String bearer) {
        // 1. Extract jti from JWT
        String token = bearer.substring(7);
        Claims claims = jwtUtil.parseToken(token, publicKey);
        String jti = claims.getId();

        // 2. Revoke the session
        sessionRepo.findByJti(jti).ifPresent(session -> {
            session.setRevokedAt(LocalDateTime.now());
            session.setRevokeReason("LOGOUT");
            sessionRepo.save(session);
        });

        return ResponseEntity.ok(ApiResponse.success(null, "Logged out"));
    }
}
```

---

### Day 3 — Rules Service: `field_definitions` + MQ Publishing

```java
// field_definitions API
@RestController
@RequestMapping("/field-definitions")
public class FieldDefinitionController {

    @PostMapping
    public ResponseEntity<ApiResponse<FieldDefinitionDto>> create(
            @RequestBody CreateFieldDefRequest req) { ... }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FieldDefinitionDto>>> getAll(
            @RequestParam Long profileId,
            @RequestParam String mti) {
        // Filter by profileId + mti
        // Return all field definitions for message builder
    }
}
```

#### RabbitMQ Publishing from Rules Service:
```java
@Component
public class RuleEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishRuleUpdated(Long profileId, String mti) {
        RuleEvent event = new RuleEvent("RULE_UPDATED", profileId, mti,
                LocalDateTime.now());
        rabbitTemplate.convertAndSend("cache.invalidation", "", event);
        // fanout exchange — no routing key needed
    }

    public void publishRuleDeleted(Long profileId, String mti) {
        RuleEvent event = new RuleEvent("RULE_DELETED", profileId, mti,
                LocalDateTime.now());
        rabbitTemplate.convertAndSend("cache.invalidation", "", event);
    }
}
```

#### Bulk Rules Import:
```java
@PostMapping("/rules/bulk")
public ResponseEntity<ApiResponse<BulkImportResult>> bulkImport(
        @RequestBody List<CreateRuleRequest> rules) {
    // Validate each rule
    // Save all in a single transaction
    // Return count of created, count of failed, list of errors
    List<ValidationRule> saved = ruleRepository.saveAll(
        rules.stream().map(this::mapToEntity).collect(Collectors.toList())
    );
    return ResponseEntity.ok(ApiResponse.success(
        new BulkImportResult(saved.size(), 0), saved.size() + " rules imported"));
}
```

---

### Day 4 — RabbitMQ Full Exchange Setup

```java
// RabbitMQ configuration — declare ALL exchanges and queues
@Configuration
public class RabbitConfig {

    @Bean
    public DirectExchange validationEventsExchange() {
        return ExchangeBuilder.directExchange("validation.events")
                .durable(true).build();
    }

    @Bean
    public TopicExchange auditEventsExchange() {
        return ExchangeBuilder.topicExchange("audit.events")
                .durable(true).build();
    }

    @Bean
    public FanoutExchange cacheInvalidationExchange() {
        return ExchangeBuilder.fanoutExchange("cache.invalidation")
                .durable(true).build();
    }

    // Queues
    @Bean
    public Queue historyValidationQueue() {
        return QueueBuilder.durable("history.validation-runs")
                .withArgument("x-dead-letter-exchange", "dlx.exchange")
                .withArgument("x-dead-letter-routing-key", "history.validation-runs.dlq")
                .build();
    }

    @Bean
    public Queue historyAuditQueue() {
        return QueueBuilder.durable("history.audit-logs")
                .withArgument("x-dead-letter-exchange", "dlx.exchange")
                .build();
    }

    @Bean
    public Queue cacheInvalidationQueue() {
        return QueueBuilder.durable("validation-engine.cache-invalidation")
                .withArgument("x-dead-letter-exchange", "dlx.exchange")
                .build();
    }

    // Bindings
    @Bean
    public Binding validationBinding() {
        return BindingBuilder.bind(historyValidationQueue())
                .to(validationEventsExchange())
                .with("run.completed");
    }

    @Bean
    public Binding auditBinding() {
        return BindingBuilder.bind(historyAuditQueue())
                .to(auditEventsExchange())
                .with("audit.#");   // matches audit.auth.login, audit.profile.create, etc.
    }

    @Bean
    public Binding cacheBinding() {
        return BindingBuilder.bind(cacheInvalidationQueue())
                .to(cacheInvalidationExchange());
        // fanout — no routing key
    }
}
```

#### Verify via Management UI:
```
http://localhost:15672
Username: guest | Password: guest

→ Go to Exchanges tab:
  ✅ validation.events (direct, durable)
  ✅ audit.events (topic, durable)
  ✅ cache.invalidation (fanout, durable)

→ Go to Queues tab:
  ✅ history.validation-runs
  ✅ history.audit-logs
  ✅ validation-engine.cache-invalidation

→ Check each queue → Bindings section to verify correct routing keys
```

---

### Day 5 — Bug Fixes + DB Verify + Demo Prep

```sql
-- Full DB verification queries:

-- 1. Verify all 16 tables exist
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'iso8583_db'
ORDER BY TABLE_NAME;

-- 2. Verify foreign keys
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'iso8583_db';

-- 3. Verify indexes
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'iso8583_db'
ORDER BY TABLE_NAME, INDEX_NAME;

-- 4. Verify seed data
SELECT COUNT(*) FROM ollama_config;   -- 9
SELECT COUNT(*) FROM system_config;   -- 4
SELECT username, role FROM users;     -- admin user exists
```

#### Docker Compose from scratch test:
```bash
# This must work with ONE command:
docker-compose down -v && docker-compose up -d

# Wait 30 seconds, then verify:
docker ps  # All containers Up

# Verify schema auto-applied:
docker exec iso8583-mysql mysql -uroot -proot iso8583_db \
  -e "SHOW TABLES;" | wc -l
# Should print 17 (16 tables + header)
```

---

### Day 6 — Validation Engine: Feign Clients + Cache

```java
// ProfileClient — calls Profile Service
@FeignClient(
    name = "profile-service",
    url = "${profile.service.url}",
    configuration = FeignConfig.class
)
public interface ProfileClient {

    @GetMapping("/internal/profiles/{profileId}/format")
    ProfileFormat getFormat(@PathVariable Long profileId);
}

// RulesClient — calls Rules Service
@FeignClient(name = "rules-service", url = "${rules.service.url}")
public interface RulesClient {

    @GetMapping("/internal/rules")
    List<ValidationRule> getRules(
        @RequestParam Long profileId,
        @RequestParam String mti);
}

// AiClient — calls AI Service
@FeignClient(name = "ai-service", url = "${ai.service.url}")
public interface AiClient {

    @PostMapping("/internal/ai/explain")
    String explain(@RequestBody AiExplainRequest request);
}
```

#### Caffeine Cache Configuration:
```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(30, TimeUnit.SECONDS)
                .maximumSize(500)
                .recordStats());  // enable cache stats for monitoring
        return manager;
    }
}

// Usage in service:
@Service
public class ProfileCacheService {

    @Cacheable(value = "formats", key = "#profileId")
    public ProfileFormat getFormat(Long profileId) {
        return profileClient.getFormat(profileId);
    }

    @CacheEvict(value = "formats", key = "#profileId")
    public void evictFormat(Long profileId) {
        log.info("Cache evicted for formatId: {}", profileId);
    }
}
```

#### Resilience4j Circuit Breaker:
```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      profile-cb:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 10s
        permittedNumberOfCallsInHalfOpenState: 3
        timeoutDuration: 3s
      rules-cb:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 10s
        timeoutDuration: 3s
      ai-cb:
        slidingWindowSize: 5
        failureRateThreshold: 60
        waitDurationInOpenState: 30s
        timeoutDuration: 20s
```

---

### Day 7 — Cache Invalidation Consumer + Redis run_reference

#### Cache Invalidation MQ Consumer:
```java
@Component
public class CacheInvalidationConsumer {

    private final ProfileCacheService profileCache;
    private final RulesCacheService rulesCache;

    @RabbitListener(queues = "validation-engine.cache-invalidation")
    public void handleInvalidation(CacheInvalidationEvent event) {
        log.info("Cache invalidation received: {}", event.getEventType());

        switch (event.getEventType()) {
            case "RULE_UPDATED", "RULE_DELETED" -> {
                // Evict rules cache for this profile+mti
                String cacheKey = event.getProfileId() + ":" + event.getMti();
                rulesCache.evict(cacheKey);
                log.info("Rules cache evicted for key: {}", cacheKey);
            }
            case "FORMAT_UPDATED", "FORMAT_ROLLED_BACK" -> {
                // Evict profile format cache
                profileCache.evictFormat(event.getProfileId());
                log.info("Format cache evicted for profileId: {}", event.getProfileId());
            }
        }
    }
}
```

#### Redis run_reference Generator:
```java
@Service
public class RunReferenceService {

    private final RedisTemplate<String, Long> redisTemplate;

    public String generate() {
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE); // YYYYMMDD
        String key = "run:ref:counter:" + date;

        // INCR is atomic — safe for concurrent calls
        Long counter = redisTemplate.opsForValue().increment(key);

        // Set TTL to 2 days (if not already set)
        redisTemplate.expire(key, 2, TimeUnit.DAYS);

        // Format: VLD-20250501-00001
        return String.format("VLD-%s-%05d", date, counter);
    }
}
```

---

### Day 8 — Validation Engine: `/validate/build` Endpoint

```java
@PostMapping("/validate/build")
public ResponseEntity<ApiResponse<BuildResponse>> buildMessage(
        @RequestBody BuildRequest request) {

    // 1. Fetch field definitions from rules-service
    List<FieldDefinition> allFields = rulesClient.getFieldDefinitions(
        request.getProfileId(), request.getMti());

    // 2. Filter: only show builder-visible fields
    List<FieldDefinition> visibleFields = allFields.stream()
            .filter(FieldDefinition::isBuilderVisible)
            .collect(Collectors.toList());

    // 3. Validate user-provided values
    List<BuildError> buildErrors = new ArrayList<>();
    for (FieldDefinition field : visibleFields) {
        String value = request.getFields().get(field.getFieldNumber());
        if (field.isMandatory() && (value == null || value.isBlank())) {
            buildErrors.add(new BuildError(field.getFieldNumber(),
                    "Mandatory field missing"));
            continue;
        }
        if (value != null && value.length() > field.getMaxLength()) {
            buildErrors.add(new BuildError(field.getFieldNumber(),
                    "Exceeds max length " + field.getMaxLength()));
        }
    }

    if (!buildErrors.isEmpty()) {
        return ResponseEntity.badRequest().body(
            ApiResponse.error("Build validation failed", "BUILD_VALIDATION_ERROR"));
    }

    // 4. Build ISO8583 hex using jPOS ISOMsg
    ISOMsg isoMsg = new ISOMsg();
    isoMsg.setPackager(packager);
    isoMsg.setMTI(request.getMti());

    for (Map.Entry<Integer, String> entry : request.getFields().entrySet()) {
        isoMsg.set(entry.getKey(), entry.getValue());
    }

    byte[] packed = isoMsg.pack();
    String hexMessage = ISOUtil.byte2hex(packed);

    return ResponseEntity.ok(ApiResponse.success(
        new BuildResponse(hexMessage, visibleFields), "Message built successfully"));
}
```

---

### Day 9 — Performance Test + Cache Verify

```java
// jPOS parse performance test
@Test
void testParsePerformance() {
    String hex = "0200..."; // your test hex
    ISOPackager packager = loadPackager();

    long start = System.currentTimeMillis();
    for (int i = 0; i < 1000; i++) {
        IsoParserUtil.parse(hex, packager);
    }
    long elapsed = System.currentTimeMillis() - start;

    System.out.println("1000 parses in " + elapsed + "ms");
    System.out.println("Avg per parse: " + (elapsed / 1000.0) + "ms");
    assertTrue(elapsed / 1000.0 < 5.0, "Must be < 5ms per parse");
}
```

#### Cache Hit Rate Test:
```bash
# Call /validate twice with same profileId
# Then check profile-service logs — second call should NOT appear in profile-service logs

# In profile-service logs: grep for the internal endpoint call
# First call: you'll see it
# Second call: you should NOT see it (served from Caffeine cache)
```

#### Redis Concurrency Test:
```bash
# Use Apache Bench or a simple parallel curl:
for i in {1..50}; do
  curl -s -X POST http://localhost:8080/validate \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"profileId":1,"hexMessage":"0200..."}' \
    | jq -r '.data.runReference' &
done
wait

# Collect all run references into a file and check uniqueness:
# All 50 must be different (no duplicates)
```

---

### Day 10 — Final Integration Pass

```bash
# Full smoke test script:

echo "=== Starting full smoke test ==="

# 1. Check all ports
for port in 8761 8888 8080 8081 8082 8083 8084 8085 8086; do
  STATUS=$(curl -s http://localhost:$port/actuator/health | jq -r '.status')
  echo "Port $port: $STATUS"
done

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')
echo "JWT obtained: ${TOKEN:0:20}..."

# 3. Test each service
curl -s http://localhost:8080/profiles -H "Authorization: Bearer $TOKEN" | jq '.success'
curl -s http://localhost:8080/rules -H "Authorization: Bearer $TOKEN" | jq '.success'
curl -s http://localhost:8080/ai/templates -H "Authorization: Bearer $TOKEN" | jq '.success'

echo "=== Smoke test complete ==="
```

---

## 🔗 Dependencies

### What you give others:
| Deliverable | Who needs it | When |
|---|---|---|
| `docker-compose.yml` running | Everyone | Day 1 morning |
| `schema.sql` applied (all 16 tables) | Everyone | Day 1 EOD |
| RabbitMQ exchanges + queues declared | Bala (publish), Janani (AI events), Nethra (consumers) | Day 4 |
| Profile Service `/internal/profiles/{id}/format` | Bala (Validation Engine) | Day 6 |

### What you need from others:
| What | From | When |
|---|---|---|
| `common-lib` JAR installed | Bala | Day 1 EOD |
| RSA public key | Bala | Day 1 EOD |
| Rules Service `/internal/rules` endpoint | Janani | Day 6 |
| Eureka URL + Config Server running | Janani | Day 2 (for service registration) |

---

## ⚠️ Key Rules — Never Violate

```
✅ schema.sql must be idempotent — use IF NOT EXISTS everywhere
✅ audit_logs: NO UPDATE, NO DELETE — insert only, forever
✅ PAN in validation_run_fields must be masked BEFORE insert
✅ Fanout exchange for cache.invalidation — no routing key
✅ Redis INCR is atomic — never use SELECT + UPDATE for run_reference
✅ Caffeine TTL = 30s — keep it short, cache invalidation via MQ handles the rest
✅ Dead Letter Queues must be declared for all queues
```

---

## 🧪 Quick Debug Checklist

| Problem | Check |
|---|---|
| MySQL not starting | Port 3306 in use? `lsof -i :3306` |
| Schema not applying | Check docker logs: `docker logs iso8583-mysql` |
| Feign call failing | Is target service running and registered in Eureka? |
| Cache not evicting | Is `cache.invalidation` fanout binding correct? |
| Duplicate run_reference | Check Redis key TTL — did it expire mid-day? |
| RabbitMQ binding not working | Verify in management UI: Exchange → Bindings tab |

---

*Logeshwaran — Sprint 1 & 2 · ISO 8583 Validator · Spring Boot 3.2*
