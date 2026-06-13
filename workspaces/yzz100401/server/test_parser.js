const { parsePdf, parseWord, parseImage, parseText, getFileType } = require('./src/services/documentParser');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('=' * 60);
  console.log('文件解析服务测试');
  console.log('=' * 60);

  // 测试文本解析
  console.log('\n1. 测试文本文件解析');
  try {
    const txtPath = path.join(__dirname, '../test_sample_insurance.txt');
    if (fs.existsSync(txtPath)) {
      const result = await parseText(txtPath);
      console.log(`   成功: ${result.length} 页, 总字数: ${result.reduce((s, p) => s + p.content.length, 0)}`);
      console.log(`   第一页预览: ${result[0].content.substring(0, 80)}...`);
    } else {
      console.log('   跳过: 测试文件不存在');
    }
  } catch (e) {
    console.log(`   失败: ${e.message}`);
  }

  // 测试文件类型判断
  console.log('\n2. 测试文件类型判断');
  const testFiles = [
    ['test.pdf', 'application/pdf'],
    ['test.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['test.doc', 'application/msword'],
    ['test.jpg', 'image/jpeg'],
    ['test.png', 'image/png'],
    ['test.txt', 'text/plain'],
    ['test.unknown', 'application/octet-stream'],
  ];
  for (const [name, mime] of testFiles) {
    const type = getFileType(name, mime);
    console.log(`   ${name} (${mime}): ${type}`);
  }

  // 测试 PDF 解析模块加载
  console.log('\n3. 测试 PDF 解析模块');
  try {
    const pdfParse = require('pdf-parse');
    console.log('   pdf-parse 模块加载成功');
  } catch (e) {
    console.log(`   失败: ${e.message}`);
  }

  // 测试 Word 解析模块加载
  console.log('\n4. 测试 Word 解析模块');
  try {
    const mammoth = require('mammoth');
    console.log('   mammoth 模块加载成功');
  } catch (e) {
    console.log(`   失败: ${e.message}`);
  }

  // 测试 OCR 模块加载
  console.log('\n5. 测试 OCR 识别模块');
  try {
    const { createWorker } = require('tesseract.js');
    console.log('   tesseract.js 模块加载成功');
  } catch (e) {
    console.log(`   失败: ${e.message}`);
  }

  console.log('\n' + '=' * 60);
  console.log('测试完成');
  console.log('=' * 60);
}

runTests().catch(console.error);
