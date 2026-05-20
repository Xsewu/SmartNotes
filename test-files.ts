import { getDashboardFiles } from "./app/actions/files";

async function run() {
  try {
    await getDashboardFiles();
  } catch (e) {
    console.error(e);
  }
}
run();
