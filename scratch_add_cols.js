require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NOCODB_API_URL.replace(/\/$/, '');
const XC_TOKEN = process.env.NOCODB_API_TOKEN;
const TABLE_ID = process.env.NOCODB_TABLE_ROOMS;

async function addColumn(columnData) {
  const metaUrl = `${BASE_URL}/api/v2/meta/tables/${TABLE_ID}/columns`;
  console.log(`Adding column: ${columnData.title}...`);
  const res = await fetch(metaUrl, {
    method: 'POST',
    headers: {
      'xc-token': XC_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(columnData)
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Failed to add ${columnData.title}:`, errorText);
  } else {
    console.log(`Successfully added ${columnData.title}`);
  }
}

async function main() {
  const columns = [
    {
      title: "HourlyPrice",
      column_name: "HourlyPrice",
      uidt: "Number",
      meta: {
        type: "Number"
      }
    },
    {
      title: "ExtraHourPrice",
      column_name: "ExtraHourPrice",
      uidt: "Number",
      meta: {
        type: "Number"
      }
    },
    {
      title: "OvernightPrice",
      column_name: "OvernightPrice",
      uidt: "Number",
      meta: {
        type: "Number"
      }
    }
  ];

  for (const col of columns) {
    await addColumn(col);
  }
}

main();
