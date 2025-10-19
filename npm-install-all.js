import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);
const folders = ["./", "src/services/auth/server", "src/services/profile-api", "src/services/matchmaking","src/services/message-api", "src/services/moderation-api" ];

for (const folder of folders) {
  if (fs.existsSync(folder)) {
    console.log(`Installing dependencies in ${folder}...`);
    await execAsync(`cd ${folder} && npm install`);
  } else {
    console.log(`Folder ${folder} does not exist, skipping...`);
  }
}

console.log("All installations done!");
