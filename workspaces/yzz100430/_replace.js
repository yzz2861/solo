const fs = require('fs');

const filePath = 'src/pages/Home.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldBlockStart = '  const handleLabImport = (rows: LabImportRow[]) => {';
const oldBlockEnd = '    if (rows.length > 0) setStep(Math.max(step, 2));';

const startIdx = content.indexOf(oldBlockStart);
const endIdx = content.indexOf(oldBlockEnd, startIdx) + oldBlockEnd.length + 3; // +3 for `  };`

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find handleLabImport block');
  process.exit(1);
}

const newBlock = `  const handleLabImport = (rows: LabImportRow[]) => {
    const transformed: LabResult[] = [];
    const villageMap = new Map<string, { code: string; name: string }>();
    const wellMap = new Map<string, Well>();

    rows.forEach((r) => {
      const villageCode = String(
        pickField(r, ['villageCode', '村编码', '村代码', 'village_code']),
      );
      const villageName = String(
        pickField(r, ['village', '村名', '村庄', 'villageName']),
      );
      const wellNo = String(
        pickField(r, ['wellNo', '井号', 'well_no', 'officialNo']),
      );
      const labDate = String(
        pickField(r, ['labDate', '化验日期', '检测日期', 'lab_date']),
      );
      const nitrateRaw = pickField(r, [
        'nitrate',
        '硝酸盐',
        'nitrateN',
        'nitrate_n',
      ]);
      const nitrateUnit = String(
        pickField(r, ['nitrateUnit', '硝酸盐单位', 'nitrate_unit']),
      ) as NitrateUnit;
      const turbidityRaw = pickField(r, [
        'turbidity',
        '浊度',
        'turbidityNTU',
        'turbidity_ntu',
      ]);
      const coliformRaw = pickField(r, [
        'coliform',
        '菌落总数',
        '菌落',
        '细菌总数',
      ]);

      if (!villageCode && !villageName) return;
      const vCode = villageCode || villageName;
      if (vCode) {
        if (!villageMap.has(vCode)) {
          villageMap.set(vCode, {
            code: vCode,
            name: villageName || villageCode,
          });
        }
      }
      if (wellNo) {
        const wid = 'w-' + vCode + '-' + wellNo;
        if (!wellMap.has(wid)) {
          wellMap.set(wid, {
            id: wid,
            villageId: 'v-' + vCode,
            officialNo: wellNo,
            commonName: wellNo,
          });
        }
      }

      transformed.push({
        id: 'l-' + uid(),
        villageCode: vCode,
        wellNo,
        labDate: labDate || new Date().toISOString().slice(0, 10),
        nitrate: nitrateRaw != null ? Number(nitrateRaw) : NaN,
        nitrateUnit: nitrateUnit || 'mg/L',
        turbidity: turbidityRaw != null ? Number(turbidityRaw) : NaN,
        coliform: coliformRaw != null ? Number(coliformRaw) : NaN,
      });
    });

    const existingVillages = useWellStore.getState().villages;
    const existingCodes = new Set(existingVillages.map((v) => v.code));
    const newVillages: Village[] = [];
    villageMap.forEach((v) => {
      if (!existingCodes.has(v.code)) {
        newVillages.push({
          id: 'v-' + v.code,
          name: v.name,
          code: v.code,
          positionX: 20 + Math.random() * 60,
          positionY: 15 + Math.random() * 60,
        });
      }
    });

    if (newVillages.length > 0) {
      useWellStore.getState().upsertVillages(newVillages);
    }
    useWellStore.getState().upsertWells(Array.from(wellMap.values()));

    importLabResults(transformed);
    if (rows.length > 0) setStep(Math.max(step, 2));
  };`;

content = content.slice(0, startIdx) + newBlock + content.slice(endIdx);
fs.writeFileSync(filePath, content);
console.log('Successfully replaced handleLabImport');
