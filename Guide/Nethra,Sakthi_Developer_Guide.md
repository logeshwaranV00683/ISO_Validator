# 👩‍💻 Nethra — Developer Guide
### ISO 8583 Validator | Sprint 1 & 2 | 10 Days

> **Your Role:** Dev D — API Gateway (skeleton + routing) · Profile Service (switch profiles, format versioning, MQ publish) · History Service (MQ consumers + query APIs) · Postman full coverage

---

## 🗂️ What You Own

| Module | Port | Your Responsibility |
|---|---|---|
| `api-gateway` | 8080 | Route config · CorrelationIdFilter · CORS |
| `profile-service` | 8082 | Switch profiles · Message formats · Versioning · MQ publish |
| `history-service` | 8086 | ValidationRun consumer · Audit consumer · Query APIs |

---

## 🛠️ Laptop Setup (Do This First)

```bash
# 1. Java 21
java -version

# 2. Maven 3.9.x
mvn -version

# 3. Docker infra (Logeshwaran starts this — verify)
docker ps
# Must show: mysql, redis, rabbitmq all "Up"

# 4. Postman
# Download: https://www.postman.com/downloads/
# Install Postman Agent for local collection testing

# 5. Get RSA public.pem from Bala on Day 1 EOD
# Place it at: api-gateway/src/main/resources/keys/public.pem
```

---

## 📅 Day-by-Day Tasks

---

### Day 1 — API Gateway Skeleton

Janani builds Eureka + Config Server on Day 1 — you are building the Gateway in parallel.

#### Step 1 — Project Setup

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
</dependency>
```

> ⚠️ Gateway uses **reactive** stack (WebFlux) — NOT regular Spring MVC. Do NOT add `spring-boot-starter-web` — it will conflict.

#### Step 2 — Route Configuration

```yaml
# application.yml
server:
  port: 8080

spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      routes:
        # Auth Service
        - id: auth-service
          uri: lb://auth-service          # lb:// = load balanced via Eureka
          predicates:
            - Path=/auth/**, /users/**, /config/**
          filters:
            - StripPrefix=0

        # Profile Service
        - id: profile-service
          uri: lb://profile-service
          predicates:
            - Path=/profiles/**, /formats/**
          filters:
            - StripPrefix=0

        # Rules Service
        - id: rules-service
          uri: lb://rules-service
          predicates:
            - Path=/rules/**, /field-definitions/**
          filters:
            - StripPrefix=0

        # Validation Engine
        - id: validation-engine
          uri: lb://validation-engine
          predicates:
            - Path=/validate/**
          filters:
            - StripPrefix=0

        # AI Service
        - id: ai-service
          uri: lb://ai-service
          predicates:
            - Path=/ai/**
          filters:
            - StripPrefix=0

        # History Service
        - id: history-service
          uri: lb://history-service
          predicates:
            - Path=/history/**, /audit/**
          filters:
            - StripPrefix=0

  data:
    redis:
      host: localhost
      port: 6379

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/

management:
  endpoints:
    web:
      exposure:
        include: health, info, gateway
  endpoint:
    health:
      show-details: always
```

#### Step 3 — `CorrelationIdFilter`

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter implements GlobalFilter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        // Use existing ID if present (from upstream system), else generate new one
        String correlationId = exchange.getRequest().getHeaders()
                .getFirst(CORRELATION_ID_HEADER);

        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        final String finalId = correlationId;

        // Inject into request (downstream services receive it)
        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header(CORRELATION_ID_HEADER, finalId)
                .build();

        // Also inject into response (caller can trace the request)
        exchange.getResponse().getHeaders()
                .add(CORRELATION_ID_HEADER, finalId);

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }
}
```

#### Step 4 — CORS Global Filter

```java
@Configuration
public class CorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));  // Tighten in prod
        config.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsWebFilter(source);
    }
}
```

#### ✅ Day 1 Verification:
```bash
# Start gateway
mvn spring-boot:run

# Actuator health
curl http://localhost:8080/actuator/health
# Expect: {"status":"UP"}

# Check routes registered
curl http://localhost:8080/actuator/gateway/routes
# Should show all 6 routes
```

---

### Day 2 — Profile Service Skeleton

```
profile-service/
  src/main/java/com/iso8583/profile/
    controller/
      ProfileController.java
      FormatController.java
      InternalProfileController.java
    service/
      ProfileService.java
      FormatService.java
    repository/
      SwitchProfileRepository.java
      MessageFormatRepository.java
      MessageFormatVersionRepository.java
    entity/
      SwitchProfile.java
      MessageFormat.java
      MessageFormatVersion.java
    dto/
      CreateProfileRequest.java
      ProfileDto.java
      CreateFormatRequest.java
      FormatDto.java
    event/
      FormatEventPublisher.java
```

#### `ProfileController.java`:

```java
@RestController
@RequestMapping("/profiles")
public class ProfileController {

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<ApiResponse<ProfileDto>> createProfile(
            @RequestBody @Valid CreateProfileRequest req) {
        ProfileDto created = profileService.create(req);
        return ResponseEntity.status(201).body(ApiResponse.success(created, "Profile created"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProfileDto>>> getAllProfiles() {
        // Only return non-deleted profiles
        return ResponseEntity.ok(ApiResponse.success(
                profileService.getAll(), "OK"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProfileDto>> getProfile(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                profileService.getById(id), "OK"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<ApiResponse<ProfileDto>> updateProfile(
            @PathVariable Long id,
            @RequestBody UpdateProfileRequest req) { ... }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> activateProfile(@PathVariable Long id) {
        profileService.setActive(id, true);
        return ResponseEntity.ok(ApiResponse.success(null, "Profile activated"));
    }
}
```

#### `FormatController.java`:

```java
@RestController
@RequestMapping("/formats")
public class FormatController {

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<ApiResponse<FormatDto>> createFormat(
            @RequestBody @Valid CreateFormatRequest req) {
        // Link to profile, set currentVersion = 1
        FormatDto created = formatService.create(req);
        return ResponseEntity.status(201).body(ApiResponse.success(created, "Format created"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FormatDto>> getFormat(@PathVariable Long id) {
        // Return format including xmlContent
        return ResponseEntity.ok(ApiResponse.success(
                formatService.getById(id), "OK"));
    }
}
```

---

### Day 3 — Profile Service: Versioning + RabbitMQ Publisher

#### Format Update with Version Bump:

```java
@PutMapping("/formats/{id}")
@PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
public ResponseEntity<ApiResponse<FormatDto>> updateFormat(
        @PathVariable Long id,
        @RequestBody UpdateFormatRequest req,
        @RequestHeader("X-Auth-Username") String username) {

    MessageFormat format = formatRepo.findById(id)
            .orElseThrow(() -> new NotFoundException("Format not found"));

    // 1. Save current content as a version BEFORE overwriting
    MessageFormatVersion versionRecord = MessageFormatVersion.builder()
            .formatId(id)
            .versionNumber(format.getCurrentVersion())
            .xmlContent(format.getXmlContent())   // save OLD content
            .createdBy(username)
            .build();
    formatVersionRepo.save(versionRecord);

    // 2. Update main format with new content + bump version
    format.setXmlContent(req.getXmlContent());
    format.setCurrentVersion(format.getCurrentVersion() + 1);
    formatRepo.save(format);

    // 3. Publish cache invalidation event
    formatEventPublisher.publishFormatUpdated(format.getProfileId(), id);

    return ResponseEntity.ok(ApiResponse.success(mapToDto(format), "Format updated"));
}
```

#### Rollback Endpoint:

```java
@PutMapping("/formats/{id}/rollback")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<ApiResponse<FormatDto>> rollback(@PathVariable Long id) {
    MessageFormat format = formatRepo.findById(id).orElseThrow();

    // Get the PREVIOUS version (currentVersion - 1)
    int prevVersionNum = format.getCurrentVersion() - 1;
    if (prevVersionNum < 1) {
        throw new BadRequestException("No previous version available to rollback");
    }

    MessageFormatVersion prevVersion = formatVersionRepo
            .findByFormatIdAndVersionNumber(id, prevVersionNum)
            .orElseThrow(() -> new NotFoundException("Version " + prevVersionNum + " not found"));

    // Restore previous content (DON'T decrement version number — add a new version row)
    // The rollback itself becomes the latest version
    format.setXmlContent(prevVersion.getXmlContent());
    format.setCurrentVersion(format.getCurrentVersion() + 1);
    formatRepo.save(format);

    // Publish rollback event
    formatEventPublisher.publishFormatRolledBack(format.getProfileId(), id);

    return ResponseEntity.ok(ApiResponse.success(mapToDto(format), "Rolled back to v" + prevVersionNum));
}
```

#### Internal Endpoint for Validation Engine:

```java
// NOT in Gateway routes — only internal Feign calls
@RestController
@RequestMapping("/internal/profiles")
public class InternalProfileController {

    @GetMapping("/{profileId}/format")
    public ResponseEntity<ProfileFormatResponse> getFormatForEngine(
            @PathVariable Long profileId) {
        // Return: formatId + xmlContent + mti
        // This is what the validation-engine uses to build its packager
        MessageFormat format = formatService.getActiveFormatByProfile(profileId);
        return ResponseEntity.ok(new ProfileFormatResponse(
                format.getId(),
                format.getXmlContent(),
                format.getMti(),
                format.getProfileId()));
    }
}
```

#### RabbitMQ Event Publisher:

```java
@Component
public class FormatEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishFormatUpdated(Long profileId, Long formatId) {
        FormatCacheEvent event = FormatCacheEvent.builder()
                .eventType("FORMAT_UPDATED")
                .profileId(profileId)
                .formatId(formatId)
                .timestamp(LocalDateTime.now())
                .build();
        // Publish to fanout exchange — all bound queues receive it
        rabbitTemplate.convertAndSend("cache.invalidation", "", event);
        log.info("Published FORMAT_UPDATED for profileId={} formatId={}", profileId, formatId);
    }

    public void publishFormatRolledBack(Long profileId, Long formatId) {
        FormatCacheEvent event = FormatCacheEvent.builder()
                .eventType("FORMAT_ROLLED_BACK")
                .profileId(profileId)
                .formatId(formatId)
                .timestamp(LocalDateTime.now())
                .build();
        rabbitTemplate.convertAndSend("cache.invalidation", "", event);
    }
}
```

---

### Day 4 — Profile Service Testing

Full flow test in order:

```
1. POST /profiles
   Body: { "profileName": "Test Switch", "description": "Visa integration" }
   → Expect: 201, profile with id=1, active=false

2. POST /formats
   Body: { "profileId": 1, "formatName": "0200 Format", "mti": "0200", "xmlContent": "<iso87...>" }
   → Expect: 201, format with id=1, currentVersion=1

3. PATCH /profiles/1/activate
   → Expect: 200, profile active=true

4. PUT /formats/1  (update XML content)
   Body: { "xmlContent": "<updated xml>" }
   → Expect: 200, currentVersion=2

5. GET /formats/1
   → Expect: currentVersion=2, xmlContent = updated content

6. PUT /formats/1/rollback
   → Expect: 200, xmlContent = original content from v1

7. GET /internal/profiles/1/format
   → Expect: xmlContent, mti, profileId returned correctly
```

#### RabbitMQ verify after step 4:
```
http://localhost:15672 → Queues
→ validation-engine.cache-invalidation → Get Messages
→ Should see: {"eventType":"FORMAT_UPDATED","profileId":1,"formatId":1}
```

---

### Day 5 — Profile E2E via Gateway

```bash
# 1. Get JWT
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

# 2. Create profile through Gateway
curl -X POST http://localhost:8080/profiles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profileName":"Visa Switch","description":"Test profile"}'
# Expect: 201

# 3. No JWT test — must be rejected at Gateway
curl -X POST http://localhost:8080/profiles \
  -H "Content-Type: application/json" \
  -d '{"profileName":"Test"}'
# Expect: 401 from JwtAuthFilter (NOT from profile-service)

# 4. Verify X-Correlation-ID flows through
curl -v http://localhost:8080/profiles -H "Authorization: Bearer $TOKEN" 2>&1 | grep "X-Correlation-ID"
# Should see: < X-Correlation-ID: <uuid> in response headers

# 5. Eureka dashboard
# Open: http://localhost:8761
# Should see: PROFILE-SERVICE registered
```

---

### Day 6 — History Service: ValidationRun Consumer

```
history-service/
  src/main/java/com/iso8583/history/
    consumer/
      ValidationRunConsumer.java
      AuditLogConsumer.java
    controller/
      HistoryController.java
      AuditController.java
    service/
      ValidationRunService.java
      AuditLogService.java
    repository/
      ValidationRunRepository.java
      ValidationRunFieldRepository.java
      ValidationRunErrorRepository.java
      AuditLogRepository.java
    entity/
      ValidationRun.java
      ValidationRunField.java
      ValidationRunError.java
      AuditLog.java
    dto/
      ValidationRunDto.java
      ValidationRunDetailDto.java
      AuditLogDto.java
    event/
      ValidationRunCompletedEvent.java
```

#### `ValidationRunConsumer.java`:

```java
@Component
public class ValidationRunConsumer {

    @RabbitListener(queues = "history.validation-runs")
    public void handleValidationRun(ValidationRunCompletedEvent event) {
        log.info("Received ValidationRunEvent: runRef={}", event.getRunReference());

        // IDEMPOTENCY CHECK — handle duplicate messages safely
        if (validationRunRepo.existsByRunReference(event.getRunReference())) {
            log.warn("Duplicate event for runRef={} — skipping", event.getRunReference());
            return;
        }

        try {
            // 1. Save main run record
            ValidationRun run = ValidationRun.builder()
                    .runReference(event.getRunReference())
                    .profileId(event.getProfileId())
                    .userId(event.getUserId())
                    .usernameSnapshot(event.getUsername())  // snapshot — don't FK to user
                    .mti(event.getMti())
                    .status(event.getErrors().isEmpty()
                            ? RunStatus.VALID : RunStatus.INVALID)
                    .aiExplanation(event.getAiExplanation())
                    .build();
            ValidationRun saved = validationRunRepo.save(run);

            // 2. Save parsed fields (PAN must already be masked by engine)
            List<ValidationRunField> fields = event.getParsedFields()
                    .entrySet().stream()
                    .map(e -> ValidationRunField.builder()
                            .runId(saved.getId())
                            .fieldNumber(e.getKey())
                            .fieldValue(e.getValue())  // already masked by engine
                            .build())
                    .collect(Collectors.toList());
            fieldRepo.saveAll(fields);

            // 3. Save errors (if any)
            if (!event.getErrors().isEmpty()) {
                List<ValidationRunError> errors = event.getErrors().stream()
                        .map(e -> ValidationRunError.builder()
                                .runId(saved.getId())
                                .fieldNumber(e.getFieldId())
                                .errorCode(e.getErrorCode())
                                .errorMessage(e.getErrorMessage())
                                .build())
                        .collect(Collectors.toList());
                errorRepo.saveAll(errors);
            }

            log.info("Saved run: runRef={} status={}", saved.getRunReference(), saved.getStatus());

        } catch (Exception e) {
            log.error("Failed to save ValidationRun: runRef={} error={}",
                    event.getRunReference(), e.getMessage(), e);
            // Re-throw to trigger RabbitMQ requeue / DLQ
            throw new RuntimeException("Failed to persist run", e);
        }
    }
}
```

#### `ValidationRunCompletedEvent.java` — must match what Bala publishes:

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValidationRunCompletedEvent {
    private String runReference;        // VLD-YYYYMMDD-00001
    private Long profileId;
    private Long userId;
    private String username;
    private String mti;
    private Map<Integer, String> parsedFields;    // PAN already masked
    private List<ValidationError> errors;         // empty list if VALID
    private String aiExplanation;                 // null if AI skipped
    private LocalDateTime createdAt;
}
```

> ⚠️ Coordinate with Bala on the exact field names in this event — must match exactly.

---

### Day 7 — History Service: Audit Consumer

#### `AuditLogConsumer.java`:

```java
@Component
public class AuditLogConsumer {

    @RabbitListener(queues = "history.audit-logs")
    public void handleAuditLog(AuditLogEvent event) {
        // IMMUTABLE — only INSERT, never UPDATE or DELETE
        AuditLog log = AuditLog.builder()
                .action(event.getAction())              // e.g. "auth.login"
                .entityType(event.getEntityType())      // e.g. "USER"
                .entityId(event.getEntityId())          // e.g. "42"
                .userId(event.getUserId())
                .usernameSnapshot(event.getUsername())
                .correlationId(event.getCorrelationId())
                .ipAddress(event.getIpAddress())
                .oldValue(event.getOldValue())          // JSON string
                .newValue(event.getNewValue())          // JSON string
                .build();
        // createdAt is auto-set — no updatedAt column (immutable)
        auditLogRepo.save(log);
    }
}
```

> ❗ **Immutability is non-negotiable.** Audit logs table has NO `updated_at` column and NO soft delete. Once a row is inserted, it stays forever.

#### Test with manual MQ publish:

```bash
# From RabbitMQ Management UI (http://localhost:15672):
# Go to Exchanges → audit.events
# Click "Publish message"
# Routing key: audit.auth.login
# Payload:
{
  "action": "auth.login",
  "entityType": "USER",
  "entityId": "1",
  "userId": 1,
  "username": "admin",
  "correlationId": "test-corr-123",
  "ipAddress": "127.0.0.1"
}

# Then verify in DB:
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;
# Should see the row you just published
```

---

### Day 8 — History Service: Query APIs

#### `HistoryController.java`:

```java
@RestController
@RequestMapping("/history")
public class HistoryController {

    // Paginated list with multiple filters
    @GetMapping("/runs")
    public ResponseEntity<ApiResponse<Page<ValidationRunDto>>> listRuns(
            @RequestParam(required = false) Long profileId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String status,      // VALID/INVALID/ERROR
            @RequestParam(required = false) String mti,
            @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt")); // newest first

        Page<ValidationRun> results = validationRunService.search(
                profileId, userId, status, mti, dateFrom, dateTo, pageable);

        return ResponseEntity.ok(ApiResponse.success(
                results.map(this::mapToDto), "OK"));
    }

    // Full detail for a single run — by runReference (VLD-xxx), NEVER by id
    @GetMapping("/runs/{runReference}")
    public ResponseEntity<ApiResponse<ValidationRunDetailDto>> getRunDetail(
            @PathVariable String runReference) {

        ValidationRun run = validationRunRepo.findByRunReference(runReference)
                .orElseThrow(() -> new NotFoundException(
                        "Run not found: " + runReference));

        List<ValidationRunField> fields = fieldRepo.findByRunId(run.getId());
        List<ValidationRunError> errors = errorRepo.findByRunId(run.getId());

        ValidationRunDetailDto detail = ValidationRunDetailDto.builder()
                .runReference(run.getRunReference())
                .profileId(run.getProfileId())
                .username(run.getUsernameSnapshot())
                .mti(run.getMti())
                .status(run.getStatus())
                .parsedFields(mapFields(fields))
                .errors(mapErrors(errors))
                .aiExplanation(run.getAiExplanation())
                .createdAt(run.getCreatedAt())
                .build();

        return ResponseEntity.ok(ApiResponse.success(detail, "OK"));
    }
}
```

#### Dynamic Query with JPA Specifications:

```java
// ValidationRunSpecification.java
public class ValidationRunSpec {

    public static Specification<ValidationRun> filter(
            Long profileId, Long userId, String status,
            String mti, LocalDate dateFrom, LocalDate dateTo) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (profileId != null)
                predicates.add(cb.equal(root.get("profileId"), profileId));
            if (userId != null)
                predicates.add(cb.equal(root.get("userId"), userId));
            if (status != null)
                predicates.add(cb.equal(root.get("status"), RunStatus.valueOf(status)));
            if (mti != null)
                predicates.add(cb.equal(root.get("mti"), mti));
            if (dateFrom != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"),
                        dateFrom.atStartOfDay()));
            if (dateTo != null)
                predicates.add(cb.lessThan(root.get("createdAt"),
                        dateTo.plusDays(1).atStartOfDay()));

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
```

#### Audit Controller:

```java
@RestController
@RequestMapping("/audit")
@PreAuthorize("hasRole('ADMIN')")   // Only ADMIN can view audit logs
public class AuditController {

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<Page<AuditLogDto>>> listLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<AuditLog> logs = auditLogRepo.findAll(
                AuditLogSpec.filter(action, entityType, userId, dateFrom, dateTo),
                pageable);

        return ResponseEntity.ok(ApiResponse.success(
                logs.map(this::mapToDto), "OK"));
    }
}
```

> 📌 **run_reference** is the ONLY cross-service identifier for validation runs. Never expose the internal database `run_id` in any API response. Always use `runReference` (VLD-xxx format).

---

### Day 9 — Bug Fixes + Error Standardization

Your job today is to audit ALL services for consistent error handling.

#### Standard Error Shapes (verify all services match):

```java
// Global exception handler — add to EACH service
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Map<String, String>> handleValidation(
            MethodArgumentNotValidException e) {
        Map<String, String> errors = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> Objects.requireNonNullElse(fe.getDefaultMessage(), "Invalid")));
        return ApiResponse.error("Validation failed", "VALIDATION_ERROR");
        // Include field-level errors in the response
    }

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleNotFound(NotFoundException e) {
        return ApiResponse.error(e.getMessage(), "NOT_FOUND");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleGeneral(Exception e) {
        log.error("Unexpected error", e);
        // NEVER expose stack trace to client
        return ApiResponse.error("Internal server error", "INTERNAL_ERROR");
    }
}
```

#### Error Response Verification Checklist:

```bash
# Test each error scenario through Gateway:

# 400 — Validation error (missing required field)
curl -X POST http://localhost:8080/profiles \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'
# Expect: {"success":false,"errorCode":"VALIDATION_ERROR","message":"Validation failed"}

# 401 — Missing/invalid JWT
curl http://localhost:8080/profiles
# Expect: {"success":false,"message":"Missing Authorization header"}

# 403 — Role check
# (Use a VIEWER token)
curl -X DELETE http://localhost:8080/rules/1 \
  -H "Authorization: Bearer $VIEWER_TOKEN"
# Expect: {"success":false,"errorCode":"FORBIDDEN"}

# 404 — Resource not found
curl http://localhost:8080/profiles/99999 \
  -H "Authorization: Bearer $TOKEN"
# Expect: {"success":false,"errorCode":"NOT_FOUND"}

# 500 — Must NOT expose stack trace
# Verify: no "at com.iso8583..." in any 500 response
```

#### PAN Masking Audit:

```bash
# Scan all service logs for raw PANs
# PAN pattern: 13-19 digit number

# After running a /validate call, check logs:
grep -E '\b[0-9]{13,19}\b' auth-service.log
grep -E '\b[0-9]{13,19}\b' validation-engine.log
grep -E '\b[0-9]{13,19}\b' history-service.log

# ALL results must show masked PANs only: 411111******1111
# If you find raw PAN in any log → report to Bala immediately
```

#### X-Correlation-ID end-to-end trace:

```bash
# 1. Send a /validate request with custom correlation ID
curl -X POST http://localhost:8080/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Correlation-ID: my-trace-id-001" \
  -H "Content-Type: application/json" \
  -d '{"profileId":1,"hexMessage":"0200..."}'

# 2. Search ALL service logs for this ID
grep "my-trace-id-001" api-gateway.log
grep "my-trace-id-001" auth-service.log        # (if involved)
grep "my-trace-id-001" validation-engine.log
grep "my-trace-id-001" history-service.log

# Every service that handled this request must show the same correlation ID
# This proves end-to-end distributed tracing is working
```

---

### Day 10 — Postman Full Coverage

Create a single Postman collection with all requests, organized in folders.

#### Collection structure:

```
ISO 8583 Validator
├── 0. Setup
│   └── Login (auto-saves JWT to env variable)
│
├── 1. Auth
│   ├── Login (ADMIN)
│   ├── Login (ANALYST)
│   ├── Login (VIEWER)
│   ├── Logout
│   ├── Create User
│   ├── Get All Users
│   ├── Get User by ID
│   ├── Update User
│   ├── Delete User (soft)
│   └── Change Password
│
├── 2. Profile
│   ├── Create Profile
│   ├── Get All Profiles
│   ├── Get Profile by ID
│   ├── Update Profile
│   ├── Activate Profile
│   ├── Create Message Format
│   ├── Get Format by ID
│   ├── Update Format (verify version bump)
│   ├── Rollback Format
│   └── Get Format Versions
│
├── 3. Rules
│   ├── Create Rule (MANDATORY)
│   ├── Create Rule (REGEX)
│   ├── Create Rule (ALLOWED_VALUES)
│   ├── Create Rule (MAX_LENGTH)
│   ├── Add Allowed Value
│   ├── Remove Allowed Value
│   ├── Get Effective Rules
│   ├── Update Rule
│   ├── Delete Rule (soft)
│   └── Bulk Import (10 rules)
│
├── 4. Validate
│   ├── Validate Message (VALID — all rules pass)
│   ├── Validate Message (INVALID — multiple errors)
│   ├── Validate Message (missing mandatory DE)
│   └── Build Message
│
├── 5. AI
│   ├── Create Global Template
│   ├── Create Profile Template
│   ├── Get All Templates
│   ├── Update Template (verify version)
│   ├── Rollback Template
│   ├── Get Ollama Config
│   ├── Update Config (toggle ollama.enabled)
│   └── AI Health Check
│
├── 6. History
│   ├── List Runs (no filters)
│   ├── List Runs (filter by status=INVALID)
│   ├── List Runs (filter by profileId + dateFrom)
│   ├── Get Run by Reference (VLD-xxx)
│   ├── List Audit Logs (no filters)
│   └── List Audit Logs (filter by action=auth.login)
│
└── 7. Error Cases
    ├── No JWT → 401
    ├── Expired JWT → 401
    ├── VIEWER creates profile → 403
    ├── Get non-existent resource → 404
    └── Invalid request body → 400
```

#### Postman Login auto-save test script:

```javascript
// Add to "Tests" tab of the Login request:
const response = pm.response.json();
if (response.success && response.data.token) {
    pm.environment.set("jwt_token", response.data.token);
    pm.environment.set("token_set_at", new Date().toISOString());
    console.log("✅ JWT saved to environment");
} else {
    console.error("❌ Login failed:", response.message);
}
```

#### Postman environment variables needed:

```
base_url      = http://localhost:8080
jwt_token     = (auto-set by login script)
profile_id    = (set after creating a profile)
format_id     = (set after creating a format)
run_reference = (copy from validate response)
```

#### Export the collection:
```
Postman → Collection → ⋯ → Export → Collection v2.1
Save as: ISO8583_Validator_Postman_Collection.json
Share with team via group chat
```

---

## 🔗 Dependencies

### What you give others:
| Deliverable | Who needs it | When |
|---|---|---|
| Gateway routing YAML (Day 1) | Everyone (all requests go through port 8080) | Day 1 EOD |
| Profile Service `/internal/profiles/{id}/format` | Bala + Logeshwaran (Validation Engine) | Day 3 |
| Postman collection (Day 10) | Everyone | Day 10 EOD |

### What you need from others:
| What | From | When |
|---|---|---|
| `common-lib` JAR | Bala | Day 1 EOD |
| RSA `public.pem` | Bala | Day 1 EOD (Gateway needs it for JwtAuthFilter from Day 2) |
| Docker infra running | Logeshwaran | Day 1 |
| RabbitMQ exchanges declared | Logeshwaran | Day 6 (History consumer needs queues ready) |
| Eureka Server running | Janani | Day 1 EOD (Gateway needs Eureka for lb:// routing) |
| `ValidationRunCompletedEvent` exact field names | Bala | Day 6 (must match what engine publishes) |

---

## ⚠️ Key Rules — Never Violate

```
✅ Gateway uses WebFlux (reactive) — never add spring-boot-starter-web
✅ /internal/** routes must NOT appear in Gateway route config
✅ History consumer: always check run_reference exists before INSERT (idempotency)
✅ audit_logs: INSERT ONLY — no update, no delete, no soft delete
✅ run_reference (VLD-xxx) is the ONLY cross-service ID — never expose internal run_id
✅ CorrelationIdFilter must run at HIGHEST_PRECEDENCE — before JwtAuthFilter
✅ PAN in validation_run_fields must be masked BEFORE insert (engine masks it — verify)
✅ Paginated list APIs: never return all rows without pagination
```

---

## 🧪 Quick Debug Checklist

| Problem | Check |
|---|---|
| Gateway: `java.lang.ClassNotFoundException: web filter` | Removed `spring-boot-starter-web` from pom? |
| `lb://auth-service` not resolving | Is Eureka running? Is auth-service registered? Check http://localhost:8761 |
| History consumer not receiving messages | Are RabbitMQ exchanges/queues declared? Check Logeshwaran's Day 4 setup |
| Duplicate runs in history | Is idempotency check (`existsByRunReference`) in consumer? |
| Audit logs getting updated | Make sure no `@OneToMany(cascade = ALL)` accidentally triggers updates |
| Postman `401` on all requests | Is `jwt_token` env variable set? Did the login test script run? |

---

*Nethra — Sprint 1 & 2 · ISO 8583 Validator · Spring Boot 3.2*
