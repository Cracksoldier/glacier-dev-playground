import { detectUnsupportedBrowser } from "../browserSupport";
import AppShell from "./AppShell";
import UnsupportedBrowserNotice from "./UnsupportedBrowserNotice";

function App() {
  // Checked before `AppShell` mounts, so no worker, iframe, or store code ever
  // runs on a browser that cannot support it.
  const missingFeatures = detectUnsupportedBrowser();
  if (missingFeatures !== null) {
    return <UnsupportedBrowserNotice missingFeatures={missingFeatures} />;
  }
  return <AppShell />;
}

export default App;
