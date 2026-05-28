# 👩‍💻 Janani — Developer Guide
### ISO 8583 Validator | Sprint 1 & 2 | 10 Days

> **Your Role:** Dev C — Infra (Eureka + Config Server) · Gateway Security (JwtAuthFilter + Rate Limiter) · Rules Service · AI Service (Ollama integration)

---

## 🗂️ What You Own

| Module | Port | Your Responsibility |
|---|---|---|
| `service-registry` | 8761 | Eureka Server — service discovery |
| `config-server` | 8888 | Centralized config for all services |
| `api-gateway` | 8080 | JwtAuthFilter + Rate Limiter (Day 2) |
| `rules-service` | 8083 | Validation rules CRUD + internal endpoint |
| `ai-service` | 8085 | Prompt templates + Ollama client + ai_run_logs |

---

## 🛠️ Laptop Setup (Do This First)

```bash
# 1. Java 21 confirm
java -version   # must say openjdk 21

# 2. Maven confirm
mvn -version

# 3. Docker infra (Logeshwaran starts this — verify it's up)
docker ps
# Must show: mysql, redis, rabbitmq all as "Up"

# 4. Install Ollama
# Mac:
brew install ollama
# Windows: download from https://ollama.ai

# 5. Pull mistral model (do this early — it's ~4GB)
ollama pull mistral:7b

# 6. Verify Ollama is running
curl http://localhost:11434/api/tags
# Should return JSON with model list
```

> ⚠️ **Ollama download is large (~4GB).** Start `ollama pull mistral:7b` first thing on Day 1 — let it download in the background while you code.

---

## 📅 Day-by-Day Tasks

---

### Day 1 — Eureka Server + Config Server

**Your services are infrastructure — all 4 devs need Eureka running by EOD Day 1.**

#### Step 1 — `service-registry` (port 8761)

```xml
<!-- pom.xml dependencies -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>
```

```java
// ServiceRegistryApplication.java
@SpringBootApplication
@EnableEurekaServer
public class ServiceRegistryApplication {
    public static void main(String[] args) {
        SpringApplication.run(ServiceRegistryApplication.class, args);
    }
}
```

```yaml
# application.yml
server:
  port: 8761

spring:
  application:
    name: service-registry

eureka:
  instance:
    hostname: localhost
  client:
    register-with-eureka: false   # Don't register itself
    fetch-registry: false
  server:
    enable-self-preservation: false  # OFF for dev — no false positives
    eviction-interval-timer-in-ms: 5000

management:
  endpoints:
    web:
      exposure:
        include: health, info
```

#### ✅ Verify Eureka:
```bash
# Start service-registry
mvn spring-boot:run

# Open browser → http://localhost:8761
# Should see: "Eureka — Instances currently registered with Eureka"
# (Initially empty — services register as they start)
```

---

#### Step 2 — `config-server` (port 8888)

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-config-server</artifactId>
</dependency>
```

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

```yaml
# application.yml
server:
  port: 8888

spring:
  application:
    name: config-server
  profiles:
    active: native          # filesystem-backed (simpler for dev)
  cloud:
    config:
      server:
        native:
          search-locations: classpath:/configs   # put yml files here

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
```

#### Config files to create under `src/main/resources/configs/`:

```
configs/
  auth-service.yml
  auth-service-dev.yml
  profile-service.yml
  rules-service.yml
  validation-engine.yml
  ai-service.yml
  history-service.yml
  api-gateway.yml
```

**Sample `auth-service.yml`:**
```yaml
# configs/auth-service.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/iso8583_db
    username: root
    password: root
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false

jwt:
  expiry-minutes: 60
```

#### ✅ Verify Config Server:
```bash
# Should return auth-service config as JSON:
curl http://localhost:8888/auth-service/default
```

> 📌 **Share the Config Server URL with everyone:** `http://localhost:8888`
> Each service's `bootstrap.yml` will point here.

---

### Day 2 — Gateway: JwtAuthFilter + Rate Limiter

Nethra builds the Gateway skeleton on Day 1. On Day 2, you add the security layer.

**Get the RSA `public.pem` from Bala first thing this morning.**

#### Step 1 — Load RSA Public Key

```java
@Configuration
public class JwtConfig {

    @Value("${jwt.public-key-path:classpath:keys/public.pem}")
    private Resource publicKeyResource;

    @Bean
    public PublicKey jwtPublicKey() throws Exception {
        String pem = new String(publicKeyResource.getInputStream().readAllBytes())
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(pem);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(decoded);
        return KeyFactory.getInstance("RSA").generatePublic(spec);
    }
}
```

#### Step 2 — `JwtAuthFilter` (GlobalFilter)

```java
@Component
@Order(-1)   // Run BEFORE all other filters
public class JwtAuthFilter implements GlobalFilter {

    private final PublicKey publicKey;

    // Public routes — no JWT needed
    private static final List<String> PUBLIC_PATHS = List.of(
            "/auth/login",
            "/auth/logout",
            "/actuator"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().toString();

        // Bypass auth for public routes
        if (PUBLIC_PATHS.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        // Extract Bearer token
        String authHeader = exchange.getRequest()
                .getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return rejectWith401(exchange, "Missing Authorization header");
        }

        String token = authHeader.substring(7);

        try {
            // Verify RS256 signature + expiry
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(publicKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            // Inject user info as headers for downstream services
            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .header("X-Auth-User-Id", claims.getSubject())
                    .header("X-Auth-Username", (String) claims.get("username"))
                    .header("X-Auth-Role", (String) claims.get("role"))
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());

        } catch (ExpiredJwtException e) {
            return rejectWith401(exchange, "Token expired");
        } catch (JwtException e) {
            return rejectWith401(exchange, "Invalid token");
        }
    }

    private Mono<Void> rejectWith401(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders()
                .setContentType(MediaType.APPLICATION_JSON);
        byte[] body = ("{\"success\":false,\"message\":\"" + message + "\"}").getBytes();
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(body);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }
}
```

#### Step 3 — Redis Rate Limiter

```yaml
# In api-gateway application.yml (or via config-server)
spring:
  cloud:
    gateway:
      default-filters:
        - name: RequestRateLimiter
          args:
            redis-rate-limiter.replenishRate: 20    # 20 req/s per user
            redis-rate-limiter.burstCapacity: 40    # burst up to 40
            redis-rate-limiter.requestedTokens: 1
            key-resolver: "#{@userKeyResolver}"

  data:
    redis:
      host: localhost
      port: 6379
```

```java
// Rate limit per user (uses X-Auth-User-Id injected by JwtAuthFilter)
@Bean
public KeyResolver userKeyResolver() {
    return exchange -> Mono.justOrEmpty(
            exchange.getRequest().getHeaders().getFirst("X-Auth-User-Id"))
            .defaultIfEmpty("anonymous");
}
```

#### ✅ Verify Rate Limiter:
```bash
# Send 50 rapid requests — after 40 burst, should get 429
for i in {1..50}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://localhost:8080/users \
    -H "Authorization: Bearer $TOKEN"
done
# First 40: 200, After: 429 Too Many Requests
```

---

### Day 3 — Rules Service: Full CRUD

```
rules-service/
  src/main/java/com/iso8583/rules/
    controller/
      RuleController.java
      FieldDefinitionController.java
      InternalRuleController.java
    service/
      RuleService.java
    repository/
      RuleRepository.java
      RuleAllowedValueRepository.java
    entity/
      ValidationRule.java
      RuleAllowedValue.java
    dto/
      CreateRuleRequest.java
      RuleDto.java
    event/
      RuleEventPublisher.java
```

#### `RuleController.java`:

```java
@RestController
@RequestMapping("/rules")
public class RuleController {

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<ApiResponse<RuleDto>> createRule(
            @RequestBody @Valid CreateRuleRequest req) {
        RuleDto created = ruleService.create(req);
        ruleEventPublisher.publishRuleUpdated(req.getProfileId(), req.getMti());
        return ResponseEntity.status(201).body(ApiResponse.success(created, "Rule created"));
    }

    // GET /rules?profileId=1&mti=0200
    @GetMapping
    public ResponseEntity<ApiResponse<List<RuleDto>>> getRules(
            @RequestParam Long profileId,
            @RequestParam String mti) {
        // Only fetch: active = true AND deleted_at IS NULL
        List<RuleDto> rules = ruleService.getEffectiveRules(profileId, mti);
        return ResponseEntity.ok(ApiResponse.success(rules, "OK"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<ApiResponse<RuleDto>> updateRule(
            @PathVariable Long id,
            @RequestBody UpdateRuleRequest req) { ... }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable Long id) {
        // SOFT DELETE — set deleted_at = now()
        ruleService.softDelete(id);
        // Publish cache invalidation event
        ValidationRule rule = ruleService.getById(id);
        ruleEventPublisher.publishRuleDeleted(rule.getProfileId(), rule.getMti());
        return ResponseEntity.ok(ApiResponse.success(null, "Rule deleted"));
    }

    // Allowed values management
    @PostMapping("/{id}/allowed-values")
    public ResponseEntity<ApiResponse<Void>> addAllowedValue(
            @PathVariable Long id,
            @RequestBody AddAllowedValueRequest req) {
        ruleService.addAllowedValue(id, req.getValue());
        return ResponseEntity.ok(ApiResponse.success(null, "Value added"));
    }

    @DeleteMapping("/{id}/allowed-values/{value}")
    public ResponseEntity<ApiResponse<Void>> removeAllowedValue(
            @PathVariable Long id,
            @PathVariable String value) { ... }
}
```

#### Internal endpoint for Validation Engine (Feign):

```java
// NOT exposed through Gateway — internal only
@RestController
@RequestMapping("/internal/rules")
public class InternalRuleController {

    @GetMapping
    public List<ValidationRule> getRulesInternal(
            @RequestParam Long profileId,
            @RequestParam String mti) {
        // Returns raw entity list (not DTO) for engine consumption
        return ruleService.getEffectiveRulesForEngine(profileId, mti);
    }

    @GetMapping("/field-definitions")
    public List<FieldDefinition> getFieldDefinitions(
            @RequestParam Long profileId,
            @RequestParam String mti) {
        return fieldDefService.getByProfileAndMti(profileId, mti);
    }
}
```

#### `getEffectiveRules` — Repository Query:

```java
// RuleRepository.java
@Query("""
    SELECT r FROM ValidationRule r
    WHERE r.profileId = :profileId
      AND r.mti = :mti
      AND r.active = true
      AND r.deletedAt IS NULL
    ORDER BY r.fieldId, r.ruleType
""")
List<ValidationRule> findEffectiveRules(
    @Param("profileId") Long profileId,
    @Param("mti") String mti);
```

---

### Day 4 — Rules Service Testing

Run these in order using Postman:

```
1. POST /rules
   Body: { profileId: 1, mti: "0200", fieldId: 2, ruleType: "MANDATORY" }
   → Expect: 201, rule created with id

2. POST /rules
   Body: { profileId: 1, mti: "0200", fieldId: 4, ruleType: "MAX_LENGTH", maxLength: 12 }
   → Expect: 201

3. POST /rules/{id}/allowed-values
   Body: { value: "000000" }
   → Expect: 200

4. GET /rules?profileId=1&mti=0200
   → Expect: 2 rules returned (both active)

5. DELETE /rules/{id}  (soft delete)
   → Expect: 200

6. GET /rules?profileId=1&mti=0200
   → Expect: 1 rule (deleted one should NOT appear)

7. GET /internal/rules?profileId=1&mti=0200
   → Expect: same 1 rule (internal endpoint)
```

#### RabbitMQ Event Verification:

```
After step 1 (POST /rules):
→ Open http://localhost:15672
→ Go to Queues → validation-engine.cache-invalidation
→ Click "Get Messages" → should see RULE_UPDATED event

After step 5 (DELETE /rules):
→ Same queue → should see RULE_DELETED event
```

#### `is_builder_visible` filter test:

```sql
-- Insert a field definition with is_builder_visible = false
INSERT INTO field_definitions (profile_id, mti, field_number, field_name,
  data_type, is_builder_visible)
VALUES (1, '0200', 1, 'Bitmap', 'BINARY', false);

-- API call should NOT return this field
GET /field-definitions?profileId=1&mti=0200
-- Verify: DE1 (Bitmap) not in response
```

---

### Day 5 — Rules E2E via Gateway

```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

# 1. Full CRUD through Gateway (port 8080)
curl -X POST http://localhost:8080/rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profileId":1,"mti":"0200","fieldId":2,"ruleType":"MANDATORY"}'

# 2. Role test — VIEWER must get 403 on POST
VIEWER_TOKEN="<get a VIEWER role token>"
curl -X POST http://localhost:8080/rules \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profileId":1,"mti":"0200","fieldId":3,"ruleType":"MANDATORY"}'
# Expect: 403 Forbidden

# 3. Verify RULE_UPDATED event end-to-end
# After POST /rules → check RabbitMQ UI → cache.invalidation queue
# Should see: {"eventType":"RULE_UPDATED","profileId":1,"mti":"0200"}
```

---

### Day 6 — AI Service: Templates + Internal Endpoint

```
ai-service/
  src/main/java/com/iso8583/ai/
    controller/
      AiTemplateController.java
      AiConfigController.java
      InternalAiController.java
    service/
      AiTemplateService.java
      OllamaService.java
      AiRunLogService.java
    repository/
      AiPromptTemplateRepository.java
      AiRunLogRepository.java
      OllamaConfigRepository.java
    entity/
      AiPromptTemplate.java
      AiRunLog.java
      OllamaConfig.java
    client/
      OllamaClient.java
```

#### Template Scope Resolution Logic:

```java
@Service
public class AiTemplateService {

    public AiPromptTemplate resolveTemplate(Long profileId, String mti) {
        // Priority: PROFILE scope → GLOBAL scope
        // 1. Try to find a PROFILE-specific template
        Optional<AiPromptTemplate> profileTemplate = templateRepo
                .findByProfileIdAndMtiAndActiveTrue(profileId, mti);

        if (profileTemplate.isPresent()) {
            return profileTemplate.get();
        }

        // 2. Fall back to GLOBAL template
        return templateRepo.findFirstByScopeAndActiveTrue(TemplateScope.GLOBAL)
                .orElseThrow(() -> new NotFoundException("No active prompt template found"));
    }

    public String substituteVariables(String template, TemplateContext ctx) {
        // Replace {mti} {profile} {errors} {fields}
        return template
                .replace("{mti}", ctx.getMti())
                .replace("{profile}", ctx.getProfileName())
                .replace("{errors}", formatErrors(ctx.getErrors()))
                .replace("{fields}", formatFields(ctx.getParsedFields()));
    }

    private String formatErrors(List<ValidationError> errors) {
        if (errors == null || errors.isEmpty()) return "No errors";
        return errors.stream()
                .map(e -> "DE" + e.getFieldId() + ": " + e.getErrorMessage())
                .collect(Collectors.joining("\n"));
    }
}
```

#### Internal endpoint for Validation Engine:

```java
@RestController
@RequestMapping("/internal/ai")
public class InternalAiController {

    @PostMapping("/explain")
    public ResponseEntity<String> explain(
            @RequestBody AiExplainRequest request) {
        // Called by validation-engine via Feign
        // Returns explanation string (nullable)
        try {
            String explanation = ollamaService.getExplanation(
                    request.getProfileId(),
                    request.getMti(),
                    request.getErrors(),
                    request.getParsedFields());
            return ResponseEntity.ok(explanation);
        } catch (Exception e) {
            log.warn("AI explain failed: {}", e.getMessage());
            return ResponseEntity.ok(null);  // null = SKIP_AI, caller handles gracefully
        }
    }
}
```

---

### Day 7 — AI Service: Ollama Client + ai_run_logs

#### `OllamaClient.java` — calls local Ollama:

```java
@Component
public class OllamaClient {

    private final RestTemplate restTemplate;
    private final OllamaConfigRepository configRepo;

    public String callOllama(String prompt) {
        // Load config from DB
        String endpoint = getConfig("ollama.endpoint");  // http://localhost:11434
        String model    = getConfig("ollama.model");     // mistral:7b
        int timeout     = Integer.parseInt(getConfig("ollama.timeout.ms"));

        OllamaRequest req = OllamaRequest.builder()
                .model(model)
                .prompt(prompt)
                .stream(false)
                .build();

        OllamaResponse response = restTemplate.postForObject(
                endpoint + "/api/generate", req, OllamaResponse.class);

        return response != null ? response.getResponse() : null;
    }

    private String getConfig(String key) {
        return configRepo.findByConfigKey(key)
                .map(OllamaConfig::getConfigValue)
                .orElseThrow(() -> new RuntimeException("Config not found: " + key));
    }
}
```

#### Log EVERY AI call to `ai_run_logs`:

```java
@Service
public class OllamaService {

    public String getExplanation(Long profileId, String mti,
            List<ValidationError> errors, Map<Integer, String> fields) {

        // Check if AI is enabled
        boolean enabled = Boolean.parseBoolean(
                ollamaConfigRepo.findByConfigKey("ollama.enabled")
                        .map(OllamaConfig::getConfigValue).orElse("false"));

        if (!enabled) {
            logSkip(runRef, "DISABLED");
            return null;  // SKIP_AI
        }

        // Build prompt from template
        AiPromptTemplate template = templateService.resolveTemplate(profileId, mti);
        String prompt = templateService.substituteVariables(template.getPromptTemplate(),
                buildContext(profileId, mti, errors, fields));

        long startMs = System.currentTimeMillis();
        int retryCount = 0;
        String status = "SUCCESS";
        String responseText = null;
        Integer httpStatus = null;

        try {
            responseText = ollamaClient.callOllama(prompt);
            httpStatus = 200;
        } catch (Exception e) {
            status = "FAILED";
            retryCount = 1;  // Could implement retry here
            log.warn("Ollama call failed: {}", e.getMessage());
        } finally {
            long durationMs = System.currentTimeMillis() - startMs;
            // Always log — success or failure
            aiRunLogService.log(AiRunLog.builder()
                    .runReference(runRef)
                    .templateId(template.getId())
                    .promptSent(prompt)
                    .responseReceived(responseText)
                    .durationMs(durationMs)
                    .status(status)
                    .retryCount(retryCount)
                    .httpStatusCode(httpStatus)
                    .build());
        }

        return responseText;
    }
}
```

#### Circuit Breaker on Ollama calls:

```java
// application.yml
resilience4j:
  circuitbreaker:
    instances:
      ollama-cb:
        slidingWindowSize: 5
        failureRateThreshold: 60
        waitDurationInOpenState: 30s
        timeoutDuration: 20s

// Usage:
@CircuitBreaker(name = "ollama-cb", fallbackMethod = "ollamaFallback")
public String callOllamaWithCB(String prompt) {
    return ollamaClient.callOllama(prompt);
}

public String ollamaFallback(String prompt, Throwable t) {
    log.warn("Ollama CB open — returning null explanation");
    aiRunLogService.logCbOpen(runRef);
    return null;  // validation still succeeds without AI explanation
}
```

#### `/ai/health` endpoint:
```java
@GetMapping("/ai/health")
public ResponseEntity<ApiResponse<AiHealthDto>> health() {
    try {
        String resp = ollamaClient.callOllama("Hello");
        String model = ollamaConfigRepo.findByConfigKey("ollama.model")
                .map(OllamaConfig::getConfigValue).orElse("unknown");
        return ResponseEntity.ok(ApiResponse.success(
                new AiHealthDto("UP", model), "Ollama is running"));
    } catch (Exception e) {
        return ResponseEntity.ok(ApiResponse.success(
                new AiHealthDto("DOWN", null), "Ollama not reachable"));
    }
}
```

---

### Day 8 — AI Service: Template Versioning + Ollama Config API

#### Template Versioning (same pattern as Profile Service):

```java
@PutMapping("/ai/templates/{id}")
@PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
public ResponseEntity<ApiResponse<TemplateDto>> updateTemplate(
        @PathVariable Long id,
        @RequestBody UpdateTemplateRequest req) {

    AiPromptTemplate template = templateRepo.findById(id)
            .orElseThrow(() -> new NotFoundException("Template not found"));

    // 1. Bump version number
    int newVersion = template.getCurrentVersion() + 1;

    // 2. Save version history (mark old as not current)
    templateVersionRepo.findByTemplateIdAndIsCurrent(id, true)
            .forEach(v -> { v.setIsCurrent(false); templateVersionRepo.save(v); });

    // 3. Insert new version row
    AiPromptTemplateVersion version = AiPromptTemplateVersion.builder()
            .templateId(id)
            .versionNumber(newVersion)
            .promptContent(req.getPromptTemplate())
            .isCurrent(true)
            .createdBy(getCurrentUser())
            .build();
    templateVersionRepo.save(version);

    // 4. Update main template
    template.setPromptTemplate(req.getPromptTemplate());
    template.setCurrentVersion(newVersion);
    templateRepo.save(template);

    // Publish audit event
    rabbitTemplate.convertAndSend("audit.events", "audit.ai.template-update",
            buildAuditEvent("ai.template-update", id.toString()));

    return ResponseEntity.ok(ApiResponse.success(mapToDto(template), "Updated"));
}

// Rollback
@PutMapping("/ai/templates/{id}/rollback")
public ResponseEntity<ApiResponse<TemplateDto>> rollback(@PathVariable Long id) {
    AiPromptTemplate template = templateRepo.findById(id).orElseThrow();
    int prevVersion = template.getCurrentVersion() - 1;
    if (prevVersion < 1) throw new BadRequestException("No previous version to rollback to");

    AiPromptTemplateVersion prevContent = templateVersionRepo
            .findByTemplateIdAndVersionNumber(id, prevVersion)
            .orElseThrow(() -> new NotFoundException("Version not found"));

    template.setPromptTemplate(prevContent.getPromptContent());
    templateRepo.save(template);

    return ResponseEntity.ok(ApiResponse.success(mapToDto(template), "Rolled back"));
}
```

#### Ollama Config API:

```java
@GetMapping("/ai/config")
public ResponseEntity<ApiResponse<Map<String, String>>> getConfig() {
    Map<String, String> config = ollamaConfigRepo.findAll().stream()
            .collect(Collectors.toMap(
                    OllamaConfig::getConfigKey,
                    OllamaConfig::getConfigValue));
    return ResponseEntity.ok(ApiResponse.success(config, "OK"));
}

@PutMapping("/ai/config/{key}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<ApiResponse<Void>> updateConfig(
        @PathVariable String key,
        @RequestBody UpdateConfigRequest req) {

    OllamaConfig config = ollamaConfigRepo.findByConfigKey(key)
            .orElseThrow(() -> new NotFoundException("Config key not found: " + key));

    String oldValue = config.getConfigValue();
    config.setConfigValue(req.getValue());
    ollamaConfigRepo.save(config);

    // Publish audit event for config changes
    rabbitTemplate.convertAndSend("audit.events", "audit.ai.config-change",
            buildAuditEvent("ai.config-change", key, oldValue, req.getValue()));

    return ResponseEntity.ok(ApiResponse.success(null, "Config updated"));
}
```

---

### Day 9 — Ollama Integration Test

```bash
# 1. Full end-to-end AI call via /validate
curl -X POST http://localhost:8080/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": 1,
    "hexMessage": "0200..."
  }'
# Verify in response: "aiExplanation": "The message failed because..."

# 2. SKIP_AI fallback test — stop Ollama
# Mac: pkill ollama
# Then send the same request:
curl -X POST http://localhost:8080/validate ...
# Expect: validation succeeds (status VALID/INVALID), but aiExplanation: null
# Must NOT fail with 500 error!

# 3. Profile-scope template test
# Create a PROFILE-scope template for profileId=1:
curl -X POST http://localhost:8080/ai/templates \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"templateName":"Profile1 Template","scope":"PROFILE","profileId":1,"promptTemplate":"..."}'

# Validate with profileId=1
# → Verify PROFILE template is used (check ai_run_logs.template_id)

# 4. Verify ai_run_logs table
SELECT run_reference, duration_ms, status, retry_count
FROM ai_run_logs
ORDER BY created_at DESC
LIMIT 10;
# Every /validate call must have a corresponding row
# Even SKIP/fallback cases must be logged with status='SKIPPED' or 'CB_OPEN'
```

---

### Day 10 — Final Demo Prep + Retrospective

#### Demo Script (15 min — practice this):

```
Step 1: Login as ADMIN (30 sec)
  POST /auth/login → show JWT received

Step 2: Create a switch profile (1 min)
  POST /profiles → show profile created with ID

Step 3: Add message format (1 min)
  POST /formats → show format linked to profile, version = 1

Step 4: Add validation rules (2 min)
  POST /rules (x4) → mandatory DE2, DE4, DE11 + regex on DE12
  Show rules listed via GET /rules

Step 5: Validate a correct 0200 message (2 min)
  POST /validate → show: all fields parsed, 0 errors, AI explanation

Step 6: Validate an incorrect message (2 min)
  POST /validate (missing DE4) → show: errors list, AI explanation of what failed

Step 7: View history (1 min)
  GET /history/runs/{VLD-xxx} → full run detail

Step 8: View audit logs (1 min)
  GET /audit/logs → show the audit trail of all actions
```

#### Known Issues Document format:
```markdown
# Known Issues — Sprint 2

## Open Issues
| # | Issue | Severity | Owner | Status |
|---|---|---|---|---|
| 1 | Ollama slow on CPU-only machines (>10s) | Low | Janani | Known |
| 2 | ... | ... | ... | ... |

## Resolved in Sprint 2
| # | Issue | Fixed By |
|---|---|---|
| 1 | Circuit breaker firing too early | Increased slidingWindowSize |
```

#### Sprint Retrospective Notes — capture these:
- What went well
- What was harder than expected
- jPOS learning curve — was Day 1 unit test enough?
- Did 10 days feel tight? Which feature was de-scoped?
- Suggestions for Sprint 3

---

## 🔗 Dependencies

### What you give others:
| Deliverable | Who needs it | When |
|---|---|---|
| Eureka Server running (port 8761) | Everyone (service registration) | Day 1 EOD |
| Config Server running (port 8888) | Everyone (centralized config) | Day 1 EOD |
| `public.pem` loaded in Gateway JwtAuthFilter | All requests through Gateway | Day 2 |
| Rules Service `/internal/rules` endpoint | Bala (Validation Engine Feign) | Day 6 |
| AI Service `/internal/ai/explain` endpoint | Bala (Validation Engine Feign) | Day 6 |

### What you need from others:
| What | From | When |
|---|---|---|
| `common-lib` JAR (`mvn install`) | Bala | Day 1 EOD |
| RSA `public.pem` key file | Bala | Day 2 morning — don't start JwtAuthFilter without this |
| Docker infra up (MySQL, Redis, RabbitMQ) | Logeshwaran | Day 1 |
| RabbitMQ exchanges declared | Logeshwaran | Day 3 (before publishing Rule events) |

---

## ⚠️ Key Rules — Never Violate

```
✅ JwtAuthFilter must run BEFORE all other Gateway filters — use @Order(-1)
✅ /internal/** must NOT be in Gateway route config — internal only
✅ AI failure must NEVER fail the /validate response — always fallback to null
✅ Log EVERY Ollama call to ai_run_logs — even skipped/failed ones
✅ Template scope: PROFILE overrides GLOBAL — never the reverse
✅ Circuit breaker open = return null, NOT throw exception
✅ Public routes (/auth/login, /actuator) must bypass JwtAuthFilter
```

---

## 🧪 Quick Debug Checklist

| Problem | Check |
|---|---|
| Services not showing in Eureka | Is `eureka.client.service-url.defaultZone` set in each service's bootstrap.yml? |
| Config Server returns 404 | Does the file name match `{service-name}.yml` exactly? |
| JwtAuthFilter giving 401 on valid token | Is public.pem in the correct location? Check key format (no BOM characters) |
| Ollama returning empty response | Try `curl http://localhost:11434/api/tags` — is mistral:7b downloaded? |
| Rate limiter not working | Is Redis running? Check `spring.data.redis` config |
| RULE_UPDATED event not firing | Is RabbitMQ fanout exchange `cache.invalidation` declared? (Logeshwaran's Day 4) |

---

*Janani — Sprint 1 & 2 · ISO 8583 Validator · Spring Boot 3.2*
