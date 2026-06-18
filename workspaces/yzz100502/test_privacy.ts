import { privacyService } from "./src/services/privacyService";

console.log("=== 单独测试 privacyService ===");

const text = "医生您好，我是李秀英，这几天好多了，咳嗽基本止住了，谢谢关心";

console.log("\n1. 测试 maskKnownNamesInText:");
console.log("   原文:", text);
const result1 = privacyService.maskKnownNamesInText(text, ["李秀英"]);
console.log("   结果:", result1);
console.log("   期望: 医生您好，我是李*英，这几天好多了，咳嗽基本止住了，谢谢关心");
console.log("   是否匹配:", result1 === "医生您好，我是李*英，这几天好多了，咳嗽基本止住了，谢谢关心");

console.log("\n2. 测试 maskAll with knownNames:");
const result2 = privacyService.maskAll(text, ["李秀英"]);
console.log("   原文:", text);
console.log("   结果:", result2);
console.log("   是否包含李*英:", result2.includes("李*英"));

console.log("\n3. 测试 maskName:");
console.log("   maskName('李秀英') =", privacyService.maskName("李秀英"));
console.log("   maskName('张伟') =", privacyService.maskName("张伟"));

console.log("\n4. 测试 maskAll 不带 knownNames:");
const result3 = privacyService.maskAll(text);
console.log("   原文:", text);
console.log("   结果:", result3);
console.log("   是否包含李*英:", result3.includes("李*英"));
