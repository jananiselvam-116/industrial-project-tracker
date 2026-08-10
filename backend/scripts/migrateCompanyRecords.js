/**
 * One-time migration script:
 * Creates Company (project-tracking) records for any Company-role users
 * that have an Organisation but no matching Company document.
 *
 * Usage: node backend/scripts/migrateCompanyRecords.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Organisation = require('../models/Organisation');
const Company = require('../models/Company');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/industrial-project-mgmt';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Find all Company-role users
  const companyUsers = await User.find({ role: 'Company' }).populate('companyId');
  console.log(`Found ${companyUsers.length} Company-role user(s)`);

  let created = 0;

  for (const cu of companyUsers) {
    // Check if a Company document already exists for this user
    const existing = await Company.findOne({
      $or: [
        { companyUser: cu._id },
        { createdBy: cu._id },
      ]
    });

    if (existing) {
      console.log(`  ✅ Company record already exists for "${cu.name}" (${cu.email})`);
      continue;
    }

    // Get organisation name
    const orgName = cu.companyId?.name || cu.name || 'Unnamed Company';

    // Create Company document
    const company = await Company.create({
      companyName: orgName,
      projectName: '',
      investmentCommitted: 0,
      expense: 0,
      employeesExpected: 0,
      projectStatus: 'Not Started',
      companyUser: cu._id,
    });

    console.log(`  🆕 Created Company record for "${orgName}" (ID: ${company._id})`);
    created++;
  }

  console.log(`\nDone! Created ${created} new Company record(s).`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
