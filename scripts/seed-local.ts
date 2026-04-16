import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://slash:slash@127.0.0.1:5432/slashcash';
const LOCAL_USER_ID = process.env.LOCAL_USER_ID ?? '11111111-1111-1111-1111-111111111111';

const sql = postgres(DATABASE_URL);

async function main() {
  await sql`INSERT INTO auth.users (id) VALUES (${LOCAL_USER_ID}::uuid) ON CONFLICT (id) DO NOTHING`;

  await sql`
    INSERT INTO profiles (id, first_name, last_name)
    VALUES (${LOCAL_USER_ID}::uuid, 'Local', 'User')
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO email_sync_status (
      user_id,
      last_synced_at,
      last_sync_attempt_at,
      sync_status,
      has_initial_sync,
      processed_emails,
      progress_percentage
    )
    VALUES (
      ${LOCAL_USER_ID}::uuid,
      NOW(),
      NOW(),
      'complete',
      true,
      1,
      100
    )
    ON CONFLICT DO NOTHING
  `;

  await sql`
    INSERT INTO transactions_v2 (
      user_id,
      merchant_id,
      merchant_code,
      merchant_name,
      amount,
      currency,
      type,
      status,
      transaction_date,
      description,
      category,
      payment_method,
      merchant_data,
      data_source,
      is_verified,
      verification_status
    )
    VALUES
    (
      ${LOCAL_USER_ID}::uuid,
      'swiggy',
      'SWIGGY',
      'Swiggy',
      485.00,
      'INR',
      'DEBIT',
      'COMPLETED',
      NOW() - INTERVAL '2 days',
      'Paneer Tikka + Roti Combo',
      'Food',
      'UPI',
      '{"swiggyMetadata":{"service":"FOOD_DELIVERY"},"transaction":{"restaurantName":"Punjabi Rasoi","deliveryFee":"29","discount":"40","membershipDiscount":"15"}}'::jsonb,
      'LOCAL_SEED',
      true,
      'VERIFIED'
    ),
    (
      ${LOCAL_USER_ID}::uuid,
      'swiggy',
      'SWIGGY',
      'Swiggy',
      1120.00,
      'INR',
      'DEBIT',
      'COMPLETED',
      NOW() - INTERVAL '8 days',
      'Instamart groceries',
      'Groceries',
      'UPI',
      '{"swiggyMetadata":{"service":"INSTAMART"},"transaction":{"orderItems":[{"name":"Milk"},{"name":"Eggs"}]}}'::jsonb,
      'LOCAL_SEED',
      true,
      'VERIFIED'
    )
    ON CONFLICT DO NOTHING
  `;

  console.log('✅ Seeded local user and sample Swiggy transactions.');
  await sql.end();
}

main().catch(async (error) => {
  console.error('❌ Failed to seed local data', error);
  await sql.end();
  process.exit(1);
});
