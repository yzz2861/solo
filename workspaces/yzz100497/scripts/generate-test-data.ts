import * as fs from 'fs';
import * as path from 'path';
const sharp = require('sharp');
const AdmZip = require('adm-zip');

const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data');

async function createTestImage(
  outputPath: string,
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): Promise<void> {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color
    }
  })
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

async function generateTestData() {
  console.log('🧪 正在生成测试数据...\n');

  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  }

  const authors = [
    {
      name: '张三',
      email: 'zhangsan@example.com',
      phone: '13800138001',
      works: [
        {
          title: '城市夜景',
          photos: [
            { name: 'DSC0001.jpg', width: 6000, height: 4000, color: { r: 30, g: 40, b: 80 } },
            { name: 'DSC0002.jpg', width: 6000, height: 4000, color: { r: 20, g: 30, b: 60 } }
          ],
          hasStatement: true
        },
        {
          title: '山间晨雾',
          photos: [
            { name: 'DSC0003.jpg', width: 4000, height: 6000, color: { r: 180, g: 200, b: 220 } }
          ],
          hasStatement: true
        }
      ],
      hasBio: true,
      hasAuthorization: true,
      authorizationSigned: true
    },
    {
      name: '李四',
      email: 'lisi@example.com',
      phone: '13900139002',
      works: [
        {
          title: '老街记忆',
          photos: [
            { name: 'IMG_0001.jpg', width: 800, height: 600, color: { r: 150, g: 120, b: 90 } }
          ],
          hasStatement: false
        }
      ],
      hasBio: true,
      hasAuthorization: true,
      authorizationSigned: false
    },
    {
      name: '王小明',
      email: 'wangxm@example.com',
      phone: '13700137003',
      works: [
        {
          title: '海边日落',
          photos: [
            { name: 'P_0001.JPG', width: 5472, height: 3648, color: { r: 255, g: 150, b: 50 } },
            { name: 'P_0002.JPG', width: 5472, height: 3648, color: { r: 255, g: 100, b: 50 } }
          ],
          hasStatement: true
        }
      ],
      hasBio: true,
      hasAuthorization: false,
      authorizationSigned: false
    }
  ];

  for (const author of authors) {
    const authorDir = path.join(TEST_DATA_DIR, author.name);
    fs.mkdirSync(authorDir, { recursive: true });

    if (author.hasBio) {
      const bioContent = `姓名：${author.name}
邮箱：${author.email}
电话：${author.phone}

作者简介：
${author.name}，自由摄影师，专注于风光和人文摄影。
作品曾多次在国内外影展中展出。
`;
      fs.writeFileSync(path.join(authorDir, `${author.name}_作者简介.txt`), bioContent, 'utf8');
    }

    if (author.hasAuthorization) {
      const authContent = `作品授权书

本人${author.name}（身份证号：XXXXXXXXXXXXXXXXX），
同意将以下参展作品授权给本次影展组委会：

${author.works.map(w => `- 《${w.title}》`).join('\n')}

本人确认拥有以上作品的完整版权，并授权组委会
在本次影展的宣传、展览、出版等活动中使用。

${author.authorizationSigned ? `作者签名：${author.name}` : '作者签名：_____________'}
日期：2024年01月15日
`;
      fs.writeFileSync(path.join(authorDir, `${author.name}_授权书.txt`), authContent, 'utf8');
    }

    for (const work of author.works) {
      const workDir = path.join(authorDir, work.title);
      fs.mkdirSync(workDir, { recursive: true });

      for (const photo of work.photos) {
        const photoPath = path.join(workDir, photo.name);
        await createTestImage(photoPath, photo.width, photo.height, photo.color);
        console.log(`  ✓ 创建图片: ${photo.name} (${photo.width}x${photo.height})`);
      }

      if (work.hasStatement) {
        const stmtContent = `作品名称：${work.title}
作者：${author.name}

作品说明：
${work.title}拍摄于2023年，展现了自然与人文的和谐之美。
本作品采用长曝光技术，捕捉了光影流动的瞬间。
`;
        fs.writeFileSync(path.join(workDir, `${work.title}_作品说明.txt`), stmtContent, 'utf8');
      }
    }
  }

  const otherDir = path.join(TEST_DATA_DIR, '其他文件');
  fs.mkdirSync(otherDir, { recursive: true });

  fs.writeFileSync(
    path.join(otherDir, '百度网盘链接.txt'),
    'https://pan.baidu.com/s/1abcdefghijklmnopqr 提取码: abcd',
    'utf8'
  );

  const smallPhotoPath = path.join(otherDir, 'small_photo.jpg');
  await createTestImage(smallPhotoPath, 640, 480, { r: 100, g: 100, b: 100 });
  console.log(`  ✓ 创建小图片: small_photo.jpg (640x480)`);

  const zip = new AdmZip();
  const zipText = '这是压缩包内的文件内容';
  zip.addFile('compressed_photo.txt', Buffer.from(zipText, 'utf8'));
  zip.writeZip(path.join(otherDir, '压缩包投稿.zip'));
  console.log(`  ✓ 创建压缩包: 压缩包投稿.zip`);

  const authorNameVariantDir = path.join(TEST_DATA_DIR, '张 三');
  fs.mkdirSync(authorNameVariantDir, { recursive: true });
  const variantPhotoPath = path.join(authorNameVariantDir, 'DSC0010.jpg');
  await createTestImage(variantPhotoPath, 5000, 3333, { r: 200, g: 150, b: 100 });
  console.log(`  ✓ 创建作者名变体测试: 张 三/DSC0010.jpg (5000x3333)`);
  
  const duplicatePhotoPath = path.join(authorNameVariantDir, 'DSC0001_copy.jpg');
  await createTestImage(duplicatePhotoPath, 6000, 4000, { r: 30, g: 40, b: 80 });
  console.log(`  ✓ 创建重复投稿测试: 张 三/DSC0001_copy.jpg (6000x4000) - 与张三/城市夜景/DSC0001.jpg相同`);

  console.log('\n✅ 测试数据生成完成！');
  console.log(`   目录: ${TEST_DATA_DIR}\n`);
}

generateTestData().catch(console.error);
