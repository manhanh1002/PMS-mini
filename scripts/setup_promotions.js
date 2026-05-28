const NOCODB_API_URL = 'https://nocodb.smax.in';
const NOCODB_API_TOKEN = '3QOFS4wKLsvojGsWLqHva4a9Zk-y9y5TjjB6KahX';
const NOCODB_BASE_ID = 'po448h6upuka001';
const BOOKINGS_TABLE_ID = 'mo341b3cwnlr2di';

async function createTable() {
  const url = `${NOCODB_API_URL}/api/v1/db/meta/projects/${NOCODB_BASE_ID}/tables`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xc-token': NOCODB_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      table_name: 'Promotions',
      title: 'Promotions',
      columns: [
        { column_name: 'Code', title: 'Code', uidt: 'SingleLineText' },
        { column_name: 'Name', title: 'Name', uidt: 'SingleLineText' },
        { column_name: 'Type', title: 'Type', uidt: 'SingleSelect', dtxp: 'Percentage,FixedAmount' },
        { column_name: 'Value', title: 'Value', uidt: 'Number' },
        { column_name: 'MaxDiscount', title: 'MaxDiscount', uidt: 'Number' },
        { column_name: 'MinNights', title: 'MinNights', uidt: 'Number' },
        { column_name: 'RoomTypes', title: 'RoomTypes', uidt: 'SingleLineText' },
        { column_name: 'ValidFrom', title: 'ValidFrom', uidt: 'Date' },
        { column_name: 'ValidTo', title: 'ValidTo', uidt: 'Date' },
        { column_name: 'UsageLimit', title: 'UsageLimit', uidt: 'Number' },
        { column_name: 'UsedCount', title: 'UsedCount', uidt: 'Number' },
        { column_name: 'Status', title: 'Status', uidt: 'SingleSelect', dtxp: 'Active,Expired,Disabled' }
      ]
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error('Error creating table Promotions:', response.status, text);
    return null;
  }
  
  const data = await response.json();
  console.log('Created Promotions table:', data.id);
  return data.id;
}

async function addColumnsToBookings() {
  const url = `${NOCODB_API_URL}/api/v1/db/meta/tables/${BOOKINGS_TABLE_ID}/columns`;
  
  // Add PromoCode
  const res1 = await fetch(url, {
    method: 'POST',
    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ column_name: 'PromoCode', title: 'PromoCode', uidt: 'SingleLineText' })
  });
  console.log('PromoCode column response:', res1.status);
  if (!res1.ok) console.log(await res1.text());
  
  // Add DiscountAmount
  const res2 = await fetch(url, {
    method: 'POST',
    headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ column_name: 'DiscountAmount', title: 'DiscountAmount', uidt: 'Number' })
  });
  console.log('DiscountAmount column response:', res2.status);
  if (!res2.ok) console.log(await res2.text());
}

async function main() {
  const tableId = await createTable();
  await addColumnsToBookings();
  if (tableId) {
    console.log(`\n\nPlease add NOCODB_TABLE_PROMOTIONS=${tableId} to .env.local\n\n`);
  }
}

main();
