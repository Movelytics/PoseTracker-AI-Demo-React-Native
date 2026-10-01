const fs = require("fs");

if (!fs.existsSync(".env")) {
  console.error(
    "The production bundle needs a .env file with POSETRACKER_TOKEN. It was not in the uploaded project."
  );
  process.exit(1);
}
