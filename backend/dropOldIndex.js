const mongoose = require('mongoose');

async function dropOldParticipantsIndex() {
  try {
    const db = mongoose.connection.db;
    const indexes = await db.collection('conversations').indexes();
    console.log('Current indexes:', indexes);

    // Drop the old unique index on participants field (usually named 'participants_1')
    await db.collection('conversations').dropIndex('participants_1');
    console.log('✅ Dropped old unique index on participants.');
  } catch (error) {
    if (error.codeName === 'IndexNotFound') {
      console.log('ℹ️ Old index on participants not found, nothing to drop.');
    } else {
      console.error('❌ Error dropping old index:', error);
    }
  }
}

require("dotenv").config();

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ MONGO_URI missing from environment variables.");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ Database connected');
    await dropOldParticipantsIndex();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });
