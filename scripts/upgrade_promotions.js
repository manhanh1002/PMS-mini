const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const NOCODB_API_URL = process.env.NOCODB_API_URL;
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;
const TABLE_ID = process.env.NOCODB_TABLE_PROMOTIONS;

async function upgradePromotionsTable() {
  if (!TABLE_ID) {
    console.error('Không tìm thấy NOCODB_TABLE_PROMOTIONS trong .env.local');
    return;
  }

  const columns = [
    { column_name: 'ApplyScope', title: 'ApplyScope', uidt: 'SingleLineText', dt: 'varchar' },
    { column_name: 'FreeServiceId', title: 'FreeServiceId', uidt: 'Number', dt: 'int' }
  ];

  for (const col of columns) {
    try {
      console.log(`Đang thêm cột ${col.column_name}...`);
      const baseUrl = NOCODB_API_URL.endsWith('/') ? NOCODB_API_URL.slice(0, -1) : NOCODB_API_URL;
      const response = await fetch(`${baseUrl}/api/v2/meta/tables/${TABLE_ID}/columns`, {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(col),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.msg && data.msg.includes('duplicate')) {
          console.log(`Cột ${col.column_name} đã tồn tại, bỏ qua.`);
        } else {
          console.error(`Lỗi tạo cột ${col.column_name}:`, data);
        }
      } else {
        console.log(`Tạo cột ${col.column_name} thành công!`);
      }
    } catch (e) {
      console.error(`Lỗi Exception khi tạo cột ${col.column_name}:`, e.message);
    }
  }
}

upgradePromotionsTable();
