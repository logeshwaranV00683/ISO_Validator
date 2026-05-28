import MockAdapter from "axios-mock-adapter";
import apiClient from "../api/apiClient";

const mock = new MockAdapter(apiClient, { delayResponse: 600 });

// ── AUTH ──────────────────────────────────────────────────────────────────────
mock.onPost("/auth/login").reply(({ data }) => {
  const { username, password } = JSON.parse(data);
  const users = {
    admin:   { userId:1, username:"admin",   fullName:"John Doe",    email:"admin@company.com",   role:"ADMIN",   avatarInitials:"JD" },
    analyst: { userId:2, username:"analyst", fullName:"Priya Singh", email:"priya@company.com",   role:"ANALYST", avatarInitials:"PS" },
    viewer:  { userId:3, username:"viewer",  fullName:"Alex Tan",    email:"alex@company.com",    role:"VIEWER",  avatarInitials:"AT" },
  };
  const passwords = { admin:"admin123", analyst:"analyst123", viewer:"viewer123" };
  const user = users[username];
  if (user && passwords[username] === password)
    return [200, { success:true, data:{ token:"mock-jwt-token", user } }];
  return [401, { success:false, error:{ message:"Invalid credentials." } }];
});
mock.onPost("/auth/logout").reply(200, { success:true });

// ── HISTORY STATS ─────────────────────────────────────────────────────────────
mock.onGet("/history/stats").reply(200, { success:true, data:{
  totalRuns:247, passed:198, failed:34, warned:15,
  passRate:80.2, avgTotalMs:428, avgAiMs:389, p95TotalMs:680,
  aiSkipCount:12, aiErrorCount:2,
  topErrorFields:[
    { deNumber:"DE7",  fieldName:"Transmission Date & Time", errorCount:28 },
    { deNumber:"DE4",  fieldName:"Transaction Amount",       errorCount:19 },
    { deNumber:"DE11", fieldName:"System Trace Audit",       errorCount:14 },
    { deNumber:"DE39", fieldName:"Response Code",            errorCount:11 },
    { deNumber:"DE2",  fieldName:"Primary Account Number",   errorCount:8  },
  ],
  runsByStatus:{ PASSED:198, FAILED:34, WARNED:15 },
  runsByMti:{ "0200":180, "0210":42, "0420":18, "0800":7 },
  runsByProfile:{ "Visa Switch":140, "MasterCard GW":72, "Legacy Switch":35 },
}});

// ── HISTORY ───────────────────────────────────────────────────────────────────
const MOCK_HISTORY = [
  { runReference:"VLD-0247", createdAt:"2026-05-24T17:28:00Z", mti:"0200", profileNameSnapshot:"Visa Switch",   environment:"PROD", totalErrors:2, status:"FAILED",  parseDurationMs:12, validationDurationMs:8,  aiDurationMs:420, totalDurationMs:440, rawMessageSnapshot:"0200723A00010AC08012345...", responseCode:"30" },
  { runReference:"VLD-0246", createdAt:"2026-05-24T17:25:00Z", mti:"0210", profileNameSnapshot:"Visa Switch",   environment:"PROD", totalErrors:0, status:"PASSED",  parseDurationMs:10, validationDurationMs:6,  aiDurationMs:0,   totalDurationMs:16,  rawMessageSnapshot:"0210823A00010AC08098765...", responseCode:"00" },
  { runReference:"VLD-0245", createdAt:"2026-05-24T17:15:00Z", mti:"0420", profileNameSnapshot:"MasterCard GW", environment:"UAT",  totalErrors:1, status:"WARNED",  parseDurationMs:14, validationDurationMs:9,  aiDurationMs:390, totalDurationMs:413, rawMessageSnapshot:"0420923A00010AC08011111...", responseCode:null },
  { runReference:"VLD-0244", createdAt:"2026-05-24T16:50:00Z", mti:"0200", profileNameSnapshot:"Visa Switch",   environment:"PROD", totalErrors:0, status:"PASSED",  parseDurationMs:11, validationDurationMs:7,  aiDurationMs:0,   totalDurationMs:18,  rawMessageSnapshot:"0200123A00010AC08099999...", responseCode:null },
  { runReference:"VLD-0243", createdAt:"2026-05-24T16:20:00Z", mti:"0200", profileNameSnapshot:"Legacy Switch", environment:"DEV",  totalErrors:4, status:"FAILED",  parseDurationMs:18, validationDurationMs:12, aiDurationMs:510, totalDurationMs:540, rawMessageSnapshot:"0200FF3A00010AC08077777...", responseCode:"05" },
];

mock.onGet("/history").reply(200, { success:true, data:{
  content: MOCK_HISTORY, page:0, size:20, totalElements:247, totalPages:13
}});

mock.onGet(/\/history\/VLD-\w+/).reply(200, { success:true, data: MOCK_HISTORY[0] });

// ── PROFILES ──────────────────────────────────────────────────────────────────
const MOCK_PROFILES = [
  { profileId:1, profileName:"Visa Switch",   formatId:1, formatName:"ISO87 ASCII",    environment:"PROD", isActive:true,  isDefault:true,  rulesCount:14, host:"10.0.1.10", port:"8583", timezone:"Asia/Kolkata",    connectionTimeoutMs:30000, tpduEnabled:false, tpduValue:"",           lastUsedAt:"2026-05-24T14:30:00Z" },
  { profileId:2, profileName:"MasterCard GW", formatId:1, formatName:"ISO87 ASCII",    environment:"UAT",  isActive:true,  isDefault:false, rulesCount:11, host:"10.0.1.20", port:"8583", timezone:"UTC",             connectionTimeoutMs:20000, tpduEnabled:true,  tpduValue:"6000000000", lastUsedAt:"2026-05-24T12:10:00Z" },
  { profileId:3, profileName:"Legacy Switch", formatId:2, formatName:"ISO93 EBCDIC",   environment:"DEV",  isActive:false, isDefault:false, rulesCount:8,  host:"10.0.2.5",  port:"9000", timezone:"America/New_York", connectionTimeoutMs:60000, tpduEnabled:true,  tpduValue:"6000000001", lastUsedAt:"2026-05-23T09:00:00Z" },
];

mock.onGet("/profiles").reply(200, { success:true, data:{
  content: MOCK_PROFILES, page:0, size:20, totalElements:3, totalPages:1
}});
mock.onGet(/\/profiles\/\d+/).reply(({ url }) => {
  const id = +url.split("/").pop();
  const p  = MOCK_PROFILES.find(p => p.profileId === id);
  return p ? [200, { success:true, data:p }] : [404, { success:false }];
});
mock.onPost("/profiles").reply(201, { success:true, data:{ ...MOCK_PROFILES[0], profileId:4, profileName:"New Profile" } });
mock.onPut(/\/profiles\/\d+/).reply(200, { success:true, data: MOCK_PROFILES[0] });
mock.onDelete(/\/profiles\/\d+/).reply(204);
mock.onPatch(/\/profiles\/\d+\/default/).reply(200, { success:true, data: MOCK_PROFILES[0] });
mock.onPatch(/\/profiles\/\d+\/status/).reply(200, { success:true, data: MOCK_PROFILES[0] });
mock.onPost(/\/profiles\/\d+\/test-connection/).reply(200, { success:true, data:{
  result:"SUCCESS", message:"Connected successfully", latencyMs:42, testedAt: new Date().toISOString()
}});
mock.onPost(/\/profiles\/\d+\/clone/).reply(201, { success:true, data:{ ...MOCK_PROFILES[0], profileId:5, profileName:"Visa Switch (Copy)" } });

// ── FORMATS ───────────────────────────────────────────────────────────────────
const MOCK_FORMATS = [
  { formatId:1, formatName:"ISO87 ASCII",    isoVersion:"ISO 8583-1:1987", encoding:"ASCII",  fieldCount:128, status:"active",   checksum:"a1b2c3d4", currentVersion:3, usedByProfiles:["Visa Switch","MasterCard GW"], updatedBy:"admin", updatedAt:"2026-05-01T00:00:00Z",
    xmlContent:`<isopackager>\n  <isofield id="2"  length="19" name="Primary Account Number"    class="IFB_LLNUM"   />\n  <isofield id="3"  length="6"  name="Processing Code"           class="IFB_NUMERIC" />\n  <isofield id="4"  length="12" name="Transaction Amount"         class="IFB_NUMERIC" />\n  <isofield id="7"  length="10" name="Transmission Date and Time" class="IFB_NUMERIC" />\n  <isofield id="11" length="6"  name="System Trace Audit Number"  class="IFB_NUMERIC" />\n  <isofield id="41" length="8"  name="Card Acceptor Terminal ID"  class="IFB_CHAR"    />\n</isopackager>` },
  { formatId:2, formatName:"ISO93 EBCDIC",   isoVersion:"ISO 8583-1:1993", encoding:"EBCDIC", fieldCount:128, status:"inactive", checksum:"e5f6a7b8", currentVersion:1, usedByProfiles:["Legacy Switch"], updatedBy:"admin", updatedAt:"2026-04-15T00:00:00Z", xmlContent:"<isopackager><!-- EBCDIC config --></isopackager>" },
  { formatId:3, formatName:"ISO2003 Binary", isoVersion:"ISO 8583-2:2003", encoding:"Binary", fieldCount:192, status:"active",   checksum:"c9d0e1f2", currentVersion:2, usedByProfiles:[], updatedBy:"admin", updatedAt:"2026-03-20T00:00:00Z", xmlContent:"<isopackager><!-- Binary config --></isopackager>" },
];

mock.onGet("/formats").reply(200, { success:true, data:{
  content: MOCK_FORMATS, page:0, size:20, totalElements:3, totalPages:1
}});
mock.onGet(/\/formats\/\d+\/versions/).reply(200, { success:true, data:[
  { version:3, updatedBy:"priya.s", updatedAt:"2026-05-01T10:00:00Z", changeNote:"Added DE55 EMV field" },
  { version:2, updatedBy:"john.d",  updatedAt:"2026-04-10T09:30:00Z", changeNote:"Updated DE43 length" },
  { version:1, updatedBy:"admin",   updatedAt:"2026-03-01T14:00:00Z", changeNote:"Initial format definition" },
]});
mock.onPost("/formats/validate-xml").reply(200, { success:true, data:{ valid:true, fieldCount:6, fieldsFound:["DE2","DE3","DE4","DE7","DE11","DE41"], parseError:null } });
mock.onPut(/\/formats\/\d+/).reply(200, { success:true, data: MOCK_FORMATS[0] });
mock.onPost(/\/formats\/\d+\/reload/).reply(200, { success:true, data:{ message:"Format reloaded successfully" } });

// ── RULES ─────────────────────────────────────────────────────────────────────
const MOCK_RULES = [
  { ruleId:1, profileId:1, mti:"0200", deNumber:"DE2",  fieldName:"Primary Account Number",    isMandatory:true,  minLength:13, maxLength:19, dataType:"numeric",      patternRegex:"^[0-9]+$",      severity:"CRITICAL", isActive:true,  priority:1, allowedValues:[],                         effectiveFrom:"2026-01-01", effectiveTo:"",           description:"PAN must be present",             updatedBy:"john.d",  updatedAt:"2026-05-10T00:00:00Z" },
  { ruleId:2, profileId:1, mti:"0200", deNumber:"DE3",  fieldName:"Processing Code",           isMandatory:true,  minLength:6,  maxLength:6,  dataType:"numeric",      patternRegex:"^[0-9]{6}$",    severity:"CRITICAL", isActive:true,  priority:2, allowedValues:["000000","010000","310000"], effectiveFrom:"2026-01-01", effectiveTo:"",           description:"6-digit processing code",         updatedBy:"john.d",  updatedAt:"2026-05-10T00:00:00Z" },
  { ruleId:3, profileId:1, mti:"0200", deNumber:"DE4",  fieldName:"Transaction Amount",        isMandatory:true,  minLength:12, maxLength:12, dataType:"numeric",      patternRegex:"^[0-9]{12}$",   severity:"WARNING",  isActive:true,  priority:3, allowedValues:[],                         effectiveFrom:"2026-01-01", effectiveTo:"",           description:"12-digit zero-padded amount",     updatedBy:"priya.s", updatedAt:"2026-05-12T00:00:00Z" },
  { ruleId:4, profileId:1, mti:"0200", deNumber:"DE7",  fieldName:"Transmission Date & Time",  isMandatory:true,  minLength:10, maxLength:10, dataType:"numeric",      patternRegex:"^[0-9]{10}$",   severity:"CRITICAL", isActive:true,  priority:4, allowedValues:[],                         effectiveFrom:"2026-01-01", effectiveTo:"",           description:"MMDDHHmmss timestamp",            updatedBy:"priya.s", updatedAt:"2026-05-12T00:00:00Z" },
  { ruleId:5, profileId:1, mti:"0200", deNumber:"DE11", fieldName:"System Trace Audit Number", isMandatory:true,  minLength:6,  maxLength:6,  dataType:"numeric",      patternRegex:"^[0-9]{6}$",    severity:"CRITICAL", isActive:true,  priority:5, allowedValues:[],                         effectiveFrom:"2026-01-01", effectiveTo:"",           description:"Unique trace per transaction",    updatedBy:"john.d",  updatedAt:"2026-05-10T00:00:00Z" },
  { ruleId:6, profileId:1, mti:"0200", deNumber:"DE41", fieldName:"Card Acceptor Terminal ID", isMandatory:false, minLength:8,  maxLength:8,  dataType:"alphanumeric", patternRegex:"^[A-Z0-9]{8}$", severity:"INFO",     isActive:true,  priority:6, allowedValues:[],                         effectiveFrom:"2026-01-01", effectiveTo:"2026-12-31", description:"8-char terminal identifier",      updatedBy:"admin",   updatedAt:"2026-05-08T00:00:00Z" },
];

mock.onGet("/rules").reply(200, { success:true, data:{
  content: MOCK_RULES, page:0, size:50, totalElements:6, totalPages:1
}});
mock.onPost("/rules").reply(201, { success:true, data:{ ...MOCK_RULES[0], ruleId:99 } });
mock.onPut(/\/rules\/\d+/).reply(200, { success:true, data: MOCK_RULES[0] });
mock.onDelete(/\/rules\/\d+/).reply(204);
mock.onPatch(/\/rules\/\d+\/status/).reply(200, { success:true, data: MOCK_RULES[0] });
mock.onGet("/rules/export").reply(200, { success:true, data: MOCK_RULES });

// ── FIELD DEFINITIONS ─────────────────────────────────────────────────────────
const MOCK_FIELD_DEFS = [
  { definitionId:1,  profileId:1, mti:"0200", deNumber:"DE2",  fieldName:"Primary Account Number",    dataType:"numeric",      maxLength:19, isLlvar:true,  isLllvar:false, isMandatory:true,  placeholderValue:"4111111111111111",              displayOrder:1,  isBuilderVisible:true,  isActive:true },
  { definitionId:2,  profileId:1, mti:"0200", deNumber:"DE3",  fieldName:"Processing Code",           dataType:"numeric",      maxLength:6,  isLlvar:false, isLllvar:false, isMandatory:true,  placeholderValue:"000000",                        displayOrder:2,  isBuilderVisible:true,  isActive:true },
  { definitionId:3,  profileId:1, mti:"0200", deNumber:"DE4",  fieldName:"Transaction Amount",        dataType:"numeric",      maxLength:12, isLlvar:false, isLllvar:false, isMandatory:true,  placeholderValue:"000000010000",                  displayOrder:3,  isBuilderVisible:true,  isActive:true },
  { definitionId:4,  profileId:1, mti:"0200", deNumber:"DE7",  fieldName:"Transmission Date & Time",  dataType:"numeric",      maxLength:10, isLlvar:false, isLllvar:false, isMandatory:true,  placeholderValue:"0524174800",                    displayOrder:4,  isBuilderVisible:true,  isActive:true },
  { definitionId:5,  profileId:1, mti:"0200", deNumber:"DE11", fieldName:"System Trace Audit Number", dataType:"numeric",      maxLength:6,  isLlvar:false, isLllvar:false, isMandatory:true,  placeholderValue:"123456",                        displayOrder:5,  isBuilderVisible:true,  isActive:true },
  { definitionId:6,  profileId:1, mti:"0200", deNumber:"DE14", fieldName:"Expiry Date (YYMM)",        dataType:"numeric",      maxLength:4,  isLlvar:false, isLllvar:false, isMandatory:true,  placeholderValue:"2612",                          displayOrder:6,  isBuilderVisible:true,  isActive:true },
  { definitionId:7,  profileId:1, mti:"0200", deNumber:"DE22", fieldName:"POS Entry Mode",            dataType:"numeric",      maxLength:3,  isLlvar:false, isLllvar:false, isMandatory:true,  placeholderValue:"022",                           displayOrder:7,  isBuilderVisible:true,  isActive:true },
  { definitionId:8,  profileId:1, mti:"0200", deNumber:"DE12", fieldName:"Local Transaction Time",    dataType:"numeric",      maxLength:6,  isLlvar:false, isLllvar:false, isMandatory:false, placeholderValue:"174800",                        displayOrder:8,  isBuilderVisible:true,  isActive:true },
  { definitionId:9,  profileId:1, mti:"0200", deNumber:"DE13", fieldName:"Local Transaction Date",    dataType:"numeric",      maxLength:4,  isLlvar:false, isLllvar:false, isMandatory:false, placeholderValue:"0524",                          displayOrder:9,  isBuilderVisible:true,  isActive:true },
  { definitionId:10, profileId:1, mti:"0200", deNumber:"DE18", fieldName:"Merchant Category Code",    dataType:"numeric",      maxLength:4,  isLlvar:false, isLllvar:false, isMandatory:false, placeholderValue:"5411",                          displayOrder:10, isBuilderVisible:true,  isActive:true },
  { definitionId:11, profileId:1, mti:"0200", deNumber:"DE37", fieldName:"Retrieval Reference Number",dataType:"alphanumeric", maxLength:12, isLlvar:false, isLllvar:false, isMandatory:false, placeholderValue:"123456789012",                  displayOrder:11, isBuilderVisible:true,  isActive:true },
  { definitionId:12, profileId:1, mti:"0200", deNumber:"DE41", fieldName:"Card Acceptor Terminal ID", dataType:"alphanumeric", maxLength:8,  isLlvar:false, isLllvar:false, isMandatory:false, placeholderValue:"TERM0001",                      displayOrder:12, isBuilderVisible:true,  isActive:true },
  { definitionId:13, profileId:1, mti:"0200", deNumber:"DE42", fieldName:"Card Acceptor ID Code",     dataType:"alphanumeric", maxLength:15, isLlvar:false, isLllvar:false, isMandatory:false, placeholderValue:"MERCHANT001   ",                displayOrder:13, isBuilderVisible:true,  isActive:true },
  { definitionId:14, profileId:1, mti:"0200", deNumber:"DE43", fieldName:"Merchant Name / Location",  dataType:"alphanumeric", maxLength:40, isLlvar:false, isLllvar:false, isMandatory:false, placeholderValue:"ACME STORE      CHENNAI   IN", displayOrder:14, isBuilderVisible:true,  isActive:true },
  { definitionId:15, profileId:1, mti:"0200", deNumber:"DE49", fieldName:"Currency Code (ISO 4217)",  dataType:"numeric",      maxLength:3,  isLlvar:false, isLllvar:false, isMandatory:false, placeholderValue:"356",                           displayOrder:15, isBuilderVisible:true,  isActive:true },
];

mock.onGet("/field-definitions").reply(200, { success:true, data: MOCK_FIELD_DEFS });
mock.onPost("/field-definitions").reply(201, { success:true, data:{ ...MOCK_FIELD_DEFS[0], definitionId:99 } });
mock.onPut(/\/field-definitions\/\d+/).reply(200, { success:true, data: MOCK_FIELD_DEFS[0] });
mock.onDelete(/\/field-definitions\/\d+/).reply(204);

// ── VALIDATE ──────────────────────────────────────────────────────────────────
mock.onPost("/validate").reply(200, { success:true, data:{
  runReference:"VLD-0248", status:"FAILED", mti:"0200", mtiDescription:"Authorization Request",
  profile:{ profileName:"Visa Switch", environment:"PROD" },
  timing:{ parseDurationMs:12, validationDurationMs:8, aiDurationMs:420, totalDurationMs:440 },
  bitmap:{ primary:"723A00010AC08000", extended:null, bitsSet:[2,3,4,7,11,41] },
  parsedFields:[
    { deNumber:"MTI",  fieldName:"Message Type Indicator",    rawValue:"0200",             displayValue:"Authorization Request",                isPresent:true  },
    { deNumber:"DE2",  fieldName:"Primary Account Number",    rawValue:"4111111111111111", displayValue:"4111 •••• •••• 1111",                 isPresent:true  },
    { deNumber:"DE3",  fieldName:"Processing Code",           rawValue:"000000",           displayValue:"Purchase (00) · From (00) · To (00)", isPresent:true  },
    { deNumber:"DE4",  fieldName:"Transaction Amount",        rawValue:"00000010000",      displayValue:"₹100.00 (11 digits)",                 isPresent:true  },
    { deNumber:"DE7",  fieldName:"Transmission Date & Time",  rawValue:null,               displayValue:"Missing — CRITICAL",                  isPresent:false },
    { deNumber:"DE11", fieldName:"System Trace Audit Number", rawValue:"123456",           displayValue:"Trace #123456",                       isPresent:true  },
    { deNumber:"DE41", fieldName:"Card Acceptor Terminal ID", rawValue:"TERM0001",         displayValue:"Terminal: TERM0001",                  isPresent:true  },
  ],
  errors:[
    { deNumber:"DE7",  fieldName:"Transmission Date & Time", severity:"CRITICAL", issueDescription:"Field is mandatory but absent in the message",      ruleSnapshot:"mandatory=true, length=10", aiExplanation:"DE7 timestamps when the transaction was initiated. Its absence causes acquirer switches to reject with response code 30 (Format Error).", aiFixSuggestion:"Populate with MMDDHHmmss format. Example: 0524174800 (May 24, 17:48:00)" },
    { deNumber:"DE4",  fieldName:"Transaction Amount",        severity:"WARNING",  issueDescription:"Length is 11 digits, expected exactly 12 digits",  ruleSnapshot:"length=12",                 aiExplanation:"DE4 must be exactly 12 digits, right-justified and zero-padded. You sent 11 digits.", aiFixSuggestion:"Pad with leading zero: 00000010000 → 000000010000" },
    { deNumber:"DE22", fieldName:"POS Entry Mode",            severity:"INFO",     issueDescription:"Recommended field absent for 0200 transactions",   ruleSnapshot:"mandatory=false",           aiExplanation:null, aiFixSuggestion:null },
  ],
  summary:{ criticalCount:1, warningCount:1, infoCount:1, totalCount:3 },
  ai:{ enabled:false, modelUsed:null, durationMs:null },
}});

mock.onPost(/\/validate\/VLD-\w+\/rerun/).reply(200, { success:true, data:{ runReference:"VLD-0249", status:"PASSED", errors:[], summary:{ criticalCount:0, warningCount:0, infoCount:0, totalCount:0 } } });

// ── BUILD ─────────────────────────────────────────────────────────────────────
mock.onPost("/validate/build").reply(200, { success:true, data:{
  rawMessage:"0200723A00010AC080164111111111111111000000000000010000052417480012345602260220TERM0001MERCHANT001    ACME STORE      CHENNAI   IN 356",
  mti:"0200", bitmapHex:"723A00010AC08000", bitsSet:[2,3,4,7,11,14,22,41,42,43,49],
  totalLength:128, missingMandatory:[],
  fieldBreakdown:[
    { deNumber:"DE2",  fieldName:"Primary Account Number",    rawValue:"164111111111111111", encoding:"LLVAR" },
    { deNumber:"DE3",  fieldName:"Processing Code",           rawValue:"000000",             encoding:"FIXED" },
    { deNumber:"DE4",  fieldName:"Transaction Amount",        rawValue:"000000010000",       encoding:"FIXED" },
    { deNumber:"DE7",  fieldName:"Transmission Date & Time",  rawValue:"0524174800",         encoding:"FIXED" },
    { deNumber:"DE11", fieldName:"System Trace Audit Number", rawValue:"123456",             encoding:"FIXED" },
    { deNumber:"DE41", fieldName:"Card Acceptor Terminal ID", rawValue:"TERM0001",           encoding:"FIXED" },
  ],
  profile:{ profileName:"Visa Switch", environment:"PROD" },
}});

// ── AI ────────────────────────────────────────────────────────────────────────
mock.onGet("/ai/config").reply(200, { success:true, data:{
  ollamaEndpoint:"http://localhost:11434/api/generate", activeModel:"mistral:7b",
  temperature:0.3, maxTokens:1024, timeoutMs:15000, retryCount:2,
  enabled:true, fallbackBehavior:"SKIP_AI",
}});
mock.onPut("/ai/config").reply(200, { success:true, data:{} });
mock.onGet("/ai/models").reply(200, { success:true, data:[
  { name:"mistral:7b",  size:"4.1 GB", modified:"2026-05-01", isActive:true  },
  { name:"phi3:mini",   size:"2.3 GB", modified:"2026-04-15", isActive:false },
  { name:"llama3:8b",   size:"4.7 GB", modified:"2026-03-20", isActive:false },
  { name:"codellama:7b",size:"3.8 GB", modified:"2026-03-01", isActive:false },
]});
mock.onGet("/ai/prompts/global").reply(200, { success:true, data:{
  templateId:1, templateContent:"You are an ISO8583 payment expert.\n\nFor each validation error below, provide:\n1. What the issue is\n2. Why it matters in payment processing\n3. Exact fix with example value\n\nContext:\n- MTI: {mti}\n- Switch Profile: {profile}\n- Parsed Fields: {fields}\n\nValidation Errors:\n{errors}\n\nRespond field-by-field. Be concise, technical, and actionable.",
  currentVersion:3, updatedBy:"priya.s", updatedAt:"2026-05-12T10:00:00Z",
}});
mock.onPut("/ai/prompts/global").reply(200, { success:true, data:{} });
mock.onGet(/\/ai\/prompts\/profile\/\d+/).reply(200, { success:true, data:null });
mock.onPut(/\/ai\/prompts\/profile\/\d+/).reply(200, { success:true, data:{} });
mock.onDelete(/\/ai\/prompts\/profile\/\d+/).reply(204);
mock.onPost("/ai/test").reply(200, { success:true, data:{
  response:"DE7 (Transmission Date & Time) is missing from your 0200 message. This field is mandatory per ISO8583 spec and timestamps when the transaction was initiated at the originating switch. Without it, the acquirer switch will reject with response code 30 (Format Error).\n\nFix: Populate DE7 with MMDDHHmmss format — e.g., 0524174800 for May 24th at 17:48:00.",
  durationMs:412, modelUsed:"mistral:7b",
}});
mock.onGet(/\/ai\/prompts\/\d+\/versions/).reply(200, { success:true, data:[
  { version:3, updatedBy:"priya.s", updatedAt:"2026-05-12T10:00:00Z", changeNote:"Added {profile} context variable" },
  { version:2, updatedBy:"john.d",  updatedAt:"2026-05-01T09:30:00Z", changeNote:"Removed markdown instruction"     },
  { version:1, updatedBy:"admin",   updatedAt:"2026-04-15T14:00:00Z", changeNote:"Initial prompt template"          },
]});
mock.onGet("/ai/logs").reply(200, { success:true, data:{
  content:[
    { logId:1, runReference:"VLD-0247", status:"SUCCESS", modelUsed:"mistral:7b", durationMs:420, errorMessage:null },
    { logId:2, runReference:"VLD-0245", status:"SUCCESS", modelUsed:"mistral:7b", durationMs:390, errorMessage:null },
    { logId:3, runReference:"VLD-0243", status:"TIMEOUT", modelUsed:"mistral:7b", durationMs:15000, errorMessage:"Request timed out after 15000ms" },
  ],
  page:0, size:20, totalElements:3, totalPages:1,
}});

// ── USERS ─────────────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { userId:1, username:"admin",   fullName:"John Doe",    email:"admin@company.com",   role:"ADMIN",   avatarInitials:"JD", isActive:true, createdAt:"2026-01-01T00:00:00Z" },
  { userId:2, username:"analyst", fullName:"Priya Singh", email:"priya@company.com",   role:"ANALYST", avatarInitials:"PS", isActive:true, createdAt:"2026-01-15T00:00:00Z" },
  { userId:3, username:"viewer",  fullName:"Alex Tan",    email:"alex@company.com",    role:"VIEWER",  avatarInitials:"AT", isActive:true, createdAt:"2026-02-01T00:00:00Z" },
  { userId:4, username:"ravi.k",  fullName:"Ravi Kumar",  email:"ravi@company.com",    role:"ANALYST", avatarInitials:"RK", isActive:false, createdAt:"2026-03-01T00:00:00Z" },
];

mock.onGet("/users").reply(200, { success:true, data:{
  content: MOCK_USERS, page:0, size:20, totalElements:4, totalPages:1
}});
mock.onPost("/users").reply(201, { success:true, data:{ ...MOCK_USERS[0], userId:5 } });
mock.onPut(/\/users\/\d+/).reply(200, { success:true, data: MOCK_USERS[0] });
mock.onDelete(/\/users\/\d+/).reply(204);
mock.onPatch(/\/users\/\d+\/status/).reply(200, { success:true, data: MOCK_USERS[0] });
mock.onPatch(/\/users\/\d+\/role/).reply(200, { success:true, data: MOCK_USERS[0] });
mock.onPost(/\/users\/\d+\/reset-password/).reply(200, { success:true });
mock.onGet(/\/users\/\d+\/sessions/).reply(200, { success:true, data:[] });
mock.onDelete(/\/users\/\d+\/sessions/).reply(204);

// ── AUDIT ─────────────────────────────────────────────────────────────────────
mock.onGet("/audit").reply(200, { success:true, data:{
  content:[
    { auditId:1, createdAt:"2026-05-24T17:28:00Z", sourceService:"rule-service",    action:"UPDATE", entityType:"RULE",    entityId:"1", performedBy:"priya.s", ipAddress:"192.168.1.10", changesSummary:"Updated maxLength from 10 to 12", beforeValue:'{"maxLength":10}', afterValue:'{"maxLength":12}' },
    { auditId:2, createdAt:"2026-05-24T16:50:00Z", sourceService:"profile-service", action:"CREATE", entityType:"PROFILE", entityId:"3", performedBy:"admin",   ipAddress:"192.168.1.5",  changesSummary:"Created Legacy Switch profile",   beforeValue:null,              afterValue:'{"profileName":"Legacy Switch"}' },
    { auditId:3, createdAt:"2026-05-24T15:30:00Z", sourceService:"auth-service",    action:"LOGIN",  entityType:"USER",   entityId:"1", performedBy:"admin",   ipAddress:"192.168.1.5",  changesSummary:"User logged in",                  beforeValue:null,              afterValue:null },
    { auditId:4, createdAt:"2026-05-24T14:00:00Z", sourceService:"format-service",  action:"UPDATE", entityType:"FORMAT", entityId:"1", performedBy:"john.d",  ipAddress:"192.168.1.8",  changesSummary:"Updated XML config v2→v3",         beforeValue:'{"version":2}',   afterValue:'{"version":3}' },
  ],
  page:0, size:30, totalElements:4, totalPages:1,
}});

// ── SYSTEM CONFIG ─────────────────────────────────────────────────────────────
mock.onGet("/config").reply(200, { success:true, data:[
  { key:"validation.max_message_size_bytes", value:"65536",        description:"Max raw message size accepted by validator",          updatedBy:"admin",   updatedAt:"2026-05-01T00:00:00Z" },
  { key:"validation.enable_ai_by_default",   value:"false",        description:"Auto-enable AI explanation for all validation runs",  updatedBy:"admin",   updatedAt:"2026-05-01T00:00:00Z" },
  { key:"history.retention_days",            value:"90",           description:"Days to retain validation run history",               updatedBy:"admin",   updatedAt:"2026-04-15T00:00:00Z" },
  { key:"auth.max_failed_attempts",          value:"5",            description:"Max login failures before account lockout",           updatedBy:"admin",   updatedAt:"2026-04-01T00:00:00Z" },
  { key:"auth.lockout_duration_minutes",     value:"15",           description:"Account lockout duration in minutes",                 updatedBy:"admin",   updatedAt:"2026-04-01T00:00:00Z" },
  { key:"audit.enabled",                     value:"true",         description:"Enable audit logging for all write operations",       updatedBy:"admin",   updatedAt:"2026-03-01T00:00:00Z" },
  { key:"ai.default_model",                  value:"mistral:7b",   description:"Default Ollama model for AI explanations",            updatedBy:"priya.s", updatedAt:"2026-05-12T00:00:00Z" },
  { key:"format.hot_reload_enabled",         value:"true",         description:"Allow hot-reload of format XML without restart",      updatedBy:"admin",   updatedAt:"2026-03-01T00:00:00Z" },
]});
mock.onPut(/\/config\/.+/).reply(200, { success:true, data:{} });

export default mock;