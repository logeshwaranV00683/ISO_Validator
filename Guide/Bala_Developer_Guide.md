# 👨‍💻 Bala — Developer Guide
### ISO 8583 Validator | Sprint 1 & 2 | 10 Days

> **Your Role:** Dev A — `common-lib` architect · Auth Service owner · Validation Engine (core parse + rule evaluation)

---

## 🗂️ What You Own

| Module | Port | Your Responsibility |
|---|---|---|
| `common-lib` | — | Shared utilities used by ALL services |
| `auth-service` | 8081 | Users, login, sessions, RBAC |
| `validation-engine` | 8084 | jPOS parse + RulesEngine + /validate endpoint |

---

## 🛠️ Laptop Setup (Do This First)

```bash
# 1. Java 21
java -version  # must say 21

# 2. Maven 3.9.x
mvn -version

# 3. Start Docker infra
docker-compose up -d
# Verify:
docker ps  # MySQL, Redis, RabbitMQ must all be "Up"
```

> ⚠️ **Critical:** Run `mvn install` on `common-lib` BEFORE touching any service. All 3 other devs depend on your lib.

---

## 📅 Day-by-Day Tasks

---

### Day 1 — Maven Multi-Module + common-lib

**This is the most important day. Everyone is blocked until common-lib is done.**

#### Step 1 — Create parent `pom.xml`

```xml
<!-- pom.xml (root) -->
<groupId>com.iso8583</groupId>
<artifactId>iso8583-validator</artifactId>
<version>1.0.0-SNAPSHOT</version>
<packaging>pom</packaging>

<modules>
  <module>common-lib</module>
  <module>auth-service</module>
  <module>profile-service</module>
  <module>rules-service</module>
  <module>validation-engine</module>
  <module>ai-service</module>
  <module>history-service</module>
  <module>api-gateway</module>
  <module>service-registry</module>
  <module>config-server</module>
</modules>
```

Add common dependency management in root pom:
- `spring-boot-starter-parent` 3.2.x
- `spring-cloud-dependencies` 2023.0.x BOM
- `jjwt` 0.12.x
- `jPOS` 2.1.x
- `resilience4j`
- `caffeine`

---

#### Step 2 — common-lib: `ApiResponse<T>`

```java
// common-lib/src/main/java/com/iso8583/common/dto/ApiResponse.java
@Data
@Builder
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private String errorCode;
    private LocalDateTime timestamp = LocalDateTime.now();
    private String correlationId;

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true).data(data).message(message).build();
    }

    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return ApiResponse.<T>builder()
                .success(false).message(message).errorCode(errorCode).build();
    }
}
```

---

#### Step 3 — common-lib: `PanMaskingUtil`

```java
// Masks PAN: keep first 6 + last 4, replace middle with ****
public class PanMaskingUtil {

    private static final Pattern PAN_PATTERN =
        Pattern.compile("\\b(\\d{6})(\\d+)(\\d{4})\\b");

    public static String mask(String value) {
        if (value == null || value.length() < 13) return value;
        Matcher m = PAN_PATTERN.matcher(value);
        if (m.find()) {
            String middle = "*".repeat(m.group(2).length());
            return m.group(1) + middle + m.group(3);
        }
        return value;
    }

    // Call this before EVERY log statement involving card data
    public static Map<Integer, String> maskFields(Map<Integer, String> fields) {
        Map<Integer, String> masked = new HashMap<>(fields);
        // DE2 = PAN
        if (masked.containsKey(2)) {
            masked.put(2, mask(masked.get(2)));
        }
        return masked;
    }
}
```

> ❗ Rule: **Never log raw PAN.** Always call `PanMaskingUtil.mask()` before any `log.info()` / `log.debug()` that involves DE2.

---

#### Step 4 — common-lib: `JwtUtil`

```java
public class JwtUtil {
    // RS256 — use Public Key to verify (distributed to all services)
    // Use Private Key only in auth-service to sign

    public static Claims parseToken(String token, PublicKey publicKey) {
        return Jwts.parserBuilder()
                .setSigningKey(publicKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public static boolean isExpired(Claims claims) {
        return claims.getExpiration().before(new Date());
    }

    public static String extractRole(Claims claims) {
        return (String) claims.get("role");
    }
}
```

> 📌 Generate RSA key pair on Day 1:
> ```bash
> openssl genrsa -out private.pem 2048
> openssl rsa -in private.pem -pubout -out public.pem
> ```
> Share `public.pem` with Janani (Gateway), Nethra (History Service) and Logeshwaran.

---

#### Step 5 — common-lib: `BaseEntity`

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {
    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;
}
```

#### ✅ End of Day 1 — Run this:
```bash
cd common-lib
mvn clean install
# Must succeed with BUILD SUCCESS
# Share the .jar path in group chat — others need it
```

---

### Day 2 — Auth Service: Users CRUD

#### Project structure:
```
auth-service/
  src/main/java/com/iso8583/auth/
    controller/
      UserController.java
      AuthController.java
    service/
      UserService.java
      AuthService.java
    repository/
      UserRepository.java
      UserSessionRepository.java
    entity/
      User.java
      UserSession.java
    dto/
      LoginRequest.java
      LoginResponse.java
      CreateUserRequest.java
    config/
      SecurityConfig.java
```

#### `User.java` entity:
```java
@Entity
@Table(name = "users")
public class User extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String passwordHash;    // BCrypt only — never store plain text

    private String fullName;
    private String avatarInitials;  // auto-derive from fullName

    @Enumerated(EnumType.STRING)
    private Role role;              // ADMIN, ANALYST, VIEWER

    private boolean active = true;
    private LocalDateTime lockedUntil;
    private int failedLoginCount = 0;
    private LocalDateTime passwordChangedAt;
    private LocalDateTime deletedAt;  // soft delete
}
```

#### `UserController.java`:
```java
@RestController
@RequestMapping("/users")
@PreAuthorize("hasRole('ADMIN')")  // Only ADMIN can manage users
public class UserController {

    @PostMapping
    public ResponseEntity<ApiResponse<UserDto>> createUser(
            @RequestBody @Valid CreateUserRequest req) {
        // auto-derive avatarInitials from fullName:
        // "John Doe" → "JD"
        String initials = Arrays.stream(req.getFullName().split(" "))
                .map(w -> String.valueOf(w.charAt(0)).toUpperCase())
                .collect(Collectors.joining());
        // ... save user
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        // SOFT DELETE — set deletedAt = now(), do NOT remove the row
    }
}
```

---

### Day 3 — Auth Service: RBAC + Internal API

#### RBAC with `@PreAuthorize`:
```java
// Auth Service Security Config
@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    // Role hierarchy:
    // ADMIN  → all access
    // ANALYST → read + validate
    // VIEWER → read only
}

// Usage in controllers:
@PreAuthorize("hasAnyRole('ADMIN', 'ANALYST', 'VIEWER')")
@GetMapping  // All roles can read

@PreAuthorize("hasRole('ADMIN')")
@PostMapping  // Only ADMIN can create

@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/{id}")
```

#### Internal token validation endpoint:
```java
// Called by API Gateway's JwtAuthFilter
@RestController
@RequestMapping("/internal/auth")
public class InternalAuthController {

    @GetMapping("/validate-token")
    public ResponseEntity<TokenValidationResult> validateToken(
            @RequestHeader("Authorization") String bearerToken) {
        // 1. Parse JWT
        // 2. Extract jti (UUID from claims)
        // 3. Look up user_sessions by jti
        // 4. Check revoked_at IS NULL
        // 5. Return valid=true/false + role + userId
    }
}
```

> ⚠️ This endpoint is NOT exposed at the Gateway level. It's only called internally by the Gateway's filter.

#### Password change — critical logic:
```java
@PutMapping("/{id}/password")
public ResponseEntity<ApiResponse<Void>> changePassword(
        @PathVariable Long id, @RequestBody ChangePasswordRequest req) {
    // 1. Verify current password (BCrypt check)
    // 2. Hash new password with BCrypt
    // 3. Update user.passwordHash
    // 4. Set user.passwordChangedAt = now()
    // 5. REVOKE ALL EXISTING SESSIONS for this user
    //    UPDATE user_sessions SET revoked_at = now(), revoke_reason = 'PASSWORD_CHANGED'
    //    WHERE user_id = id AND revoked_at IS NULL
}
```

---

### Day 4 — Auth Service Testing

Run these Postman scenarios in order:

```
1. POST /auth/login  (valid credentials)
   → Expect: 200, JWT in response body

2. POST /users  (with JWT from step 1, ADMIN role)
   → Expect: 201, user created

3. POST /auth/logout  (with JWT)
   → Expect: 200

4. GET /users  (with the SAME revoked JWT)
   → Expect: 401 Unauthorized
```

#### Edge cases to verify:

| Scenario | Expected Result |
|---|---|
| Wrong password (1st attempt) | 400, `failedLoginCount = 1` |
| Wrong password (5th attempt) | 400, `locked_until = now + 15min` |
| Login with locked account | 403, "Account locked" message |
| Expired JWT (manually set exp in past) | 401 |
| Missing Authorization header | 401 |
| VIEWER role tries to create user | 403 |

#### Verify DB rows:
```sql
-- Check session written on login
SELECT * FROM user_sessions ORDER BY created_at DESC LIMIT 5;

-- Check revoked_at on logout
SELECT username, revoked_at, revoke_reason FROM user_sessions
WHERE revoked_at IS NOT NULL;
```

---

### Day 5 — Auth E2E via Gateway

```bash
# All calls go through port 8080 (Gateway), NOT 8081 (Auth directly)

# 1. Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Copy the JWT from response

# 2. Use JWT to call protected endpoint
curl http://localhost:8080/users \
  -H "Authorization: Bearer <JWT>"
# Expect: 200 with user list

# 3. Verify X-Correlation-ID in response headers
curl -v http://localhost:8080/auth/login ...
# Look for: X-Correlation-ID: <uuid> in response headers

# 4. Invalid JWT test
curl http://localhost:8080/users \
  -H "Authorization: Bearer invalidtoken123"
# Expect: 401 from Gateway (not from Auth Service)
```

---

### Day 6 — Validation Engine: jPOS Setup

#### Add jPOS dependency:
```xml
<dependency>
    <groupId>org.jpos</groupId>
    <artifactId>jpos</artifactId>
    <version>2.1.9</version>
</dependency>
```

#### `IsoParserUtil.java` — stateless utility:
```java
public class IsoParserUtil {

    // One packager per format type — load from XML config
    public static Map<Integer, String> parse(String hexMessage, ISOPackager packager)
            throws ISOException {

        byte[] bytes = ISOUtil.hex2byte(hexMessage);
        ISOMsg isoMsg = new ISOMsg();
        isoMsg.setPackager(packager);
        isoMsg.unpack(bytes);

        Map<Integer, String> fields = new HashMap<>();
        for (int i = 0; i <= 128; i++) {
            if (isoMsg.hasField(i)) {
                fields.put(i, isoMsg.getString(i));
            }
        }
        return fields;
    }

    // Use GenericPackager with ISO87 or ISO93 XML file
    public static ISOPackager loadPackager(String xmlResourcePath) throws ISOException {
        return new GenericPackager(xmlResourcePath);
    }
}
```

#### Unit test — run this on Day 6 first:
```java
@Test
void testParse0200Message() {
    // Sample 0200 ISO8583 hex string (use a known test message)
    String hex = "0200..."; // get a sample from online ISO8583 test tools
    ISOPackager packager = IsoParserUtil.loadPackager("packager/iso87ascii.xml");
    Map<Integer, String> fields = IsoParserUtil.parse(hex, packager);

    assertNotNull(fields.get(2));  // DE2 = PAN
    assertNotNull(fields.get(3));  // DE3 = Processing Code
    assertNotNull(fields.get(4));  // DE4 = Amount
    assertNotNull(fields.get(11)); // DE11 = STAN

    // Verify PAN is never logged raw
    log.info("Parsed: {}", PanMaskingUtil.maskFields(fields)); // ✅ masked
}
```

---

### Day 7 — Validation Engine: RulesEngine

```java
// Pure stateless class — NO Spring annotations, NO DB, NO I/O
// Input and output only. Fully unit-testable.
public class RulesEngine {

    public List<ValidationError> evaluate(
            List<ValidationRule> rules,
            Map<Integer, String> parsedFields) {

        List<ValidationError> errors = new ArrayList<>();

        for (ValidationRule rule : rules) {
            int fieldId = rule.getFieldId();
            String value = parsedFields.get(fieldId);

            switch (rule.getRuleType()) {
                case MANDATORY -> {
                    if (value == null || value.isBlank()) {
                        errors.add(new ValidationError(fieldId, "MANDATORY_MISSING",
                                "Field DE" + fieldId + " is mandatory"));
                    }
                }
                case REGEX -> {
                    if (value != null && !value.matches(rule.getRulePattern())) {
                        errors.add(new ValidationError(fieldId, "REGEX_FAILED",
                                "DE" + fieldId + " does not match pattern"));
                    }
                }
                case ALLOWED_VALUES -> {
                    if (value != null && !rule.getAllowedValues().contains(value)) {
                        errors.add(new ValidationError(fieldId, "INVALID_VALUE",
                                "DE" + fieldId + " value '" + value + "' not allowed"));
                    }
                }
                case MAX_LENGTH -> {
                    if (value != null && value.length() > rule.getMaxLength()) {
                        errors.add(new ValidationError(fieldId, "MAX_LENGTH_EXCEEDED",
                                "DE" + fieldId + " exceeds max length " + rule.getMaxLength()));
                    }
                }
                case MIN_LENGTH -> {
                    if (value != null && value.length() < rule.getMinLength()) {
                        errors.add(new ValidationError(fieldId, "MIN_LENGTH_VIOLATED",
                                "DE" + fieldId + " below min length " + rule.getMinLength()));
                    }
                }
            }
        }
        return errors;
    }
}
```

#### Write 10+ unit tests:
```java
// Test matrix:
// ✅ MANDATORY field present → no error
// ❌ MANDATORY field missing → error
// ✅ REGEX field matches pattern → no error
// ❌ REGEX field doesn't match → error
// ✅ ALLOWED_VALUES field in list → no error
// ❌ ALLOWED_VALUES field not in list → error
// ✅ MAX_LENGTH within limit → no error
// ❌ MAX_LENGTH exceeded → error
// ✅ MIN_LENGTH within limit → no error
// ❌ MIN_LENGTH violated → error
// Edge: null value on non-mandatory field → no error
// Edge: empty string on MANDATORY → error
```

---

### Day 8 — Validation Engine: `/validate` Endpoint

This is the core of the entire system. Full pipeline:

```java
@PostMapping("/validate")
public ResponseEntity<ApiResponse<ValidationResponse>> validate(
        @RequestBody ValidateRequest request,
        @RequestHeader("X-Auth-User-Id") String userId,
        @RequestHeader("X-Correlation-ID") String correlationId) {

    // Step 1: Parse ISO8583 hex
    Map<Integer, String> parsedFields = isoParserUtil.parse(
        request.getHexMessage(), packager);

    // Step 2: Extract MTI (field 0)
    String mti = parsedFields.get(0);

    // Step 3: Fetch profile format (Feign + Caffeine cache)
    ProfileFormat format = profileClient.getFormat(request.getProfileId());

    // Step 4: Fetch rules (Feign + Caffeine cache)
    List<ValidationRule> rules = rulesClient.getRules(
        request.getProfileId(), mti);

    // Step 5: Evaluate rules
    List<ValidationError> errors = rulesEngine.evaluate(rules, parsedFields);

    // Step 6: AI explanation (nullable — CB + fallback)
    String aiExplanation = null;
    try {
        if (!errors.isEmpty()) {
            aiExplanation = aiClient.explain(
                request.getProfileId(), mti, errors);
        }
    } catch (Exception e) {
        log.warn("AI service unavailable, skipping explanation");
        // SKIP_AI fallback — validation still succeeds
    }

    // Step 7: Generate run_reference via Redis
    String runRef = runReferenceService.generate(); // VLD-YYYYMMDD-00001

    // Step 8: Publish event (ASYNC — do not await)
    ValidationRunCompletedEvent event = buildEvent(
        runRef, request, parsedFields, errors, aiExplanation, userId);
    rabbitTemplate.convertAndSend(
        "validation.events", "run.completed", event);

    // Step 9: Return response IMMEDIATELY (don't wait for history save)
    ValidationResponse response = ValidationResponse.builder()
        .runReference(runRef)
        .mti(mti)
        .status(errors.isEmpty() ? "VALID" : "INVALID")
        .parsedFields(PanMaskingUtil.maskFields(parsedFields))  // MASK PAN!
        .errors(errors)
        .aiExplanation(aiExplanation)
        .build();

    return ResponseEntity.ok(ApiResponse.success(response, "Validation complete"));
}
```

---

### Day 9 — Full E2E Flow Test

Run this complete happy path test:

```bash
# Step 1: Login
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.token')

# Step 2: Create profile (ask Logeshwaran for profile ID)
PROFILE_ID=1

# Step 3: Validate a real 0200 message
curl -X POST http://localhost:8080/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": '$PROFILE_ID',
    "hexMessage": "0200..."
  }'

# Expect in response:
# - runReference: "VLD-20250501-00001"
# - status: "VALID" or "INVALID"
# - parsedFields: map of DE → value (PAN must be masked!)
# - errors: [] (if valid) or list of ValidationError
# - aiExplanation: string or null

# Step 4: Verify history saved
curl http://localhost:8080/history/runs/VLD-20250501-00001 \
  -H "Authorization: Bearer $TOKEN"
# Expect: full run detail with fields + errors
```

---

### Day 10 — API Documentation + README

#### Postman Collection must cover:
- `POST /auth/login` — with sample body, auto-save token to env variable
- `GET /users`, `POST /users`, `PUT /users/{id}`, `DELETE /users/{id}`
- `POST /auth/logout`
- `PUT /users/{id}/password`
- `GET /config/**`, `PUT /config/{key}`
- `POST /validate`, `POST /validate/build`
- All with example request bodies and expected responses

#### Postman test script for login (auto-save JWT):
```javascript
// In the "Tests" tab of the login request:
var response = pm.response.json();
pm.environment.set("jwt_token", response.data.token);
```

#### README.md sections:
1. Prerequisites (Java 21, Docker, Maven)
2. `docker-compose up -d` (infra)
3. `mvn install` on common-lib
4. Start each service with `mvn spring-boot:run`
5. Get JWT — `POST /auth/login`
6. First request walkthrough

---

## 🔗 Dependencies

### What you give others:
| Deliverable | Who needs it | When |
|---|---|---|
| `common-lib` JAR (`mvn install`) | Everyone | Day 1 EOD |
| RSA public key (`public.pem`) | Janani (Gateway), all services | Day 1 EOD |
| `/internal/auth/validate-token` endpoint | Janani (Gateway JwtAuthFilter) | Day 3 |

### What you need from others:
| What | From | When |
|---|---|---|
| Profile Service internal endpoint working | Logeshwaran | Day 6 (Feign calls) |
| Rules Service internal endpoint working | Janani | Day 6 (Feign calls) |
| AI Service internal endpoint working | Janani | Day 8 (optional, fallback exists) |
| RabbitMQ exchanges declared | Logeshwaran | Day 7 (before publishing events) |

---

## ⚠️ Key Rules — Never Violate

```
✅ Always mask PAN before logging or writing to DB
✅ common-lib must be mvn-installed BEFORE other services build
✅ /internal/** endpoints are NOT exposed at Gateway
✅ RulesEngine has NO Spring beans, NO DB calls, NO I/O — pure logic only
✅ Return /validate response IMMEDIATELY — don't wait for MQ/history
✅ Use ApiResponse<T> wrapper for ALL controller responses
✅ Soft delete only — never hard delete users
✅ RS256 JWT — never HS256
```

---

## 🧪 Quick Debug Checklist

| Problem | Check |
|---|---|
| `401` on all requests | Is Gateway's JwtAuthFilter getting the public key correctly? |
| `NoSuchBeanDefinitionException` | Did you run `mvn install` on common-lib? |
| jPOS `ISOException` on parse | Is the packager XML correct for the message format? |
| Caffeine cache not evicting | Is the MQ consumer in validation-engine receiving `cache.invalidation` events? |
| `run_reference` duplicates | Check Redis INCR key — are concurrent calls using the same date key? |

---

*Bala — Sprint 1 & 2 · ISO 8583 Validator · Spring Boot 3.2*
